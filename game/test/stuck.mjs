// Teste de regressão: formigas NÃO podem ficar travadas.
// Regressão que motivou o teste: uma pilha de comida podia nascer DENTRO do
// formigueiro (o genWorld não checava a distância do formigueiro para as 14
// pilhas aleatórias). Como o formigueiro tem colisão de raio 70 e a formiga só
// para de ir quando chega a ~37px do alvo, ela empurrava a colisão para sempre
// no estado "goto" — travada, com a colônia inteira parada na porta.
// Uso: node test/stuck.mjs
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- stubs -----
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
const { genWorld, world, nearestPile } = await import(BASE + "world.js");
const units = await import(BASE + "units.js");
const { G, loadSave } = await import(BASE + "state.js");
const { MAPS, CHAMBERS } = await import(BASE + "config.js");
const { spawnEnemy, foes } = await import(BASE + "enemies.js");
const { rollDraft, applyMutation } = await import(BASE + "mutations.js");

loadSave();
const problems = [];
const ok = (msg) => console.log("ok    " + msg);
const bad = (msg) => { problems.push(msg); console.log("ERRO  " + msg); };

// ------------------------------------------------------------ 1) dá para chegar?
// O genWorld não pode colocar comida/essência dentro da área de colisão do
// formigueiro (A.r + folga) — senão a formiga nunca alcança o alvo.
const CLEAR = 70 + 90;                 // collR do formigueiro + folga de trabalho
const SEEDS = [1, 7, 42, 777, 20240117];
let checked = 0, closest = Infinity;
for (let m = 0; m < MAPS.length; m++) {
  for (const seed of SEEDS) {
    genWorld(seed, m);
    const A = world.anthill;
    for (const t of [...world.piles, ...world.nodes]) {
      const d = Math.hypot(t.x - A.x, t.y - A.y);
      closest = Math.min(closest, d);
      checked++;
      if (d < CLEAR) {
        bad(`mapa ${m + 1} seed ${seed}: ${t.kind} a ${d.toFixed(0)}px do formigueiro (mínimo ${CLEAR})`);
      }
    }
  }
}
ok(`${checked} pilhas/nós em ${MAPS.length} mapas: o mais próximo do formigueiro ficou a ${closest.toFixed(0)}px`);

// -------------------------------- 1b) a rede de segurança empurra p/ fora ----
{
  const { clearResourcesFromAnthill } = await import(BASE + "world.js");
  const A2 = world.anthill;
  world.piles.push({ kind: "food", x: A2.x + 12, y: A2.y - 8, amount: 50, max: 50, r: 30, seed: 9 });
  world.nodes.push({ kind: "essence", x: A2.x - 24, y: A2.y + 18, amount: 40, max: 40, r: 26, seed: 9 });
  const food = world.piles[world.piles.length - 1], ess = world.nodes[world.nodes.length - 1];
  clearResourcesFromAnthill();
  const df = Math.hypot(food.x - A2.x, food.y - A2.y);
  const de = Math.hypot(ess.x - A2.x, ess.y - A2.y);
  if (df >= 190 && de >= 190 && food.moved && ess.moved) {
    ok(`rede de segurança tirou comida/essência de dentro do formigueiro (${df.toFixed(0)}px e ${de.toFixed(0)}px)`);
  } else bad(`rede de segurança falhou (comida ${df.toFixed(0)}px, essência ${de.toFixed(0)}px)`);
  // e o seletor de alvos ignora o que estiver na parede
  world.piles.push({ kind: "food", x: A2.x, y: A2.y, amount: 30, max: 30, r: 30, seed: 8 });
  const chosen = nearestPile(A2.x, A2.y);
  if (!chosen || Math.hypot(chosen.x - A2.x, chosen.y - A2.y) >= 150) ok("o seletor nunca escolhe recurso dentro da parede do formigueiro");
  else bad("o seletor ainda escolhe recurso dentro da parede do formigueiro");
  world.piles.splice(world.piles.indexOf(food), 1);
  world.piles.pop();
  world.nodes.splice(world.nodes.indexOf(ess), 1);
}

// --------------------------------------------- 2) e se a comida nascer dentro?
// Simula o estrago: uma pilha no coração do formigueiro. As operárias têm que
// dar um jeito (desistir e escolher outra coisa), nunca ficar presas no "goto".
genWorld(999, 0);
const A = world.anthill;
world.piles.push({
  kind: "food", x: A.x, y: A.y, amount: 90, max: 90, r: 30,
  sprite: world.piles[0] ? world.piles[0].sprite : null, seed: 1,
});
const blocked = world.piles[world.piles.length - 1];
// colônia de teste
G.run = {
  status: "running", food: 0, essencePool: 0, level: 0, wave: 0, mapIdx: 0,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mutations: new Set(), mutationLog: [], kills: 0, xp: 0, xpNext: 10,
};
window.__run = G.run;      // os módulos leem a run por aqui (como o game.js faz)
units.allies.length = 0;
for (let i = 0; i < 6; i++) {
  const ang = (i / 6) * Math.PI * 2;
  units.spawnAnt("worker", A.x + Math.cos(ang) * 150, A.y + Math.sin(ang) * 150);
}
const workers = units.allies.filter((a) => a.type === "worker");

const DT = 1 / 60;
const stuckFor = new Map();      // id -> segundos no mesmo estado
const worst = new Map();         // id -> maior tempo parado sem colher
let gatheredFromBlocked = 0;
const before = blocked.amount;
for (let step = 0; step < 60 * 45; step++) {      // 45s
  units.updateAllies(DT, []);
  for (const a of workers) {
    if (a.dead) continue;
    if (a.state === "goto") {
      const t = (stuckFor.get(a.id) || 0) + DT;
      stuckFor.set(a.id, t);
      if (t > 6) worst.set(a.id, Math.max(worst.get(a.id) || 0, t));
    } else stuckFor.set(a.id, 0);
  }
}
gatheredFromBlocked = before - blocked.amount;
for (const [id, t] of worst) {
  const a = workers.find((w) => w.id === id);
  bad(`operária ${a ? a.type : id} ficou ${t.toFixed(1)}s presa no "goto" (alvo inalcançável)`);
}
if (!worst.size) ok("nenhuma operária ficou presa no \"goto\" mesmo com a pilha dentro do formigueiro");
// elas têm que continuar trabalhando: algo foi coletado ou a pilha foi limpa
if (gatheredFromBlocked > 0 || blocked.amount === 0) {
  ok(`as operárias deram um jeito na pilha impossível (coletado ${gatheredFromBlocked.toFixed(0)})`);
} else if (!worst.size) {
  ok("as operárias ignoraram a pilha inalcançável e foram trabalhar em outro lugar");
}

// ----------------------------------------- 3) ninguém fica preso no formigueiro
// Depois de todo o movimento, nenhuma formiga pode estar DENTRO da colisão.
let inside = 0;
for (const a of units.allies) {
  if (a.dead) continue;
  if (Math.hypot(a.x - A.x, a.y - A.y) < 60) inside++;
}
if (inside) bad(`${inside} formiga(s) terminaram dentro do formigueiro`);
else ok("nenhuma formiga terminou dentro do formigueiro");

// --------------------------------------- 4) a bombeira explode de verdade ----
// Regressão: o papel da bombeira é "ranged" no config, e o código testava
// role === "bomber" — nunca era verdade, então o projétil saía sem área,
// sem queimadura e com som/visual de cuspe. O teste mira 3 inimigos colados:
// a explosão tem que acertar mais de um e deixar todo mundo queimando.
const { clearFoes } = await import(BASE + "enemies.js");
const { projectiles, updateProjectiles, clearCombat } = await import(BASE + "combat.js");
clearFoes(); clearCombat();
const ex = A.x + 700, ey = A.y;
for (let i = 0; i < 3; i++) spawnEnemy("runner", ex + i * 14, ey, 1);
const targets = foes.slice();
if (targets.length !== 3) bad(`não deu para montar o cenário: ${targets.length} inimigo(s) em vez de 3`);
const stats = new Map(targets.map((f) => [f, { dmg: 0, burn: 0, hp: f.hp }]));
const bomber = units.spawnAnt("bomber", ex - 90, ey);
G.run.food = 999;
let maxAoe = 0, maxProjR = 0, arcs = 0;
const seen = new Set();
for (let step = 0; step < 60 * 10; step++) {
  units.updateAllies(DT, foes);
  updateProjectiles(DT, units.allies, foes);
  for (const p of projectiles) {
    if (seen.has(p)) continue;
    seen.add(p);
    maxAoe = Math.max(maxAoe, p.aoe || 0);
    maxProjR = Math.max(maxProjR, p.size || 0);
    if (p.arc) arcs++;
  }
  for (const f of targets) {
    const st = stats.get(f);
    const hp = Math.max(0, f.hp);
    if (hp < st.hp) { st.dmg += st.hp - hp; st.hp = hp; }
    st.burn = Math.max(st.burn, f.burnT || 0);
  }
}
const hit = [...stats.values()].filter((s) => s.dmg > 0);
const burning = [...stats.values()].filter((s) => s.burn > 0);
if (seen.size === 0) {
  bad("a bombeira não disparou nenhum projétil (cheque custo/alcance em config.js)");
} else if (maxAoe <= 0) {
  bad("o projétil da bombeira saiu sem área (aoe 0) — o papel/pistola não chegou no disparo");
} else {
  ok(`a bombeira disparou ${seen.size} bomba(s) — aoe ${maxAoe}px, desenho ${maxProjR.toFixed(1)}, arco ${arcs > 0 ? "sim" : "NÃO"}`);
}
if (hit.length >= 2) ok(`explosão em área acertou ${hit.length} inimigos de uma vez (${hit.map((s) => s.dmg.toFixed(0)).join("/")} de dano)`);
else bad(`bombeira não explodiu: só ${hit.length} inimigo(s) levaram dano de ${targets.length}`);
if (burning.length >= 2) ok(`queimadura pegou ${burning.length} inimigos (${burning.map((s) => s.burn.toFixed(1)).join("/")}s)`);
else bad(`queimadura chegou em ${burning.length} inimigo(s) em vez de 2+`);

// ------------------------------------------------------------- relatório ----
console.log("\n===========================================================");
if (problems.length) {
  console.log("PROBLEMAS (" + problems.length + "):\n - " + problems.join("\n - "));
  process.exit(2);
}
console.log("TESTE DE TRAVAMENTO E EXPLOSÃO PASSOU");
