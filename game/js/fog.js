// ============================================================================
// FUMIGA — Fog of War: grade de visão da colônia (explorado vs visível)
// ============================================================================
import { WORLD_W, WORLD_H } from "./config.js";

const CELL = 32;                       // tamanho da célula em pixels do mundo
const COLS = Math.ceil(WORLD_W / CELL);
const ROWS = Math.ceil(WORLD_H / CELL);

const visited = new Uint8Array(COLS * ROWS);  // já explorado alguma vez
const seen = new Uint8Array(COLS * ROWS);     // visível neste ciclo

let dirty = true;
let veil = null;                      // canvas de baixa resolução da névoa

export function fogReset() {
  visited.fill(0);
  seen.fill(0);
  dirty = true;
}

function cellOf(x, y) {
  const c = (x / CELL) | 0, r = (y / CELL) | 0;
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
  return r * COLS + c;
}

export function fogVisible(x, y) {
  const k = cellOf(x, y);
  return k >= 0 && seen[k] === 1;
}
export function fogExplored(x, y) {
  const k = cellOf(x, y);
  return k >= 0 && visited[k] === 1;
}

/** Revela círculo em torno de (x,y) em pixels. */
function reveal(x, y, rPx) {
  const r = Math.ceil(rPx / CELL);
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0;
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      if (i * i + j * j > r * r + r) continue; // borda arredondada
      const c = cx + i, rr = cy + j;
      if (c < 0 || rr < 0 || c >= COLS || rr >= ROWS) continue;
      seen[rr * COLS + c] = 1;
    }
  }
}

/**
 * Recalcula a visão do ciclo.
 * beings = [{x,y,sight}] (rainha, rainha no ninho, unidades, chefe agredido)
 */
export function fogUpdate(beings) {
  seen.fill(0);
  for (const b of beings) reveal(b.x, b.y, b.sight);
  for (let i = 0; i < seen.length; i++) if (seen[i]) visited[i] = 1;
  dirty = true;
}

// ---------------------------------------------------------------- desenho ---
function rebuildVeil() {
  if (!veil) {
    veil = document.createElement("canvas");
    veil.width = COLS; veil.height = ROWS;
  }
  const c = veil.getContext("2d");
  const img = c.getImageData(0, 0, COLS, ROWS);
  const d = img.data;
  for (let i = 0; i < seen.length; i++) {
    const o = i * 4;
    if (!visited[i]) { d[o] = 7; d[o + 1] = 5; d[o + 2] = 12; d[o + 3] = 248; }
    else if (!seen[i]) { d[o] = 7; d[o + 1] = 5; d[o + 2] = 12; d[o + 3] = 128; }
    else { d[o + 3] = 0; }
  }
  c.putImageData(img, 0, 0);
  dirty = false;
}

/** Pinta a névoa sobre o mundo inteiro (coordenadas de tela via origem/zoom). */
export function fogDraw(ctx, originX, originY, zoom, time) {
  if (dirty) rebuildVeil();
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true; // bordas suaves, estilo Dead Cells
  ctx.drawImage(veil, originX, originY, WORLD_W * zoom, WORLD_H * zoom);
  ctx.imageSmoothingEnabled = prev;
}

/** Névoa no minimapa (mapeada na escala do mini). */
export function fogDrawMini(ctx, mx, my, mw, mh) {
  if (dirty) rebuildVeil();
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 0.85;
  ctx.drawImage(veil, mx, my, mw, mh);
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = prev;
}
