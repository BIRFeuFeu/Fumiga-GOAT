// ============================================================================
// LORE VFX — Habilidades 11 Castas com Aura + Partícula + Som + Ícone Lore
// FASE 2: Médio — equilíbrio performance/impacto, não-humanóide, orgânico
// Cada casta tem: aura (cor), partícula, som ambiente e ícone lore.
// Inspirações: Hollow Knight (soul/essência por zona), Dead Cells (peso curto),
// Nuclear Throne ("toda ação tem um cue") [2](https://www.reddit.com/r/gamedesign/comments/198fctp/good_examples_of_game_juice_game_feel/)
// Performance: orçamento de 30 partículas VFX por frame + gates de áudio.
// ============================================================================
import { spawnPart, burst, ring } from "./particles.js";
import { SFX } from "./audio.js";
import { G } from "./state.js";

// ---------------------------------------------------------------- orçamento -
// Teto de partículas VFX por frame (o checklist da Fase 2 exige ≤30/frame).
// Quando estoura, o VFX vira só anel (barato) — o jogo nunca engasga no meio
// de uma batalha com 20 formigas atacando juntas.
const VFX_FRAME_BUDGET = 30;
let vfxFrame = -1, vfxUsed = 0;
function vfxFrameId() {
  // G.time avança em segundos; 60 quadros por segundo.
  return Math.floor((G.time || 0) * 60);
}
function vfxAllow(n) {
  const f = vfxFrameId();
  if (f !== vfxFrame) { vfxFrame = f; vfxUsed = 0; }
  if (vfxUsed + n > VFX_FRAME_BUDGET) return false;
  vfxUsed += n;
  return true;
}
function reducedFX() {
  return !!G.save?.accessibility?.reducedParticles || G.save?.settings?.particles === false;
}

export const ANT_VFX = {
  worker: {
    name: "CORTADEIRA",
    lore: "A agricultora que cultiva o Jardim Eterno. Folhas viram fungo.",
    aura: "#7fd6a0",
    particle: "#bfffa8",
    icon: "🍃",
    onGather: (a) => {
      SFX.spore();
      if (!vfxAllow(4)) { ring(a.x, a.y, { r0: 4, r1: 14, life: 0.3, color: "#7fd6a0", width: 1 }); return; }
      burst(a.x, a.y - 4, { n: 4, color: ["#7fd6a0", "#bfffa8"], spMin: 10, spMax: 40, life: 0.5, sizeMin: 1, sizeMax: 2, glow: true });
      ring(a.x, a.y, { r0: 4, r1: 14, life: 0.3, color: "#7fd6a0", width: 1 });
    },
    onCarry: (a) => {
      if (!vfxAllow(1)) return;
      spawnPart({ x: a.x, y: a.y - 6, vx: 0, vy: -18, life: 0.6, size: 2, color: "#7fd6a0", glow: true });
    },
  },
  gatherer: {
    name: "POTE-DE-MEL",
    lore: "A despensa viva. Gaster brilha quando cheio de néctar âmbar.",
    aura: "#ffd479",
    particle: "#ffb347",
    icon: "🍯",
    onGather: (a) => {
      SFX.honey();
      if (!vfxAllow(5)) { ring(a.x, a.y, { r0: 3, r1: 12, life: 0.35, color: "#ffd479", width: 1.5 }); return; }
      burst(a.x, a.y, { n: 5, color: ["#ffd479", "#ffb347", "#fff"], spMin: 12, spMax: 45, life: 0.6, glow: true });
      ring(a.x, a.y, { r0: 3, r1: 12, life: 0.35, color: "#ffd479", width: 1.5 });
    },
    onCarry: (a) => {
      if (!vfxAllow(1)) return;
      // gota de mel escorrendo do gaster cheio
      spawnPart({ x: a.x, y: a.y - 4, vx: 0, vy: 14, life: 0.5, size: 1.8, color: "#ffb347", glow: true });
    },
  },
  scout: {
    name: "PRATA",
    lore: "A veloz que vê longe. Antenas captam feromônio a 300 passos.",
    aura: "#6db7ff",
    particle: "#8fd3ff",
    icon: "👁️",
    onScout: (a) => {
      SFX.pheromone();
      if (!vfxAllow(3)) { ring(a.x, a.y, { r0: 8, r1: 28, life: 0.4, color: "#6db7ff", width: 1 }); return; }
      ring(a.x, a.y, { r0: 8, r1: 28, life: 0.4, color: "#6db7ff", width: 1 });
      for (let i = 0; i < 3; i++) spawnPart({ x: a.x, y: a.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.5, size: 1.5, color: "#8fd3ff", glow: true });
    },
  },
  soldier: {
    name: "BALA",
    lore: "A atiradora que não erra. Poneratoxina deixa o inimigo lento.",
    aura: "#ff4d5a",
    particle: "#ff8a94",
    icon: "⚔️",
    onAttack: (a, target) => {
      // som base já é o bite() em units.js — aqui só o clarão roxo da ferroada
      if (!vfxAllow(6)) { ring(target.x, target.y, { r0: 2, r1: 10, life: 0.2, color: "#ff4d5a", width: 2 }); return; }
      burst(a.x, a.y, { n: 6, color: ["#ff4d5a", "#ff8a94", "#c77dff"], spMin: 20, spMax: 70, life: 0.35, sizeMin: 1, sizeMax: 2.5 });
      ring(target.x, target.y, { r0: 2, r1: 10, life: 0.2, color: "#ff4d5a", width: 2 });
    },
  },
  trapjaw: {
    name: "ARPÃO",
    lore: "A estrondosa. Queixo-de-arpão fecha a 200km/h. Estalo que abre terra.",
    aura: "#ff9a5c",
    particle: "#ffb347",
    icon: "💥",
    onAttack: (a, target) => {
      SFX.silk(); // estalo seco da mandíbula
      if (!vfxAllow(10)) { ring(a.x, a.y, { r0: 6, r1: 22, life: 0.3, color: "#ff9a5c", width: 2 }); return; }
      burst(a.x, a.y, { n: 10, color: ["#ff9a5c", "#ffd479", "#fff"], spMin: 30, spMax: 90, life: 0.45, glow: true });
      ring(a.x, a.y, { r0: 6, r1: 22, life: 0.3, color: "#ff9a5c", width: 2 });
      ring(target.x, target.y, { r0: 4, r1: 16, life: 0.25, color: "#ff4d5a", width: 2 });
    },
  },
  spitter: {
    name: "ACROBATA",
    lore: "A bailarina que cospe veneno corrosivo girando. Dança da morte.",
    aura: "#c77dff",
    particle: "#e8a8ff",
    icon: "🕸️",
    onAttack: (a, target) => {
      SFX.spore(); // borrifo corrosivo
      if (!vfxAllow(9)) return;
      burst(a.x, a.y, { n: 5, color: ["#c77dff", "#e8a8ff"], spMin: 15, spMax: 60, life: 0.5, glow: true });
      // trilha de veneno até o alvo
      for (let i = 0; i < 4; i++) spawnPart({ x: a.x + (target.x - a.x) * i / 4, y: a.y + (target.y - a.y) * i / 4, vx: 0, vy: -10, life: 0.6, size: 1.8, color: "#c77dff", glow: true });
    },
  },
  bomber: {
    name: "FOGO",
    lore: "A incendiária. Glândula de ácido fórmico que explode em brasa.",
    aura: "#ff7a3d",
    particle: "#ffb347",
    icon: "🔥",
    onAttack: (a, target) => {
      // whoosh já toca no disparo; a explosão toca boom() em combat.js
      if (!vfxAllow(8)) { ring(target.x, target.y, { r0: 8, r1: 24, life: 0.35, color: "#ff7a3d", width: 2 }); return; }
      burst(a.x, a.y, { n: 8, color: ["#ff7a3d", "#ffb347", "#ff4d5a"], spMin: 25, spMax: 80, life: 0.5, glow: true });
      ring(target.x, target.y, { r0: 8, r1: 24, life: 0.35, color: "#ff7a3d", width: 2 });
    },
  },
  tank: {
    name: "CEFALOTE",
    lore: "A porta-viva. Cabeça em forma de rolha bloqueia túneis. Guarda.",
    aura: "#8f6fd6",
    particle: "#9a8fc0",
    icon: "🛡️",
    onGuard: (a) => {
      SFX.pheromone();
      if (!vfxAllow(4)) { ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR + 14, life: 0.6, color: "#8f6fd6", width: 2 }); return; }
      ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR + 14, life: 0.6, color: "#8f6fd6", width: 2 });
      burst(a.x, a.y, { n: 4, color: ["#8f6fd6", "#9a8fc0"], spMin: 8, spMax: 25, life: 0.5, glow: true });
    },
    onAttack: (a, target) => {
      if (!vfxAllow(4)) return;
      burst(a.x, a.y, { n: 4, color: ["#8f6fd6", "#9a8fc0"], spMin: 15, spMax: 55, life: 0.35, glow: true });
      ring(target.x, target.y, { r0: 2, r1: 10, life: 0.2, color: "#8f6fd6", width: 2 });
    },
  },
  healer: {
    name: "MATABELE",
    lore: "A resgatadora que lambe feridas. Saliva com antibiótico cura irmãs.",
    aura: "#7fd6a0",
    particle: "#bfffa8",
    icon: "💚",
    onHeal: (a, target) => {
      SFX.healCast();
      if (!vfxAllow(9)) { ring(target.x, target.y, { r0: 4, r1: 14, life: 0.5, color: "#7fd6a0", width: 1.5 }); return; }
      burst(target.x, target.y, { n: 6, color: ["#7fd6a0", "#bfffa8", "#fff"], spMin: 10, spMax: 40, life: 0.7, glow: true });
      ring(target.x, target.y, { r0: 4, r1: 14, life: 0.5, color: "#7fd6a0", width: 1.5 });
      for (let i = 0; i < 3; i++) spawnPart({ x: target.x + (Math.random() - 0.5) * 20, y: target.y - 10, vx: 0, vy: -22, life: 0.8, size: 2, color: "#7fd6a0", glow: true });
    },
  },
  weaver: {
    name: "TECELÃ",
    lore: "A costureira que tece seda entre folhas. Túneis de seda aceleram colônia.",
    aura: "#ffd479",
    particle: "#ffe9a8",
    icon: "🧵",
    onGather: (a) => {
      SFX.silk();
      if (!vfxAllow(4)) return;
      burst(a.x, a.y - 4, { n: 4, color: ["#ffe9a8", "#ffd479", "#7fd6a0"], spMin: 10, spMax: 40, life: 0.6, glow: true });
      ring(a.x, a.y, { r0: 3, r1: 12, life: 0.35, color: "#ffe9a8", width: 1 });
    },
    onWeave: (a) => {
      SFX.silk();
      if (!vfxAllow(5)) { ring(a.x, a.y, { r0: 6, r1: 20, life: 0.5, color: "#ffd479", width: 1 }); return; }
      ring(a.x, a.y, { r0: 6, r1: 20, life: 0.5, color: "#ffd479", width: 1 });
      for (let i = 0; i < 5; i++) spawnPart({ x: a.x + (Math.random() - 0.5) * 30, y: a.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 20, vy: -12, life: 0.9, size: 1.5, color: "#ffe9a8", glow: true });
    },
    onCarry: (a) => {
      if (!vfxAllow(1)) return;
      spawnPart({ x: a.x, y: a.y - 6, vx: 0, vy: -14, life: 0.6, size: 1.5, color: "#ffe9a8", glow: true });
    },
  },
  giant: {
    name: "DINOPONERA",
    lore: "A colossa sem rainha. Cada operária pode virar rainha. Gigante.",
    aura: "#ffd479",
    particle: "#ff9a5c",
    icon: "👑",
    onAttack: (a, target) => {
      SFX.slam();
      if (!vfxAllow(14)) { ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR + 24, life: 0.45, color: "#ffd479", width: 3 }); return; }
      burst(a.x, a.y, { n: 14, color: ["#ffd479", "#ff9a5c", "#fff"], spMin: 30, spMax: 110, life: 0.6, glow: true });
      ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR + 24, life: 0.45, color: "#ffd479", width: 3 });
      ring(target.x, target.y, { r0: 6, r1: 20, life: 0.35, color: "#ff4d5a", width: 2 });
    },
  },
};

export function triggerAntVFX(type, event, ant, target = null) {
  const vfx = ANT_VFX[type];
  if (!vfx || !ant) return;
  switch (event) {
    case "gather": vfx.onGather && vfx.onGather(ant); break;
    case "carry": vfx.onCarry && vfx.onCarry(ant); break;
    case "scout": vfx.onScout && vfx.onScout(ant); break;
    case "attack": vfx.onAttack && target && vfx.onAttack(ant, target); break;
    case "guard": vfx.onGuard && vfx.onGuard(ant); break;
    case "heal": vfx.onHeal && target && vfx.onHeal(ant, target); break;
    case "weave": vfx.onWeave && vfx.onWeave(ant); break;
    default: break;
  }
}

// Aura persistente da casta — 1 elipse barata por formiga, sem gradiente.
// Desenhada em render.js por baixo do sprite (a cor diz a casta de longe).
export function drawAllyAura(ctx, dx, dy, z, type, bodyR, time) {
  const vfx = ANT_VFX[type];
  if (!vfx) return;
  const breathe = reducedFX() ? 0 : Math.sin(time * 2.2 + dx * 0.05) * 0.04;
  ctx.save();
  ctx.globalAlpha = (reducedFX() ? 0.10 : 0.16) + breathe;
  ctx.fillStyle = vfx.aura;
  ctx.beginPath();
  ctx.ellipse(dx, dy + 3 * z, (bodyR + 4) * z, (bodyR + 4) * 0.55 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Cristal de memória geométrico — hexágono com luz interna.
// Âmbar #ffd479 = memória da Colônia · violeta #c77dff = Névoa.
export function drawHexCrystal(ctx, x, y, size, color, time) {
  const r = size / 2;
  const pulse = reducedFX() ? 0 : Math.sin(time * 3) * 0.08;
  ctx.save();
  // halo
  ctx.globalAlpha = 0.22 + pulse;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill();
  // corpo hexagonal
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 - Math.PI / 2;
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#1a1427"; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  // luz interna
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - 1), Math.round(y - r * 0.55), 2, Math.round(r * 1.1));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#fff";
  ctx.fillRect(Math.round(x - 1), Math.round(y - 2), 2, 2);
  ctx.restore();
  // partículas de memória subindo
  if (reducedFX()) return;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 2; i++) {
    const rise = (time * 8 + i * 7) % 12;
    ctx.globalAlpha = 0.8 * (1 - rise / 12);
    ctx.fillRect(Math.round(x - 3 + i * 6), Math.round(y - size / 2 - rise), 1, 2);
  }
  ctx.restore();
}

// VFX cristal memória geométrico no mundo — hexágonos reais que sobem.
export function spawnMemoryCrystal(x, y, isViolet = false) {
  const color = isViolet ? "#c77dff" : "#ffd479";
  SFX.crystal();
  if (!vfxAllow(12)) { ring(x, y, { r0: 4, r1: 18, life: 0.6, color, width: 2 }); return; }
  burst(x, y, { n: 8, color: [color, "#fff", "#e8f4ff"], spMin: 15, spMax: 70, life: 0.8, glow: true, sizeMin: 1.5, sizeMax: 3, shape: "hex" });
  ring(x, y, { r0: 4, r1: 18, life: 0.6, color, width: 2 });
  for (let i = 0; i < 4; i++) {
    spawnPart({ x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.2, size: 3, sizeEnd: 1, color, glow: true, shape: "hex" });
  }
}
