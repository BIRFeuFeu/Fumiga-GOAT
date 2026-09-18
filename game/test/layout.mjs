// Teste de LAYOUT headless: roda o jogo com um canvas de mentira que grava
// todas as operações de desenho e reconstrói o texto desenhado pela fonte
// bitmap (a partir das células do atlas). Depois acusa:
//   1. texto desenhado fora do canvas 960x540;
//   2. texto encoberto por um retângulo opaco pintado depois (o clássico
//      "painel por cima do título");
//   3. texto colidindo com outro texto (sobreposição grande);
//   4. botões clicáveis sobrepostos (clique ambíguo).
// Uso: node test/layout.mjs
const gradProxy = { addColorStop() {} };
const FONT_META = {
  // cw/ch = célula do atlas; ink = altura real da tinta e o recuo do topo
  // (medidos no atlas: a célula tem folga, o texto não encosta no rodapé)
  "assets/font/font_big.png": { cw: 22, ch: 30, ink: 20, inkY: 5 },
  "assets/font/font_small.png": { cw: 13, ch: 16, ink: 11, inkY: 3 },
};

// ------------------------------------------------------------------ canvas --
let REC = null;            // coletor de operações do canvas principal
function mat() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
function mul(m, n) {
  return {
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
  };
}
function apply(m, x, y) { return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }

class MockCanvas {
  constructor() {
    this.width = 0; this.height = 0; this.style = {};
    this._text = null; this._tint = null; this._fontName = null;
    this._draws = [];
  }
  getContext() { return new MockCtx(this); }
  addEventListener() {}
}

class MockCtx {
  constructor(cv) {
    this.cv = cv;
    this.fillStyle = "#000"; this.strokeStyle = "#000"; this.lineWidth = 1;
    this.globalAlpha = 1; this.globalCompositeOperation = "source-over";
    this.imageSmoothingEnabled = false; this.font = ""; this.textAlign = "left";
    this.m = mat(); this.stack = [];
    this.path = []; this.open = false;
    this.ops = [];
    this.canvas = cv;
  }
  save() { this.stack.push({ ...this.m }); }
  restore() { if (this.stack.length) this.m = this.stack.pop(); }
  translate(x, y) { this.m = mul(this.m, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); }
  scale(x, y) { this.m = mul(this.m, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); }
  rotate(a) { this.m = mul(this.m, { a: Math.cos(a), b: Math.sin(a), c: -Math.sin(a), d: Math.cos(a), e: 0, f: 0 }); }
  createLinearGradient() { return gradProxy; }
  createRadialGradient() { return gradProxy; }
  measureText() { return { width: 8 }; }
  getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  putImageData() {}
  setTransform() {}
  beginPath() { this.path = []; this.open = true; }
  closePath() {}
  moveTo(x, y) { this.path.push([x, y]); }
  lineTo(x, y) { this.path.push([x, y]); }
  quadraticCurveTo(cx, cy, x, y) { this.path.push([cx, cy], [x, y]); }
  bezierCurveTo(a, b, c, d, x, y) { this.path.push([a, b], [c, d], [x, y]); }
  arc(x, y, r) { this.path.push([x - r, y - r], [x + r, y + r]); }
  arcTo() {}
  ellipse(x, y, rx, ry) { this.path.push([x - rx, y - ry], [x + rx, y + ry]); }
  rect(x, y, w, h) { this.path.push([x, y], [x + w, y + h]); }
  clip() {}
  fill() { this.op("fillPath", this._bbox(this.path), this.fillStyle); }
  stroke() { this.op("strokePath", this._bbox(this.path), this.strokeStyle); }

  // ---- primitivas geométricas -------------------------------------------
  _bbox(pts) {
    if (!pts.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [px, py] of pts) {
      const [x, y] = apply(this.m, px, py);
      if (x < x0) x0 = x; if (y < y0) y0 = y;
      if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  setLineDash() {}
  fillRect(x, y, w, h) {
    const [ax, ay] = apply(this.m, x, y);
    const [bx, by] = apply(this.m, x + w, y + h);
    this.op("fillRect", { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }, this.fillStyle);
  }
  strokeRect(x, y, w, h) {
    const [ax, ay] = apply(this.m, x, y);
    const [bx, by] = apply(this.m, x + w, y + h);
    this.op("strokeRect", { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }, this.strokeStyle);
  }
  clearRect() {}

  drawImage(img, ...a) {
    // 0) atlas da fonte tingido num canvas auxiliar: marca de qual fonte é,
    //    para depois reconstruir o texto glifo a glifo
    if (img && img._src && FONT_META[img._src]) this.cv._fontName = img._src;
    // 1) desenho de glifo numa linha (canvas de fonte tingida -> texto)
    if (img && img._fontName && a.length >= 8) {
      const meta = FONT_META[img._fontName];
      const idx = Math.round(a[0] / meta.cw) + Math.round(a[1] / meta.ch) * 12;
      this.cv._fontName = img._fontName;
      this.cv._text = (this.cv._text || "") + (CHARS[idx] !== undefined ? CHARS[idx] : "?");
      return;
    }
    // 2) uma linha de texto pronta sendo desenhada no destino
    if (img && img._text) {
      const dx = a[0], dy = a[1];
      const meta = FONT_META[img._fontName] || { ch: img.height, ink: img.height, inkY: 0 };
      const scale = Math.max(1, Math.round(img.height / meta.ch));
      this.op("text", {
        x: dx, y: dy + meta.inkY * scale, w: img.width, h: meta.ink * scale,
        cellY: dy, cellH: img.height,
      }, img._tint || "#fff", img._text);
      return;
    }
    if (img && img.width !== undefined) {
      const dx = a.length >= 8 ? a[4] : a[0], dy = a.length >= 8 ? a[5] : a[1];
      const dw = a.length >= 8 ? a[6] : a[2], dh = a.length >= 8 ? a[7] : a[3];
      if (typeof dx === "number" && typeof dy === "number") {
        const [ax, ay] = apply(this.m, dx, dy);
        const [bx, by] = apply(this.m, dx + (dw || 0), dy + (dh || 0));
        this.op("image", { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) }, "img", img.src || "");
      }
    }
  }

  // ---- gravação ---------------------------------------------------------
  op(kind, box, style, text) {
    const cv = this.cv;
    if (cv._draws) cv._draws.push({ kind, box, style, text, alpha: this.globalAlpha, gco: this.globalCompositeOperation });
    // canvas de linha: registra a tinta para identificar a cor do texto
    if (cv._draws && kind === "fillRect" && this.globalCompositeOperation === "source-in") cv._tint = this.fillStyle;
    if (REC && cv === REC.canvas) REC.ops.push({ kind, box, style, text, alpha: this.globalAlpha, gco: this.globalCompositeOperation });
  }
}

// ------------------------------------------------------------------- DOM ----
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
const mainCanvas = new MockCanvas();
mainCanvas.width = 960; mainCanvas.height = 540;
globalThis.document = {
  createElement(tag) {
    const cv = new MockCanvas();
    cv._draws = [];        // canvases auxiliares: só rastreiam glifos/tinta
    return cv;
  },
  createElementNS() { const cv = new MockCanvas(); cv._draws = []; return cv; },
  getElementById() { return mainCanvas; },
  addEventListener() {}, fonts: { load: () => Promise.resolve() },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; this._src = ""; }
  set src(v) {
    this._src = v;
    const meta = FONT_META[v];
    if (meta) { this.width = 264; this.height = 180; }
    if (this.onload) setTimeout(() => this.onload(), 0);
  }
  get src() { return this._src; }
};
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
process.on("unhandledRejection", (e) => { console.error("UNHANDLED-REJ", e && e.stack || e); process.exit(9); });
process.on("uncaughtException", (e) => { console.error("UNCAUGHT", e && e.stack || e); process.exit(9); });

// ------------------------------------------------------------------ imports --
const BASE = new URL("../js/", import.meta.url).pathname;
await import(BASE + "assets.js");            // registra o MANIFEST cedo
const { loadAll } = await import(BASE + "assets.js");
const { loadFonts, FONT_CHARS } = await import(BASE + "font.js");
const CHARS = FONT_CHARS;
globalThis.CHARS = CHARS;
const { G } = await import(BASE + "state.js");
const { boot, update, render, setLastDt } = await import(BASE + "game.js");
const { mouse, pressed, endTick } = await import(BASE + "input.js");
const { uiButtons } = await import(BASE + "ui.js");
const { startTutorial, stopTutorial, TUT } = await import(BASE + "tutorial.js");
const { enterTree } = await import(BASE + "meta.js");
const { director, resetDirector } = await import(BASE + "waves.js");
const { spawnBoss, foes } = await import(BASE + "enemies.js");
const { nestExit } = await import(BASE + "nest.js");
const { world } = await import(BASE + "world.js");
const { allies } = await import(BASE + "units.js");

await loadFonts();
await loadAll();
// mesmo "bake" do boot real (main.js): sprites girados e sheets de chefe
const { bakeRot, bakeRotTinted, dupSprite, setRotDrawScale, rotDrawSize } = await import(BASE + "assets.js");
const { GIANT_SCALE } = await import(BASE + "config.js");
const { bakeBossSheets } = await import(BASE + "render.js");
const ANT_SIZES = {
  worker: 34, soldier: 48, spitter: 44, tank: 54, queen: 142,
  scout: 36, healer: 40, bomber: 46,
  giant: 247,   // mesmo assado do main.js (5x o da soldado)
  e_runner: 30, e_swarm: 34, e_warrior: 48, e_spitter: 46, e_reaper: 44,
  e_matron: 80, e_sentinel: 62,
};
dupSprite("soldier", "giant");
for (const [k, s] of Object.entries(ANT_SIZES)) bakeRot(k, s);
setRotDrawScale("giant", "soldier", GIANT_SCALE);
bakeRotTinted("worker", "gatherer", 34, "#7fd6c0", 0.5);
bakeBossSheets();
boot();
G.save.tutorial = 1;

// ------------------------------------------------------------------ helpers --
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function frame() {
  REC = { canvas: mainCanvas, ops: [] };
  setLastDt(1 / 60);
  update(1 / 60);
  render(1 / 60);
  const ops = REC.ops;
  REC = null;
  endTick();
  return ops;
}

const problems = new Map();   // chave lógica -> mensagem (dedup)

// A GIGANTE precisa sair do forno exatamente GIANT_SCALE vezes a soldado: o
// assado é 5x menor (memória) e o fator de desenho compensa.
const giantPx = rotDrawSize("giant"), soldierPx = rotDrawSize("soldier");
const ratio = soldierPx ? giantPx / soldierPx : 0;
console.log("escala: soldado " + soldierPx + "px desenhados, gigante " + giantPx +
  "px (" + ratio.toFixed(2) + "x, alvo " + GIANT_SCALE + "x)");
if (Math.abs(ratio - GIANT_SCALE) > 0.01) {
  problems.set("escala|gigante", "escala da gigante: " + ratio.toFixed(2) + "x (esperado " + GIANT_SCALE + "x)");
}
const coverage = [];          // quantos textos cada cenário auditou
const note = (label, kind, key, msg) => {
  const k = kind + "|" + key;
  if (!problems.has(k)) problems.set(k, msg);
};
const rectsOverlap = (a, b) => {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
};
const area = (r) => Math.max(1, r.w * r.h);

// texto encoberto: retângulo opaco pintado DEPOIS por cima do texto
function opaqueAfter(ops, i) {
  const t = ops[i];
  for (let j = i + 1; j < ops.length; j++) {
    const o = ops[j];
    if (o.kind !== "fillRect" && o.kind !== "fillPath") continue;
    if (o.alpha < 0.55 && !/^#[0-9a-f]{6}$/i.test(String(o.style))) continue;
    if (!o.box) continue;
    // escurecedores de tela cheia (draft, pausa, fim, câmara) são intencionais
    if (o.box.w * o.box.h > 960 * 540 * 0.85) continue;
    const ov = rectsOverlap(t.box, o.box);
    if (ov > area(t.box) * 0.6 && o.box.w > 8 && o.box.h > 8) return o;
  }
  return null;
}

// Em RUN o mundo (props, unidades, textos flutuantes) é desenhado primeiro, em
// coordenadas de MUNDO — texto de mundo pode sair da tela ao arrastar a câmera
// (é recortado pelo canvas, não é defeito). A interface começa no painel do
// jogador (10,8,262) ou, nas telas modais, no escurecedor de tela cheia.
function uiStart(ops) {
  const hud = ops.findIndex((o) => o.box && Math.abs(o.box.x - 10) < 1.5 &&
    Math.abs(o.box.y - 8) < 1.5 && Math.abs(o.box.w - 262) < 2);
  let last = -1;
  ops.forEach((o, i) => {
    if (!o.box) return;
    if ((o.kind === "fillRect" || o.kind === "fillPath") && o.box.w > 900 && o.box.h > 500) last = i;
  });
  if (last >= 0 && last + 1 > hud) return last + 1;
  return hud < 0 ? 0 : hud;
}

function auditFrame(label, ops, opt = {}) {
  const uiOps = opt.uiStart === "auto" ? ops.slice(uiStart(ops)) : ops;
  const texts = [];
  uiOps.forEach((o, i) => { if (o.kind === "text") texts.push({ ...o, i }); });

  // 1) fora do canvas (a ÁRVORE desenha nós fora da vista ao dar pan/zoom —
  //    lá o corte é esperado)
  for (const t of texts) {
    if (opt.allowOffscreen) break;
    if (t.style === "rgba(10,8,18,0.9)") continue; // sombra do texto
    const b = t.box;
    if (b.x < -0.6 || b.y < -0.6 || b.x + b.w > 960.6 || b.y + b.h > 540.6) {
      note(label, "fora", t.text,
        `${label}: texto "${t.text}" fora do canvas em (${b.x.toFixed(0)},${b.y.toFixed(0)}) ${b.w.toFixed(0)}x${b.h.toFixed(0)}`);
    }
  }
  // 2) encoberto por algo pintado depois
  for (const t of texts) { if (opt.allowOffscreen) break;
    if (t.style === "rgba(10,8,18,0.9)") continue;
    const o = opaqueAfter(uiOps, t.i);
    if (o) note(label, "encoberto", t.text,
      `${label}: texto "${t.text}" (y=${t.box.y.toFixed(0)}) encoberto por fill em (${o.box.x.toFixed(0)},${o.box.y.toFixed(0)}) ${o.box.w.toFixed(0)}x${o.box.h.toFixed(0)}`);
  }
  // 3) textos colidindo (ignora sombra e repetição do mesmo texto por perto)
  for (let i = 0; !opt.allowOffscreen && i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.text === b.text) continue;
      if (a.style === "rgba(10,8,18,0.9)" || b.style === "rgba(10,8,18,0.9") continue;
      const ov = rectsOverlap(a.box, b.box);
      if (ov > Math.min(area(a.box), area(b.box)) * 0.35) {
        note(label, "colisao", a.text + " x " + b.text,
          `${label}: textos colidem "${a.text}"@${a.box.x.toFixed(0)},${a.box.y.toFixed(0)} x "${b.text}"@${b.box.x.toFixed(0)},${b.box.y.toFixed(0)}`);
      }
    }
  }
  coverage.push(label + " " + texts.length);
  // 4) botões sobrepostos
  const bs = uiButtons();
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const ov = rectsOverlap(a, b);
      if (ov > Math.min(area(a), area(b)) * 0.35) {
        note(label, "botoes", a.id + " x " + b.id,
          `${label}: botões sobrepostos ${a.id} x ${b.id} (clique ambíguo)`);
      }
    }
  }
}

const clickAt = (x, y) => {
  mouse.x = x; mouse.y = y; mouse.down = mouse.justDown = true;
  frame();
  mouse.down = mouse.justDown = false; mouse.justUp = true;
  frame();
  mouse.justUp = false;
  frame();
};
function flushTransition(maxFrames = 40) {
  for (let i = 0; i < maxFrames; i++) {
    frame();
  }
}

// ---------------------------------------------------------------- cenários --
await wait(30);

// TÍTULO
G.screen = "TITLE";
auditFrame("TÍTULO", frame());

// COMO JOGAR
G.screen = "HELP";
auditFrame("COMO JOGAR", frame());
G.screen = "TITLE"; frame();

// ÁRVORE DA EVOLUÇÃO (com progresso, para desenhar preços/MAX)
G.screen = "TREE"; enterTree();
G.save.essence = 75;
G.save.nodes = { raiz: 1, t_col: 2, g_dan: 5, r_pop: 4 };
auditFrame("ÁRVORE", frame(), { allowOffscreen: true });
G.screen = "TITLE"; frame();

// RUN: novo fluxo PRETITLE->TITLE->MODE->RUN
// TÍTULO já está em TITLE, clica JOGAR -> MODE -> primeiro card -> RUN
clickAt(200, 275);
flushTransition();
if (G.screen !== "MODE") { console.error("não entrou em MODE após JOGAR (screen=" + G.screen + ")"); process.exit(3); }
auditFrame("MODE", frame());
clickAt(114, 282);
flushTransition();
if (G.screen !== "RUN") { console.error("não entrou na RUN após modo (screen=" + G.screen + ")"); process.exit(3); }
auditFrame("RUN hud", frame(), { uiStart: "auto" });

// HUD expandido
clickAt(58, G.run ? 108 : 108);
auditFrame("RUN hud expandido", frame(), { uiStart: "auto" });

// botão FORMIGAS: abre a fileira das 9 classes no rodapé (recolhida por padrão)
clickAt(62, 540 - 100 + 44);
auditFrame("RUN formigas abertas", frame(), { uiStart: "auto" });
clickAt(62, 540 - 100 + 44);   // fecha de novo

// GIGANTE em campo: colosso de 20x a soldado, arte assada 5x e ampliada no
// desenho. Fica com comida sobrando para a loja mostrar o slot habilitado.
const { spawnAnt } = await import(BASE + "units.js");
{
  const faminto = G.run.food;
  G.run.food = 900;
  const A = world.anthill;
  const GI = spawnAnt("giant", A.x + 30, A.y + 20, { guardPos: { x: A.x + 220, y: A.y + 160 } });
  GI.spawnT = 0; GI.bob = 1.2;
  auditFrame("RUN gigante", frame(), { uiStart: "auto" });
  G.run.food = faminto;
  allies.splice(allies.indexOf(GI), 1);
}

// tutorial aberto
startTutorial();
TUT.t = 1.2;
auditFrame("RUN tutorial", frame(), { uiStart: "auto" });
stopTutorial(true);

// chefe na tela (fase de onda do chefe, como no jogo real)
director.waveInMap = (await import(BASE + "config.js")).MAPS[0].waves.length;
director.phase = "wave";
director.budget = 8;
const B1 = spawnBoss("hare", G.run.wave || 1);
B1.x = world.anthill.x + 120; B1.y = world.anthill.y - 60; B1.revealT = 5;
await wait(20);
auditFrame("RUN chefe", frame(), { uiStart: "auto" });
// com tutorial aberto (cartão + barra do chefe)
startTutorial();
TUT.t = 1.2;
auditFrame("RUN tutorial + chefe", frame(), { uiStart: "auto" });
stopTutorial(true);

// draft
G.run.draft = { options: (await import(BASE + "mutations.js")).rollDraft(), t: 2 };
auditFrame("RUN draft", frame(), { uiStart: "auto" });
G.run.draft = null;

// FORMIGUEIRO (cena viva): abre pelo botão do canto inferior-direito
G.run.baseOpen = true;
auditFrame("RUN formigueiro", frame(), { uiStart: "auto" });
G.run.baseOpen = false;
nestExit();

// pausa
const { setPaused } = await import(BASE + "game.js");
setPaused(true);
auditFrame("RUN pausa", frame(), { uiStart: "auto" });
setPaused(false);

// transição de mapa
G.run.transition = true;
auditFrame("RUN transição", frame(), { uiStart: "auto" });
G.run.transition = false;

// fim de expedição (derrota com muitas mutações: testa o painel mais cheio)
G.run.status = "lost";
G.run.payout = { relic: 42, waveBonus: 180, killBonus: 320, mapBonus: 480, winBonus: 0, mult: 1.45, total: 1500 };
G.run.mutationLog = (await import(BASE + "config.js")).MUTATIONS.slice(0, 10).map(m => ({ ...m, rar: m.rar }));
auditFrame("RUN fim (derrota)", frame(), { uiStart: "auto" });
// vitória
G.run.payout = { relic: 62, waveBonus: 220, killBonus: 510, mapBonus: 960, winBonus: 200, mult: 1.45, total: 2800 };
G.run.status = "won";
auditFrame("RUN fim (vitória)", frame(), { uiStart: "auto" });

// mapa 6 (bioma do gelo) com chefe boar, mundo todo renderizado
const { genWorld } = await import(BASE + "world.js");
genWorld(4242, 5);
await wait(20);
G.run.status = "running";
G.run.payout = null;
G.run.mutationLog = [];
G.run.endT = 0;
foes.length = 0;
const M6 = (await import(BASE + "config.js")).MAPS[5];
director.mapIdx = 5;
director.waveInMap = M6.waves.length;
director.phase = "wave";
director.budget = 8;
spawnBoss("boar", 40);
auditFrame("RUN mapa 6 + chefe", frame(), { uiStart: "auto" });

const list = [...problems.values()];
console.log("textos auditados: " + coverage.join(" | "));
console.log(list.length ? "PROBLEMAS (" + list.length + "):\n - " + list.join("\n - ") : "TESTE DE LAYOUT PASSOU");
process.exit(list.length ? 2 : 0);
