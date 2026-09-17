// ============================================================================
// FUMIGA-GOAT — áudio procedural (WebAudio). Sem arquivos externos.
// ============================================================================
import { G } from "./state.js";
import { rand } from "./utils.js";

let ctx = null, master = null, sfxBus = null, musBus = null;
let noiseBuf = null;
let musicTimer = null, musicStep = 0;
let combatHeat = 0; // 0..1 — intensidade rítmica durante batalhas

export function audioReady() { return !!ctx; }

export function initAudio() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.gain.value = 0.34; musBus.connect(master);

  // buffer de ruído branco reutilizável
  const len = ctx.sampleRate * 1.2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  startMusic();
}

export function setCombat(h) { combatHeat = h; }

function now() { return ctx ? ctx.currentTime : 0; }
function ok() { return ctx && !G.muted; }

// ------------------------------------------------------------------- SFX ----
function env(g, t, a, peak, dec, sus = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
}

function tone({ type = "square", f0 = 440, f1 = null, dur = 0.12, vol = 0.2, a = 0.005, when = 0, dest = null }) {
  if (!ok()) return;
  const t = now() + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, a, vol, dur);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t); o.stop(t + dur + 0.1);
}

function noise({ dur = 0.15, vol = 0.2, lp = 3000, hp = 0, a = 0.004, when = 0 }) {
  if (!ok()) return;
  const t = now() + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const g = ctx.createGain();
  let node = s;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; node.connect(f); node = f; }
  if (hp) { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; node.connect(f); node = f; }
  env(g, t, a, vol, dur);
  node.connect(g); g.connect(sfxBus);
  s.start(t); s.stop(t + dur + 0.1);
}

// limitador: evita rajadas de dezenas de osciladores simultâneos
const GATE = {};
function gate(name, minMs) {
  const t = performance.now();
  if (GATE[name] && t - GATE[name] < minMs) return false;
  GATE[name] = t;
  return true;
}

export const SFX = {
  uiMove:  () => tone({ type: "square", f0: 620, f1: 700, dur: 0.05, vol: 0.06 }),
  uiClick: () => { tone({ type: "square", f0: 740, f1: 520, dur: 0.07, vol: 0.1 }); },
  select:  () => tone({ type: "square", f0: 480, f1: 860, dur: 0.06, vol: 0.07 }),
  command: () => { tone({ type: "square", f0: 340, f1: 300, dur: 0.06, vol: 0.08 }); noise({ dur: 0.08, vol: 0.04, lp: 2000 }); },
  deny:    () => tone({ type: "sawtooth", f0: 160, f1: 90, dur: 0.18, vol: 0.12 }),
  buy:     () => { tone({ type: "square", f0: 520, f1: 780, dur: 0.08, vol: 0.12 }); tone({ type: "square", f0: 1040, dur: 0.1, vol: 0.09, when: 0.07 }); },
  hatch:   () => { tone({ type: "sine", f0: 300, f1: 620, dur: 0.14, vol: 0.14 }); noise({ dur: 0.1, vol: 0.05, lp: 2600, when: 0.05 }); },
  pickup:  () => tone({ type: "square", f0: 900, f1: 1300, dur: 0.06, vol: 0.07 }),
  coin:    () => { tone({ type: "square", f0: 1180, dur: 0.05, vol: 0.06 }); tone({ type: "square", f0: 1560, dur: 0.07, vol: 0.05, when: 0.05 }); },
  chomp:   () => { if (!gate("chomp", 90)) return; noise({ dur: 0.07, vol: 0.06, lp: 1400 }); },
  bite:    () => { if (!gate("bite", 75)) return; noise({ dur: 0.08, vol: 0.12, lp: 2200 }); tone({ type: "sine", f0: 190, f1: 110, dur: 0.08, vol: 0.1 }); },
  spit:    () => { if (!gate("spit", 90)) return; tone({ type: "sawtooth", f0: 700, f1: 240, dur: 0.12, vol: 0.05 }); noise({ dur: 0.1, vol: 0.05, hp: 1200, lp: 6000 }); },
  hurt:    () => { if (!gate("hurt", 120)) return; tone({ type: "sawtooth", f0: 300, f1: 170, dur: 0.1, vol: 0.08 }); },
  splat:   () => { if (!gate("splat", 70)) return; noise({ dur: 0.16, vol: 0.13, lp: 900 }); tone({ type: "sine", f0: 150, f1: 60, dur: 0.15, vol: 0.1 }); },
  egg:     () => tone({ type: "sine", f0: 240, f1: 400, dur: 0.12, vol: 0.1 }),
  horn:    () => { tone({ type: "sawtooth", f0: 98, f1: 147, dur: 0.8, vol: 0.16, a: 0.25 }); tone({ type: "sawtooth", f0: 147, dur: 0.9, vol: 0.1, when: 0.35, a: 0.2 }); },
  waveDone:() => { tone({ type: "square", f0: 660, dur: 0.09, vol: 0.1 }); tone({ type: "square", f0: 880, dur: 0.14, vol: 0.1, when: 0.1 }); },
  chime:   () => { [0, 1, 2].forEach(i => tone({ type: "sine", f0: [523, 659, 784][i], dur: 0.35, vol: 0.08, when: i * 0.09 })); },
  queenHit:() => { tone({ type: "sawtooth", f0: 130, f1: 70, dur: 0.3, vol: 0.18 }); noise({ dur: 0.2, vol: 0.12, lp: 700 }); },
  heart:   () => { tone({ type: "sine", f0: 55, f1: 40, dur: 0.13, vol: 0.22 }); tone({ type: "sine", f0: 52, f1: 38, dur: 0.12, vol: 0.18, when: 0.18 }); },
  roar:    () => { tone({ type: "sawtooth", f0: 70, f1: 45, dur: 0.9, vol: 0.22, a: 0.08 }); noise({ dur: 0.9, vol: 0.16, lp: 500, a: 0.06 }); },
  slam:    () => { noise({ dur: 0.4, vol: 0.3, lp: 400 }); tone({ type: "sine", f0: 90, f1: 35, dur: 0.4, vol: 0.25 }); },
  boom:    () => { if (!gate("boom", 90)) return; noise({ dur: 0.32, vol: 0.3, lp: 900 }); tone({ type: "sine", f0: 130, f1: 40, dur: 0.32, vol: 0.3 }); },
  healCast:() => { if (!gate("heal", 260)) return; tone({ type: "sine", f0: 660, f1: 990, dur: 0.12, vol: 0.05 }); },
  whoosh:  () => noise({ dur: 0.25, vol: 0.1, hp: 400, lp: 3000 }),
  win:     () => { [523, 659, 784, 1046].forEach((f, i) => tone({ type: "square", f0: f, dur: 0.22, vol: 0.11, when: i * 0.14 })); },
  lose:    () => { [392, 311, 233, 155].forEach((f, i) => tone({ type: "sawtooth", f0: f, dur: 0.4, vol: 0.12, when: i * 0.22 })); },
  rebirth: () => { [220, 440, 660, 880].forEach((f, i) => tone({ type: "sine", f0: f, dur: 0.5, vol: 0.1, when: i * 0.1 })); },
  stinger: () => { tone({ type: "sawtooth", f0: 196, f1: 98, dur: 0.5, vol: 0.12 }); noise({ dur: 0.4, vol: 0.1, lp: 900 }); },
};

// ------------------------------------------------------------------ música ---
// progressão menor ambiente: Am – F – C – E(menor sombrio)
const CHORDS = [
  [110.0, 130.81, 164.81],   // A2 C3 E3
  [87.31, 110.0, 130.81],    // F2 A2 C3
  [98.0, 123.47, 146.83],    // G2 B2 D3
  [110.0, 130.81, 164.81],   // A2 C3 E3
];
const CHORD_LEN = 6.0;

function startMusic() {
  if (musicTimer) return;
  musicTimer = setInterval(() => {
    if (!ok()) return;
    const t = now() + 0.05;
    const chord = CHORDS[musicStep % CHORDS.length];
    musicStep++;

    // pad: 3 osciladores levemente desafinados
    chord.forEach((f, i) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o1.type = "sawtooth"; o2.type = "sawtooth";
      o1.frequency.value = f; o2.frequency.value = f * 1.007;
      fl.type = "lowpass"; fl.frequency.setValueAtTime(320 + i * 60, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.028, t + 1.8);
      g.gain.setValueAtTime(0.028, t + CHORD_LEN - 1.6);
      g.gain.linearRampToValueAtTime(0.0001, t + CHORD_LEN);
      o1.connect(fl); o2.connect(fl); fl.connect(g); g.connect(musBus);
      o1.start(t); o2.start(t); o1.stop(t + CHORD_LEN); o2.stop(t + CHORD_LEN);
    });

    // sub grave pulsante
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = "sine"; sub.frequency.value = chord[0] / 2;
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.05, t + 0.4);
    sg.gain.setValueAtTime(0.05, t + CHORD_LEN - 0.5);
    sg.gain.linearRampToValueAtTime(0.0001, t + CHORD_LEN);
    sub.connect(sg); sg.connect(musBus);
    sub.start(t); sub.stop(t + CHORD_LEN);

    // percussão (quando em combate)
    for (let b = 0; b < CHORD_LEN * 2; b++) {
      const tb = t + b * 0.5;
      // tique grave
      const kick = ctx.createOscillator(), kg = ctx.createGain();
      kick.type = "sine";
      kick.frequency.setValueAtTime(120, tb);
      kick.frequency.exponentialRampToValueAtTime(40, tb + 0.12);
      kg.gain.setValueAtTime(0.0001, tb);
      kg.gain.linearRampToValueAtTime(0.05 + 0.05 * combatHeat, tb + 0.01);
      kg.gain.exponentialRampToValueAtTime(0.0001, tb + 0.16);
      kick.connect(kg); kg.connect(musBus);
      kick.start(tb); kick.stop(tb + 0.2);
      if (combatHeat > 0.3 && b % 2 === 1) {
        // "chimbal" de ruído
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const hf = ctx.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 5000;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, tb);
        ng.gain.linearRampToValueAtTime(0.028 * combatHeat, tb + 0.01);
        ng.gain.exponentialRampToValueAtTime(0.0001, tb + 0.07);
        s.connect(hf); hf.connect(ng); ng.connect(musBus);
        s.start(tb); s.stop(tb + 0.1);
      }
    }
  }, CHORD_LEN * 1000 - 60);
}
