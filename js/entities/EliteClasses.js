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
            const dx = this.x - e.x, dy = this.y - e.y; const d=Math.hypot(dx,dy)||1; const away = { x: this.x + (dx/d)*80, y: this.y + (dy/d)*80 }; // [M-03] norm*80
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
        this.setScale(2.2); // [M-05] 10→2.2
        this.moveSpeed *= 0.5; // [M-05] -50% (era -80%)
        this.aggroRadius = 8;
        this.canFight = true;
        this.range = 1;
        this.setDepth(4);
        try { this.setSize(18, 18); this.body.setSize(18,18); } catch {} // [M-05] hitbox 18
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
        this.charges = 3; // [M-06] 3 cargas
        this.recharge = 0;
        this.maxCharges = 3;
    }
    doIdle(ctx) {
        // recarga 4s cada
        if(this.charges < this.maxCharges){
            this.recharge += this.scene.gameDelta/1000;
            if(this.recharge >= 4){ this.recharge=0; this.charges++; }
        }
        const ward = this.scene.findNearestWoundedAlly(this);
        if (ward) {
            this.chase(ward, this.scene.gameDelta / 1000);
            if (this.distTo(ward) < TILE * 1.5) {
                this.healTimer += this.scene.gameDelta / 1000;
                if (this.healTimer >= 0.5 && this.charges>0) {
                    this.healTimer = 0;
                    this.charges--;
                    ward.currentHp = Math.min(ward.maxHp, ward.currentHp + 10); // [M-06] 8→10
                    this.scene.events.emit('heal', ward);
                    // aura verde
                    try{ this.setTint(0x5ad25a); this.scene.time.delayedCall(200,()=>this.clearTint()); }catch{}
                } else if(this.charges<=0){
                    // sem mana foge
                    this.fleeFrom(ctx);
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
