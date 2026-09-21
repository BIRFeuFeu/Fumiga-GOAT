// Teste do PÓS-FINAL: ASCENSÃO DA NÉVOA + PROFECIAS + ERAS.
// Garante que o fator replay é de verdade:
//   1. ascMods() — modificadores lineares + marcos de rampa nos níveis certos;
//   2. PROPHECIES/ERA_LINES — ids únicos, recompensas e glifos que a fonte tem;
//   3. a horda e os chefes escalam com a ASCENSÃO (spawnEnemy/spawnBoss);
//   4. checkProphecies() concede uma única vez, com trade correto;
//   5. settleRun() — essência extra, destravamento de nível, ERA e prophecias.
// Uso: node test/prophecy.mjs
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 0, height: 0 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "setLineDash") return () => {};
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return (...a) => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
const fakeCanvas = { width: 960, height: 540, style: {}, getContext: makeCtx, addEventListener() {} };
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return fakeCanvas; },
  addEventListener() {}, fonts: { load: () => Promise.resolve() },
  createElementNS() { return { getContext: makeCtx }; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
globalThis.performance = globalThis.performance || { now: () => Date.now() };
process.on("unhandledRejection", (e) => { console.error("UNHANDLED-REJ", e && e.stack || e); process.exit(9); });
process.on("uncaughtException", (e) => { console.error("UNCAUGHT", e && e.stack || e); process.exit(9); });

const BASE = "/home/user/Fumiga-GOAT/game/js";
const { ascMods, ascLabel, ASC_MAX, PROPHECIES, ERA_LINES, BOSSES } = await import(BASE + "/config.js");
const { FONT_CHARS } = await import(BASE + "/font.js");
const { G, checkProphecies } = await import(BASE + "/state.js");
const { world, genWorld } = await import(BASE + "/world.js");
const en = await import(BASE + "/enemies.js");
const { settleRun } = await import(BASE + "/game.js");

const problems = [];
const ok = (msg) => console.log("ok    " + msg);
const bad = (msg) => { problems.push(msg); console.log("ERRO  " + msg); };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ----------------------------------------------------- 1) ascMods + marcos --
const m0 = ascMods(0), m5 = ascMods(5), m20 = ascMods(20);
if (ASC_MAX !== 20) bad("ASC_MAX deveria ser 20");
if (!(m0.hp === 1 && m0.dmg === 1 && m0.ess === 1 && m0.budget === 1 && m0.calm === 1 && m0.foodMult === 1))
  bad("ascMods(0) não é neutro: " + JSON.stringify(m0));
if (!near(m20.hp, 2.6) || !near(m20.dmg, 1.8) || !near(m20.ess, 4)) bad("escala linear nv20 errada: " + JSON.stringify(m20));
if (!near(ascMods(1).budget, 1) || !near(ascMods(2).budget, 1.1) || !near(ascMods(17).budget, 1.25))
  bad("marco de orçamento (nv2/nv17) errado");
if (!near(ascMods(4).speed, 1) || !near(m5.speed, 1.06)) bad("marco de pressa (nv5) errado");
if (!near(ascMods(10).calm, 1) || !near(ascMods(11).calm, 0.7)) bad("marco de calmaria (nv11) errado");
if (!near(ascMods(13).foodMult, 1) || !near(ascMods(14).foodMult, 0.85)) bad("marco de colheita (nv14) errado");
if (!near(ascMods(7).bossDmg, 1) || !near(ascMods(8).bossDmg, 1.15)) bad("marco de chefes cruéis (nv8) errado");
if (!near(m20.bossHp, 2.45)) bad("NÉVOA PLENA (nv20) sem o +25% de vida de chefe");
if (ascLabel(0) !== "A BRUMA DORME" || ascLabel(8) !== "CHEFES CRUÉIS" || ascLabel(20) !== "A NÉVOA PLENA")
  bad("ascLabel errado: " + ascLabel(0) + "/" + ascLabel(8) + "/" + ascLabel(20));
if (!near(ascMods(30).ess, ascMods(20).ess) || !near(ascMods(-3).ess, 1)) bad("ascMods não trava em [0, 20]");
ok("ascMods: linear + marcos de rampa (nv2/5/8/11/14/17/20) e teto " + ASC_MAX);

// ------------------------------------------- 2) dados: ids, glifos, recompensas --
const glyphs = new Set([...FONT_CHARS.toUpperCase(), " "]);
const glyphOk = (s) => [...String(s).toUpperCase()].every((c) => glyphs.has(c));
if (PROPHECIES.length !== 16) bad("esperava 16 profecias, achei " + PROPHECIES.length);
const ids = new Set(PROPHECIES.map((p) => p.id));
if (ids.size !== PROPHECIES.length) bad("ids de profecias repetidos");
for (const p of PROPHECIES) {
  if (!(p.reward > 0)) bad(p.id + ": recompensa inválida");
  if (!glyphOk(p.name) || !glyphOk(p.desc)) bad(p.id + ": glifo fora do atlas em \"" + p.name + "\" / \"" + p.desc + "\"");
}
if (ERA_LINES.length !== 10 || ERA_LINES.some((l) => !glyphOk(l))) bad("ERA_LINES com problema (10 linhas, glifos)");
ok(PROPHECIES.length + " profecias + " + ERA_LINES.length + " eras — ids únicos, recompensas e glifos OK");
if (G.save.ascension !== 0 || G.save.era !== 0 || !G.save.prophecies) bad("save novo não começa com ascensão/era/profecias zeradas");

// ------------------------------------------------- 3) horda e chefes escalam --
genWorld(3, 0);
G.run = { ascension: 0 };
const e0 = en.spawnEnemy("runner", world.anthill.x + 200, world.anthill.y, 1);
en.clearFoes();
G.run = { ascension: 20 };
const e20 = en.spawnEnemy("runner", world.anthill.x + 200, world.anthill.y, 1);
if (!(e20.hp > e0.hp && e20.dmg > e0.dmg)) bad("horda não escala: hp " + e0.hp + ">" + e20.hp);
if (e20.hp !== Math.round(e0.hp * 2.6)) bad("vida da horda no nv20: " + e20.hp + " (esperado " + Math.round(e0.hp * 2.6) + ")");
en.clearFoes();
const hare = BOSSES.hare;
const b20 = en.spawnBoss("hare", 1);
if (b20.hp !== Math.round(hare.hp * 2.45)) bad("chefe nv20: hp " + b20.hp + " (esperado " + Math.round(hare.hp * 2.45) + ")");
if (b20.def.dmg !== Math.round(hare.dmg * 1.15) || b20.def.dashDmg !== Math.round(hare.dashDmg * 1.15))
  bad("chefe nv20: golpes não escalaram (dmg " + b20.def.dmg + ", dash " + b20.def.dashDmg + ")");
en.clearFoes();
G.run = null;
ok("ASCENSÃO nv20: horda x2,6 de vida e chefe com " + b20.hp + " de HP (golpes +15%)");

// ------------------------------------------------ 4) checkProphecies (unitário) --
const TIPOS11 = ["worker", "gatherer", "scout", "soldier", "trapjaw", "spitter", "bomber", "tank", "healer", "weaver", "giant"];
G.save.essence = 0; G.save.prophecies = {}; G.save.nodes = {}; G.save.era = 0;
G.save.best = { wave: 0, kills: 0, wins: 1, runs: 1, maps: 0 };
const rico = { mode: "campanha", ascension: 5, hatched: new Set(TIPOS11), queenMinHp: 0.8, wave: 30, deaths: 1 };
const vivos = [...TIPOS11, "worker", "worker", "soldier", "soldier", "healer"]; // 16 vivas
const ganhas = checkProphecies(rico, true, { alive: vivos, cycle: 0 });
const esperadas = ["p_primeira", "p_asc5", "p_onze", "p_dino", "p_nacao", "p_rainha", "p_ondas25"];
for (const id of esperadas) if (!ganhas.some((p) => p.id === id)) bad("profecia " + id + " não foi concedida");
if (ganhas.some((p) => p.id === "p_imacula")) bad("FLOR IMACULADA concedida com mortes");
if (ganhas.some((p) => p.id === "p_asc10")) bad("ASC10 concedida na ascensão 5");
const soma = ganhas.reduce((s, p) => s + p.reward, 0);
if (G.save.essence !== soma) bad("essência das profecias: " + G.save.essence + " (esperado " + soma + ")");
if (checkProphecies(rico, true, { alive: vivos, cycle: 0 }).length !== 0) bad("profecia concedida duas vezes");
if (G.save.essence !== soma) bad("reconferir pagou de novo");
const sobrev = { mode: "sobrevivencia", wave: 9, deaths: 5 };
const g2 = checkProphecies(sobrev, false, { cycle: 2 });
if (!g2.some((p) => p.id === "p_ciclo3")) bad("CICLO 3 não concedido na sobrevivência");
G.save.best.kills = 1000; G.save.nodes = { k_bala: 3 };
const g3 = checkProphecies(null, false, null);
if (!g3.some((p) => p.id === "p_mil") || !g3.some((p) => p.id === "p_keystone")) bad("profecias de estado (p_mil/p_keystone) não concedem");
ok("checkProphecies: 7 profecias de run + ciclo + estado, sem pagamento duplo");

// ----------------------------------------------------------- 5) settleRun --
G.save.essence = 0; G.save.prophecies = {}; G.save.nodes = {}; G.save.ascension = 0; G.save.era = 0;
G.save.best = { wave: 0, kills: 0, wins: 1, runs: 1, maps: 0 };
const mkRun = (over) => Object.assign({
  payoutDone: false, payout: null, status: "won", mode: "campanha",
  modeDef: { id: "campanha", name: "CAMPANHA" },
  mapsCleared: 6, wave: 25, kills: 100, essencePool: 500,
  ascension: 0, hatched: new Set(), queenMinHp: 1, deaths: 3,
  endless: false, bossRush: false, mutations: new Set(), mutationLog: [],
}, over);
// 1ª vitória: nv0 — destrava a ASCENSÃO 1 e abre a ERA 1
G.run = mkRun({});
settleRun();
const p1 = G.run.payout;
if (p1.total !== 1510) bad("payout base: " + p1.total + " (esperado 1510)");
if (p1.ascension !== 0 || p1.ascMult !== 1) bad("payout ascensão nv0: " + JSON.stringify({ a: p1.ascension, m: p1.ascMult }));
if (G.save.ascension !== 1) bad("vencer no nv0 deveria destravar a ASCENSÃO 1 (ficou " + G.save.ascension + ")");
if (G.save.era !== 1) bad("vencer a campanha deveria abrir a ERA 1 (ficou " + G.save.era + ")");
const premios1 = (p1.prophecies || []).reduce((s, p) => s + p.reward, 0);
if (G.save.essence !== p1.total + premios1) bad("essência do fim de run: " + G.save.essence);
if (!(p1.prophecies || []).some((p) => p.id === "p_primeira")) bad("settleRun não concedeu O PRIMEIRO DEGRAU");
ok("1ª vitória: payout " + p1.total + " + " + premios1 + " de profecias, ASCENSÃO 1 destravada, ERA 1");

// 2ª vitória: nv1 — essência x1,15 e destrava a ASCENSÃO 2
G.run = mkRun({ ascension: 1, deaths: 2, payoutDone: false, payout: null });
settleRun();
const p2 = G.run.payout;
if (p2.ascMult !== 1.15) bad("ascMult nv1: " + p2.ascMult);
if (p2.total !== Math.round(1510 * 1.15)) bad("payout nv1: " + p2.total);
if (G.save.ascension !== 2) bad("vencer no nv1 deveria destravar a ASCENSÃO 2 (ficou " + G.save.ascension + ")");
if (G.save.era !== 2) bad("ERA deveria ser 2 (ficou " + G.save.era + ")");
ok("2ª vitória (nv1): essência x1,15 = " + p2.total + ", ASCENSÃO 2 destravada, ERA 2");

// derrota: não avança era nem ascensão
G.run = mkRun({ status: "lost", payoutDone: false, payout: null });
settleRun();
if (G.save.era !== 2 || G.save.ascension !== 2) bad("derrota mexeu em era/ascensão");
ok("derrota não avança ERA nem ASCENSÃO (e ainda paga a essência do run)");

console.log(problems.length ? "\nPROBLEMAS: " + problems.join(" | ") : "\nPÓS-FINAL OK — ASCENSÃO, PROFECIAS E ERAS PASSARAM");
process.exit(problems.length ? 2 : 0);
