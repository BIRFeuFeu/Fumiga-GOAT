/**
 * js/entities/AntBase.js — Herança de EntityBase + Fila de Comandos + BT [TDD §4/§5.2]
 * ---------------------------------------------------------------------------
 * Toda formiga roda uma Behavior Tree com as 4 prioridades do TDD:
 *   1 Combate (Aggro)  2 Obediência (Feromônio)  3 Sobrevivência (Fuga)  4 Idle
 * Movimentação por waypoints do AStarGrid (Grid Navigation), não por forças.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { EntityBase } from './EntityBase.js';
import { BehaviorTree, Selector, Condition, Action, STATUS } from '../ai/BehaviorTree.js';

export class AntBase extends EntityBase {
    constructor(scene, x, y, texture, cfg, cls) {
        super(scene, x, y, texture, cfg, 'Player');
        this.cls = cls; // 'worker' | 'soldier' | ...
        this.path = [];
        this.pathVersion = -1;
        this.workTimer = 0;
        this.workTarget = null; // {x,y,kind}
        this.carrying = 0;
        this.homeTile = scene.gameRef ? scene.gameRef.queenTile : { x: 0, y: 0 };

        // knobs por classe (sobrepostos nas subclasses)
        this.aggroRadius = 0; // tiles
        this.fleeRadius = 0;
        this.canFight = false;
        this.hardAggro = false;

        this.tree = new BehaviorTree(
            new Selector([
                new Selector([
                    new Condition((a, c) => a.canFight && a.enemyInRadius(c, a.aggroRadius), 'combate?'),
                    new Action((a, c) => a.attackNearest(c), 'atacar')
                ]),
                new Selector([
                    new Condition((a, c) => a.relevantPheromone(c), 'feromonio?'),
                    new Action((a, c) => a.followPheromone(c), 'obedecer')
                ]),
                new Selector([
                    new Condition((a, c) => a.fleeRadius > 0 && a.enemyInRadius(c, a.fleeRadius), 'fugir?'),
                    new Action((a, c) => a.fleeFrom(c), 'sobreviver')
                ]),
                new Action((a, c) => a.doIdle(c), 'idle')
            ])
        );
    }

    /* ---------- helpers de contexto ---------- */
    enemyInRadius(ctx, radiusTiles) {
        if (radiusTiles <= 0) return !!this._nearestEnemy;
        const r = radiusTiles * TILE;
        return !!this._nearestEnemy && this.distTo(this._nearestEnemy) <= r;
    }
    nearestEnemy(ctx) {
        return this._nearestEnemy;
    }

    relevantPheromone(ctx) {
        const p = ctx.pheromone;
        for (const t of this.pheromoneTypes || []) if (p.hasActive(t)) return true;
        return false;
    }

    /* ---------- pathing ---------- */
    setPathTo(tx, ty) {
        const g = this.scene.gameRef.grid;
        const here = this.tile();
        this.path = g.findPath(here.x, here.y, tx, ty);
        this.pathVersion = g.version;
        return this.path.length > 0;
    }

    followPath(dt) {
        const g = this.scene.gameRef.grid;
        if (g.version !== this.pathVersion) {
            // grade mudou -> recalcula na próxima decisão (TDD §5.1)
            this.pathVersion = g.version;
        }
        if (!this.path.length) return false;
        const t = this.path[0];
        const cx = (t.x + 0.5) * TILE;
        const cy = (t.y + 0.5) * TILE;
        const dx = cx - this.x;
        const dy = cy - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.effectiveSpeed() * dt;
        if (dist <= Math.max(1.5, step)) {
            this.x = cx;
            this.y = cy;
            this.path.shift();
            this.syncBody();
            return this.path.length > 0;
        }
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.setFlipX(dx < 0);
        this.syncBody();
        return true;
    }

    effectiveArmor() {
        let base = this.armor || 0;
        try { if (this.scene && this.scene.gameRef && this.scene.gameRef.rooms) base += this.scene.gameRef.rooms.defenseArmor(); } catch {}
        return base;
    }

    effectiveSpeed() {
        return this.moveSpeed * this.speedMultiplier() * this.scene.getTimeScale() * (this.scene.gameRef ? this.scene.gameRef.globalSpeedMult || 1 : 1);
    }

    /* ---------- ações BT ---------- */
    attackNearest(ctx) {
        const e = this._nearestEnemy;
        if (!e || e.dead) return STATUS.FAILURE;
        this.faceToward(e);
        const range = (this.range || 1) * TILE * 1.2;
        if (this.distTo(e) <= range) {
            if (this.attackCooldown <= 0) {
                this.playAttack();
                this.dealDamageTo(e);
                this.attackCooldown = 0.6;
            }
            return STATUS.RUNNING;
        }
        // aproxima (ignora path, persegue direto em linha curta)
        this.chase(e, dtGlobal(this));
        return STATUS.RUNNING;
    }

    dealDamageTo(e) {
        const gm = this.scene.gameRef.gm;
        let dmg = this.baseDamage * gm.damage();
        let type = 'physical';
        if (gm.flag('projectile')) {
            this.scene.spawnProjectile(this, e, dmg);
            return;
        }
        if (gm.flag('poison')) e.addStatus('poison', { dps: 3, duration: 3 });
        if (gm.flag('armor_shred')) e.armor = Math.max(0, e.armor - 2);
        if (gm.flag('boss_exec') && e.boss) dmg *= 4;
        if (gm.flag('divine_oblit') && Math.random() < 0.05) dmg = e.currentHp + 999;
        e.takeDamage(dmg, this, type);
        if (gm.flag('meteor')) this.scene.aoe(this.x, this.y, TILE * 1.5, dmg * 0.5, 'Player');
        if (gm.flag('singularity')) this.scene.pullEnemies(this.x, this.y, TILE * 3);
        if (gm.flag('mind_control') && Math.random() < 0.06 && !e.boss) this.scene.convertEnemy(e);
        this.scene.audio.play('bite');
    }

    followPheromone(ctx) {
        const p = ctx.pheromone;
        for (const t of this.pheromoneTypes || []) {
            const z = p.nearest(t, this.tile().x, this.tile().y);
            if (z) {
                if (t === 'retreat') {
                    this.setPathTo(this.homeTile.x, this.homeTile.y);
                } else {
                    const target = this.scene.gameRef.grid.nearestWalkable(z.x, z.y) || z;
                    this.setPathTo(target.x, target.y);
                }
                this.followPath(dtGlobal(this));
                return STATUS.RUNNING;
            }
        }
        return STATUS.FAILURE;
    }

    fleeFrom(ctx) {
        const e = this._nearestEnemy;
        if (!e) return STATUS.FAILURE;
        const here = this.tile();
        const ex = e.tile ? e.tile() : { x: Math.floor(e.x / TILE), y: Math.floor(e.y / TILE) };
        const away = this.scene.gameRef.grid.nearestWalkable(here.x + (here.x - ex.x), here.y + (here.y - ex.y)) || here;
        this.setPathTo(away.x, away.y);
        this.followPath(dtGlobal(this));
        return STATUS.RUNNING;
    }

    chase(target, dt) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.x += (dx / d) * this.effectiveSpeed() * dt;
        this.y += (dy / d) * this.effectiveSpeed() * dt;
        this.setFlipX(dx < 0);
    }

    doIdle(ctx) {
        return STATUS.SUCCESS;
    }

    playAttack() {
        const an = this.anims;
        if (an && this.scene.anims.exists(this.texture.key + '_attack')) {
            this.play(this.texture.key + '_attack', true);
        }
    }

    update(dt) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        this.tickStatuses(dt);
        this._nearestEnemy = this.scene.findNearestEnemy(this);
        const ctx = { pheromone: this.scene.gameRef.pheromone };
        this.tree.tick(this, ctx);
    }
}

function dtGlobal(a) {
    return (a.scene.gameDelta || 16) / 1000;
}
