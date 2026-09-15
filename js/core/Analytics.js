/**
 * js/core/Analytics.js — Telemetria mínima FUMIGA [PLANO IA-0]
 * ---------------------------------------------------------------------------
 * Wrapper leve: loga no console + fila 100 em SaveManager (via localStorage
 * key fumiga_events). Não bloqueia update. Usado para 3 eventos base:
 * run_start / run_end / mutation_pick + tutorial_step / share.
 * No headless, vira no-op se localStorage bloqueado.
 * ---------------------------------------------------------------------------
 */
export const Analytics = {
    log(event, payload) {
        try {
            const entry = { e: event, p: payload || {}, t: Date.now() };
            // console para debug + preview
            console.log('[FUMIGA]', event, payload);
            // fila persistida 100
            let q = [];
            try {
                const raw = localStorage.getItem('fumiga_events');
                if (raw) q = JSON.parse(raw);
            } catch {}
            q.push(entry);
            if (q.length > 100) q.shift();
            try { localStorage.setItem('fumiga_events', JSON.stringify(q)); } catch {}
            // também emite via Phaser se disponível
            try {
                if (typeof window !== 'undefined' && window.__FUMIGA__ && window.__FUMIGA__.events) {
                    window.__FUMIGA__.events.emit(event, payload);
                }
            } catch {}
        } catch {}
    },
    getQueue() {
        try {
            const raw = localStorage.getItem('fumiga_events');
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },
    clear() {
        try { localStorage.removeItem('fumiga_events'); } catch {}
    }
};
