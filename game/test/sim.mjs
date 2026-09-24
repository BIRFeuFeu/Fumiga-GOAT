// Teste de cabeça: simula a expedição inteira (6 mapas) fora do browser.
// Uso: node test/sim.mjs  |  FORCE=4 node test/sim.mjs  (vai direto ao mapa 4)
// Verifica invariantes e captura exceções nos caminhos quentes.

// ---------------------------------------------------------------- stubs ----
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: null }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => ({ addColorStop() {} });
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (typeof p === "string" && p in t) return t[p];
      return (...a) => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement(tag) {
    return { width: 0, height: 0, style: {}, getContext: makeCtx };
  },
  getElementById() { return null; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class { constructor() { this.width = 64; this.height = 64; } set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); } };
if (!globalThis.performance) globalThis.performance = { now: () => Date.now() };

// ---------------------------------------------------------------- imports ---
const { genWorld, world } = await import("../js/world.js");
const units = await import("../js/units.js");
const { spawnQueen, spawnAnt, updateAllies, allies, buyUnit } = units;
const en = await import("../js/enemies.js");
const { updateFoes, foes, updateBoss } = en;
const { updateProjectiles, updateOrbs } = await import("../js/combat.js");
const { updateParticles } = await import("../js/particles.js");
const waves = await import("../js/waves.js");
const { resetDirector, updateDirector, director, skipPeace, mapDef, isLastMap, nextMapCalm } = waves;
const { rollDraft, applyMutation } = await import("../js/mutations.js");
const { G, loadSave } = await import("../js/state.js");
const { START, MAPS } = await import("../js/config.js");
// nível/XP do jogo é processado em game.js; aqui mantemos campos coerentes

// ---------------------------------------------------------------- setup -----
loadSave();
if (process.env.TREE_POWERS) {
  const { META_NODES } = await import("../js/config.js");
  for (const n of META_NODES) G.save.nodes[n.id] = n.cost.length;
}
if (process.env.FRUIT_POWERS) {
  const { NEW_FRUIT_NODES } = await import("../js/fruit_skills.js");
  for (const n of NEW_FRUIT_NODES) if (n.map !== "topo") G.save.nodes[n.id]=1;
}
genWorld(123456, 0);

const run = {
  seed: 123456, status: "running",
  food: START.food, essencePool: 0, kills: 0, wave: 0, bestWaveThisRun: 0,
  level: 0, xp: 0, xpNext: 40, fungusT: 9,
  chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  mapsCleared: 0,
  mutations: new Set(), mutationLog: [],
  queenJustHit: 0, banner: null, draft: null, elapsed: 0,
  bossDefeated: false, rebirthUsed: false, mapIdx: 0,
};
G.run = run;
window.__run = run;

const queen = spawnQueen();
window.__alliesQueen = queen;

function relocateColony() {
  const A = world.anthill;
  let k = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const ang = (k * 2.399) + 0.7;
    const d = a.type === "worker" ? 120 : 200;
    a.x = A.x + Math.cos(ang) * (d + (k % 5) * 22);
    a.y = A.y + Math.sin(ang) * (d + (k % 5) * 22);
    a.state = "idle"; a.target = null; a.forcedTarget = null;
    a.pile = null; a.node = null; a.cmdPos = null;
    if (a.def.role !== "worker") a.guardPos = { x: a.x, y: a.y };
    k++;
  }
  queen.x = A.x; queen.y = A.y - 10;
}

for (let i = 0; i < START.workers; i++) {
  spawnAnt("worker", world.anthill.x + 100, world.anthill.y + i * 20 - 40);
}
spawnAnt("soldier", world.anthill.x - 140, world.anthill.y);
spawnAnt("spitter", world.anthill.x, world.anthill.y - 150);
spawnAnt("tank", world.anthill.x, world.anthill.y + 150);
resetDirector();

// FORCE=N (1..6): pula direto para a onda do chefe do mapa N com um exército adequado
if (process.env.FORCE) {
  const target = Math.max(1, Math.min(MAPS.length, parseInt(process.env.FORCE, 10) || 1));
  director.mapIdx = target - 1;
  run.mapIdx = target - 1;
  genWorld(999000 + target, target - 1);
  resetDirector();
  director.mapIdx = target - 1;
  run.mapIdx = target - 1;
  // onda global coerente com a progressão
  let gw = 0;
  for (let i = 0; i < target - 1; i++) gw += MAPS[i].waves.length;
  run.wave = gw;
  run.mapsCleared = target - 1;
  // a próxima onda já é a onda do chefe
  director.waveInMap = MAPS[target - 1].waves.length - 1;
  director.phase = "calm";
  director.timer = 2;
  collaboratorArmy(target);
  relocateColony();
  run.food = 1600;
  const nMut = Math.min(12, target * 2);
  for (let d = 0; d < nMut; d++) {
    const opts = rollDraft();
    if (opts.length) applyMutation(opts[(Math.random() * opts.length) | 0]);
  }
}

function collaboratorArmy(power = 1) {
  const A = world.anthill;
  const nSold = 10 + power * 4, nSpit = 5 + power * 2, nTank = 3 + power;
  for (let i = 0; i < nSold; i++) {
    const a = spawnAnt("soldier", A.x + (i % 8) * 36 - 126, A.y + ((i / 8) | 0) * 44 - 60);
    a.selected = false;
  }
  for (let i = 0; i < nSpit; i++) spawnAnt("spitter", A.x + (i % 7) * 32 - 96, A.y - 130);
  for (let i = 0; i < nTank; i++) spawnAnt("tank", A.x + (i % 4) * 40 - 60, A.y + 140);
  for (let i = 0; i < 3; i++) spawnAnt("scout", A.x + (i % 3) * 30 - 30, A.y - 170);
  for (let i = 0; i < 2 + Math.floor(power / 2); i++) spawnAnt("healer", A.x + i * 30 - 30, A.y + 60);
  for (let i = 0; i < 1 + Math.floor(power / 2); i++) spawnAnt("bomber", A.x + i * 30 - 30, A.y - 90);
  spawnAnt("giant", A.x + 260, A.y + 260);   // o colosso vem junto
}

// --------------------------------------------------------------- semente ----
// O "jogador" simulado (compras, rali, mutações) e alguns efeitos usam
// Math.random(): sem semente fixa o desfecho mudava a cada execução e em
// algumas rodadas a colônia nem vencia nem era derrotada em 90 min simulados —
// a bateria do CI ficava instável (vermelho sem haver regressão). Com uma
// semente determinística o teste cobre exatamente os mesmos caminhos e sempre
// dá o mesmo resultado. SEED=<n> roda com outra semente para investigar.
const SEED = Number(process.env.SEED || 0x5eed1a) >>> 0;
let _rng = SEED;
Math.random = function () {                       // mulberry32
  _rng = (_rng + 0x6D2B79F5) >>> 0;
  let t = _rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------- simul -----
const DT = 1 / 60;
let simT = 0, step = 0, frames = 0;
const stats = { minFood: Infinity, maxAllies: 0, maxFoes: 0 };
let drafted = 0;
const bossesSeen = new Set();
const MAX_STEPS = 60 * 60 * 90; // até 90 min simulados
const outside = []; // lista filtrada (!inside), reconstruída a cada passo

try {
  while (simT < 60 * 90 && run.status === "running" && frames < MAX_STEPS) {
    step++;
    simT += DT;
    run.elapsed += DT;
    window.__run = run;

    updateDirector(DT);
    updateAllies(DT, foes);
    // Contrato igual ao worldTick (game.js): inimigos e projéteis só enxergam
    // quem está FORA — quem está dentro do ninho é outra cena (nest.js) e fica
    // inalcançável (sem isso, inimigos cercam a porta para sempre e a onda
    // nunca termina quando a colônia inteira se abriga).
    outside.length = 0;
    for (const a of allies) if (!a.inside) outside.push(a);
    outside.queen = allies.queen;
    updateFoes(DT, outside);
    if (en.boss) { bossesSeen.add(en.boss.kind); updateBoss(DT, outside); }
    updateProjectiles(DT, outside, foes);
    const g = updateOrbs(DT, world.anthill, queen && !queen.dead);
    if (g > 0) run.essencePool += g;
    updateParticles(DT);

    // transição de mapa (como o botão "AVANÇAR" da tela)
    if (director.phase === "mapClear") {
      if (isLastMap()) { /* vitória vem do bossDefeated abaixo */ }
      else {
        director.mapIdx++;
        run.mapIdx = director.mapIdx;
        genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
        en.clearFoes();
        relocateColony();
        if (queen && !queen.dead) queen.hp = Math.min(queen.maxHp, queen.hp + queen.maxHp * 0.4);
        nextMapCalm();
      }
    }

    // comportamento do "jogador" simulado
    if (step % 150 === 0 && director.phase === "wave") {
      units.rallyDefenders(world.anthill);
    }
    if (step % 36 === 0) {
      const workers = allies.filter(a => !a.dead && a.type === "worker").length;
      const fighters = allies.filter(a => !a.dead && a.type !== "worker").length;
      let want = null;
      if (workers >= 6 && step > 1200 && run.food > 360 && units.unitLimitLeft("giant")) want = "giant";
      else if (workers < 7) want = "worker";
      else if (fighters < workers * 1.6 && fighters < 30) {
        const r = Math.random();
        want = r < 0.42 ? "soldier" : r < 0.7 ? "spitter" : r < 0.8 ? "tank"
          : r < 0.88 ? "bomber" : r < 0.94 ? "scout" : "healer";
      } else if (workers < 9) {
        want = Math.random() < 0.5 ? "worker" : "gatherer";
      }
      if (want && run.food > 45) buyUnit(want);
      if (director.phase === "calm" && director.timer > 4) skipPeace();
      if (director.pendingDrafts > 0) {
        director.pendingDrafts--;
        const opts = rollDraft();
        if (opts.length) { applyMutation(opts[(Math.random() * opts.length) | 0]); drafted++; }
      }
    }
    if (process.env.DEBUG && step % 60 === 0) {
      console.log("t=" + simT.toFixed(0), "fase=" + director.phase,
        "mapa=" + (director.mapIdx + 1), "ondaMapa=" + director.waveInMap,
        "ondaGlobal=" + run.wave,
        "budget=" + director.budget.toFixed(1), "vivos=" + foes.filter(e => !e.dead).length,
        "timer=" + director.timer.toFixed(1), "draftPend=" + director.pendingDrafts);
      if (en.boss) console.log("   BOSS", JSON.stringify({ kind: en.boss.kind, hp: en.boss.hp | 0, sub: en.boss.sub, t: en.boss.t }));
    }
    if (step % 600 === 0 && enemiesAlive(foes) === 0 && director.phase === "calm" && run.food > 300) {
      buyUnit("soldier");
    }

    // fim de jogo
    if (queen.hp <= 0 && !queen.dead) { queen.dead = true; run.status = "lost"; }
    if (run.bossDefeated && isLastMap() && run.bossDefeated === mapDef().boss) run.status = "won";
    // modo FORCE: objetivo é o chefe do mapa alvo — encerra quando ele cai
    if (process.env.FORCE && run.bossDefeated === MAPS[Math.max(1, Math.min(MAPS.length, parseInt(process.env.FORCE, 10) || 1)) - 1].boss
        && director.phase !== "wave") {
      run.status = "forced-pass";
      break;
    }

    stats.minFood = Math.min(stats.minFood, run.food);
    stats.maxAllies = Math.max(stats.maxAllies, allies.filter(a => !a.dead).length);
    stats.maxFoes = Math.max(stats.maxFoes, enemiesAlive(foes));
    stats.giants = Math.max(stats.giants || 0, allies.filter(a => a.type === "giant" && !a.dead).length);
  }
} catch (e) {
  console.error("FALHA na simulação @", simT.toFixed(1) + "s, mapa", director.mapIdx + 1, "onda", run.wave);
  console.error(e.stack);
  process.exit(1);
}

function enemiesAlive(f) { let n = 0; for (const e of f) if (!e.dead) n++; return n; }

if (process.env.DEBUG) {
  console.log("\n--- inimigos restantes ---");
  for (const f of foes.slice(0, 10)) console.log(f.type, "pos", f.x | 0, f.y | 0, "hp", f.hp);
  console.log("--- aliadas amostras ---");
  for (const a of allies.filter(a => !a.dead).slice(0, 8)) console.log(a.type, "pos", a.x | 0, a.y | 0, "estado", a.state, "hp", a.hp);
}

// ---------------------------------------------------------------- report ----
const mins = (simT / 60).toFixed(1);
console.log("\n======================== RELATÓRIO ========================");
console.log("Tempo simulado:", mins + "min", " status:", run.status);
console.log("Mapa:", (director.mapIdx + 1) + "/" + MAPS.length, " mapas limpos:", run.mapsCleared, " onda global:", run.wave);
console.log("Abates:", run.kills, " comida:", run.food, " essência:", run.essencePool);
console.log("Aliadas vivas:", allies.filter(a => !a.dead).length, " pico:", stats.maxAllies,
  " gigantes (pico):", stats.giants || 0);
console.log("Inimigos vivos:", enemiesAlive(foes), " pico:", stats.maxFoes);
console.log("Drafts aplicados:", drafted, " mutações:", [...run.mutations].join(","));
console.log("Rainha:", queen.hp + "/" + queen.maxHp, " viva:", !queen.dead);
console.log("Bosses vistos:", [...bossesSeen].join(", ") || "nenhum", " derrotado:", run.bossDefeated || "não");
console.log("===========================================================");

const problems = [];
if (run.status === "running") {
  if (process.env.FORCE) problems.push("simulação não terminou no modo FORCE");
  else problems.push("simulação não terminou (nem vitória nem derrota)");
}
if (run.wave === 0) problems.push("nenhuma onda começou");
if (run.essencePool === 0 && run.kills > 10) problems.push("essência nunca acumulou apesar de abates");
if (!(queen.maxHp > 0)) problems.push("rainha sem vida máxima");
if (Number.isNaN(run.food) || Number.isNaN(queen.hp)) problems.push("NaN detectado");
if (process.env.FORCE) {
  const target = Math.max(1, Math.min(MAPS.length, parseInt(process.env.FORCE, 10) || 1));
  const want = MAPS[target - 1].boss;
  if (!bossesSeen.has(want)) problems.push(`chefe ${want} nunca apareceu (vistos: ${[...bossesSeen]})`);
}
if (problems.length) { console.error("PROBLEMAS:", problems); process.exit(2); }
console.log("SIMULAÇÃO PASSOU SEM EXCEÇÕES");
