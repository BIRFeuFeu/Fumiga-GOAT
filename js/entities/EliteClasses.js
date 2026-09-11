/**
 * js/entities/EliteClasses.js — Espiã, Cuspidora(Sniper), Gigante + Suporte [TDD §4.2 / GDD §6.3/§9]
 * ---------------------------------------------------------------------------
 * SpyAnt:   sobrescreve a facção p/ ser ignorada; infiltra e envenena a Rainha
 *           rival (DoT sem aggro). Se ela morrer -> triggerAssimilation().
 * SniperAnt: alcance/visão 3x, 10% do HP, kiting (recua se chegarem perto).
 * GiantAnt: setScale(10), -80% velocidade, dano em área (círculo à frente).
 * HealerAnt: cura aliados próximos (suporte).
 * DiggerAnt: escava mais rápido e quebra pedras sólidas (tile 3).
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';
import { WorkerAnt } from './WorkerAnt.js';

export class SniperAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_sniper', cfg, 'sniper');
        this.aggroRadius = 36; // visão 3x
        this.range = 3;
        this.canFight = true;
        this.pheromoneTypes = ['attack', 'retreat'];
    }
    attackNearest(ctx) {
        const e = this._nearestEnemy;
        if (!e || e.dead) return 'failure';
        this.faceToward(e);
        const range = this.range * TILE;
        const d = this.distTo(e);
        if (d < TILE * 1.4) {
            // kiting: recua
            const away = { x: this.x + (this.x - e.x), y: this.y + (this.y - e.y) };
            this.chase(away, this.scene.gameDelta / 1000);
            return 'running';
        }
        if (d <= range * 1.6 && this.attackCooldown <= 0) {
            this.attackCooldown = 0.9;
            this.playAttack();
            this.scene.spawnProjectile(this, e, this.baseDamage * this.scene.gameRef.gm.damage(), 'acid');
            this.scene.audio.play('acid');
        }
        return 'running';
    }
}

export class SpyAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_spy', cfg, 'spy');
        this.faction = 'Enemy_Faction'; // TDD: troca de tag p/ ser ignorada
        this.ignored = true;
        this.canFight = false;
        this.setAlpha(0.6);
    }
    doIdle(ctx) {
        const g = this.scene.gameRef;
        const rival = g.rivalQueen;
        if (!rival || rival.dead) return 'success';
        if (this.distTo(rival) > TILE * 1.6) {
            this.chase(rival, this.scene.gameDelta / 1000);
        } else {
            // veneno DoT sem disparar aggro (TDD §4.2 SpyAnt)
            rival.addStatus('poison', { dps: 6, duration: 2 });
            this.setAlpha(0.35);
        }
        return 'running';
    }
}

export class GiantAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_giant', cfg, 'giant');
        this.setScale(10); // TDD §4.2: colossal
        this.moveSpeed *= 0.2; // -80% velocidade
        this.aggroRadius = 8;
        this.canFight = true;
        this.range = 1;
        this.setDepth(4);
    }
    dealDamageTo(e) {
        const dmg = this.baseDamage * this.scene.gameRef.gm.damage();
        // AoE: círculo à frente atinge todos dentro
        this.scene.aoe(this.x, this.y, TILE * 2.2, dmg, 'Player', this);
        this.scene.shake(60);
        this.scene.audio.play('boss');
    }
}

export class HealerAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_healer', cfg, 'healer');
        this.fleeRadius = 6;
        this.canFight = false;
        this.healTimer = 0;
    }
    doIdle(ctx) {
        const ward = this.scene.findNearestWoundedAlly(this);
        if (ward) {
            this.chase(ward, this.scene.gameDelta / 1000);
            if (this.distTo(ward) < TILE * 1.5) {
                this.healTimer += this.scene.gameDelta / 1000;
                if (this.healTimer >= 0.5) {
                    this.healTimer = 0;
                    ward.currentHp = Math.min(ward.maxHp, ward.currentHp + 8);
                    this.scene.events.emit('heal', ward);
                }
            }
        }
        return 'success';
    }
}

export class DiggerAnt extends WorkerAnt {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, cfg);
        this.setTexture('ant_digger');
        this.fast = true;
        this.breaksRock = true;
    }
}
