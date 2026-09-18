// Teste de integração headless (mock de DOM): percorre boot → título → run →
// câmara interna → pausa → transição de mapa, capturando exceções de runtime.
// Uso: node test/uitest.mjs
const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 0, height: 0 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
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
const BASE = "/home/user/Fumiga-GOAT/game/js";
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

// ---- título → run (botão novo, coluna esquerda)
mouse.x = 200; mouse.y = 294; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
expect(G.screen === "RUN", "run iniciou via botão do menu");
expect(units.allies.filter(a => !a.dead).length >= 5,
  "esquadrão inicial 2 op. + 2 colet. + 1 explor. (vivas: " + units.allies.filter(a => !a.dead).length + ")");
expect(units.allies.filter(a => a.type === "worker").length === 2, "2 operárias");
expect(units.allies.filter(a => a.type === "gatherer").length === 2, "2 coletoras");
expect(units.allies.filter(a => a.type === "scout").length === 1, "1 exploradora");
expect(!!G.run.chambers && G.run.level === 0 && G.run.xpNext > 0, "campos chambers/xp inicializados");

// ---- onda + chefe (render do boss sob fog)
waves.skipPeace();
await wait(300);
expect(waves.director.phase === "wave", "onda iniciada");
en.spawnBoss(G.run ? waves.mapDef().boss : "hare", G.run.wave);
await wait(400);
expect(!!en.boss, "chefe presente: " + (en.boss && en.boss.kind));

// ---- HUD: as formigas só aparecem no botão FORMIGAS (recolhido por padrão)
const FOOT_Y = 540 - 100, SHOP_TOGGLE_X = 10 + 52, GIANT_X = 10 + 104 + 6 + 8 * 76 + 35;
expect(units.eggs.length === 0, "loja começa recolhida (sem encomenda pendente)");
mouse.x = GIANT_X; mouse.y = FOOT_Y + 44; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);
expect(units.eggs.length === 0, "clicar onde ficaria a gigante não compra nada com a loja fechada");

// abre pelo botão FORMIGAS
mouse.x = SHOP_TOGGLE_X; mouse.y = FOOT_Y + 44; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);

// ---- FORMIGA GIGANTE: slot 9 da loja aberta, corpo de 20 soldados, 1 por run
G.run.food = 999;
mouse.x = GIANT_X; mouse.y = FOOT_Y + 44; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(60);
expect(units.eggs.some(e => e.type === "giant"), "gigante encomendada no 9º slot da loja aberta");
const foodAfterGiant = G.run.food;
G.run.food = 999;
mouse.x = GIANT_X; mouse.y = FOOT_Y + 44; mouse.down = mouse.justDown = true;
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

// ---- FORMIGUEIRO (a cena viva): entra pelo botão do canto inferior-direito
const nestMod = await import(BASE + "/nest.js");
mouse.x = 960 - 10 - 132 + 66; mouse.y = FOOT_Y + 44; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(120);
expect(G.run.baseOpen === true && nestMod.nest.open === true, "formigueiro aberto pelo botão do canto");
expect(nestMod.nest.ants.length >= 1, "formigas trabalhando lá dentro (" + nestMod.nest.ants.length + ")");

// clica numa câmara: começa a ESCAVAÇÃO (não é mais um clique instantâneo)
G.run.food = 999; G.run.essencePool = 999;
const rr = nestMod.NEST_ROOMS.find(r => r.id === "pantry");
mouse.x = rr.x + rr.w / 2; mouse.y = rr.y + rr.h / 2; mouse.down = mouse.justDown = true;
await wait(60); mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40); mouse.justUp = false; await wait(60);
expect(!!nestMod.nest.dig && nestMod.nest.dig.id === "pantry",
  "escavação da despensa começou com as formigas na obra (" + nestMod.nest.ants.filter(n => n.job === "digger").length + " escavando)");

// a comida foi gasta no início da obra e o nível só sobe no fim
const foodDuringDig = G.run.food;
await wait(7200);   // a obra leva ~6s com as escavadoras (mais rápido a cada nível)
expect(G.run.chambers.pantry === 1, "despensa ficou pronta depois da escavação (nível " + G.run.chambers.pantry + ", comida na obra: " + foodDuringDig + ")");

// entregas: uma carregadora na despensa entrega na hora (caminho determinístico,
// sem depender do tempo real do laço — antes esse expect era instável)
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
// e o formigueiro continua vivo: alguém está em rota ou carregando algo
await wait(600);
const busy = nestMod.nest.ants.filter(a => a.route || a.carry).length;
expect(busy >= 1, "formigas em movimento dentro do formigueiro (" + busy + " ocupadas)");

// a operária que nasce no berçário sai no MUNDO, junto ao formigueiro
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

// sai com ESC
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(100);
expect(!G.run.baseOpen && nestMod.nest.open === false, "formigueiro fechou (ESC)");

// ---- pausa e retorno
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(150);
// botão CONTINUAR: centro do painel de pausa
mouse.x = 480; mouse.y = 209; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(80);

// ---- draft via teclado
waves.director.phase = "calm";
waves.director.budget = 0;
waves.director.pendingDrafts = 1;
await wait(200);
expect(!!G.run.draft, "draft aberto");
pressed.Digit2 = true;
await wait(60);
pressed.Digit2 = false;
await wait(100);
expect(!G.run.draft, "draft escolhido; mutações: " + G.run.mutations.size);

// ---- transição de mapa (render da tela + avançar)
waves.director.phase = "mapClear";
await wait(200);
expect(G.run.transition === true, "transição aberta");
mouse.x = 480; mouse.y = 390; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
await wait(300);
expect(waves.director.mapIdx === 1, "mapa avançou para: " + (waves.director.mapIdx + 1));
expect(!G.run.transition, "transição fechada");

// ---- nevoeiro: grades coerentes após update
const fog = await import(BASE + "/fog.js");
expect(fog.fogExplored(world.anthill.x, world.anthill.y) === true, "formigueiro explorado no fog");

console.log(problems.length ? "PROBLEMAS: " + problems.join(" | ") : "UI-TEST PASSOU");
process.exit(problems.length ? 2 : 0);
