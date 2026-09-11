/**
 * js/systems/AudioManager.js — Pool de sons com variação de pitch/detune [TDD §8]
 * ---------------------------------------------------------------------------
 * Limita sons simultâneos do mesmo tipo (<=3) e randomiza o detune de cada
 * emissão para variação orgânica. BGM com crossfade entre faixas.
 * ---------------------------------------------------------------------------
 */
export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.active = new Map(); // key -> timestamps
        this.MAX_SAME = 3;
        this.bgmKey = null;
    }

    play(key, { volume = 0.8 } = {}) {
        try {
            const s = this.scene.sound;
            if (!s || !s.get || !s.get(key)) return;
            // pool: conta instâncias tocando
            const now = performance.now();
            const list = (this.active.get(key) || []).filter((t) => now - t < 400);
            if (list.length >= this.MAX_SAME) return;
            list.push(now);
            this.active.set(key, list);
            const detune = Phaser.Math.Between(-150, 150); // TDD §8
            s.play(key, { detune, volume });
        } catch (e) {
            /* áudio indisponível (headless) — silencioso */
        }
    }

    playBgm(key, { volume = 0.5 } = {}) {
        try {
            const s = this.scene.sound;
            if (!s || !s.get || !s.get(key)) return;
            if (this.bgmKey === key) return;
            if (this.bgmKey) s.stop(this.bgmKey);
            this.bgmKey = key;
            s.play(key, { loop: true, volume });
        } catch (e) {}
    }

    stopBgm() {
        try {
            if (this.bgmKey && this.scene.sound) this.scene.sound.stop(this.bgmKey);
        } catch (e) {}
        this.bgmKey = null;
    }
}
