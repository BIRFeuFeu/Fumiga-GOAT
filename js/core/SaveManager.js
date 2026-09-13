/**
 * js/core/SaveManager.js — Persistência de Geleia Real + Metaprogresso [TDD §3.3]
 * ---------------------------------------------------------------------------
 * Async/await obrigatório (não trava a thread no Mobile). Usa IndexedDB nativo
 * quando disponível e cai para localStorage como fallback (navegador simples /
 * testes Node usam um store em memória).
 * Estrutura: { royalJelly, skillTree, discoveredBiomes }
 * ---------------------------------------------------------------------------
 */
const KEY = 'fumiga_save_v1';

export const DEFAULT_SAVE = () => ({
    royalJelly: 0,
    skillTree: {
        hp_buff: 0,
        speed_buff: 0,
        luck: 0,
        pantry: 0,
        incubation: 0,
        unlock_fungus: false,
        unlock_trap: false,
        unlock_sniper: false,
        unlock_spy: false,
        unlock_giant: false,
        unlock_digger: false,
        unlock_healer: false
    },
    discoveredBiomes: [],
    tutorialDone: false,
    volume: { bgm: 0.6, sfx: 0.8, mute: false }
});

export class SaveManager {
    constructor() {
        this.db = null;
        this._memory = null;
    }

    _hasIDB() {
        // iframe sandboxed/de terceiros: o PRÓPRIO ACESSO a `indexedDB`
        // (getter) lança SecurityError — por isso o typeof vai em try/catch.
        try {
            return typeof indexedDB !== 'undefined' && !!indexedDB;
        } catch (e) {
            return false;
        }
    }
    _hasLS() {
        try {
            return typeof localStorage !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    _open() {
        return new Promise((resolve) => {
            let req = null;
            try {
                req = indexedDB.open('fumiga', 1);
            } catch (e) {
                // SecurityError síncrono (storage bloqueado) → fallback
                resolve(null);
                return;
            }
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
            req.onblocked = () => resolve(null);
        });
    }

    async saveProgress(data) {
        if (this._hasIDB()) {
            try {
                const db = this.db || (this.db = await this._open());
                if (db) {
                    return await new Promise((resolve) => {
                        try {
                            const tx = db.transaction('saves', 'readwrite');
                            tx.objectStore('saves').put(data, KEY);
                            tx.oncomplete = () => resolve(true);
                            tx.onerror = () => resolve(false);
                            tx.onabort = () => resolve(false);
                        } catch (e) {
                            resolve(false); // db fechado/inválido → fallback
                        }
                    });
                }
            } catch (e) {
                this.db = null; // IDB indisponível: cai p/ LS/memória
            }
        }
        if (this._hasLS()) {
            try {
                localStorage.setItem(KEY, JSON.stringify(data));
                return true;
            } catch (e) { /* quota/SecurityError → memória */ }
        }
        this._memory = data;
        return true;
    }

    async loadProgress() {
        if (this._hasIDB()) {
            try {
                const db = this.db || (this.db = await this._open());
                if (db) {
                    const data = await new Promise((resolve) => {
                        try {
                            const tx = db.transaction('saves', 'readonly');
                            const req = tx.objectStore('saves').get(KEY);
                            req.onsuccess = () => resolve(req.result || null);
                            req.onerror = () => resolve(null);
                        } catch (e) {
                            resolve(null);
                        }
                    });
                    if (data) return this._merge(data);
                }
            } catch (e) {
                this.db = null;
            }
        }
        if (this._hasLS()) {
            try {
                const raw = localStorage.getItem(KEY);
                if (raw) {
                    try {
                        return this._merge(JSON.parse(raw));
                    } catch (e) {}
                }
            } catch (e) { /* SecurityError → memória */ }
        }
        if (this._memory) return this._merge(this._memory);
        return DEFAULT_SAVE();
    }

    _merge(data) {
        const base = DEFAULT_SAVE();
        return {
            ...base,
            ...data,
            skillTree: { ...base.skillTree, ...(data.skillTree || {}) },
            discoveredBiomes: data.discoveredBiomes || [],
            tutorialDone: data.tutorialDone ?? base.tutorialDone,
            volume: { ...base.volume, ...(data.volume || {}) }
        };
    }

    async resetProgress() {
        return this.saveProgress(DEFAULT_SAVE());
    }
}
