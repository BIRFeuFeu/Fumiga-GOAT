// ============================================================================
// FUMIGA-GOAT — estado global do jogo + persistência
// ============================================================================
import { META_NODES } from "./config.js";

const SAVE_KEY = "fumiga_goat_save_v1";

// G: singleton mutável compartilhado por todos os módulos ---------------------
export const G = {
  screen: "BOOT",        // BOOT TITLE TREE RUN HELP
  time: 0,               // relógio global (s)
  timeScale: 1,          // slow-mo de morte/vitória
  slowMo: 0,

  // progresso meta (persistente)
  save: {
    essence: 0, nodes: {},
    best: { wave: 0, kills: 0, wins: 0, runs: 0, maps: 0 },
    tutorial: 0,         // 1 = tutorial concluído (ou pulado)
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
        G.save.tutorial = data.tutorial ? 1 : 0;
      }
    }
  } catch (e) { /* armazenamento indisponível: segue sem persistência */ }
}

export function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { /* ok */ }
}

// ------------------------------------------------------------------- meta ---
export function metaLevel(id) { return G.save.nodes[id] | 0; }

export function metaNode(id) { return META_NODES.find((n) => n.id === id); }

export function metaCanBuy(id) {
  const node = metaNode(id);
  if (!node) return { ok: false, why: "?" };
  const lvl = metaLevel(id);
  if (lvl >= node.cost.length) return { ok: false, why: "MÁX" };
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
  persistSave();
  return true;
}

// Bônus derivados da árvore de evolução --------------------------------------
export function metaBonus() {
  const L = metaLevel;
  return {
    foodBonus: 1 + 0.15 * L("t_col"),
    workerSpeed: 1 + 0.10 * L("t_vel"),
    workerCarry: L("t_carga"),
    startWorkers: 2 * L("t_ini"),
    crystalYield: 2 * L("t_ambar"),
    dmgAll: 1 + 0.10 * L("g_dan"),
    hpAll: 1 + 0.12 * L("g_vid"),
    critChance: 0.04 * L("g_cri"),
    startSoldiers: L("g_grd"),
    queenHp: 1 + 0.15 * L("r_vida"),
    queenEatRate: Math.pow(0.7, L("r_reg")),
    hatchSpeed: Math.pow(0.88, L("r_ovo")),
    popCap: 4 * L("r_pop"),
    essMult: 1 + 0.15 * L("r_ess"),
    rebirth: L("r_ren") > 0,
  };
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
    muts: u,
  });
}
