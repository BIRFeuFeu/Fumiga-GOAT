// ============================================================================
// FUMIGA — MODO DEBUG (ferramenta de desenvolvimento, fora do jogo normal)
//
// Só é carregado quando a URL tem ?debug (import dinâmico em main.js): o
// jogador comum nunca baixa nem executa este arquivo. O save usa um slot
// próprio "_debug" (state.js), então nada aqui toca o progresso real.
//
// Inspiração: o Debug Mode do Celeste (save com tudo liberado, teleporte para
// qualquer sala) e o cenário de testes do Factorio (entra pronto para testar).
//
// Parâmetros (combináveis):
//   ?debug                      liga o overlay (FPS, ms/frame, entidades) e window.FUMIGA
//   &tela=TITLE|MODE|TREE|OPTIONS|HELP|PROPHECY|MEMORY|RUN|NINHO
//   &mapa=1..6  &modo=campanha|sobrevivencia|enxame|cacada  &seed=123
//   &invencivel  &essencia=9999  &velocidade=2
//   &cutscene   (por padrão cutscenes e tutorial são pulados no debug)
//   &limpo      (zera o save de debug antes de aplicar o resto)
//   &hud=0      (esconde o overlay — útil para capturas de tela limpas)
//
// Exemplos:
//   /game/?debug&tela=RUN&mapa=3&seed=42&invencivel
//   /game/mobile/?debug&tela=TREE&essencia=5000
// Teclado: F3 liga/desliga o overlay. No console: FUMIGA.ajuda()
// ============================================================================
import { G, persistSave } from "./state.js";
import { MAPS } from "./config.js";
import { missingGlyphs, layoutRec } from "./font.js";
import { __debug } from "./game.js";
import { getCutsceneDefs } from "./cutscenes.js";
import { allies } from "./units.js";
import { foes, boss } from "./enemies.js";
import { projectiles, orbs } from "./combat.js";
import { counts as particleCount } from "./particles.js";
import { director } from "./waves.js";
import { world } from "./world.js";

const SCREENS = ["PRETITLE", "TITLE", "MODE", "TREE", "OPTIONS", "HELP", "PROPHECY", "MEMORY", "RUN", "NINHO"];

// --------------------------------------------------------------- medições ---
const fps = { frames: 0, acc: 0, value: 0, worst: 0, worstAcc: 0, workMs: 0, workAcc: 0 };
let showHud = true;
const errors = [];

function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }

function readParams() {
  const p = new URLSearchParams(location.search);
  const has = (k) => p.has(k) && p.get(k) !== "0" && p.get(k) !== "false";
  return {
    tela: (p.get("tela") || "").toUpperCase(),
    mapa: num(p.get("mapa"), 1) - 1,
    modo: p.get("modo") || "campanha",
    seed: p.has("seed") ? num(p.get("seed"), 1) : null,
    invencivel: has("invencivel"),
    essencia: p.has("essencia") ? Math.max(0, num(p.get("essencia"), 0)) : null,
    velocidade: p.has("velocidade") ? num(p.get("velocidade"), 1) : null,
    cutscene: has("cutscene"),
    limpo: has("limpo"),
    hud: p.get("hud") !== "0",
  };
}

function skipIntro() {
  // marca todas as memórias como vistas e o tutorial como feito (save de debug)
  G.save.cutscenes = G.save.cutscenes || {};
  for (const id of Object.keys(getCutsceneDefs())) G.save.cutscenes[id] = true;
  G.save.tutorial = 1;
}

/** Vai para uma tela (ou expedição) pelos mesmos caminhos dos botões. */
function go(tela, opts = {}) {
  tela = String(tela || "").toUpperCase();
  if (tela === "RUN" || tela === "NINHO") {
    __debug.startRun({ mode: opts.modo || "campanha", map: opts.mapa ?? 0, seed: opts.seed ?? null });
    if (tela === "NINHO") setTimeout(() => __debug.openNest(), 50);
    return G.screen;
  }
  if (!SCREENS.includes(tela)) throw new Error("tela desconhecida: " + tela + " (use " + SCREENS.join(", ") + ")");
  __debug.openScreen(tela);
  return G.screen;
}

function snapshot() {
  const run = G.run;
  return {
    tela: G.screen,
    fps: Math.round(fps.value), piorFrameMs: +fps.worst.toFixed(1), trabalhoMs: +fps.workMs.toFixed(2),
    mapa: run ? run.mapIdx + 1 : null, onda: run ? director.waveInMap : null, fase: run ? director.phase : null,
    seed: run ? run.seed : null,
    aliadas: allies.filter((a) => !a.dead).length, inimigas: foes.length, chefe: !!boss,
    particulas: particleCount(), projeteis: projectiles.length, orbes: orbs.length,
    props: world.props ? world.props.length : 0,
    glifosFaltando: [...missingGlyphs.entries()].map(([c, t]) => c + " em \"" + t + "\""),
    erros: errors.slice(-10),
  };
}

// ------------------------------------------------------ AUDITORIA DE LAYOUT --
// Grava UM frame (font.js/ui.js) e acusa, só na camada de interface:
//   fora      texto fora do canvas 960x540
//   colisão   dois textos se sobrepondo
//   vazando   texto que começa numa caixa/botão e passa da borda dela
//   botões    botões desenhados um por cima do outro
//   sob-botão texto invadindo um botão que não é o dele
//   toque     (mobile) botão DOM da camada de toque cobrindo texto/botão do canvas
const ov = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const inter = (a, b) => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
};
const inside = (a, b, tol = 1.5) => a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const area = (r) => Math.max(1, r.w * r.h);
const R = (r) => "(" + Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.w) + "x" + Math.round(r.h) + ")";

function domRects() {
  // botões da camada de toque (game/mobile/touch.js), em coordenadas do canvas
  const cv = document.getElementById("game");
  if (!cv) return [];
  const c = cv.getBoundingClientRect(), sx = 960 / c.width, sy = 540 / c.height;
  const out = [];
  for (const el of document.querySelectorAll("#touch-hud button, #touch-hud .btn, #touch-mode-btn, #rotate-hint")) {
    const st = getComputedStyle(el);
    if (el.hidden || st.display === "none" || st.visibility === "hidden" || +st.opacity < 0.05) continue;
    if (el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    out.push({ id: (el.textContent || el.id || "toque").trim().replace(/\s+/g, " ").slice(0, 24),
      x: (r.left - c.left) * sx, y: (r.top - c.top) * sy, w: r.width * sx, h: r.height * sy });
  }
  return out;
}

function analyzeLayout(texts0, boxes0) {
  const issues = [];
  const add = (k, msg) => { if (!issues.some((i) => i.msg === msg)) issues.push({ tipo: k, msg }); };
  // só interface, visível (alpha) e recortada pela lista rolável
  const texts = [];
  for (const t of texts0) {
    if (t.layer !== "ui" || t.alpha < 0.35) continue;
    const v = t.clip ? inter(t, t.clip) : t;
    if (!v || v.h < t.h * 0.5) continue;
    texts.push(Object.assign({}, t, v));
  }
  const boxes = [];
  for (const b of boxes0) {
    if (b.layer !== "ui" || b.w < 6 || b.h < 6) continue;
    const v = b.clip ? inter(b, b.clip) : b;
    if (v) boxes.push(Object.assign({}, b, v));
  }
  const buttons = boxes.filter((b) => b.kind === "botao");

  for (const t of texts) {
    if (t.x < -1 || t.y < -1 || t.x + t.w > 961 || t.y + t.h > 541) add("fora", "texto \"" + t.text + "\" fora da tela " + R(t));
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.text === b.text && Math.abs(a.x - b.x) < 8 && Math.abs(a.y - b.y) < 8) continue; // camadas do mesmo texto
    const o = ov(a, b);
    if (o > Math.max(6, Math.min(area(a), area(b)) * 0.06)) add("colisão", "\"" + a.text + "\" " + R(a) + " x \"" + b.text + "\" " + R(b));
  }
  for (const t of texts) {
    // dono = menor caixa que contém boa parte do texto
    let owner = null;
    for (const b of boxes) {
      if (ov(t, b) < area(t) * 0.4) continue;
      if (!owner || area(b) < area(owner)) owner = b;
    }
    if (owner && !inside(t, owner)) add("vazando", "\"" + t.text + "\" " + R(t) + " passa da borda de " + owner.kind + " " + owner.id + " " + R(owner));
    for (const b of buttons) {
      if (b === owner || inside(t, b) || inside(b, t)) continue;
      if (owner && inside(b, owner) === false && inside(owner, b)) continue;
      if (ov(t, b) > area(t) * 0.12) add("sob-botão", "\"" + t.text + "\" " + R(t) + " invade o botão " + b.id + " " + R(b));
    }
  }
  for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
    const a = buttons[i], b = buttons[j];
    const r = inter(a, b);
    if (r && r.w > 2 && r.h > 2 && !inside(a, b, 0) && !inside(b, a, 0)) add("botões", "botão " + a.id + " " + R(a) + " x botão " + b.id + " " + R(b));
  }
  for (const d of domRects()) {
    for (const b of buttons) { const r = inter(d, b); if (r && r.w > 2 && r.h > 2) add("toque", "botão de toque \"" + d.id + "\" " + R(d) + " cobre o botão " + b.id + " " + R(b)); }
    for (const t of texts) if (ov(d, t) > area(t) * 0.15) add("toque", "botão de toque \"" + d.id + "\" " + R(d) + " cobre o texto \"" + t.text + "\"");
  }
  return issues;
}

/** Audita o próximo frame. Resolve com { tela, issues, textos, caixas, toque }. */
function auditarLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      layoutRec.texts = []; layoutRec.boxes = []; layoutRec.layer = "ui"; layoutRec.clip = null;
      layoutRec.on = true;
      requestAnimationFrame(() => {
        layoutRec.on = false;
        const texts = layoutRec.texts, boxes = layoutRec.boxes;
        layoutRec.texts = []; layoutRec.boxes = [];
        resolve({ tela: G.screen, issues: analyzeLayout(texts, boxes), textos: texts.length, caixas: boxes.length, toque: domRects() });
      });
    });
  });
}

function ajuda() {
  const txt = [
    "FUMIGA — modo debug",
    "  FUMIGA.go('TREE')                       abre uma tela: " + SCREENS.join(", "),
    "  FUMIGA.go('RUN', {mapa: 2, seed: 42})   expedição direta (mapa 0..5)",
    "  FUMIGA.essencia(5000)                   define a essência do save de debug",
    "  FUMIGA.invencivel(true)                 rainha e colônia não morrem",
    "  FUMIGA.estado()                         FPS, entidades, glifos faltando, erros",
    "  await FUMIGA.auditarLayout()            sobreposições/vazamentos do frame atual",
    "  FUMIGA.G / FUMIGA.mapas                 estado global e definições dos mapas",
    "  F3                                      liga/desliga o overlay",
  ].join("\n");
  console.log(txt);
  return txt;
}

// ------------------------------------------------------------- instalação ---
export function installDebug() {
  const opt = readParams();
  showHud = opt.hud;

  if (opt.limpo) {
    for (const k of Object.keys(G.save.nodes)) delete G.save.nodes[k];
    G.save.essence = 0; G.save.cutscenes = {}; G.save.tutorial = 0;
  }
  if (!opt.cutscene) skipIntro();
  if (opt.essencia != null) G.save.essence = opt.essencia | 0;
  if (opt.invencivel) G.save.accessibility.invincible = true;
  if (opt.velocidade != null) G.save.settings.gameSpeed = Math.max(0.25, Math.min(4, opt.velocidade));
  persistSave();

  addEventListener("error", (e) => errors.push(String(e.message || e)));
  addEventListener("unhandledrejection", (e) => errors.push("promise: " + String(e.reason && e.reason.message || e.reason)));
  addEventListener("keydown", (e) => { if (e.code === "F3") { showHud = !showHud; e.preventDefault(); } });

  window.FUMIGA = {
    G, mapas: MAPS, go, ajuda, estado: snapshot, auditarLayout,
    essencia(v) { G.save.essence = Math.max(0, v | 0); persistSave(); return G.save.essence; },
    invencivel(on = true) { G.save.accessibility.invincible = !!on; persistSave(); return !!on; },
    hud(on = !showHud) { showHud = !!on; return showHud; },
    pronto: true,
  };

  if (opt.tela) {
    try { go(opt.tela, { mapa: opt.mapa, modo: opt.modo, seed: opt.seed }); }
    catch (e) { errors.push(String(e.message)); console.warn("[debug]", e.message); }
  }
  console.info("[FUMIGA debug] ativo — save isolado \"_debug\". Digite FUMIGA.ajuda()");
  return window.FUMIGA;
}

// -------------------------------------------------------------- overlay -----
/** Chamado por main.js depois de cada frame. workMs = update+render medido. */
export function debugFrame(ctx, dt, workMs) {
  fps.frames++; fps.acc += dt; fps.workAcc += workMs;
  fps.worstAcc = Math.max(fps.worstAcc, dt * 1000);
  if (fps.acc >= 0.5) {
    fps.value = fps.frames / fps.acc;
    fps.workMs = fps.workAcc / fps.frames;
    fps.worst = fps.worstAcc;
    fps.frames = 0; fps.acc = 0; fps.workAcc = 0; fps.worstAcc = 0;
  }
  if (!showHud) return;

  const run = G.run;
  const lines = [
    Math.round(fps.value) + " FPS  pior " + fps.worst.toFixed(1) + "ms  cpu " + fps.workMs.toFixed(2) + "ms",
    "tela " + G.screen + (run && G.screen === "RUN" ? "  mapa " + (run.mapIdx + 1) + "  onda " + director.waveInMap + " (" + director.phase + ")" : ""),
  ];
  if (run && G.screen === "RUN") {
    lines.push("aliadas " + allies.filter((a) => !a.dead).length + "  inimigas " + foes.length + (boss ? " +CHEFE" : "") +
      "  part " + particleCount() + "  proj " + projectiles.length);
    lines.push("seed " + run.seed);
  }
  if (missingGlyphs.size) lines.push("GLIFO FALTANDO: " + [...missingGlyphs.keys()].join(" "));
  if (errors.length) lines.push("ERRO: " + errors[errors.length - 1].slice(0, 60));

  // fonte nativa: o overlay funciona mesmo se o atlas da fonte falhar
  ctx.save();
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  const w = 8 + Math.max(...lines.map((l) => ctx.measureText(l).width || l.length * 7));
  const x = ctx.canvas.width - w - 6, y = 6;
  ctx.fillStyle = "rgba(5,4,10,0.72)";
  ctx.fillRect(x, y, w, lines.length * 13 + 6);
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? (fps.value < 50 ? "#ff4d5a" : "#7ff3e0") : (l.startsWith("GLIFO") || l.startsWith("ERRO") ? "#ff4d5a" : "#d9cfff");
    ctx.fillText(l, x + 4, y + 4 + i * 13);
  });
  ctx.restore();
}
