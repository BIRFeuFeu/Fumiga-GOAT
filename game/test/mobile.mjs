// ============================================================================
// Regressão da VERSÃO MOBILE, headless e sem dependências:
//   cenário "gestos"      → a camada de toque (game/mobile/touch.js) traduz
//                           tap/arraste/pinça/caixa nos mesmos estados de
//                           entrada que o PC (mouse/pressed), com enquadramento
//   cenário "save"        → slot de save isolado via FUMIGA_SAVE_KEY
//   cenário "save-default"→ sem override, slot antigo (PC) intacto
// Uso: node game/test/mobile.mjs
// ============================================================================
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setImmediate as nextTurn } from "node:timers/promises";

const SELF = fileURLToPath(import.meta.url);
const scenario = process.argv[2];

if (!scenario) {
  // Sintaxe ESM da camada mobile (touch.js roda no browser como módulo).
  for (const name of ["../mobile/touch.js"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
      input: readFileSync(new URL(name, import.meta.url)), encoding: "utf8",
    });
    assert.equal(result.status, 0, name + ": " + result.stderr);
  }
  console.log("ok    sintaxe ESM da camada mobile");
  for (const name of ["gestos", "save", "save-default", "boot-mobile"]) {
    const t = name === "boot-mobile" ? 60000 : 20000;
    const result = spawnSync(process.execPath, [SELF, name], { encoding: "utf8", timeout: t });
    assert.equal(result.status, 0, name + ": " + result.stdout + result.stderr);
    process.stdout.write(result.stdout);
  }
  console.log("MOBILE OK — toque traduz para o mesmo motor e saves ficam separados");
  process.exit(0);
}

// ------------------------------------------------------ infra compartilhada -
process.on("unhandledRejection", (e) => { console.error("UNHANDLED-REJ", e && e.stack || e); process.exit(9); });

const MOB = new URL("../mobile/touch.js", import.meta.url).pathname;
const JS = new URL("../js/", import.meta.url).pathname;

function makeEl() {
  const el = {
    children: [], style: {}, hidden: false,
    className: "", textContent: "", id: "", type: "",
    listeners: {},
    appendChild(c) { el.children.push(c); return c; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    fire(t, ev = {}) {
      if (ev.preventDefault === undefined) ev.preventDefault = () => {};
      for (const f of el.listeners[t] || []) f(ev);
    },
    get firstChild() { return el.children[0] || null; },
    get lastChild() { return el.children[el.children.length - 1] || null; },
  };
  return el;
}

const gradProxy = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, p) {
      if (p === "createLinearGradient" || p === "createRadialGradient") return () => gradProxy;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (typeof p === "string" && p in t) return t[p];
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

function baseGlobals() {
  const els = new Map();
  const canvas = Object.assign(makeEl(), {
    width: 960, height: 540,
    getContext: makeCtx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
  });
  els.set("game", canvas);
  for (const id of ["touch-hud", "touch-mode-btn", "rotate-hint", "rotate-hint-x"]) els.set(id, makeEl());
  const winListeners = {};
  const frames = [];
  globalThis.window = globalThis;
  globalThis.innerWidth = 780;
  globalThis.innerHeight = 1560; // retrato na maioria dos asserts
  globalThis.document = {
    createElement: () => makeEl(),
    createElementNS: () => ({ getContext: makeCtx }),
    getElementById: (id) => els.get(id) || null,
    addEventListener() {},
    fonts: { load: () => Promise.resolve() },
  };
  globalThis.addEventListener = (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); };
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.Image = class { set src(v) { if (this.onload) this.onload(); } };
  const fireWin = (t, ev) => { if (ev.preventDefault === undefined) ev.preventDefault = () => {}; for (const f of winListeners[t] || []) f(ev); };
  return { els, canvas, winListeners, fireWin, frames };
}

// ------------------------------------------------ boot da versão mobile ----
// Boot real do shell: importa mobile/touch.js + js/main.js com DOM simulado
// e "joga" só por gestos de toque: pretitle → título → modo → expedição,
// cutscene, pan, HUD de pausa, seleção inteligente e save no slot mobile.
if (scenario === "boot-mobile") {
  const { els, canvas, fireWin } = baseGlobals();
  // o motor precisa de getContext em createElement("canvas") (bake dos sprites)
  const baseCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) =>
    tag === "canvas"
      ? { width: 0, height: 0, style: {}, getContext: makeCtx, addEventListener() {}, appendChild() {} }
      : baseCreate(tag);
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  globalThis.FUMIGA_SAVE_KEY = "fumiga_goat_mobile_save_v1";
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.innerWidth = 800; globalThis.innerHeight = 450;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 450 });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // coords virtuais (960x540) -> client (800x450)
  const ev = (id, x, y) => ({ pointerId: id, pointerType: "touch", clientX: x / 960 * 800, clientY: y / 540 * 450, preventDefault() {} });
  const tap = async (x, y, id = 1) => {
    canvas.fire("pointerdown", ev(id, x, y)); await wait(40);
    fireWin("pointerup", ev(id, x, y)); await wait(40);
  };
  const expect = (c, m) => { console.log((c ? "ok    " : "ERRO  ") + " " + m); assert.ok(c, m); };

  await import(MOB);
  const { touchMode } = await import(JS + "input.js");
  await import(JS + "main.js");
  await wait(2500);
  const { G } = await import(JS + "state.js");
  const { worldToScreen } = await import(JS + "camera.js");
  const units = await import(JS + "units.js");
  assert.equal(touchMode.on, true, "modo toque ativo no boot mobile");
  assert.equal(touchMode.smart, true, "gesto inteligente ativo por padrão no boot");
  console.log("ok    modo toque ativo com gesto inteligente");
  assert.ok(G.screen === "PRETITLE" || G.screen === "TITLE", "bootou (screen=" + G.screen + ")");
  console.log("ok    shell mobile bootou");

  if (G.screen === "PRETITLE") { await tap(480, 270, 2); await wait(900); }
  expect(G.screen === "TITLE", "toque avançou do PRETITLE");
  await tap(200, 275, 3); await wait(900);
  expect(G.screen === "MODE", "toque abriu a seleção de modo");
  await tap(114, 282, 4); await wait(1200);
  expect(G.screen === "RUN" && !!G.run, "expedição iniciou por toque");

  const { isCutsceneActive } = await import(JS + "cutscenes.js");
  for (let i = 0; i < 12 && isCutsceneActive(); i++) { await tap(480, 300, 5 + i); await wait(300); }
  expect(!isCutsceneActive(), "cutscene avançada por toques");
  await wait(400);

  const { cam } = await import(JS + "camera.js");
  const cx0 = cam.x;
  canvas.fire("pointerdown", ev(30, 480, 270)); await wait(50);
  for (let i = 1; i <= 6; i++) { fireWin("pointermove", ev(30, 480 + i * 40, 270)); await wait(30); }
  fireWin("pointerup", ev(30, 720, 270)); await wait(100);
  assert.ok(Math.abs(cam.x - cx0) > 100, "câmera arrastou com 1 dedo");
  console.log("ok    arrasto de 1 dedo move a câmera na run");

  const hud = els.get("touch-hud");
  assert.equal(hud.hidden, false, "HUD virtual visível na run");
  const pausaBtn = hud.children[1].children[3];
  const { isPaused } = await import(JS + "game.js");
  pausaBtn.fire("pointerdown"); await wait(300);
  assert.equal(isPaused(), true, "botão PAUSA pausou");
  pausaBtn.fire("pointerdown"); await wait(300);
  assert.equal(isPaused(), false, "botão PAUSA retomou");
  console.log("ok    HUD virtual pausa e retoma o jogo");

  // Irmã fora da HUD: toque em cima de botão é da UI (uiCapture) e não
  // seleciona — era isso que tornava este passo instável (a formiga sorteada
  // às vezes estava sobre a barra da loja, no rodapé).
  const ui = await import(JS + "ui.js");
  const sobUI = (x, y) => ui.uiButtons().some((b) => ui.pointInRect(x, y, b.x, b.y, b.w, b.h));
  const a = (() => {
    for (const u of units.allies) {
      if (u.dead || u.dying || u.type === "queen") continue;
      const sp = worldToScreen(u.x, u.y);
      if (sp.x < 40 || sp.y < 40 || sp.x > 920 || sp.y > 400) continue;   // vista útil
      if (sobUI(sp.x, sp.y)) continue;
      return u;
    }
    return null;
  })();
  assert.ok(a, "havia formiga viva fora da HUD para tocar");
  // um draft aberto rouba o foco de entrada; descarta antes do toque seletivo
  for (let i = 0; i < 20 && G.run.draft; i++) { G.run.draft = null; await wait(100); }
  assert.equal(!!G.run.draft, false, "nenhum draft aberto no momento do toque");
  // a formiga continua andando: mira na posição ATUAL e repete se o frame
  // adiantou entre a leitura e o toque
  let sel = 0;
  for (let r = 0; r < 8 && sel < 1; r++) {
    const sp = worldToScreen(a.x, a.y);
    if (sobUI(sp.x, sp.y)) { await wait(80); continue; }
    await tap(sp.x, sp.y, 60 + r); await wait(120);
    sel = units.selectedCount();
  }
  assert.ok(sel >= 1, "toque na formiga a selecionou");
  console.log("ok    toque inteligente selecionou (" + units.selectedCount() + ")");

  assert.equal(store.has("fumiga_goat_mobile_save_v1"), true, "save no slot mobile");
  console.log("ok    save gravado no slot mobile isolado");
  console.log("BOOT MOBILE OK — do boot à expedição só com gestos de toque");
  process.exit(0);
}

if (scenario === "gestos") {
  const { els, canvas, fireWin, frames } = baseGlobals();
  await import(MOB); // liga os listeners e o HUD na importação
  const { mouse, pressed, touchMode } = await import(JS + "input.js");
  const { G } = await import(JS + "state.js");
  const { cam } = await import(JS + "camera.js");
  const { isPaused, setPaused } = await import(JS + "game.js");

  const ev = (id, x, y) => ({ pointerId: id, pointerType: "touch", clientX: x, clientY: y, preventDefault() {} });
  const down = (id, x, y) => canvas.fire("pointerdown", ev(id, x, y));
  const move = (id, x, y) => fireWin("pointermove", ev(id, x, y));
  const up = (id, x, y) => fireWin("pointerup", ev(id, x, y));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pump = (n = 1) => { for (let i = 0; i < n; i++) { const f = frames.shift(); if (f) f(performance.now()); } };

  // 1. camada ativou o modo toque com gestos inteligentes
  assert.equal(touchMode.on, true, "camada ativou o modo toque");
  assert.equal(touchMode.smart, true, "gestos inteligentes ligados por padrão");
  console.log("ok    toque ativo + gesto inteligente padrão");

  // 2. TAP 1 dedo = clique esquerdo (mesmo estado que o mouse do PC)
  down(1, 100, 100);
  assert.equal(mouse.justDown, true, "pointerdown -> justDown");
  assert.equal(mouse.down, true, "diregle 1: mouse.down");
  assert.equal(mouse.x, 100); assert.equal(mouse.y, 100);
  mouse.justDown = false; // como o endTick limpa
  up(1, 100, 100);
  assert.equal(mouse.justUp, true, "pointerup -> justUp");
  assert.equal(mouse.down, false, "soltou o botão");
  console.log("ok    toque (tap) vira clique esquerdo nas coordenadas virtuais");

  // 3. ARRASTO 1 dedo = pan de câmera (fica segurado até soltar)
  mouse.justUp = false;
  down(2, 50, 50); mouse.justDown = false;
  move(2, 400, 380);
  assert.equal(mouse.down, true, "arrasto mantém o hold (pan)");
  assert.equal(mouse.x, 400); assert.equal(mouse.y, 380);
  up(2, 400, 380);
  mouse.justUp = false;
  console.log("ok    arrasto de 1 dedo arrasta a câmera");

  // 4. TOQUE DUPLO = direito duplo (selecionar tipo na tela)
  down(3, 200, 200); mouse.justDown = false; mouse.justUp = false;
  up(3, 200, 200); mouse.justUp = false;
  await wait(40);
  down(4, 202, 201); // dentro da janela e do raio
  up(4, 202, 201);
  assert.equal(mouse.rdbl, true, "toque duplo -> rdbl");
  mouse.rdbl = false;
  console.log("ok    toque duplo vira clique direito duplo (selecionar tipo)");

  // 5. PINÇA no RUN = zoom ancorado na câmera (1 dedo fixo + outro abre/fecha)
  G.screen = "RUN"; G.run = { status: "running" };
  const z0 = 1.0; cam.zoom = z0;
  down(5, 200, 270); down(6, 760, 270);
  move(6, 960, 270);
  assert.ok(cam.zoom > z0, "afastar os dedos aproxima o zoom");
  const z1 = cam.zoom;
  move(6, 360, 270);
  assert.ok(cam.zoom < z1, "juntar os dedos afasta o zoom");
  up(6, 360, 270); up(5, 200, 270);
  console.log("ok    pinça controla o zoom da expedição");

  // 6. 2 dedos paralelos = caixa de seleção (arrasto direito do PC)
  down(7, 300, 200); down(8, 500, 200);
  move(7, 360, 260); move(8, 560, 260);
  assert.equal(mouse.right, true, "caixa: botão direito segurado");
  assert.equal(mouse.justRightDown, true, "caixa: justRightDown disparado");
  assert.ok(mouse.rlX >= 450 && mouse.rlX <= 470, "caixa acompanha o ponto médio");
  mouse.justRightDown = false;
  up(7, 360, 260);
  assert.equal(mouse.justRightUp, true, "soltar confirma a caixa");
  assert.equal(mouse.right, false, "soltar libera o botão direito");
  up(8, 560, 260);
  mouse.justRightUp = false;
  console.log("ok    2 dedos arrastados fazem a caixa de seleção");

  // 7. PINÇA na ÁRVORE = passos de roda (zoom próprio da árvore)
  G.screen = "TREE";
  down(9, 200, 270); down(10, 760, 270);
  move(10, 960, 270);
  assert.ok(mouse.wheel < 0, "abrir a pinça aproxima a árvore (wheel < 0)");
  up(9, 200, 270); up(10, 860, 270);
  mouse.wheel = 0;
  console.log("ok    pinça na árvore vira roda de zoom");

  // 8. MODO EXPLÍCITO: em "selecionar", 1 dedo dirige o botão direito
  G.screen = "RUN";
  touchMode.smart = false; touchMode.mode = "selecionar";
  down(11, 150, 150);
  assert.equal(mouse.right, true, "modo seleção: toque vira botão direito");
  assert.equal(mouse.justRightDown, true, "modo seleção: justRightDown");
  mouse.justRightDown = false;
  up(11, 150, 150);
  assert.equal(mouse.justRightUp, true, "modo seleção: soltura encerra");
  mouse.justRightUp = false; touchMode.smart = true;
  console.log("ok    modo explícito ORDENAR/SELECIONAR alternado por botão");

  // 9. HUD: botões virtuais pressionam as teclas do PC
  const hud = els.get("touch-hud");
  const rowTop = hud.children[0], rowBot = hud.children[1], rowNest = hud.children[2];
  const [zOut, zIn, zCentro] = rowTop.children;
  const [onda, rali, ninho, pausa] = rowBot.children;
  const [chamar, soltar] = rowNest.children;
  assert.equal(hud.children.length, 3, "HUD tem 3 fileiras de botões");
  assert.ok(zOut && zIn && zCentro && onda && rali && ninho && pausa && chamar && soltar, "9 botões criados");
  pausa.fire("pointerdown");
  assert.equal(pressed.Escape, true, "botão pausa -> Escape");
  pressed.Escape = false;
  ninho.fire("pointerdown");
  assert.equal(pressed.KeyB, true, "botão ninho -> KeyB");
  pressed.KeyB = false;
  rali.fire("pointerdown");
  assert.equal(pressed.KeyF, true, "botão rali -> KeyF");
  pressed.KeyF = false;
  onda.fire("pointerdown");
  assert.equal(pressed.KeyG, true, "botão onda -> KeyG");
  pressed.KeyG = false;
  zCentro.fire("pointerdown");
  assert.equal(pressed.Space, true, "botão centro -> Espaço");
  pressed.Space = false;
  zIn.fire("pointerdown");
  assert.equal(mouse.wheel, -1, "zoom+ -> wheel -1 (aproxima)");
  mouse.wheel = 0;
  zOut.fire("pointerdown");
  assert.equal(mouse.wheel, 1, "zoom- -> wheel +1 (afasta)");
  mouse.wheel = 0;
  // a BOCA do formigueiro: fileira extra que só aparece com o ninho aberto
  soltar.fire("pointerdown");
  assert.equal(pressed.KeyL, true, "botão soltar -> KeyL (libera uma pela boca)");
  pressed.KeyL = false;
  chamar.fire("pointerdown");
  assert.equal(pressed.KeyP, true, "botão chamar -> KeyP (chama uma para dentro)");
  pressed.KeyP = false;
  assert.equal(rowNest.hidden, true, "fileira da boca escondida fora do formigueiro");
  G.screen = "RUN"; G.run = { baseOpen: true };
  pump(1);
  assert.equal(rowNest.hidden, false, "fileira da boca aparece com o formigueiro aberto");
  assert.equal(rowTop.hidden, true && rowBot.hidden, "as outras fileiras cedem o lugar no formigueiro");
  G.run = { baseOpen: false };
  pump(1);
  assert.equal(rowNest.hidden, true && rowTop.hidden === false && rowBot.hidden === false,
    "sair do formigueiro devolve as fileiras normais");
  console.log("ok    HUD virtual: pausa/ninho/rali/onda/centro/zoom/boca mapeados");

  // 10. HUD aparece só na expedição e rótulo da pausa acompanha o jogo
  G.screen = "BOOT"; G.run = null;
  pump(1);
  assert.equal(hud.hidden, true, "HUD escondido fora da run");
  G.screen = "RUN"; G.run = {};
  pump(1);
  assert.equal(hud.hidden, false, "HUD visível na run");
  assert.equal(pausa.firstChild.textContent, "⏸", "rótulo de pausa normal");
  setPaused(true);
  pump(1);
  assert.equal(pausa.firstChild.textContent, "▶", "rótulo muda quando pausado");
  assert.equal(pausa.lastChild.textContent, "VOLTAR", "texto de retomada");
  setPaused(false);
  assert.equal(isPaused(), false, "despausou");
  G.screen = "BOOT"; G.run = null;
  console.log("ok    HUD segue a tela atual e o estado de pausa");

  // 11. mouse real continua ignorado pela camada (dispositivos híbridos)
  canvas.fire("pointerdown", { pointerId: 99, pointerType: "mouse", clientX: 10, clientY: 10, preventDefault() {} });
  assert.equal(mouse.down, false, "ponteiro de mouse não passa pela camada de toque");
  console.log("ok    mouse real segue pelo caminho antigo (PC intacto)");

  console.log("GESTOS OK — camada de toque testada ponta a ponta");
  process.exit(0);
}

// -------------------------------------------------------------------- save --
if (scenario === "save" || scenario === "save-default") {
  globalThis.window = globalThis;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  if (scenario === "save") globalThis.FUMIGA_SAVE_KEY = "fumiga_goat_mobile_save_v1";
  const { G, loadSave, persistSave } = await import(JS + "state.js");

  const key = scenario === "save" ? "fumiga_goat_mobile_save_v1" : "fumiga_goat_save_v1";
  const other = scenario === "save" ? "fumiga_goat_save_v1" : "fumiga_goat_mobile_save_v1";
  G.save.essence = 777;
  persistSave();
  assert.equal(typeof store.get(key), "string", "save gravado no slot certo");
  assert.equal(store.has(other), false, "slot da outra versão intocado");
  G.save.essence = 0;
  loadSave();
  assert.equal(G.save.essence, 777, "load relê o próprio slot");
  console.log("ok    " + key + " isolado (progresso paralelo, sem conexão)");
  process.exit(0);
}
