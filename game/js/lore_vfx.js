// ============================================================================
// LORE VFX — Habilidades 11 Castas com Aura + Partícula + Som + Ícone Lore
// Médio: equilíbrio performance/impacto, não-humanóide, orgânico
// ============================================================================
import { spawnPart, burst, ring } from "./particles.js";
import { BIOME_HUD } from "./lore_hud.js";

export const ANT_VFX = {
  worker: {
    name: "CORTADEIRA",
    lore: "A agricultora que cultiva o Jardim Eterno. Folhas viram fungo.",
    aura: "#7fd6a0",
    particle: "#bfffa8",
    icon: "🍃",
    onGather: (a) => {
      burst(a.x, a.y - 4, { n: 4, color: ["#7fd6a0", "#bfffa8"], spMin: 10, spMax: 40, life: 0.5, sizeMin: 1, sizeMax: 2, glow: true });
      ring(a.x, a.y, { r0: 4, r1: 14, life: 0.3, color: "#7fd6a0", width: 1 });
    },
    onCarry: (a) => {
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
      burst(a.x, a.y, { n: 5, color: ["#ffd479", "#ffb347", "#fff"], spMin: 12, spMax: 45, life: 0.6, glow: true });
      ring(a.x, a.y, { r0: 3, r1: 12, life: 0.35, color: "#ffd479", width: 1.5 });
    },
  },
  scout: {
    name: "PRATA",
    lore: "A veloz que vê longe. Antenas captam feromônio a 300 passos.",
    aura: "#6db7ff",
    particle: "#8fd3ff",
    icon: "👁️",
    onScout: (a) => {
      ring(a.x, a.y, { r0: 8, r1: 28, life: 0.4, color: "#6db7ff", width: 1 });
      for (let i=0;i<3;i++) spawnPart({ x: a.x, y: a.y, vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30, life: 0.5, size: 1.5, color: "#8fd3ff", glow: true });
    },
  },
  soldier: {
    name: "BALA",
    lore: "A atiradora que não erra. Mandíbula estala como tiro.",
    aura: "#ff4d5a",
    particle: "#ff8a94",
    icon: "⚔️",
    onAttack: (a, target) => {
      burst(a.x, a.y, { n: 6, color: ["#ff4d5a", "#ff8a94"], spMin: 20, spMax: 70, life: 0.35, sizeMin: 1, sizeMax: 2.5 });
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
      burst(a.x, a.y, { n: 10, color: ["#ff9a5c", "#ffd479", "#fff"], spMin: 30, spMax: 90, life: 0.45, glow: true });
      ring(a.x, a.y, { r0: 6, r1: 22, life: 0.3, color: "#ff9a5c", width: 2 });
      ring(target.x, target.y, { r0: 4, r1: 16, life: 0.25, color: "#ff4d5a", width: 2 });
    },
  },
  spitter: {
    name: "ACROBATA",
    lore: "A bailarina que cospe seda ácida girando. Dança da morte.",
    aura: "#c77dff",
    particle: "#e8a8ff",
    icon: "🕸️",
    onAttack: (a, target) => {
      burst(a.x, a.y, { n: 5, color: ["#c77dff", "#e8a8ff"], spMin: 15, spMax: 60, life: 0.5, glow: true });
      // trilha seda
      for (let i=0;i<4;i++) spawnPart({ x: a.x + (target.x-a.x)*i/4, y: a.y + (target.y-a.y)*i/4, vx: 0, vy: -10, life: 0.6, size: 1.8, color: "#c77dff", glow: true });
    },
  },
  bomber: {
    name: "FOGO",
    lore: "A incendiária. Glândula de ácido fórmico que explode em brasa.",
    aura: "#ff7a3d",
    particle: "#ffb347",
    icon: "🔥",
    onAttack: (a, target) => {
      burst(a.x, a.y, { n: 8, color: ["#ff7a3d", "#ffb347", "#ff4d5a"], spMin: 25, spMax: 80, life: 0.5, glow: true });
      burst(target.x, target.y, { n: 12, color: ["#ff7a3d", "#ff4d5a", "#ffd479"], spMin: 20, spMax: 90, life: 0.6, glow: true });
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
      ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR+14, life: 0.6, color: "#8f6fd6", width: 2 });
      burst(a.x, a.y, { n: 4, color: ["#8f6fd6", "#9a8fc0"], spMin: 8, spMax: 25, life: 0.5, glow: true });
    },
  },
  healer: {
    name: "MATABELE",
    lore: "A resgatadora que lambe feridas. Saliva com antibiótico cura irmãs.",
    aura: "#7fd6a0",
    particle: "#bfffa8",
    icon: "💚",
    onHeal: (a, target) => {
      burst(target.x, target.y, { n: 6, color: ["#7fd6a0", "#bfffa8", "#fff"], spMin: 10, spMax: 40, life: 0.7, glow: true });
      ring(target.x, target.y, { r0: 4, r1: 14, life: 0.5, color: "#7fd6a0", width: 1.5 });
      for (let i=0;i<3;i++) spawnPart({ x: target.x + (Math.random()-0.5)*20, y: target.y - 10, vx: 0, vy: -22, life: 0.8, size: 2, color: "#7fd6a0", glow: true });
    },
  },
  weaver: {
    name: "TECELÃ",
    lore: "A costureira que tece seda entre folhas. Túneis de seda aceleram colônia.",
    aura: "#ffd479",
    particle: "#ffe9a8",
    icon: "🧵",
    onWeave: (a) => {
      ring(a.x, a.y, { r0: 6, r1: 20, life: 0.5, color: "#ffd479", width: 1 });
      for (let i=0;i<5;i++) spawnPart({ x: a.x + (Math.random()-0.5)*30, y: a.y + (Math.random()-0.5)*20, vx: (Math.random()-0.5)*20, vy: -12, life: 0.9, size: 1.5, color: "#ffe9a8", glow: true });
    },
  },
  giant: {
    name: "DINOPONERA",
    lore: "A colossa sem rainha. Cada operária pode virar rainha. Gigante.",
    aura: "#ffd479",
    particle: "#ff9a5c",
    icon: "👑",
    onAttack: (a, target) => {
      burst(a.x, a.y, { n: 14, color: ["#ffd479", "#ff9a5c", "#fff"], spMin: 30, spMax: 110, life: 0.6, glow: true });
      ring(a.x, a.y, { r0: a.bodyR, r1: a.bodyR+24, life: 0.45, color: "#ffd479", width: 3 });
      ring(target.x, target.y, { r0: 6, r1: 20, life: 0.35, color: "#ff4d5a", width: 2 });
    },
  },
};

export function triggerAntVFX(type, event, ant, target = null) {
  const vfx = ANT_VFX[type];
  if (!vfx) return;
  switch (event) {
    case "gather": vfx.onGather && vfx.onGather(ant); break;
    case "carry": vfx.onCarry && vfx.onCarry(ant); break;
    case "scout": vfx.onScout && vfx.onScout(ant); break;
    case "attack": vfx.onAttack && vfx.onAttack(ant, target); break;
    case "guard": vfx.onGuard && vfx.onGuard(ant); break;
    case "heal": vfx.onHeal && vfx.onHeal(ant, target); break;
    case "weave": vfx.onWeave && vfx.onWeave(ant); break;
    default: break;
  }
}

// VFX cristal memória geométrico
export function spawnMemoryCrystal(x, y, isViolet = false) {
  const color = isViolet ? "#c77dff" : "#ffd479";
  burst(x, y, { n: 8, color: [color, "#fff", "#e8f4ff"], spMin: 15, spMax: 70, life: 0.8, glow: true, sizeMin: 1.5, sizeMax: 3 });
  ring(x, y, { r0: 4, r1: 18, life: 0.6, color, width: 2 });
  for (let i=0;i<4;i++) {
    spawnPart({ x: x + (Math.random()-0.5)*10, y: y, vx: (Math.random()-0.5)*20, vy: -30 - Math.random()*20, life: 1.2, size: 2, color, glow: true });
  }
}
