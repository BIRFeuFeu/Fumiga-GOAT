// Teste da ÁRVORE DA EVOLUÇÃO ampliada.
// Garante que crescer a árvore não virou enfeite:
//   1. todo nó tem caminho até a raiz e layout sem sobreposição;
//   2. todo nó tem um bônus de verdade em metaBonus() (chave que muda algo);
//   3. os bônus realmente mudam as estatísticas/consumidores do jogo;
//   4. dá para comprar nó por nó (custo, pré-requisito, nível máximo).
// Uso: node test/tree.mjs
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
  constructor() { this.width = 264; this.height = 180; this._src = ""; }
  set src(v) { this._src = v; if (this.onload) setTimeout(() => this.onload(), 0); }
  get src() { return this._src; }
};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);

const BASE = new URL("../js/", import.meta.url).pathname;
await import(BASE + "assets.js");
await (await import(BASE + "font.js")).loadFonts();   // atlas da fonte p/ desenhar texto
const { META_NODES, META_BRANCHES } = await import(BASE + "config.js");
const { genWorld, world } = await import(BASE + "world.js");
const { G, loadSave, metaBonus, mods, metaLevel, metaCanBuy, metaBuy } = await import(BASE + "state.js");
const units = await import(BASE + "units.js");
const meta = await import(BASE + "meta.js");

loadSave();
const problems = [];
const ok = (msg) => console.log("ok    " + msg);
const bad = (msg) => { problems.push(msg); console.log("ERRO  " + msg); };

// ------------------------------------------------------ 1) estrutura/layout --
const ids = new Set(META_NODES.map((n) => n.id));
if (ids.size !== META_NODES.length) bad("há ids repetidos na árvore");
for (const n of META_NODES) {
  for (const r of n.requires) if (!ids.has(r)) bad(`${n.id}: pré-requisito inexistente "${r}"`);
  if (!META_BRANCHES[n.br]) bad(`${n.id}: ramo desconhecido "${n.br}"`);
  if (!n.cost.length) bad(`${n.id}: sem custos`);
}
// alcançável a partir da raiz?
const reach = new Set(["raiz"]);
let grew = true;
while (grew) {
  grew = false;
  for (const n of META_NODES) {
    if (reach.has(n.id)) continue;
    if (n.requires.some((r) => reach.has(r))) { reach.add(n.id); grew = true; }
  }
}
const lonely = META_NODES.filter((n) => !reach.has(n.id));
if (lonely.length) bad(`nós inalcançáveis: ${lonely.map((n) => n.id).join(", ")}`);
else ok(`${META_NODES.length} nós em ${Object.keys(META_BRANCHES).length} ramos, todos alcançáveis a partir da raiz`);
// sobreposição na grade (o mesmo critério usado para achar o layout)
let minD = Infinity, worst = "";
for (let i = 0; i < META_NODES.length; i++) {
  for (let j = i + 1; j < META_NODES.length; j++) {
    const a = META_NODES[i], b = META_NODES[j];
    const d = Math.hypot(a.x - b.x, (a.y - b.y) * 0.85);
    if (d < minD) { minD = d; worst = a.id + "/" + b.id; }
  }
}
if (minD < 0.95) bad(`nós colados na tela: ${worst} a ${minD.toFixed(2)} de distância`);
else ok(`nenhum nó colado (menor distância ${minD.toFixed(2)} = ${(minD * 134).toFixed(0)}px na tela)`);
// todos os ramos têm folhas (nós-opção no fim) — árvore com graça
for (const br of Object.keys(META_BRANCHES)) {
  const howMany = META_NODES.filter((n) => n.br === br).length;
  if (howMany < 6) bad(`ramo ${br} só tem ${howMany} nós`);
}
// raridades do rework: tier válido + cada grupo tem ao menos 1 lendário
for (const n of META_NODES) {
  if (![0, 1, 2].includes(n.tier || 0)) bad(`${n.id}: tier inválido (${n.tier})`);
}
for (const br of Object.keys(META_BRANCHES)) {
  const leg = META_NODES.filter((n) => n.br === br && (n.tier || 0) === 2).length;
  if (!leg) bad(`grupo ${br} sem nó lendário`);
}
ok("raridades: " + [0, 1, 2].map((t) => META_NODES.filter((n) => (n.tier || 0) === t).length).join("/") + " nós (comum/raro/lendário)");
ok("recursos de sprite: " + META_NODES.map((n) => n.icon).filter((v, i, a) => a.indexOf(v) === i).length + " ícones distintos");

// ------------------------------------------- 2) todo nó muda algum bônus ----
// liga um nó por vez e vê se ALGUMA chave de metaBonus() sai de neutro
function bonusOf(id, lvl) {
  for (const n of META_NODES) {
    G.save.nodes[n.id] = n.id === id ? lvl : 0;
  }
  delete G.save.nodes.raiz;
  return metaBonus();
}
const NEUTRAL = {
  foodBonus: 1, workerSpeed: 1, workerCarry: 0, startWorkers: 0, crystalYield: 0,
  dmgAll: 1, hpAll: 1, critChance: 0, startSoldiers: 0, queenHp: 1, queenEatRate: 1,
  hatchSpeed: 1, popCap: 0, essMult: 1, rebirth: false,
  gatherRate: 1, allSpeed: 1, startFood: 0, skipBonus: 0, fireRate: 1, rangeBonus: 0,
  aoeMult: 1, burnMult: 1, armor: 0, dodge: 0, reflect: 0, queenArmor: 0, xpGain: 1,
  queenRegen: 0, startEssence: 0, digSpeed: 1, nurserySpeed: 1, nestEgg: 1,
  fungusRate: 0, chamberCost: 1, nestDeposit: 0, nestSpeed: 1, workerSave: 0,
  stingSlow: 0, ceifaBonus: 0, venomTime: 1, venomDps: 1, gatePower: 0, gateRange: 0,
  dashFreq: 1, melThresh: 0, melRate: 1, fungusPower: 0, weaverBoost: 1,
  healPower: 1, triageBonus: 0, dinoHp: 1, dinoCost: 0,
};
const inert = [];
for (const n of META_NODES) {
  if (n.id === "raiz") continue;
  const before = bonusOf(n.id, 0), after = bonusOf(n.id, 1);
  const keys = Object.keys(after);
  const changed = keys.filter((k) => before[k] !== after[k]);
  if (!changed.length) { inert.push(n.id); bad(`nó "${n.id}" (${n.name}) não muda nenhum bônus`); }
  // bônus precisa sair do neutro (1 vira 1.12, 0 vira 5% etc.)
  for (const k of changed) {
    if (!(k in NEUTRAL)) bad(`bônus "${k}" (${n.id}) não é conhecido pelo jogo`);
  }
}
if (!inert.length) ok(`todos os ${META_NODES.length - 1} nós mudam pelo menos um bônus real do jogo`);

// nenhum bônus pode ficar órfão: toda chave de metaBonus() precisa de um nó
// (foi assim que o nó de POPULAÇÃO quase ficou sem árvore)
const touched = new Set();
for (const n of META_NODES) {
  if (n.id === "raiz") continue;
  const before = bonusOf(n.id, 0), after = bonusOf(n.id, 1);
  for (const k of Object.keys(after)) if (before[k] !== after[k]) touched.add(k);
}
const orphans = Object.keys(NEUTRAL).filter((k) => !touched.has(k));
if (orphans.length) bad(`bônus sem nenhum nó na árvore: ${orphans.join(", ")}`);
else ok(`${Object.keys(NEUTRAL).length} bônus do jogo têm nó na árvore (nenhum órfão)`);

// ------------------------------- 3) os bônus chegam nas estatísticas --------
// árvore zerada
for (const n of META_NODES) G.save.nodes[n.id] = 0;
G.run = {
  status: "running", food: 5000, essencePool: 5000, level: 0, wave: 0, mapIdx: 0,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mutations: new Set(), mutationLog: [], kills: 0, xp: 0, xpNext: 10,
};
window.__run = G.run;
genWorld(3, 0);
const A = world.anthill;
const base = units.spawnAnt("bomber", A.x + 400, A.y);
const baseStats = { ...base.st };
const worker0 = units.spawnAnt("worker", A.x + 420, A.y + 40);
const fighter0 = units.spawnAnt("soldier", A.x + 440, A.y - 40);
units.allies.length = 0;

G.save.nodes.g_vid = 2; G.save.nodes.g_alc = 2; G.save.nodes.g_cad = 2;
G.save.nodes.g_bomb = 2; G.save.nodes.g_fogo = 2; G.save.nodes.g_arm = 2; G.save.nodes.t_rede = 2;
G.save.nodes.t_rap = 2;
const buffed = units.spawnAnt("bomber", A.x + 400, A.y);
const worker1 = units.spawnAnt("worker", A.x + 420, A.y + 40);
const fighter1 = units.spawnAnt("soldier", A.x + 440, A.y - 40);
const checks = [
  ["vida (+12%/nv)", buffed.st.hp > baseStats.hp],
  ["alcance (+14/nv)", buffed.st.range > baseStats.range],
  ["cadência (+8%/nv)", buffed.st.atkCd < baseStats.atkCd],
  ["área da bomba (+15%/nv)", buffed.st.aoe > baseStats.aoe],
  ["queimadura (+15%/nv)", buffed.st.burnDps > baseStats.burnDps],
  ["armadura", mods().armor > 0],
  ["velocidade geral (+5%/nv) em quem não é operária", fighter1.st.speed > fighter0.st.speed],
  ["taxa de coleta (+12%/nv)", worker1.st.gatherRate > worker0.st.gatherRate],
];
for (const [label, pass] of checks) {
  if (pass) ok(`bônus chegou na ficha: ${label}`);
  else bad(`bônus NÃO chegou na ficha: ${label}`);
}
// keystones de espécie: bônus novos saem do neutro (trade-off incluso)
G.save.nodes.k_bala = 1; G.save.nodes.k_arpao = 1; G.save.nodes.k_dinoponera = 1;
const sp = mods();
const spChecks = [
  ["stingSlow (FERRÃO DA BALA)", sp.stingSlow > 0],
  ["ceifaBonus (CEIFA DA ARPÃO)", sp.ceifaBonus > 0],
  ["trade-off da ARPÃO no hpAll", sp.hpAll < 1 + 0.12 * metaLevel("g_vid")],
  ["dinoHp + dinoCost (FÚRIA DA DINOPONERA)", sp.dinoHp > 1 && sp.dinoCost > 0],
];
for (const [label, pass] of spChecks) pass ? ok("keystone ativa: " + label) : bad("keystone NÃO ativa: " + label);

// a explosão da bombeira com PÓLVORA NEGRA é maior de verdade
if (buffed.st.aoe > baseStats.aoe && buffed.st.burnDps > baseStats.burnDps) {
  ok(`bomba com a árvore: aoe ${baseStats.aoe.toFixed(0)} -> ${buffed.st.aoe.toFixed(0)}, queimadura ${baseStats.burnDps.toFixed(1)} -> ${buffed.st.burnDps.toFixed(1)}`);
}

// defesa: esquiva/armadura/espinhos/salvamento existem no golpe recebido
G.save.nodes.g_esq = 3; G.save.nodes.g_arm = 3; G.save.nodes.g_esp = 3; G.save.nodes.n_zelo = 3;
G.save.nodes.r_casca = 3; G.save.nodes.r_regen = 3;
if (mods().dodge > 0 && mods().armor > 0 && mods().reflect > 0 && mods().workerSave > 0) {
  ok(`defesa ativa: esquiva ${(mods().dodge * 100).toFixed(0)}%, armadura ${(mods().armor * 100).toFixed(0)}%, espinhos ${mods().reflect}, zelo ${(mods().workerSave * 100).toFixed(0)}%`);
} else bad("nós defensivos não produziram efeito");
// a mutação CORAÇÃO agora soma a regeneração da rainha (antes morria no mutBonus)
units.spawnQueen();
G.run.mutations = new Set(["coracao"]);
if (mods().queenRegen >= 3) ok(`mutação CORAÇÃO regenera a rainha (${mods().queenRegen} HP/s)`);
else bad(`mutação CORAÇÃO não regenera (queenRegen ${mods().queenRegen})`);
// e a regeneração acontece no tempo
const q = units.allies.queen;
q.hp = q.maxHp * 0.5;
const hpBefore = q.hp;
for (let i = 0; i < 60; i++) units.updateAllies(1 / 60, []);
if (q.hp > hpBefore) ok(`rainha se recupera sozinha (${hpBefore.toFixed(0)} -> ${q.hp.toFixed(0)} em 1s)`);
else bad("rainha não regenera apesar de queenRegen ativo");

// ninho: os bônus do ramo NINHO aparecem nos modificadores usados pelo nest.js
G.run.mutations = new Set();
G.save.nodes.n_dig = 3; G.save.nodes.n_berco = 3; G.save.nodes.n_desp = 3;
G.save.nodes.n_corr = 3; G.save.nodes.n_ovo = 3; G.save.nodes.n_eco = 3; G.save.nodes.n_fung = 3;
const m2 = mods();
if (m2.digSpeed > 1 && m2.nurserySpeed > 1 && m2.nestDeposit > 0 && m2.nestSpeed > 1
    && m2.nestEgg < 1 && m2.chamberCost < 1 && m2.fungusRate > 0) {
  ok(`ninho: escavação +${((m2.digSpeed - 1) * 100).toFixed(0)}%, berçário +${((m2.nurserySpeed - 1) * 100).toFixed(0)}%, entrega +${m2.nestDeposit}, postura ${(m2.nestEgg * 100).toFixed(0)}%, câmaras ${(m2.chamberCost * 100).toFixed(0)}%`);
} else bad("nós do NINHO não produziram efeito nos modificadores");
const { chamberCost } = await import(BASE + "nest.js");
const full = (await import(BASE + "config.js")).CHAMBERS.pantry.costs[0];
const disc = chamberCost("pantry", 0);
if (disc.food < full.food && disc.ess <= full.ess) ok(`custo da DESPENSA Nv1 com desconto: ${full.food}/${full.ess} -> ${disc.food}/${disc.ess}`);
else bad(`desconto de câmara não aplicado (${JSON.stringify(disc)} vs ${JSON.stringify(full)})`);
// sem nenhum nó, o custo é o de tabela (nada quebrou para quem começa)
for (const n of META_NODES) G.save.nodes[n.id] = 0;
if (chamberCost("pantry", 0).food === full.food) ok("com a árvore zerada o custo das câmaras continua o de tabela");
else bad("custo de câmara mudou mesmo sem nenhum nó comprado");

// -------------------------------------- 4) compra de cada nó, um a um ------
let bought = 0, failed = [];
for (const n of META_NODES) {
  for (const r of n.requires) G.save.nodes[r] = 1;
  G.save.essence = 99999;
  for (let lv = 1; lv <= n.cost.length; lv++) {
    const can = metaCanBuy(n.id);
    if (!can.ok) { failed.push(`${n.id} nível ${lv}: ${can.why}`); break; }
    metaBuy(n.id);
    bought++;
  }
  // nível máximo: não pode comprar de novo
  if (metaCanBuy(n.id).ok) failed.push(`${n.id} passou do nível máximo`);
  if (metaLevel(n.id) !== n.cost.length) failed.push(`${n.id} ficou em ${metaLevel(n.id)}/${n.cost.length}`);
}
if (failed.length) bad(`compras falharam: ${failed.slice(0, 6).join(" | ")}`);
else ok(`${bought} níveis comprados (todos os nós chegaram ao nível máximo)`);

// a tela da árvore ao menos monta e roda um quadro com a árvore grande
meta.enterTree();
let drew = false;
try {
  meta.drawTree(makeCtx(), 1 / 60);
  meta.updateTree(1 / 60);
  meta.treeFit();
  meta.drawTree(makeCtx(), 1 / 60);
  drew = true;
} catch (e) { bad("a tela da árvore quebrou ao desenhar: " + e.message + "\n      " + (e.stack || "").split("\n")[1]); }
if (drew) ok("tela da árvore desenha a árvore grande (enquadrada e com zoom)");

// ------------------------------------------------------------- relatório ----
console.log("\n===========================================================");
if (problems.length) {
  console.log("PROBLEMAS (" + problems.length + "):\n - " + problems.join("\n - "));
  process.exit(2);
}
console.log(`ÁRVORE DA EVOLUÇÃO OK — ${META_NODES.length} nós, ${Object.keys(META_BRANCHES).length} ramos, ${bought} níveis compráveis`);
