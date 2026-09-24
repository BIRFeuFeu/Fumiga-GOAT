// ============================================================================
// FUMIGA-GOAT — fonte bitmap (2 tamanhos) com cache de linhas
// Atlas: grade 12 colunas; ordem = FONT.CHARS
// ============================================================================
import { G } from "./state.js";
import { assetUrl, loadImage, LOAD_CFG } from "./assets.js";

// Ordem idêntica à do pipeline (tools/prepare_assets.sh, array CHS):
// 12 colunas por linha. Os glifos extras ficam no fim para não deslocar índice
// algum — texto com "—", "•", "▶", "[", "]" ou "✓" antes caía no fallback "?".
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ÁÀÂÃÉÊÍÓÔÕÚÇ" +
  "0123456789" +
  "?!.,:;+-*/%()<>=#_ " +
  "—•▶[]✓" +
  "∞Ñ";

/** Glifos disponíveis no atlas (ordem da grade). Usado pelo teste de texto. */
export const FONT_CHARS = CHARS;

/**
 * Caracteres pedidos a drawText que não existem no atlas (viram "?" na tela),
 * com o texto onde apareceram. Lido pelo modo debug e por test/inspect.mjs:
 * pega o que o scanner estático não vê (textos montados em tempo de execução).
 */
export const missingGlyphs = new Map();

// ---------------------------------------------------------- GRAVADOR DE LAYOUT
// Ferramenta de auditoria (modo debug / test/layout-browser.mjs): quando ligado
// por UM frame, grava a caixa de tinta de cada texto e cada painel/botão, já na
// coordenada do canvas. Desligado (sempre, no jogo normal) custa um `if`.
//   layer: "world" (mundo da expedição, que pode se sobrepor à vontade) | "ui"
//   clip:  retângulo de recorte ativo (lista rolável), para ignorar o escondido
export const layoutRec = { on: false, layer: "ui", clip: null, texts: [], boxes: [] };
const INK = { big: [5, 20], small: [4, 14] };   // [recuo do topo, altura da tinta] na célula

function txBox(ctx, x, y, w, h) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  if (!m || typeof m.a !== "number") return { x, y, w, h };
  const x0 = m.a * x + m.c * y + m.e, y0 = m.b * x + m.d * y + m.f;
  const x1 = m.a * (x + w) + m.c * (y + h) + m.e, y1 = m.b * (x + w) + m.d * (y + h) + m.f;
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

/** Grava um contêiner (painel, botão, caixa) para a auditoria de layout. */
export function layoutBox(ctx, kind, x, y, w, h, id) {
  if (!layoutRec.on) return;
  layoutRec.boxes.push(Object.assign({ kind, id: id || kind, layer: layoutRec.layer, clip: layoutRec.clip }, txBox(ctx, x, y, w, h)));
}

export const FONT = {
  big:   { src: "assets/font/font_big.png",   cw: 22, ch: 30, adv: 13, lh: 36 },
  small: { src: "assets/font/font_small.png", cw: 20, ch: 18, adv: 11, lh: 22 },
};

const imgs = {};
const cache = new Map(); // key -> canvas
let cacheCount = 0;
const CACHE_MAX = 600;

// Mesma proteção do resto do boot (ver loadAll em assets.js): prazo por
// imagem + uma segunda tentativa. Uma fonte pendurada deixava a barra de
// carregamento parada para sempre no celular.
export async function loadFonts() {
  const entries = Object.entries(FONT);
  const failed = [];
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const [k, f] = entries[next++];
      let img = null;
      for (let a = 0; a < LOAD_CFG.attempts && !img; a++) {
        try { img = await loadImage(assetUrl(f.src) + (a ? "&r=1" : "")); } catch (e) { img = null; }
      }
      if (img) imgs[k] = img; else failed.push(f.src);
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(2, entries.length); i++) workers.push(worker());
  await Promise.all(workers);
  if (failed.length) throw new Error("fonte não carregou: " + failed[0]);
}

function tinted(img, color) {
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const c = cv.getContext("2d");
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color;
  c.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

const tintCache = new Map();

function fontTinted(fname, color) {
  const key = fname + "|" + color;
  let t = tintCache.get(key);
  if (!t) {
    t = tinted(imgs[fname], color);
    tintCache.set(key, t);
    if (tintCache.size > 24) tintCache.delete(tintCache.keys().next().value);
  }
  return t;
}

// Largura real de uma linha: cada glifo avança `adv` px, mas a arte de um
// glifo ocupa `cw` px de célula. O último caractere precisa da célula inteira,
// senão a tinta além do avanço (ex.: W, Y, Ç, Ã, É) sai recortada.
export function lineWidth(len, { font = "small", scale = 1 } = {}) {
  if (len <= 0) return 0;
  const F = FONT[font];
  return ((len - 1) * F.adv + F.cw) * scale;
}

export function textWidth(text, { font = "small", scale = 1 } = {}) {
  return lineWidth(String(text).length, { font, scale });
}

/** Renderiza (com cache) uma linha de texto e a desenha em ctx. FASE 2: bigFont + highContrast */
export function drawText(ctx, text, x, y, {
  font = "small", scale = 1, color = "#fff", align = "left", shadow = true,
  shadowColor = "rgba(10,8,18,0.9)", alpha = 1, maxWidth = Infinity,
} = {}) {
  text = String(text).toUpperCase();
  // FASE 2: acessibilidade bigFont aumenta 30% e highContrast força sombra mais forte
  if (G && G.save && G.save.accessibility && G.save.accessibility.bigFont) {
    scale *= 1.3;
  }
  if (G && G.save && G.save.accessibility && G.save.accessibility.highContrast) {
    // alto contraste: sombra mais grossa e cor mais viva
    shadow = true;
    shadowColor = "rgba(0,0,0,1)";
  }
  // Bound only explicitly constrained labels, after accessibility enlargement.
  scale = Math.min(scale, maxWidth / Math.max(1, lineWidth(text.length, {font})));
  const cv = lineCanvas(text, font, scale, color);
  let dx = x;
  if (align === "center") dx = x - cv.width / 2;
  else if (align === "right") dx = x - cv.width;
  if (layoutRec.on && text.trim()) {
    // caixa da TINTA (sem a folga da célula): é o que o jogador vê
    const [iy, ih] = INK[font] || INK.small, F = FONT[font] || FONT.small;
    const lead = text.length - text.trimStart().length, core = text.trim().length;
    layoutRec.texts.push(Object.assign({ text: text.trim(), layer: layoutRec.layer, clip: layoutRec.clip,
      alpha: ctx.globalAlpha * alpha },
      txBox(ctx, Math.round(dx) + lead * F.adv * scale, Math.round(y) + iy * scale, (core - 1) * F.adv * scale + F.cw * scale * 0.8, ih * scale)));
  }
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.drawImage(lineCanvas(text, font, scale, shadowColor), Math.round(dx) + scale, Math.round(y) + scale);
  }
  ctx.drawImage(cv, Math.round(dx), Math.round(y));
  ctx.globalAlpha = prevA;
  return cv.height;
}

function lineCanvas(text, fname, scale, color) {
  const key = fname + "|" + scale + "|" + color + "|" + text;
  let cv = cache.get(key);
  if (cv) return cv;
  const F = FONT[fname];
  const img = fontTinted(fname, color);
  const w = Math.max(1, lineWidth(text.length, { font: fname, scale }));
  const h = F.ch * scale;
  cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  for (let i = 0; i < text.length; i++) {
    let gi = CHARS.indexOf(text[i]);
    if (gi < 0) {
      gi = CHARS.indexOf("?");
      // só no caminho sem cache: custo zero por frame
      if (text[i] !== "?" && missingGlyphs.size < 64) missingGlyphs.set(text[i], text);
    }
    const sx = (gi % 12) * F.cw, sy = Math.floor(gi / 12) * F.ch;
    c.drawImage(img, sx, sy, F.cw, F.ch, i * F.adv * scale, 0, F.cw * scale, F.ch * scale);
  }
  cache.set(key, cv);
  if (++cacheCount > CACHE_MAX) {
    // limpa metade mais antiga
    let n = 0;
    for (const k of cache.keys()) { cache.delete(k); if (++n > CACHE_MAX / 2) break; }
    cacheCount = cache.size;
  }
  return cv;
}

/** Quebra texto em linhas cabendo em maxW. */
export function wrapText(text, maxW, { font = "small", scale = 1 } = {}) {
  text = String(text).toUpperCase();
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (textWidth(test, { font, scale }) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
