/**
 * tools/generate-audio.mjs
 * ---------------------------------------------------------------------------
 * Sintetiza SFX e BGM do beta como WAV PCM 16-bit (sem assets binários externos).
 * Estilo: chiptune 8-bit orgânico — casa com a estética 16-bit e com o
 * AudioManager (detune/variação de pitch para não ficar repetitivo).
 *
 * Uso: npm run gen:audio  -> assets/audio/*.wav
 * ---------------------------------------------------------------------------
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeWAV } from './pixlib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'audio');
const SR = 22050;

/* ---------- primitivas de síntese ---------- */
function makeBuffer(seconds) {
    return new Float32Array(Math.floor(seconds * SR)).fill(0);
}
function env(buf, start, dur, attack = 0.005, release = 0.02) {
    // devolve função de ganho 0..1 para um sample index
    const s0 = start * SR;
    const n = dur * SR;
    return (i) => {
        const t = (i - s0) / n;
        if (t < 0 || t > 1) return 0;
        const a = Math.min(1, (t * dur) / attack);
        const r = Math.min(1, (1 - t) / release);
        return Math.max(0, Math.min(a, r));
    };
}
function osc(type) {
    return (ph) => {
        switch (type) {
            case 'square':
                return ph % 1 < 0.5 ? 1 : -1;
            case 'saw':
                return 2 * (ph % 1) - 1;
            case 'tri':
                return 4 * Math.abs((ph % 1) - 0.5) - 1;
            case 'noise':
                return Math.random() * 2 - 1;
            default:
                return Math.sin(2 * Math.PI * (ph % 1));
        }
    };
}
/** Toca uma nota: buf, t, dur, freq, tipo, vol, slide (Hz/fim opcional). */
function tone(buf, t, dur, freq, { type = 'square', vol = 0.5, slide = null, detune = 0 } = {}) {
    const shape = osc(type);
    const e = env(buf, t, dur);
    const start = Math.floor(t * SR);
    const n = Math.floor(dur * SR);
    let ph = 0;
    for (let i = 0; i < n && start + i < buf.length; i++) {
        const p = i / n;
        const f = slide ? freq + (slide - freq) * p : freq;
        ph += f * (1 + detune) / SR;
        buf[start + i] += shape(ph) * vol * e(start + i);
    }
}
function noiseHit(buf, t, dur, vol = 0.4, lowpass = 1) {
    const start = Math.floor(t * SR);
    const n = Math.floor(dur * SR);
    let last = 0;
    for (let i = 0; i < n && start + i < buf.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + lowpass * (white - last)) / (lowpass + 1e-3); // low-pass simples
        const p = i / n;
        buf[start + i] += white * (1 - p) * vol * (1 - p) + last * p * vol;
    }
}

const SFX = {
    // mordida rápida
    bite: () => {
        const b = makeBuffer(0.12);
        noiseHit(b, 0, 0.06, 0.5, 2);
        tone(b, 0, 0.08, 320, { type: 'square', vol: 0.4, slide: 120 });
        return b;
    },
    acid: () => {
        const b = makeBuffer(0.2);
        tone(b, 0, 0.16, 900, { type: 'saw', vol: 0.35, slide: 300 });
        noiseHit(b, 0.02, 0.1, 0.25, 3);
        return b;
    },
    dig: () => {
        const b = makeBuffer(0.16);
        noiseHit(b, 0, 0.1, 0.5, 1.2);
        tone(b, 0.02, 0.1, 140, { type: 'square', vol: 0.35, slide: 70 });
        return b;
    },
    build: () => {
        const b = makeBuffer(0.25);
        tone(b, 0, 0.09, 200, { type: 'square', vol: 0.4 });
        tone(b, 0.1, 0.12, 300, { type: 'square', vol: 0.4 });
        return b;
    },
    spawn: () => {
        const b = makeBuffer(0.2);
        tone(b, 0, 0.16, 220, { type: 'tri', vol: 0.5, slide: 660 });
        return b;
    },
    hurt: () => {
        const b = makeBuffer(0.15);
        tone(b, 0, 0.12, 180, { type: 'saw', vol: 0.45, slide: 90 });
        return b;
    },
    death: () => {
        const b = makeBuffer(0.3);
        tone(b, 0, 0.25, 220, { type: 'saw', vol: 0.4, slide: 60 });
        noiseHit(b, 0.05, 0.15, 0.3, 1);
        return b;
    },
    pheromone: () => {
        const b = makeBuffer(0.2);
        tone(b, 0, 0.18, 660, { type: 'tri', vol: 0.4, slide: 990 });
        return b;
    },
    card: () => {
        const b = makeBuffer(0.35);
        tone(b, 0, 0.1, 520, { type: 'square', vol: 0.4 });
        tone(b, 0.1, 0.1, 660, { type: 'square', vol: 0.4 });
        tone(b, 0.2, 0.12, 880, { type: 'square', vol: 0.4 });
        return b;
    },
    jelly: () => {
        const b = makeBuffer(0.3);
        tone(b, 0, 0.09, 880, { type: 'tri', vol: 0.5 });
        tone(b, 0.09, 0.09, 1175, { type: 'tri', vol: 0.5 });
        tone(b, 0.18, 0.12, 1568, { type: 'tri', vol: 0.5 });
        return b;
    },
    boss: () => {
        const b = makeBuffer(0.6);
        tone(b, 0, 0.5, 90, { type: 'saw', vol: 0.5, slide: 45 });
        noiseHit(b, 0.05, 0.4, 0.3, 0.6);
        tone(b, 0.2, 0.35, 70, { type: 'square', vol: 0.4, slide: 40 });
        return b;
    },
    gameover: () => {
        const b = makeBuffer(1.2);
        const seq = [392, 370, 330, 262];
        seq.forEach((f, i) => tone(b, i * 0.28, 0.26, f, { type: 'tri', vol: 0.5 }));
        tone(b, 1.0, 0.18, 196, { type: 'saw', vol: 0.4 });
        return b;
    },
    win: () => {
        const b = makeBuffer(0.8);
        [523, 659, 784, 1046].forEach((f, i) => tone(b, i * 0.12, 0.14, f, { type: 'square', vol: 0.45 }));
        return b;
    },
    click: () => {
        const b = makeBuffer(0.08);
        tone(b, 0, 0.06, 700, { type: 'square', vol: 0.35 });
        return b;
    }
};

/* ---------- BGM (sequenciador simples) ---------- */
const NOTE = {
    C2: 65.4, D2: 73.4, E2: 82.4, F2: 87.3, G2: 98, A2: 110, B2: 123.5,
    C3: 130.8, D3: 146.8, E3: 164.8, G3: 196, A3: 220,
    C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, C5: 523.3
};
function makeBGM({ bpm = 96, bars = 8, bass = [], lead = [], drums = true, mood = 'dark' }) {
    const beat = 60 / bpm;
    const total = bars * 4 * beat;
    const buf = makeBuffer(total + 0.2);
    const t0 = 0.05;
    // baixo
    for (let i = 0; i < bass.length; i++) {
        const n = bass[i];
        if (!n) continue;
        const t = t0 + (i / bass.length) * total;
        tone(buf, t, beat * (total / bass.length / beat) * 0.9, NOTE[n], { type: 'square', vol: 0.32 });
    }
    // lead
    for (let i = 0; i < lead.length; i++) {
        const n = lead[i];
        if (!n) continue;
        const t = t0 + (i / lead.length) * total;
        tone(buf, t, (total / lead.length) * 0.85, NOTE[n], { type: mood === 'dark' ? 'saw' : 'tri', vol: 0.18 });
    }
    // percussão (kick + hat de ruído)
    if (drums) {
        for (let bIdx = 0; bIdx < bars * 4; bIdx++) {
            const t = t0 + bIdx * beat;
            tone(buf, t, 0.12, 100, { type: 'square', vol: 0.4, slide: 40 });
            noiseHit(buf, t + beat / 2, 0.05, 0.12, 4);
        }
    }
    return buf;
}

console.log('[gen:audio] sintetizando...');
for (const [name, fn] of Object.entries(SFX)) {
    writeWAV(path.join(OUT, `sfx_${name}.wav`), fn());
}

writeWAV(
    path.join(OUT, 'bgm_underground.wav'),
    makeBGM({
        bpm: 88,
        bars: 8,
        bass: ['C2', null, 'C2', null, 'A2', null, 'A2', 'G2', 'F2', null, 'F2', null, 'G2', null, 'G2', 'B2'],
        lead: [null, 'C4', null, 'E4', null, 'D4', null, null, null, 'A3', null, 'C4', null, 'G3', null, null],
        mood: 'dark'
    })
);
writeWAV(
    path.join(OUT, 'bgm_surface.wav'),
    makeBGM({
        bpm: 108,
        bars: 8,
        bass: ['C3', null, 'G2', null, 'A2', null, 'F2', null, 'C3', null, 'G2', null, 'E2', null, 'G2', 'A2'],
        lead: ['C4', null, 'E4', 'G4', null, 'A4', null, 'G4', 'E4', null, 'D4', 'E4', null, 'C4', null, null],
        mood: 'bright'
    })
);
writeWAV(
    path.join(OUT, 'bgm_boss.wav'),
    makeBGM({
        bpm: 132,
        bars: 8,
        bass: ['A2', 'A2', null, 'A2', 'G2', null, 'F2', 'F2', 'A2', 'A2', null, 'A2', 'B2', null, 'C3', null],
        lead: [null, 'A4', null, 'C5', null, 'A4', 'G4', null, null, 'F4', null, 'A4', null, 'E4', null, null],
        mood: 'dark'
    })
);
console.log('[gen:audio] OK — assets/audio/');
