/**
 * js/core/EconomyManager.js — Controle de Biomassa e custos  [TDD §2 / GDD §4]
 * ---------------------------------------------------------------------------
 * Biomassa: recurso volátil da Run. Geleia Real: moeda persistente (metaprogresso).
 * Emite `changed` quando os valores mudam (HUD atualiza).
 * ---------------------------------------------------------------------------
 */
import { Emitter } from './Emitter.js';

export class EconomyManager {
    constructor({ biomass = 100, maxBiomass = 200, royalJelly = 0 } = {}) {
        this.events = new Emitter();
        this.biomass = biomass;
        this.maxBiomass = maxBiomass;
        this.royalJelly = royalJelly; // ganho na run, persistido no fim
        this.passiveRate = 0; // biomassa/segundo (Câmara de Fungos, etc.)
        this._acc = 0;
    }

    canAfford(cost) {
        return this.biomass >= cost;
    }

    spend(cost) {
        if (!this.canAfford(cost)) return false;
        this.biomass -= cost;
        this.events.emit('changed');
        return true;
    }

    add(amount) {
        this.biomass = Math.min(this.maxBiomass, this.biomass + amount);
        this.events.emit('changed');
    }

    addMax(amount) {
        this.maxBiomass += amount;
        this.events.emit('changed');
    }

    addRoyalJelly(n) {
        this.royalJelly += n;
        this.events.emit('changed');
    }

    /** Renda passiva (Câmara de Fungos: +2 a cada 5s = 0.4/s cada). */
    setPassiveRate(rate) {
        this.passiveRate = rate;
    }

    update(dt) {
        if (this.passiveRate <= 0) return;
        this._acc += this.passiveRate * dt;
        if (this._acc >= 1) {
            const whole = Math.floor(this._acc);
            this._acc -= whole;
            this.add(whole);
        }
    }
}
