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
    discoveredBiomes: []
});

export class SaveManager {
    constructor() {
        this.db = null;
        this._memory = null;
    }

    _hasIDB() {
        return typeof indexedDB !== 'undefined';
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
            if (!this._hasIDB()) return resolve(null);
            const req = indexedDB.open('fumiga', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }

    async saveProgress(data) {
        if (this._hasIDB()) {
            const db = this.db || (this.db = await this._open());
            if (db) {
                return new Promise((resolve) => {
                    const tx = db.transaction('saves', 'readwrite');
                    tx.objectStore('saves').put(data, KEY);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                });
            }
        }
        if (this._hasLS()) {
            localStorage.setItem(KEY, JSON.stringify(data));
            return true;
        }
        this._memory = data;
        return true;
    }

    async loadProgress() {
        if (this._hasIDB()) {
            const db = this.db || (this.db = await this._open());
            if (db) {
                const data = await new Promise((resolve) => {
                    const tx = db.transaction('saves', 'readonly');
                    const req = tx.objectStore('saves').get(KEY);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                });
                if (data) return this._merge(data);
            }
        }
        if (this._hasLS()) {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                try {
                    return this._merge(JSON.parse(raw));
                } catch (e) {}
            }
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
            discoveredBiomes: data.discoveredBiomes || []
        };
    }

    async resetProgress() {
        return this.saveProgress(DEFAULT_SAVE());
    }
}
