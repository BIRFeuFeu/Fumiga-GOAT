/**
 * js/entities/EnemyBase.js — IA inimiga e Bosses  [TDD §4.2 / GDD §7]
 * ---------------------------------------------------------------------------
 * Inimigos vagam na superfície, detectam o formigueiro e descem até a Rainha.
 * Atacam formigas no aggro. Voadores ignoram paredes. Ao morrer, dropam Biomassa.
 * Bosses: ataques especiais, dropam Geleia Real + Biomassa Especial e, ao morrer,
 * abrem a tela de Mutação e a escolha de Migração.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { EntityBase } from './EntityBase.js';

export class EnemyBase extends EntityBase {
    constructor(scene, x, y, texture, cfg, type) {
        super(scene, x, y, texture, cfg, 'Enemy');
        this.type = type;
        this.flying = type === 'fly' || type === 'moth';
        this.aggro = (cfg.aggro || 6) * TILE;
        this.repathTimer = 0;
        this.path = [];
        this.wanderTimer = 0;
        this.wanderTarget = null;
        this.specialTimer = 2 + Math.random() * 2;
    }

    update(dt) {
        this.tickStatuses(dt);
        if (this.dead) return;
        const g = this.scene.gameRef;

        // alvo: formiga mais próxima (espiãs são ignoradas)
        const ally = this.scene.findNearestAlly(this);
        if (ally && this.distTo(ally) <= this.aggro) {
            this.faceToward(ally);
            const range = TILE * 1.3;
            if (this.distTo(ally) <= range) {
                if (this.attackCooldown <= 0) {
                    this.attackCooldown = 0.7;
                    this.playAttack();
                    ally.takeDamage(this.baseDamage, this);
                    this.scene.audio.play('bite');
                }
            } else {
                this.chase(ally, dt);
            }
            return;
        }

        // chefe: ataques especiais
        if (this.boss) {
            this.specialTimer -= dt;
            if (this.specialTimer <= 0) {
                this.specialTimer = 4 + Math.random() * 2;
                this.bossSpecial();
            }
        }

        // desloca até a Rainha — voador [G-03]
        if (this.flying) {
            const tile = this.tile();
            const overSolid = g.grid.get(tile.x, tile.y) === 0;
            const overRock = g.grid.get(tile.x, tile.y) === 3;
            if (overRock) {
                // não atravessa ROCK [G-03]
                this.setAlpha(0.5);
                // tenta contornar
                const near = g.grid.nearestWalkable(tile.x, tile.y, 3);
                if (near) this.chase({ x: near.x*16+8, y: near.y*16+8 }, dt*0.7);
                return;
            }
            this.setAlpha(overSolid ? 0.5 : 1);
            // sombra no chão quando sobre terra
            if (overSolid && this.scene.add) {
                // shadow tint já via alpha
            }
            const speedMult = overSolid ? 0.7 : 1;
            const dx = g.queenPx.x - this.x, dy = g.queenPx.y - this.y;
            const d = Math.hypot(dx, dy) || 1;
            this.x += (dx/d) * this.moveSpeed * speedMult * this.speedMultiplier() * this.scene.getTimeScale() * dt;
            this.y += (dy/d) * this.moveSpeed * speedMult * this.speedMultiplier() * this.scene.getTimeScale() * dt;
            this.setFlipX(dx < 0);
            return;
        }
        this.repathTimer -= dt;
        if (this.repathTimer <= 0 || !this.path.length) {
            this.repathTimer = 1.2;
            const here = this.tile();
            this.path = g.grid.findPath(here.x, here.y, g.queenTile.x, g.queenTile.y);
            if (!this.path.length) {
                // sem caminho: rói a terra mais próxima (cava)
                this.digToward(dt);
                return;
            }
        }
        this.followPath(dt);
    }

    followPath(dt) {
        if (!this.path.length) return false;
        const t = this.path[0];
        const cx = (t.x + 0.5) * TILE;
        const cy = (t.y + 0.5) * TILE;
        const dx = cx - this.x;
        const dy = cy - this.y;
        const dist = Math.hypot(dx, dy);
        const step = this.moveSpeed * this.speedMultiplier() * this.scene.getTimeScale() * dt;
        if (dist <= Math.max(1.5, step)) {
            this.x = cx;
            this.y = cy;
            this.path.shift();
            return this.path.length > 0;
        }
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.setFlipX(dx < 0);
        this.syncBody();
        return true;
    }

    chase(target, dt) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.x += (dx / d) * this.moveSpeed * this.speedMultiplier() * this.scene.getTimeScale() * dt;
        this.y += (dy / d) * this.moveSpeed * this.speedMultiplier() * this.scene.getTimeScale() * dt;
        this.setFlipX(dx < 0);
    }

    /** Inimigos terrestres sem caminho escavam em direção à Rainha. */
    digToward(dt) {
        const g = this.scene.gameRef;
        const dirX = Math.sign(g.queenPx.x - this.x);
        const dirY = Math.sign(g.queenPx.y - this.y);
        const t = this.tile();
        const tx = t.x + dirX;
        const ty = t.y + dirY;
        this.digAcc = (this.digAcc || 0) + dt;
        if (this.digAcc > 1.5) {
            this.digAcc = 0;
            if (g.grid.get(tx, ty) === 0) g.grid.set(tx, ty, 1);
        }
        this.x += dirX * this.moveSpeed * 0.3 * this.scene.getTimeScale() * dt;
        this.y += dirY * this.moveSpeed * 0.3 * this.scene.getTimeScale() * dt;
    }

    playAttack() {
        if (this.scene.anims.exists(this.texture.key + '_attack')) this.play(this.texture.key + '_attack', true);
    }

    /** Ataques especiais dos chefões. */
    bossSpecial() {
        const g = this.scene.gameRef;
        switch (this.bossKind) {
            case 'wolf_spider':
                // invoca filhotes
                for (let i = 0; i < 3; i++) this.scene.spawnEnemy('spiderling', this.x + (Math.random() * 40 - 20), this.y + 20);
                break;
            case 'bombardier':
                // explosão AoE
                this.scene.aoe(this.x, this.y, TILE * 4, 20, 'Enemy');
                this.scene.shake(120);
                break;
            case 'putrid_centipede':
                // sopro tóxico + invade túneis
                this.scene.aoe(this.x, this.y, TILE * 3, 12, 'Enemy', null, 'poison');
                this.scene.spawnEnemy('spiderling', g.queenPx.x + 20, g.queenPx.y);
                break;
            case 'first_queen':
                // feromônios contra o jogador + invoca genes
                this.scene.aoe(this.x, this.y, TILE * 5, 16, 'Enemy');
                this.scene.spawnEnemy('ant', this.x - 30, this.y);
                this.scene.spawnEnemy('ant', this.x + 30, this.y);
                break;
        }
    }

    die(source) {
        if (this.dead) return;
        this.dead = true;
        this.scene.events.emit('entityDied', this, source);
        this.scene.events.emit('enemyDied', this, source);
        if (this.boss) this.scene.events.emit('bossDied', this, source);
        this.destroy();
    }
}
