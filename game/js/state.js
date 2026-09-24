import { applyFruitBonuses } from "./fruit_effects.js";
// ============================================================================
// FUMIGA-GOAT — estado global do jogo + persistência
// ============================================================================
import { META_NODES, PROPHECIES, FRUIT_TREES, MAPS } from "./config.js";

// A versão MOBILE define globalThis.FUMIGA_SAVE_KEY antes de carregar o motor,
// mantendo um slot de save PRÓPRIO: as versões PC e mobile são paralelas e
// independentes (progressos não se misturam), atualizadas em conjunto.
// MODO DEBUG (?debug na URL, ver js/debug.js): slot "_debug" separado, para os
// atalhos de teste (essência, telas, invencível) nunca tocarem o save real.
const DEBUG_URL = typeof location !== "undefined" && /[?&]debug(?:[=&]|$)/.test(location.search || "");
const SAVE_KEY =
  ((typeof globalThis !== "undefined" && typeof globalThis.FUMIGA_SAVE_KEY === "string" && globalThis.FUMIGA_SAVE_KEY) ||
  "fumiga_goat_save_v1") + (DEBUG_URL ? "_debug" : "");

// G: singleton mutável compartilhado por todos os módulos ---------------------
export const G = {
  screen: "BOOT",        // BOOT PRETITLE TITLE MODE OPTIONS TREE RUN HELP
  time: 0,               // relógio global (s)
  timeScale: 1,          // slow-mo de morte/vitória
  slowMo: 0,

  // progresso meta (persistente)
  save: {
    essence: 0, nodes: {},
    best: { wave: 0, kills: 0, wins: 0, runs: 0, maps: 0 },
    ascension: 0,        // PÓS-FINAL: maior ASCENSÃO DA NÉVOA vencida (campanha)
    era: 0,              // PÓS-FINAL: gerações do Formigueiro Eterno (1 por vitória)
    prophecies: {},      // PÓS-FINAL: vaticínios cumpridos (id -> true)
    cutscenes: {},       // MEGA LORE: memórias vistas
    clearedMaps: {},     // FASE 3: mapas vencidos na campanha (mapId -> true) — libera frutos (Noite Branca + 6 degraus + Pálida)
    tutorial: 0,         // 1 = tutorial concluído (ou pulado)
    accessibility: {     // modo acessível - escolha do usuário
      invincible: false,
      slowMo: false,
      infiniteDash: false,
      bigFont: false,
      reducedParticles: false,
      highContrast: false,
    },
    settings: {
      particles: true,
      screenshake: true,
      scanline: true,
      musicVol: 1,
      sfxVol: 1,
      gameSpeed: 1,      // 0.5, 1, 1.5, 2
      language: "pt-BR", // pt-BR, en-US, es
    },
  },

  // estado da expedição (RUN)
  run: null,

  muted: false,
};

export function muted() { return G.muted; }
export function toggleMute() { G.muted = !G.muted; return G.muted; }

// ------------------------------------------------------------------ saves ---
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        G.save.essence = Math.max(0, data.essence | 0);
        G.save.nodes = data.nodes && typeof data.nodes === "object" ? data.nodes : {};
        G.save.best = Object.assign({ wave: 0, kills: 0, wins: 0, runs: 0, maps: 0 }, data.best || {});
        G.save.ascension = Math.max(0, data.ascension | 0 || 0);
        G.save.era = Math.max(0, data.era | 0 || 0);
        G.save.prophecies = data.prophecies && typeof data.prophecies === "object" ? data.prophecies : {};
        G.save.cutscenes = data.cutscenes && typeof data.cutscenes === "object" ? data.cutscenes : {};
        G.save.clearedMaps = data.clearedMaps && typeof data.clearedMaps === "object" ? data.clearedMaps : {};
        G.save.tutorial = data.tutorial ? 1 : 0;
        if (data.accessibility && typeof data.accessibility === "object") {
          G.save.accessibility = Object.assign(G.save.accessibility, data.accessibility);
        }
        if (data.settings && typeof data.settings === "object") {
          G.save.settings = Object.assign(G.save.settings, data.settings);
        }
      }
    }
  } catch (e) { /* armazenamento indisponível: segue sem persistência */ }
}

export function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* ok */ }
}

// ------------------------------------------------------------------- meta ---
export function metaLevel(id) { return G.save.nodes[id] | 0; }

// Índices imutáveis: consultas de bônus não percorrem os 18 frutos por frame.
const FRUIT_INDEX = new Map(FRUIT_TREES.flatMap(f => f.nodes.map(n => [n.id, { node: n, fruit: f }])));
// FRUIT helpers — copa da árvore
function fruitNodeById(id) {
  return FRUIT_INDEX.get(id)?.node || null;
}
function fruitForNode(id) {
  return FRUIT_INDEX.get(id)?.fruit || null;
}
export function isFruitNode(id) { return !!fruitNodeById(id); }
export function metaNode(id) { return META_NODES.find((n) => n.id === id) || fruitNodeById(id) || null; }
export function isFruitUnlocked(mapId) {
  const f = FRUIT_TREES.find(f => f.map === mapId);
  return !!f && !f.pending && !!G.save.clearedMaps?.[mapId];
}
export function unlockFruitForBoss(mapId, bossId, mode) {
  const f = FRUIT_TREES.find(f => f.map === mapId);
  if(mode !== "campanha" || !f || f.pending || f.boss !== bossId || isFruitUnlocked(mapId)) return false;
  G.save.clearedMaps ||= {}; G.save.clearedMaps[mapId] = true;
  persistSave(); return true;
}

export function metaCanBuy(id) {
  const node = metaNode(id);
  if (!node) return { ok: false, why: "?" };
  const lvl = metaLevel(id);
  if (lvl >= node.cost.length) return { ok: false, why: "MÁX" };
  // gate de fruta: precisa ter vencido o mapa
  const fruit = fruitForNode(id);
  if (fruit && !isFruitUnlocked(fruit.map)) return { ok: false, why: fruit.pending ? "FUTURO: DERROTE A PÁLIDA (FASE 8)" : "DERROTE " + fruit.bossName };
  for (const req of node.requires) {
    if (metaLevel(req) <= 0) return { ok: false, why: "BLOQUEADO" };
  }
  const price = node.cost[lvl];
  if (G.save.essence < price) return { ok: false, why: "SEM ESSÊNCIA" };
  return { ok: true, why: "", price };
}

export function metaBuy(id) {
  const chk = metaCanBuy(id);
  if (!chk.ok) return false;
  G.save.essence -= chk.price;
  G.save.nodes[id] = metaLevel(id) + 1;
  // ERA lendária: Topo do Mundo dá +1 ERA imediata
  if (id === "f_g_3") {
    G.save.era = (G.save.era || 0) + 1;
  }
  persistSave();
  return true;
}

// Bônus derivados da árvore de evolução --------------------------------------
export function metaBonus() {
  const L = metaLevel;
  const map = G.run ? MAPS[G.run.mapIdx]?.id : null;
  // Frutos descrevem bônus locais: possuir não os torna globais.
  const F = id => fruitForNode(id)?.map === map ? L(id) : 0;
  return applyFruitBonuses({
    foodBonus: 1 + 0.15 * L("t_col") + 0.10 * F("f_p_3") + 0.12 * F("f_o_1"),
    workerSpeed: 1 + 0.10 * L("t_vel"),
    workerCarry: L("t_carga"),
    startWorkers: 2 * L("t_ini"),
    crystalYield: 2 * L("t_ambar"),
    dmgAll: 1 + 0.10 * L("g_dan") + 0.12 * F("f_d_1"),
    hpAll: Math.max(0.6, 1 + 0.12 * L("g_vid") - 0.05 * L("k_arpao")),  // trade-off da CEIFA DA ARPÃO
    critChance: 0.04 * L("g_cri"),
    startSoldiers: L("g_grd"),
    queenHp: 1 + 0.15 * L("r_vida"),
    queenEatRate: Math.pow(0.7, L("r_reg")),
    hatchSpeed: Math.pow(0.88, L("r_ovo")),
    popCap: 4 * L("r_pop") + F("f_d_2"),
    essMult: 1 + 0.15 * L("r_ess") + 0.15 * F("f_d_3"),
    rebirth: L("r_ren") > 0,

    // ---------------------------------------------------- nós novos da árvore
    // TRABALHO
    gatherRate: 1 + 0.12 * L("t_rap"),
    allSpeed: 1 + 0.05 * L("t_rede"),
    startFood: 20 * L("t_estoque"),
    skipBonus: 5 * L("t_atalho"),
    // GUERRA
    fireRate: 1 + 0.08 * L("g_cad"),
    rangeBonus: 14 * L("g_alc"),
    aoeMult: 1 + 0.15 * L("g_bomb"),
    burnMult: 1 + 0.15 * L("g_fogo"),
    armor: 0.04 * L("g_arm"),          // fração do dano recebido ignorada
    dodge: 0.05 * L("g_esq"),          // chance de esquivar por completo
    reflect: 3 * L("g_esp"),           // dano devolvido a quem morde
    // REAL
    queenArmor: 0.08 * L("r_casca"),
    xpGain: 1 + 0.10 * L("r_xp"),
    queenRegen: 1.5 * L("r_regen"),
    startEssence: 20 * L("r_essin"),
    // NINHO
    digSpeed: 1 + 0.30 * L("n_dig"),
    nurserySpeed: 1 + 0.12 * L("n_berco"),
    nestEgg: Math.pow(0.90, L("n_ovo")),
    fungusRate: L("n_fung"),
    chamberCost: Math.pow(0.92, L("n_eco")),
    nestDeposit: L("n_desp"),
    nestSpeed: 1 + 0.10 * L("n_corr"),
    workerSave: 0.06 * L("n_zelo"),

    // ---------------------------------- keystones de espécie (rework da árvore)
    // ⚔️ GUERRA
    stingSlow: 0.35 * L("k_bala"),            // FERRÃO DA BALA: +s de lentidão
    ceifaBonus: 0.08 * L("k_arpao"),          // CEIFA DA ARPÃO: limiar +
    venomTime: 1 + 0.20 * L("k_acrobata"),    // VENENO DA ACROBATA: duração
    venomDps: 1 + 0.25 * L("k_acrobata"),     //   …e corrosão
    gatePower: 0.05 * L("k_cefalote"),        // CABEÇA DE CEFALOTE: redução +
    gateRange: 30 * L("k_cefalote"),          //   …e raio da PORTA-VIVA
    // 🍃 COLETA
    dashFreq: 1 + 0.10 * L("k_prata"),        // PASSO DA PRATA: arrancadas +
    melThresh: 20 * L("k_mel"),               // ÂMBAR DA DESPENSA: estoque-alvo
    melRate: 1 + 0.20 * L("k_mel"),           //   …e gotejo mais rápido
    fungusPower: 0.30 * L("k_cortadeira"),    // JARDIM DA CORTADEIRA: fungário
    // 🏥 CRIAÇÃO
    weaverBoost: 1 + 0.15 * L("k_tecela"),    // SEDA DA TECELÃ: bônus da Tecelã
    healPower: (1 + 0.08 * L("k_matabele") + 0.10 * F("f_f_3")) * (1 + 0.15 * F("f_o_3")),    // BÁLSAMO DA MATABELE: cura
    triageBonus: 0.04 * L("k_matabele"),      //   …e limiar da triagem
    // 👑 REAL
    dinoHp: 1 + 0.25 * L("k_dinoponera"),     // FÚRIA DA DINOPONERA: vida +
    dinoCost: 40 * L("k_dinoponera"),         //   …mas custa mais (trade-off)

    // ────────────────────────── FRUTOS DA ÁRVORE — 6 mini-árvores por bioma (Fase 3)
    // Cada fruto é mecânica única + bônus de bioma (escolha C em peso_bonus)
    // Planície
    fruitPlanicieSpeed: 0.08 * F("f_p_1"),
    fruitThumpResist: 0.15 * F("f_p_2"),      // -15% dano THUMP
    fruitFoodPlanicie: 0.10 * F("f_p_3"),
    // Floresta
    fruitVision: 0.12 * F("f_f_1"),
    fruitWeaverSpeed: 0.20 * F("f_f_2"),
    fruitHealFloresta: 0.10 * F("f_f_3"),
    // Pântano
    fruitScoutSpeed: 0.15 * F("f_pa_1"),
    fruitShriekResist: 0.20 * F("f_pa_2"),    // -20% duração inversão
    fruitEssOrb: 1 * F("f_pa_3"),
    // Deserto
    fruitDmgDeserto: 0.12 * F("f_d_1"),
    fruitPopDeserto: 1 * F("f_d_2"),
    fruitEssDeserto: 0.15 * F("f_d_3"),
    // Outono
    fruitFoodOutono: 0.12 * F("f_o_1"),
    fruitTankHp: 0.18 * F("f_o_2"),
    allHealing: 1 + 0.15 * F("f_o_3"),
    fruitHealOutono: 0.15 * F("f_o_3"),
    // Gelo
    fruitBossDmg: 0.20 * F("f_g_1"),
    fruitSeePalida: F("f_g_2") > 0 ? 1 : 0,
    fruitEra: F("f_g_3") > 0 ? 1 : 0,
  });
}

// PÓS-FINAL — PROFECIAS DA COLÔNIA: vaticínios da Matriarca, recuperados do
// coração de âmbar. Cumprir uma profecia devolve memória (e paga essência).
// Chamada no fim de cada run (settleRun) e ao abrir a tela de profecias
// (run = null para checar só as de estado acumulado).
export function checkProphecies(run, won, info = {}) {
  const P = G.save.prophecies;
  const earned = [];
  const grant = (id) => {
    if (P[id]) return;
    const pr = PROPHECIES.find((q) => q.id === id);
    if (!pr) return;
    P[id] = true;
    G.save.essence += pr.reward;
    earned.push(pr);
  };
  if (run && won) {
    if (run.mode === "campanha") {
      grant("p_primeira");
      if (run.ascension >= 5) grant("p_asc5");
      if (run.ascension >= 10) grant("p_asc10");
      if (run.ascension >= 20) grant("p_asc20");
      if (run.hatched && run.hatched.size >= 11) grant("p_onze");
      if ((info.alive || []).includes("giant")) grant("p_dino");
      if ((info.alive || []).length >= 16) grant("p_nacao");
      if ((run.queenMinHp ?? 1) >= 0.5) grant("p_rainha");
      if (!(run.deaths > 0)) grant("p_imacula");
    }
    if (run.mode === "cacada") grant("p_cacada");
  }
  if (run && run.mode === "sobrevivencia" && (info.cycle || 0) >= 2) grant("p_ciclo3");
  if (run && (run.wave || 0) >= 25) grant("p_ondas25");
  // de estado (valem em qualquer chamada: fim de run ou tela de profecias)
  if (G.save.best.kills >= 1000) grant("p_mil");
  const allNodes = [...META_NODES, ...FRUIT_TREES.flatMap(f=>f.nodes)];
  if (allNodes.filter((n) => metaLevel(n.id) > 0).length >= 15) grant("p_arvore");
  if (allNodes.some((n) => (n.id.startsWith("k_") || n.id.startsWith("f_")) && n.tier===2 && metaLevel(n.id) >= n.cost.length)) grant("p_keystone");
  if ((G.save.era || 0) >= 5) grant("p_era5");
  return earned;
}

// Bônus das mutações ativas da expedição atual -------------------------------
export function mutBonus() {
  const has = (id) => G.run ? G.run.mutations.has(id) : false;
  return {
    has,
    dmg: has("lamina") ? 1.25 : 1,
    speed: has("casulo") ? 1.18 : 1,
    hp: has("exo") ? 1.3 : 1,
    dmgTaken: has("pedra") ? 0.8 : 1,
    queenHp: has("coracao") ? 1.4 : 1,
    queenRegen: has("coracao") ? 3 : 0,
    foodGather: has("fungo") ? 1.35 : 1,
    depositBonus: has("ferment") ? 2 : 0,
    acidSlow: has("acido"),
    acidDmg: has("acido") ? 1.3 : 1,
    ricochet: has("rico"),
    weakenOnHit: has("belico"),
    costMult: has("larvas") ? 0.8 : 1,
    hatchMult: has("larvas") ? 0.7 : 1,
    popCap: has("nobre") ? 6 : 0,
    packDmg: has("fome"),
    thorns: has("brasa") ? 5 : 0,
    crit: has("tornado") ? 0.12 : 0,
    seedDrop: has("semente") ? 0.2 : 0,
    venenoBurn: has("veneno") ? 2 : 0,
    healRateMult: has("nectar") ? 1.5 : 1,
    healRangeMult: has("nectar") ? 1.3 : 1,
    calmMult: has("rapina") ? 0.85 : 1,
  };
}

// Modificadores completos (meta + mutações) ----------------------------------
export function mods() {
  const m = metaBonus(), u = mutBonus();
  return Object.assign(m, {
    dmgAll: m.dmgAll * u.dmg,
    hpAll: m.hpAll * u.hp,
    queenHp: m.queenHp * u.queenHp,
    popCap: m.popCap + u.popCap,
    critChance: m.critChance + u.crit,
    queenRegen: (m.queenRegen || 0) + u.queenRegen,
    muts: u,
  });
}
