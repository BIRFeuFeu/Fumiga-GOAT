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

// ---- câmara interna (base-building)
pressed.KeyB = true;
await wait(60);
pressed.KeyB = false;
await wait(100);
expect(G.run.baseOpen === true, "tela da câmara abriu (B)");
// tenta construir o berçário clicando no retângulo da câmara
G.run.food = 999; G.run.essencePool = 999;
const PW = 640, PH = 440, pxo = 960 / 2 - PW / 2, pyo = (540 - PH) / 2;
mouse.x = pxo + 150; mouse.y = pyo + 210; mouse.down = mouse.justDown = true;
await wait(60);
mouse.down = mouse.justDown = false; mouse.justUp = true;
await wait(40);
mouse.justUp = false;
expect(G.run.chambers.nursery === 1, "berçário construído ao clicar na câmara");
// fecha com ESC
pressed.Escape = true;
await wait(60);
pressed.Escape = false;
await wait(80);
expect(!G.run.baseOpen, "tela da câmara fechou (ESC)");

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
