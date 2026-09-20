// Regressão: só as castas de guerra atacam.
// Regra do jogo (config.js, campo `attack`): soldado, cuspidora, bombeira,
// guarda de ébano e formiga gigante causam dano. Operária, coletora, batedora e
// curandeira NUNCA atacam — fazem seus outros trabalhos e fogem do perigo.
// Este teste mede o dano real causado por 1 formiga de cada casta em 8s, com um
// inimigo colado nela, rodando o updateAllies/updateProjectiles de verdade.
// Uso: node test/attack.mjs
import { fileURLToPath } from "node:url";

const grad = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => grad;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {}, createElementNS() { return { getContext: makeCtx }; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};

const BASE = new URL("../js/", import.meta.url).pathname;
await import(BASE + "assets.js");
const { genWorld, world } = await import(BASE + "world.js");
const units = await import(BASE + "units.js");
const { G, loadSave } = await import(BASE + "state.js");
const { spawnEnemy, foes, clearFoes } = await import(BASE + "enemies.js");
const { updateProjectiles } = await import(BASE + "combat.js");
const { resetColony } = await import(BASE + "brain.js");
const { UNITS } = await import(BASE + "config.js");

loadSave();
genWorld(777, 0);
G.run = {
  status: "running", food: 500, essencePool: 0, level: 0, wave: 0, mapIdx: 0,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mutations: new Set(), mutationLog: [], kills: 0, xp: 0, xpNext: 10,
};
window.__run = G.run;
resetColony();

const A = world.anthill;
// quem DEVE atacar (attack !== false) e quem NÃO deve (attack === false)
const castes = ["worker", "gatherer", "scout", "healer", "soldier", "spitter", "tank", "bomber", "giant"];
const problems = [];
const ok = (m) => console.log("ok    " + m);
const bad = (m) => { problems.push(m); console.log("ERRO  " + m); };

for (const c of castes) {
  units.allies.length = 0;
  clearFoes();
  const bx = A.x + 320, by = A.y;
  for (let i = 0; i < 3; i++) spawnEnemy("warrior", bx + i * 22, by, 1);
  const hp0 = foes.reduce((s, f) => s + f.hp, 0);
  units.spawnAnt(c, bx - 45, by);
  for (let s = 0; s < 60 * 8; s++) {
    units.updateAllies(1 / 60, foes);
    updateProjectiles(1 / 60, units.allies, foes);
  }
  const hp1 = foes.reduce((s, f) => s + Math.max(0, f.hp), 0);
  const dmg = Math.round(hp0 - hp1);
  const deveAtacar = UNITS[c].attack !== false;
  const atacou = dmg > 0;
  if (deveAtacar === atacou) {
    ok(`${c}: dano ${dmg} (${deveAtacar ? "ataca" : "não ataca"})`);
  } else {
    bad(`${c}: dano ${dmg} mas ${deveAtacar ? "deveria atacar" : "NÃO deveria atacar"}`);
  }
}

if (problems.length === 0) console.log("\nSÓ AS CASTAS DE GUERRA ATACAM ✓");
else { console.log("\nFALHAS: " + problems.length); process.exit(1); }
