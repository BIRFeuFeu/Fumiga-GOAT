// ============================================================================
// FUMIGA-GOAT — fonte bitmap (2 tamanhos) com cache de linhas
// Atlas: grade 12 colunas; ordem = FONT.CHARS
// ============================================================================

// Ordem idêntica à do pipeline (tools/prepare_assets.sh, array CHS):
// 12 colunas por linha. Os glifos extras ficam no fim para não deslocar índice
// algum — texto com "—", "•", "▶", "[", "]" ou "✓" antes caía no fallback "?".
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "ÁÀÂÃÉÊÍÓÔÕÚÇ" +
  "0123456789" +
  "?!.,:;+-*/%()<>=#_ " +
  "—•▶[]✓";

/** Glifos disponíveis no atlas (ordem da grade). Usado pelo teste de texto. */
export const FONT_CHARS = CHARS;

export const FONT = {
  big:   { src: "assets/font/font_big.png",   cw: 22, ch: 30, adv: 13, lh: 36 },
  small: { src: "assets/font/font_small.png", cw: 13, ch: 16, adv: 8,  lh: 20 },
};

const imgs = {};
const cache = new Map(); // key -> canvas
let cacheCount = 0;
const CACHE_MAX = 600;

export function loadFonts() {
  return Promise.all(Object.entries(FONT).map(([k, f]) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { imgs[k] = img; res(); };
    img.onerror = () => rej(new Error("fonte não carregou: " + f.src));
    img.src = f.src;
  })));
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

/** Renderiza (com cache) uma linha de texto e a desenha em ctx. */
export function drawText(ctx, text, x, y, {
  font = "small", scale = 1, color = "#fff", align = "left", shadow = true,
  shadowColor = "rgba(10,8,18,0.9)", alpha = 1,
} = {}) {
  text = String(text).toUpperCase();
  const cv = lineCanvas(text, font, scale, color);
  let dx = x;
  if (align === "center") dx = x - cv.width / 2;
  else if (align === "right") dx = x - cv.width;
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
    if (gi < 0) gi = CHARS.indexOf("?");
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
