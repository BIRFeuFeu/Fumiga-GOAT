// ============================================================================
// FUMIGA-GOAT — mutações da expedição (draft roguelite 1-de-3)
// ============================================================================
import { MUTATIONS, RARITY } from "./config.js";
import { G } from "./state.js";
import { pick } from "./utils.js";
import { SFX } from "./audio.js";
import { recomputeAllies, recomputeQueen } from "./units.js";

export function rollDraft() {
  const owned = G.run.mutations;
  const pool = MUTATIONS.filter(m => !owned.has(m.id));
  const out = [];
  const local = pool.slice();
  while (out.length < 3 && local.length > 0) {
    // sorteia raridade
    let r = Math.random() * 100, rar = 0;
    if (r < RARITY[0].w) rar = 0;
    else if (r < RARITY[0].w + RARITY[1].w) rar = 1;
    else rar = 2;
    let cands = local.filter(m => m.rar === rar);
    if (cands.length === 0) cands = local;
    const c = pick(cands);
    local.splice(local.indexOf(c), 1);
    out.push(c);
  }
  return out;
}

export function applyMutation(m) {
  const run = G.run;
  run.mutations.add(m.id);
  run.mutationLog.push(m);
  // recalcula atributos de TODAS as aliadas com os novos modificadores
  recomputeAllies();
  recomputeQueen();
  SFX.chime();
}

export function mutationList() {
  return G.run ? G.run.mutationLog : [];
}
