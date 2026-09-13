/**
 * js/entities/EntityBase.js — Classe abstrata de tudo que move e tem vida [TDD §4.1]
 * ---------------------------------------------------------------------------
 * Propriedades: maxHp, currentHp, moveSpeed, armor, baseDamage, faction,
 * statusEffects (veneno, lentidão...).
 * takeDamage: final = amount * (1 - armor/100); flash de hit; emite damage number.
 * die(): spawna Biomassa (se inimigo) e destrói.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';

export class EntityBase extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, cfg = {}, faction = 'Player') {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.maxHp = cfg.hp || 20;
        this.currentHp = this.maxHp;
        this.moveSpeed = cfg.speed || 40;
        this.armor = cfg.armor || 0;
        this.baseDamage = cfg.damage || 0;
        this.faction = faction;
        this.statusEffects = []; // {type:'poison'|'slow'|'freeze', dps, until, mult}
        this.dead = false;
        this.attackCooldown = 0;
        this.boss = !!cfg.boss;
        this.elite = !!cfg.elite;
        this.biomassDrop = cfg.biomass || 0;

        this.setDepth(2);
    }

    tile() {
        return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
    }

    distTo(other) {
        return Math.hypot(other.x - this.x, other.y - this.y);
    }

    hasStatus(type) {
        return this.statusEffects.some((s) => s.type === type);
    }

    addStatus(type, { dps = 0, duration = 3, mult = 1 } = {}) {
        const existing = this.statusEffects.find((s) => s.type === type);
        if (existing) {
            existing.until = this.scene.time.now + duration * 1000;
            existing.dps = Math.max(existing.dps, dps);
            return;
        }
        this.statusEffects.push({ type, dps, mult, until: this.scene.time.now + duration * 1000 });
    }

    speedMultiplier() {
        let m = 1;
        for (const s of this.statusEffects) {
            if (s.type === 'slow') m *= 0.5;
            if (s.type === 'freeze') m = 0;
        }
        return m;
    }

    /** Cálculo de dano do TDD. Retorna o dano final aplicado. */
    takeDamage(amount, source = null, type = 'physical') {
        if (this.dead) return 0;
        // Casco de Cristal: imune a fogo/ácido
        if ((type === 'fire' || type === 'acid') && this.scene.gameRef && this.scene.gameRef.flag('crystal')) return 0;
        // [M-08] defesa aplica armor: só para Player (formigas)
        let effArmor = this.armor || 0;
        try {
            if (this.faction === 'Player' && this.scene && this.scene.gameRef && this.scene.gameRef.rooms) {
                effArmor += this.scene.gameRef.rooms.defenseArmor();
            }
            // AntBase effectiveArmor override
            if (typeof this.effectiveArmor === 'function') effArmor = this.effectiveArmor();
        } catch {}
        let final = Math.max(1, amount * (1 - effArmor / 100));
        this.currentHp -= final;

        // feedback agressivo (Estética §4): flash branco/vermelho
        this.setTintFill(0xff3b30);
        this.scene.time.delayedCall(90, () => this.clearTint && this.clearTint());

        this.scene.events.emit('damageNumber', { x: this.x, y: this.y - 8, amount: Math.round(final), crit: type === 'crit' });
        this.scene.events.emit('entityHurt', this, final, source, type);

        if (this.currentHp <= 0) this.die(source);
        return final;
    }

    /** Aplica statuses (veneno) por segundo — chamado no update. */
    tickStatuses(dt) {
        const now = this.scene.time.now;
        this.statusEffects = this.statusEffects.filter((s) => s.until > now);
        for (const s of this.statusEffects) {
            if (s.type === 'poison' && s.dps > 0) {
                this.currentHp -= s.dps * dt;
                if (this.currentHp <= 0 && !this.dead) {
                    this.die();
                    break;
                }
            }
        }
    }

    die(source = null) {
        if (this.dead) return;
        this.dead = true;
        this.scene.events.emit('entityDied', this, source);
        this.scene.events.emit(this.faction === 'Enemy' ? 'enemyDied' : 'allyDied', this, source);
        this.destroy();
    }

    faceToward(target) {
        if (target && Math.abs(target.x - this.x) > 1) {
            this.setFlipX(target.x < this.x);
        }
    }

    /** Sincroniza o corpo Arcade (usado p/ overlaps de armadilha). */
    syncBody() {
        try {
            if (!this.body) return;
            // Phaser 3.90: Body não tem .set, usa position.set ou reset
            if (this.body.position && this.body.position.set) {
                this.body.position.set(this.x - this.body.width / 2, this.y - this.body.height / 2);
            } else if (typeof this.body.set === 'function') {
                this.body.set(this.x - this.body.width / 2, this.y - this.body.height / 2);
            } else if (typeof this.body.reset === 'function') {
                this.body.reset(this.x, this.y);
            } else {
                // fallback direto
                this.body.x = this.x - this.body.width / 2;
                this.body.y = this.y - this.body.height / 2;
            }
        } catch {}
    }
}
