// ============================================================================
// FUMIGA — diretor de ondas com progressão de MAPAS (estilo Dead Cells):
// calmaria → horda → draft → ... → CHEFÃO DE MAPA → transição → próximo bioma
// ============================================================================
import { MAPS, CALM_START, CALM_BETWEEN, SKIP_BONUS, XP_WAVE_BASE, XP_WAVE_PER } from "./config.js";
import { G, mods } from "./state.js";
import { world, randGate } from "./world.js";
import { rand, irand, pick, chance } from "./utils.js";
import { spawnEnemy, unlockedTypes, foes, boss, spawnBoss, clearFoes } from "./enemies.js";
import { floatText, ring } from "./particles.js";
import { SFX, setCombat } from "./audio.js";
import { tutEvent } from "./tutorial.js";

export const director = {
  phase: "calm",       // calm | wave | mapClear | done
  mapIdx: 0,           // mapa atual (0..MAPS.length-1)
  waveInMap: 0,        // onda atual dentro do mapa (0 = calmaria inicial)
  timer: CALM_START,
  timerMax: CALM_START, // duração total da calmaria atual (anel de contagem do HUD)
  budget: 0,
  budgetMax: 0,        // orçamento total da onda (barra de progresso do HUD)
  spawnT: 0,
  pendingDrafts: 0,
  bossSpawned: false,
  inactivity: 0,
};

export function resetDirector() {
  director.phase = "calm";
  director.mapIdx = 0;
  director.waveInMap = 0;
  director.timer = CALM_START;
  director.timerMax = CALM_START;
  director.budget = 0;
  director.budgetMax = 0;
  director.spawnT = 0;
  director.pendingDrafts = 0;
  director.bossSpawned = false;
  director.inactivity = 0;
}

// "peso" de cada tipo de inimigo no orçamento/ameaça da onda (usado no spawn
// e na barra de progresso do HUD — quanto falta varrer da invasão)
const THREAT_PTS = { runner: 1, swarm: 1.5, reaper: 2.5, espitter: 3, warrior: 4, sentinel: 7, matron: 14 };

/** Fração da calmaria RESTANTE (1 = acabou de começar, 0 = invasão iminente). */
export function calmFrac() {
  return director.timerMax > 0 ? Math.max(0, Math.min(1, director.timer / director.timerMax)) : 0;
}

/** Ameaça que ainda falta enfrentar: orçamento não gasto + inimigos vivos. */
function waveThreatLeft() {
  let left = Math.max(0, director.budget);
  for (const f of foes) if (!f.dead) left += f.isBoss ? 14 : (THREAT_PTS[f.type] || 1);
  return left;
}

/** Progresso da onda (0 = início, 1 = varrida) para a barra do HUD. */
export function waveProgress() {
  if (director.phase !== "wave" || director.budgetMax <= 0) return 0;
  const p = 1 - waveThreatLeft() / director.budgetMax;
  return Math.max(0, Math.min(1, p));
}

export function mapDef() { return MAPS[Math.min(director.mapIdx, MAPS.length - 1)]; }
export function waveDef() { const m = mapDef(); return m.waves[Math.min(director.waveInMap - 1, m.waves.length - 1)]; }
export function isLastMap() { return director.mapIdx >= MAPS.length - 1; }

export function skipPeace() {
  if (director.phase !== "calm") return 0;
  const bonus = director.waveInMap === 0 && director.mapIdx === 0
    ? 0 : SKIP_BONUS + mods().skipBonus;
  director.timer = Math.min(director.timer, 0.01);
  if (bonus > 0) {
    const run = window.__run;
    run.essencePool += bonus;
    floatText(world.anthill.x, world.anthill.y - 100, "+" + bonus + " ESSÊNCIA (INVOCAÇÃO)", { color: "#c77dff", life: 1.4 });
  }
  return bonus;
}

export function updateDirector(dt) {
  const run = window.__run;
  if (run.status !== "running") return;
  setCombat(foes.length > 0 ? Math.min(1, 0.4 + foes.length / 30) : 0);

  switch (director.phase) {
    case "calm": {
      director.timer -= dt;
      if (director.timer <= 0) startWave();
      break;
    }
    case "wave": {
      spawnLogic(dt);
      const w = waveDef();
      const bossAlive = w.boss && (boss && !boss.dead);
      const bossDying = w.boss && boss && boss.dying > 0;
      const m = mapDef();
      // válvula antifuro: rodagem muito longa com poucos inimigos => limpa restantes
      if (director.budget <= 0 && !bossAlive && !bossDying && foes.length > 0 && foes.length <= 6) {
        director.inactivity += dt;
        if (director.inactivity > 26) {
          floatText(world.anthill.x, world.anthill.y - 120, "A COLÔNIA EXPELE OS INVASORES", { color: "#37e6c8", life: 2 });
          for (const f of foes.slice()) if (!f.dead && !f.isBoss) f.takeDamage(99999, "ally");
          director.inactivity = 0;
        }
      } else director.inactivity = 0;
      if (director.budget <= 0 && foes.length === 0 && !bossAlive && !bossDying) endWave();
      break;
    }
  }
}

function startWave() {
  const run = window.__run;
  director.waveInMap++;
  run.wave++;
  const m = mapDef();
  const w = m.waves[director.waveInMap - 1];
  director.phase = "wave";
  director.budget = w.budget;
  director.budgetMax = w.budget;
  director.spawnT = 0.5;
  run.banner = { title: "ONDA " + director.waveInMap + "/" + m.waves.length + " — " + w.title, sub: w.tip || "", t: 3.2 };
  SFX.horn();
  tutEvent("waveStart");
  if (w.boss && !director.bossSpawned) {
    director.bossSpawned = true;
    spawnBoss(m.boss, run.wave);
    run.banner.title = "CHEFÃO DE MAPA — " + w.title;
    run.banner.sub = w.tip || "Algo imenso se aproxima...";
  }
}

function spawnLogic(dt) {
  // troco de orçamento menor que a unidade mais barata: encerra a onda
  if (director.budget > 0 && director.budget < 1) director.budget = 0;
  director.spawnT -= dt;
  if (director.spawnT > 0 || director.budget <= 0) return;
  const run = window.__run;
  const wN = run.wave;
  // ritmo: enche mais rápido conforme a onda global sobe
  const base = Math.max(1.3, 2.9 - wN * 0.06);
  director.spawnT = rand(base, base + 1.4);

  const types = unlockedTypes(wN);
  const gate = randGate();
  const squad = irand(1, 2 + Math.floor(wN / 6));

  for (let i = 0; i < squad && director.budget > 0; i++) {
    let type = runner_pick(types, wN);
    const pts = THREAT_PTS[type] || 1;
    if (pts > director.budget) continue;
    director.budget -= pts;
    const ex = gate.x + rand(-46, 46), ey = gate.y + rand(-46, 46);
    spawnEnemy(type, ex, ey, wN);
    ring(ex, ey, { r0: 4, r1: 30, life: 0.4, color: "#a32e46", width: 2 });
  }
}

function runner_pick(types, wN) {
  const w = { runner: 10, swarm: 8, reaper: 4, espitter: 3, warrior: 3, sentinel: 1.6, matron: 0.7 };
  const scale = { runner: Math.max(0.25, 1 - wN * 0.025), swarm: 1, reaper: 1 + wN * 0.012, espitter: 1 + wN * 0.01, warrior: 1 + wN * 0.018, sentinel: 1 + wN * 0.028, matron: 1 + wN * 0.02 };
  let total = 0;
  for (const t of types) total += (w[t] || 1) * (scale[t] || 1);
  let r = Math.random() * total;
  for (const t of types) {
    r -= (w[t] || 1) * (scale[t] || 1);
    if (r <= 0) return t;
  }
  return "runner";
}

function endWave() {
  const run = window.__run;
  const w = waveDef();
  const m = mapDef();
  const reward = run.wave * 6;
  run.essencePool += reward;
  run.xp += Math.round((XP_WAVE_BASE + XP_WAVE_PER * run.wave) * mods().xpGain);
  tutEvent("waveEnd");
  SFX.waveDone();
  if (run.wave > run.bestWaveThisRun) run.bestWaveThisRun = run.wave;

  if (w.boss) {
    // ----------------------------- MAPA LIMPO! -----------------------------
    run.mapsCleared++;
    director.phase = "mapClear";
    director.pendingDrafts++; // mutação como recompensa do chefão
    return;
  }

  floatText(world.anthill.x, world.anthill.y - 100, "ONDA REPELIDA! +" + reward + " ESSÊNCIA", {
    color: "#37e6c8", life: 2, scale: 1,
  });
  // draft intermediário (marcado na config da onda)
  if (w.draftAfter && run.mutations.size < 12) {
    director.pendingDrafts++;
  }
  director.phase = "calm";
  director.timer = CALM_BETWEEN * mods().muts.calmMult;
  director.timerMax = director.timer;
  director.bossSpawned = false;
  director.inactivity = 0;
}

/** Chamado por game.js quando o jogador confirma a transição de mapa. */
export function nextMapCalm() {
  director.phase = "calm";
  director.timer = 16;
  director.timerMax = 16;
  director.waveInMap = 0;
  director.bossSpawned = false;
  director.budget = 0;
  director.inactivity = 0;
}
