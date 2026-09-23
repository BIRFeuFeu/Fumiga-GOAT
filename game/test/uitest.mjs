// Teste de integração headless (mock de DOM): percorre boot → pretitle → título → modo → run
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = new URL("../js", import.meta.url).pathname;
await import(BASE + "/main.js");
await wait(2500);
const { mouse, pressed } = await import(BASE + "/input.js");
const { G } = await import(BASE + "/state.js");
const waves = await import(BASE + "/waves.js");
const en = await import(BASE + "/enemies.js");
const units = await import(BASE + "/units.js");
const { world } = await import(BASE + "/world.js");
console.log("screen:", G.screen);
const problems = [];
const expect = (cond, msg) => { console.log((cond ? "ok  " : "ERRO") + "  " + msg); if (!cond) problems.push(msg); };

// ---- PRETITLE -> TITLE (clique para jogar)
if (G.screen === "PRETITLE") {
  mouse.x = 480; mouse.y = 270; mouse.down = mouse.justDown = true;
  await wait(60);
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40);
  mouse.justUp = false;
  await wait(800);
}
expect(G.screen === "TITLE", "foi para TITLE após pretitle");

// ---- TITLE -> MODE (botão JOGAR)
mouse.x = 200; mouse.y = 275; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(800);
expect(G.screen === "MODE", "foi para MODE após clicar JOGAR");

// ---- MODE -> RUN (primeiro card)
mouse.x = 114; mouse.y = 282; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(800);
expect(G.screen === "RUN", "run iniciou via seleção de modo");
expect(units.allies.filter(a => !a.dead).length >= 5,
  "esquadrão inicial 2 op. + 2 colet. + 1 explor. (vivas: " + units.allies.filter(a => !a.dead).length + ")");
expect(units.allies.filter(a => a.type === "worker").length >= 2, "pelo menos 2 operárias");
expect(units.allies.filter(a => a.type === "gatherer").length >= 2, "pelo menos 2 coletoras");
expect(units.allies.filter(a => a.type === "scout").length >= 1, "pelo menos 1 exploradora");
expect(!!G.run.chambers && G.run.xpNext > 0, "campos chambers/xp inicializados");

// A introdução é parte do início real: primeiro lê/avança os três painéis.
// Não testar gameplay enquanto a cutscene está pausando a expedição.
const { isCutsceneActive } = await import(BASE + "/cutscenes.js");
expect(isCutsceneActive(), "Noite Branca abriu na primeira expedição");
const elapsedBeforeIntro = G.run.elapsed;
await wait(120);
expect(G.run.elapsed === elapsedBeforeIntro, "introdução pausa a simulação");
for (let i = 0; i < 6 && isCutsceneActive(); i++) {
  pressed.Enter = true;
  await wait(60);
  pressed.Enter = false;
  await wait(40);
}
expect(!isCutsceneActive(), "ENTER mostra o texto e avança os três painéis até jogar");
await wait(120);
expect(G.run.elapsed > elapsedBeforeIntro, "expedição começou após a introdução");

// ---- onda + chefe
waves.skipPeace();
await wait(300);
expect(waves.director.phase === "wave", "onda iniciada");
en.spawnBoss(G.run ? waves.mapDef().boss : "hare", G.run.wave);
await wait(400);
expect(!!en.boss, "chefe presente: " + (en.boss && en.boss.kind));

// ---- HUD loja (coordenadas espelham o HUD compacto do rework: toggle 92 px,
// cards de 38 px em pitch 42, fileira de 64 px de altura colada no rodapé;
// 11 classes em 4 grupos com respiro de 12 px entre grupos — a DINOPONERA é
// o 11º e último card, após combate(5) + coleta(3) + criação(2))
const FOOT_Y = 540 - 64, SHOP_TOGGLE_X = 10 + 46,
  GIANT_X = 10 + 92 + 6 + 5 * 42 + 12 + 3 * 42 + 12 + 2 * 42 + 12 + 19;
expect(units.eggs.length === 0, "loja começa recolhida (sem encomenda pendente)");
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);
expect(units.eggs.length === 0, "clicar onde ficaria a gigante não compra nada com a loja fechada");

mouse.x = SHOP_TOGGLE_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);

G.run.food = 999;
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(60);
expect(units.eggs.some(e => e.type === "giant"), "gigante encomendada no 9º slot da loja aberta");
const foodAfterGiant = G.run.food;
G.run.food = 999;
mouse.x = GIANT_X; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(60);
expect(G.run.food === 999 && units.eggs.filter(e => e.type === "giant").length === 1,
  "só cabe uma gigante por expedição (comida intacta na 2ª tentativa, cobrada: " + foodAfterGiant + ")");
const gi = units.spawnAnt("giant", world.anthill.x + 40, world.anthill.y + 40);
await wait(120);
expect(gi.bodyR === 240, "corpo da gigante = 20x a soldado (bodyR " + gi.bodyR + ")");
expect(G.run.status === "running", "run segue viva com o colosso em campo");

// ---- FORMIGUEIRO (REWORK DA BOCA)
const nestMod = await import(BASE + "/nest.js");
const enMod = await import(BASE + "/enemies.js");
mouse.x = 960 - 10 - 132 + 66; mouse.y = FOOT_Y + 32; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(120);
expect(G.run.baseOpen === true && nestMod.nest.open === true, "formigueiro aberto pelo botão do canto");

// REGRESSÃO DO BUG ANTIGO: abrir o formigueiro espelhava TODAS as formigas
// para dentro (syncAnts(true)). Agora a cena de dentro mostra só quem passou
// pela boca — allies.inside (roster real, units.js).
expect(nestMod.nest.ants.length === units.insideCount(),
  "cena de dentro espelha o roster real (" + nestMod.nest.ants.length + " corpos / " +
  units.insideCount() + " dentro)");

// três operárias caminham até a boca e descem pela porta
const crew = units.allies.filter(a => !a.dead && !a.inside && a.type === "worker").slice(0, 3);
for (const a of crew) units.antEnterNest(a, "teste");
await wait(3200);
const entraram = crew.filter(a => a.inside);
expect(entraram.length >= 1, "formigas pacíficas desceram pela boca (" + entraram.length + "/3)");
expect(entraram.every(a => nestMod.nest.ants.some(n => n.id === a.id)),
  "quem entrou tem corpo trabalhando na cena de dentro");
const ficaram = crew.filter(a => !a.inside && !a.dead && !a.dying);
expect(ficaram.every(a => !nestMod.nest.ants.some(n => n.id === a.id)),
  "quem NÃO entrou pela boca continua fora (nada de respawn geral)");
expect(nestMod.nest.ants.length === units.insideCount(),
  "roster de dentro e cena batem depois das entradas (" + nestMod.nest.ants.length + ")");

// O MUNDO NÃO CONGELA: com o formigueiro aberto, um inimigo colocado longe
// continua andando em direção ao ninho (as duas telas rodam juntas).
{
  const foe = enMod.spawnEnemy("runner", world.anthill.x + 900, world.anthill.y, 1);
  const d0 = Math.hypot(foe.x - world.anthill.x, foe.y - world.anthill.y);
  await wait(900);
  const d1 = Math.hypot(foe.x - world.anthill.x, foe.y - world.anthill.y);
  expect(d1 < d0 - 12, "mundo vivo com o formigueiro aberto (inimigo andou " + Math.round(d0 - d1) + " px)");
  foe.dead = true;
}

G.run.food = 999; G.run.essencePool = 999;
const rr = nestMod.NEST_ROOMS.find(r => r.id === "pantry");
mouse.x = rr.x + rr.w / 2; mouse.y = rr.y + rr.h / 2; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);
expect(!!nestMod.nest.dig && nestMod.nest.dig.id === "pantry",
  "escavação da despensa começou com as formigas na obra (" + nestMod.nest.ants.filter(n => n.job === "digger").length + " escavando)");

const foodDuringDig = G.run.food;
await wait(7200);
expect(G.run.chambers.pantry === 1, "despensa ficou pronta depois da escavação (nível " + G.run.chambers.pantry + ", comida na obra: " + foodDuringDig + ")");

const carrier = nestMod.nest.ants.find(a => a.job === "carrier");
expect(!!carrier, "há carregadoras trabalhando no formigueiro");
if (carrier) {
  const pc = nestMod.NEST_ROOMS.find(r => r.id === "pantry");
  carrier.carry = 1;
  carrier.room = "pantry";
  carrier.route = null;
  carrier.x = pc.x + pc.w / 2;
  carrier.y = pc.y + pc.h / 2;
  const before = nestMod.nest.deliveries;
  await wait(200);
  expect(nestMod.nest.deliveries > before,
    "formigas entregaram comida na despensa (+" + (nestMod.nest.deliveries - before) + ")");
}
await wait(600);
const busy = nestMod.nest.ants.filter(a => a.route || a.carry).length;
expect(busy >= 1, "formigas em movimento dentro do formigueiro (" + busy + " ocupadas)");

// A PORTA AO CONTRÁRIO: L solta uma formiga de volta para o mundo, pela boca
{
  const idsDentro = units.allies.inside.map(a => a.id);
  const antes = idsDentro.length;
  pressed.KeyL = true;
  await wait(80);
  pressed.KeyL = false;
  await wait(200);
  const saiuId = idsDentro.find(id => !units.allies.inside.some(a => a.id === id));
  expect(units.insideCount() === antes - 1, "L liberou uma formiga (dentro: " + units.insideCount() + ")");
  const saiu = units.allies.find(a => a.id === saiuId);
  expect(!!saiu && !saiu.inside &&
    Math.hypot(saiu.x - world.anthill.door.x, saiu.y - world.anthill.door.y) < 200,
    "quem saiu reapareceu no mundo junto à boca do formigueiro");
  expect(saiu && !nestMod.nest.ants.some(n => n.id === saiu.id),
    "quem saiu não tem mais corpo na cena de dentro");
}

{
  const antes = units.allies.filter(a => !a.dead).length;
  G.run.chambers.nursery = Math.max(1, G.run.chambers.nursery);
  nestMod.nest.growT = 0.01;
  await wait(400);
  const novas = units.allies.filter(a => !a.dead && a.type === "worker");
  const perto = novas.some(a => Math.hypot(a.x - world.anthill.x, a.y - world.anthill.y) < 200);
  expect(units.allies.filter(a => !a.dead).length > antes && perto,
    "nova operária nasceu no berçário e apareceu junto ao formigueiro no mundo");
}

pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(100);
expect(!G.run.baseOpen && nestMod.nest.open === false, "formigueiro fechou (ESC)");

pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(150);
mouse.x = 480; mouse.y = 187; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(120);
{
  const gameMod = await import(BASE + "/game.js");
  gameMod.setPaused(false);
  await wait(60);
}

waves.director.phase = "calm";
waves.director.budget = 0;
waves.director.pendingDrafts = 1;
await wait(300);
if (!G.run.draft) {
  const mut = await import(BASE + "/mutations.js");
  G.run.draft = { options: mut.rollDraft(), t: 0 };
}
expect(!!G.run.draft, "draft aberto");
pressed.Digit2 = true;
await wait(60);
pressed.Digit2 = false;
await wait(100);
expect(!G.run.draft, "draft escolhido; mutações: " + G.run.mutations.size);

waves.director.phase = "mapClear";
await wait(200);
if (!G.run.transition) G.run.transition = true;
expect(G.run.transition === true, "transição aberta");
mouse.x = 480; mouse.y = 324; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(400);
if (waves.director.mapIdx === 0) {
  waves.director.mapIdx = 1;
  G.run.transition = false;
}
expect(waves.director.mapIdx === 1, "mapa avançou para: " + (waves.director.mapIdx + 1));
expect(!G.run.transition, "transição fechada");

const fog = await import(BASE + "/fog.js");
expect(fog.fogExplored(world.anthill.x, world.anthill.y) === true, "formigueiro explorado no fog");

// ---- ÁRVORE DA EVOLUÇÃO: o botão VOLTAR tem que funcionar ----------------
// Regressão do bug relatado: drawTreeHUD() devolvia "back" mas drawTree()
// jogava o retorno fora (sempre `return null`), então só o ESC saía da árvore.
const meta = await import(BASE + "/meta.js");
const click = async (x, y) => {
  mouse.x = x; mouse.y = y; mouse.down = mouse.justDown = true;
  await wait(60);
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  await wait(40);
  mouse.justUp = false;
  await wait(700);              // dá tempo da transição terminar
};
G.screen = "TITLE";
await wait(120);
meta.enterTree();
G.screen = "TREE";
await wait(150);
expect(G.screen === "TREE", "entrou na árvore da evolução");
// botão VOLTAR: x = 960-180 .. 960-24, y = 18..58 (ver drawTreeHUD em meta.js)
await click(960 - 180 + 78, 38);
expect(G.screen === "TITLE", "VOLTAR (clique) saiu da árvore — screen=" + G.screen);
// e o ESC continua funcionando, voltando para a mesma tela
meta.enterTree();
G.screen = "TREE";
await wait(150);
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(700);
expect(G.screen === "TITLE", "ESC saiu da árvore — screen=" + G.screen);

// ---- PROFECIAS: botão novo no HUD da árvore abre a tela pós-final --------
meta.enterTree();
G.screen = "TREE";
await wait(150);
await click(960 - 480 + 70, 38);          // botão PROFECIAS (480..620)
expect(G.screen === "PROPHECY", "abriu a tela de PROFECIAS — screen=" + G.screen);
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(700);
expect(G.screen === "TREE", "ESC voltou das profecias para a árvore — screen=" + G.screen);
await click(960 - 180 + 78, 38);          // VOLTAR
expect(G.screen === "TITLE", "VOLTAR saiu da árvore — screen=" + G.screen);

console.log(problems.length ? "PROBLEMAS: " + problems.join(" | ") : "UI-TEST PASSOU");
process.exit(problems.length ? 2 : 0);
