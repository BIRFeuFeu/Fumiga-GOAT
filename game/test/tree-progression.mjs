// Sete patamares, economia, save antigo e potência real. Sem navegador.
import assert from "node:assert/strict";
import fs from "node:fs";
import { META_NODES, META_STAGES, META_POWER, FRUIT_TREES } from "../js/config.js";
import { TREE_ALL, TREE_STAGE_NODES, TREE_NODE_RADII, fruitCenter } from "../js/tree_layout.js";
import { G, metaBuy, metaCanBuy, metaBonus, loadSave, persistSave, isTreeStageUnlocked,
  isFruitUnlocked, unlockFruitForBoss } from "../js/state.js";
import { treeGrowth } from "../js/tree_art.js";

const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) };
const reset = () => { G.save.nodes = {}; G.save.clearedMaps = {}; G.save.essence = 1e6; G.run = null; };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const IDS = "raiz g_dan g_cri g_cad g_bomb g_vid g_arm g_esq g_esp g_grd g_alc g_fogo k_bala k_arpao k_acrobata k_cefalote t_col t_vel t_carga t_ini t_ambar t_rap t_rede t_estoque t_atalho k_prata k_mel k_cortadeira n_dig n_corr n_berco n_ovo n_fung n_eco n_desp n_zelo k_tecela k_matabele r_vida r_reg r_ovo r_casca r_xp r_regen r_essin r_pop r_ess r_ren k_dinoponera".split(" ");
assert.deepEqual(META_NODES.map(n => n.id), IDS, "nenhum ID salvo foi removido/trocado");
assert.equal(META_NODES.reduce((sum, n) => sum + n.cost.length, 0), 143, "143 níveis antigos preservados");
assert.equal(TREE_ALL.length, 137);
assert.equal(META_STAGES.length, 7);
assert.deepEqual(TREE_STAGE_NODES.map(ns => ns.length), [8, 7, 7, 7, 7, 7, 6]);
for (let i = 0; i < 7; i++) {
  const nodes = TREE_STAGE_NODES[i];
  for (const n of nodes) {
    assert.equal(n.stage, i + 1);
    for (const id of n.requires) assert(META_NODES.find(p => p.id === id).stage <= n.stage, n.id + " exige um galho posterior");
    for (let j = 1; j < n.cost.length; j++) assert(n.cost[j] > n.cost[j - 1]);
  }
  if (i) {
    assert(Math.min(...nodes.flatMap(n => n.cost)) > Math.max(...TREE_STAGE_NODES[i - 1].flatMap(n => n.cost)), "cada patamar é mais caro que o anterior");
    assert(fruitCenter(i).y < fruitCenter(i - 1).y, "fruto sobe na ordem do mundo");
  }
  // A hitbox lógica de cada fruto não se confunde com a de uma melhoria.
  for (const n of TREE_ALL.filter(n => !n._fruit)) {
    const f = fruitCenter(i);
    assert(Math.hypot(f.x - n.x, f.y - n.y) > 60 + TREE_NODE_RADII[n.tier || 0], "fruto sobre um nó: " + n.id);
  }
}

reset();
assert.equal(treeGrowth().restoredPercent, 0);
assert.deepEqual([...treeGrowth().stages], Array(7).fill(0));
for (let stage = 1; stage <= 7; stage++) {
  for (let other = 1; other <= 7; other++) assert.equal(isTreeStageUnlocked(other), other <= stage);
  const nodes = META_NODES.filter(n => n.stage === stage);
  // Compra todos os níveis, respeitando a ordem de pré-requisitos.
  const todo = new Set(nodes.map(n => n.id));
  while (todo.size) {
    let count = 0;
    for (const id of todo) {
      const n = nodes.find(n => n.id === id);
      if (!n.requires.every(r => G.save.nodes[r] > 0)) continue;
      for (let level = 0; level < n.cost.length; level++) {
        const before = G.save.essence;
        assert(metaBuy(id), id + " deveria estar liberado");
        assert.equal(before - G.save.essence, n.cost[level]);
      }
      assert.equal(metaBuy(id), false, "não recompra além do máximo");
      todo.delete(id); count++;
    }
    assert(count > 0, "cadeia de pré-requisitos travou");
  }
  assert(treeGrowth().stages[stage - 1] > 0);
  assert.equal(isFruitUnlocked(META_STAGES[stage - 1].map), false, "abrir galho não concede o fruto");
  if (stage < 7) {
    const next = META_NODES.find(n => n.stage === stage + 1);
    // Nem essência infinita/pré-requisitos presentes ignoram o chefe.
    const saved = JSON.stringify(G.save.nodes), essence = G.save.essence;
    assert.equal(metaCanBuy(next.id).ok, false);
    assert.equal(metaBuy(next.id), false);
    assert.equal(JSON.stringify(G.save.nodes), saved); assert.equal(G.save.essence, essence);
    const fruit = FRUIT_TREES[stage - 1];
    assert.equal(unlockFruitForBoss(fruit.map, fruit.boss, "sobrevivencia"), false);
    assert.equal(unlockFruitForBoss(fruit.map, "palida", "campanha"), false);
    assert.equal(unlockFruitForBoss(fruit.map, fruit.boss, "campanha"), true);
    assert.equal(unlockFruitForBoss(fruit.map, fruit.boss, "campanha"), false, "evento idempotente");
    assert(isTreeStageUnlocked(stage + 1));
    assert(isFruitUnlocked(fruit.map));
  }
}
assert.equal(isFruitUnlocked("topo"), false);
G.save.clearedMaps.topo = true;
assert.equal(isFruitUnlocked("topo"), false, "flag falsa não implementa a Pálida");
for (const n of FRUIT_TREES[6].nodes) assert.equal(metaBuy(n.id), false, "fruto final é prévia");
assert.equal(unlockFruitForBoss("topo", "palida", "campanha"), false);
for (const f of FRUIT_TREES.filter(f => !f.pending)) for (const n of f.nodes) G.save.nodes[n.id] = n.cost.length;
assert.equal(treeGrowth().restoredPercent, 100, "o fruto futuro não impede restaurar a arte atual");
assert.deepEqual([...treeGrowth().stages], Array(7).fill(1));
persistSave();
const saved = JSON.stringify(G.save);
reset(); loadSave(); assert.equal(JSON.stringify(G.save), saved);

// Save antigo pode já ter compras no alto. Elas continuam ativas mesmo sem
// registro de vitória: apenas NOVOS níveis exigem vencer os mapas corretos.
store.set("fumiga_goat_save_v1", JSON.stringify({ essence: 42, nodes: { k_acrobata: 2, g_dan: 3, f_p_1: 1 } }));
loadSave();
assert.deepEqual(G.save.nodes, { k_acrobata: 2, g_dan: 3, f_p_1: 1 });
assert.equal(G.save.essence, 42); assert.deepEqual(G.save.clearedMaps, {});
near(metaBonus().venomTime, 1.70); near(metaBonus().venomDps, 1.80);
assert.equal(metaCanBuy("k_acrobata").ok, false);
assert(treeGrowth().stages[6] > 0, "compras antigas também restauram a cor");
persistSave(); loadSave(); assert.equal(G.save.nodes.k_acrobata, 2);
G.save.clearedMaps = { floresta: true };
assert.equal(isTreeStageUnlocked(3), false, "não salta o primeiro chefe com um flag do mundo 2");
reset();
G.save.nodes.raiz = 1; G.save.essence = META_NODES.find(n => n.id === "g_dan").cost[0] - 1;
assert.equal(metaBuy("g_dan"), false, "saldo insuficiente");

// Contrato numérico dos 48 efeitos principais; os testes tree/fruits exercitam
// também os consumidores (fichas, golpes, coleta, cura, ninho e chefes reais).
const values = {
  g_dan: { dmgAll: 1.10 }, g_vid: { hpAll: 1.12 }, t_col: { foodBonus: 1.15 }, t_vel: { workerSpeed: 1.10 },
  n_dig: { digSpeed: 1.30 }, r_vida: { queenHp: 1.15 }, r_reg: { queenEatRate: .70 },
  g_cri: { critChance: .05 }, g_grd: { startSoldiers: 1 }, t_carga: { workerCarry: 1 }, t_rap: { gatherRate: 1.16 },
  n_corr: { nestSpeed: 1.15 }, n_berco: { nurserySpeed: 1.20 }, r_ovo: { hatchSpeed: .85 },
  g_cad: { fireRate: 1.12 }, g_arm: { armor: .05 }, g_alc: { rangeBonus: 20 }, t_ini: { startWorkers: 3 },
  t_ambar: { crystalYield: 3 }, n_fung: { fungusRate: 2 }, r_pop: { popCap: 5 },
  g_bomb: { aoeMult: 1.25 }, g_esq: { dodge: .07 }, g_fogo: { burnMult: 1.25 }, t_rede: { allSpeed: 1.08 },
  t_estoque: { startFood: 40 }, n_ovo: { nestEgg: .86 }, n_eco: { chamberCost: .90 },
  g_esp: { reflect: 6 }, t_atalho: { skipBonus: 12 }, n_desp: { nestDeposit: 3 }, n_zelo: { workerSave: .09 },
  r_casca: { queenArmor: .10 }, r_xp: { xpGain: 1.18 }, r_essin: { startEssence: 45 },
  k_bala: { stingSlow: .50 }, k_prata: { dashFreq: 1.18 }, k_cortadeira: { fungusPower: .60 },
  k_mel: { melThresh: 30, melRate: 1.30 }, k_matabele: { healPower: 1.14, triageBonus: .05 },
  r_regen: { queenRegen: 3 }, r_ess: { essMult: 1.22 },
  k_arpao: { ceifaBonus: .10, hpAll: .95 }, k_acrobata: { venomTime: 1.35, venomDps: 1.40 },
  k_cefalote: { gatePower: .08, gateRange: 45 }, k_tecela: { weaverBoost: 1.25 },
  k_dinoponera: { dinoHp: 1.40, dinoCost: 40 }, r_ren: { rebirth: true },
};
assert.equal(Object.keys(values).length, 48);
for (const [id, expected] of Object.entries(values)) {
  G.save.nodes = { [id]: 1 };
  const got = metaBonus();
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "number") near(got[key], value); else assert.equal(got[key], value);
  }
}
assert.equal(META_POWER.r_ren, .75);
const art = fs.readFileSync(new URL("../assets/ui/tree_ancestral.png", import.meta.url));
assert.deepEqual([art.readUInt32BE(16), art.readUInt32BE(20)], [768, 672]);
assert.equal(art[25], 6, "RGBA verdadeiro, sem fundo chapado");
assert(art.length < 800000, "arte otimizada");
console.log("PATAMARES OK — 49 IDs/143 níveis, 7 gates, preços crescentes, 48 efeitos, save antigo e cor por região");
