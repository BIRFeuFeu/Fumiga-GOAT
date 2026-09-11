/**
 * js/core/GameManager.js — Singleton gerenciador do estado da Run  [TDD §2/§3]
 * ---------------------------------------------------------------------------
 * Guarda: Save (persistente), Run atual (bioma, wave, estado), modificadores de
 * mutação (runMods) e níveis da Árvore de Habilidades. Emite eventos de fluxo
 * (runStart, runEnd, biomeChanged, gameOver) para as cenas reagirem.
 * ---------------------------------------------------------------------------
 */
import { Emitter } from './Emitter.js';
import { SaveManager, DEFAULT_SAVE } from './SaveManager.js';
import { MutationSystem } from '../systems/MutationSystem.js';
import { BiomeManager } from '../world/BiomeManager.js';

export const RUN_STATE = { IDLE: 'idle', PLAYING: 'playing', MUTATION: 'mutation', MIGRATION: 'migration', GAMEOVER: 'gameover', VICTORY: 'victory' };

class GameManagerImpl {
    constructor() {
        this.events = new Emitter();
        this.saveManager = new SaveManager();
        this.save = DEFAULT_SAVE();
        this.runMods = MutationSystem.freshMods();
        this.state = RUN_STATE.IDLE;
        this.biomeId = 'bosque_umido';
        this.wave = 0;
        this.maxWave = 5; // chefe na onda 5
        this.waveTimer = 0;
        this.stats = { kills: 0, biomassCollected: 0, roomsBuilt: 0, mutations: 0 };
        this._loaded = null;
    }

    /** Carrega o save persistente (chamado no Boot/MainMenu). */
    async init() {
        if (!this._loaded) {
            this._loaded = this.saveManager.loadProgress().then((s) => {
                this.save = s;
                return s;
            });
        }
        return this._loaded;
    }

    /* ---------------- Metaprogresso ---------------- */
    skill(name) {
        const v = this.save.skillTree[name];
        return typeof v === 'boolean' ? (v ? 1 : 0) : v || 0;
    }
    hasUnlock(name) {
        return !!this.save.skillTree[name];
    }
    get luck() {
        return this.skill('luck') * 0.25;
    }
    get hpBuff() {
        return 1 + this.skill('hp_buff') * 0.1;
    }
    get speedBuff() {
        return 1 + this.skill('speed_buff') * 0.08;
    }
    get maxBiomassBase() {
        return 200 + this.skill('pantry') * 20;
    }
    get incubationMult() {
        return Math.max(0.4, 1 - this.skill('incubation') * 0.12);
    }

    /* ---------------- Run ---------------- */
    startRun(biomeId = 'bosque_umido') {
        this.biomeId = biomeId;
        this.wave = 0;
        this.runMods = MutationSystem.freshMods();
        this.state = RUN_STATE.PLAYING;
        this.stats = { kills: 0, biomassCollected: 0, roomsBuilt: 0, mutations: 0 };
        this.events.emit('runStart', biomeId);
    }

    biome() {
        return BiomeManager.byId(this.biomeId);
    }

    addRoyalJelly(n) {
        this.save.royalJelly += n;
    }

    /** Persiste ao fim da run (derrota ou migração). */
    async persist() {
        return this.saveManager.saveProgress(this.save);
    }

    discoverBiome(id) {
        if (!this.save.discoveredBiomes.includes(id)) this.save.discoveredBiomes.push(id);
    }

    spendJelly(cost) {
        if (this.save.royalJelly < cost) return false;
        this.save.royalJelly -= cost;
        return true;
    }

    buySkill(name, cost) {
        if (!this.spendJelly(cost)) return false;
        const cur = this.save.skillTree[name];
        this.save.skillTree[name] = typeof cur === 'boolean' ? true : (cur || 0) + 1;
        return true;
    }

    /* ---------------- Modificadores de mutação ---------------- */
    damage() {
        return this.runMods.damage * 1;
    }
    speed() {
        return this.runMods.speed * this.speedBuff;
    }
    hpMult() {
        return this.runMods.hp * this.hpBuff;
    }
    armor() {
        return this.runMods.armor + (this.runMods.armorAdd || 0);
    }
    flag(name) {
        return (this.runMods.flags[name] || 0) > 0;
    }

    applyMutation(mutation) {
        MutationSystem.applyTo(this.runMods, mutation);
        this.stats.mutations++;
        this.events.emit('mutationApplied', mutation);
    }

    /* ---------------- Fluxo ---------------- */
    setState(state) {
        this.state = state;
        this.events.emit('state', state);
    }

    gameOver(win) {
        this.state = win ? RUN_STATE.VICTORY : RUN_STATE.GAMEOVER;
        this.events.emit('runEnd', { win });
    }
}

export const GameManager = new GameManagerImpl();
