// ============================================================================
// FUMIGA-GOAT — utilitários matemáticos / RNG / helpers
// ============================================================================

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand  = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const irand = (a, b) => Math.floor(rand(a, b + 1));
export const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp  = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
export const dist  = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const TAU = Math.PI * 2;

export function angLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function easeOutBack(t) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

export function fmt(n) {
  n = Math.floor(n);
  return n >= 10000 ? (n / 1000).toFixed(1) + "K" : String(n);
}

export let UID = 1;
export function nextId() { return UID++; }

// ---------------------------------------------------------------------------
// Grade espacial simples para separação e consultas de proximidade
// ---------------------------------------------------------------------------
export class SpatialGrid {
  constructor(cellSize = 64) {
    this.cs = cellSize;
    this.map = new Map();
  }
  clear() { this.map.clear(); }
  key(x, y) { return ((x / this.cs) | 0) * 100000 + ((y / this.cs) | 0); }
  insert(e) {
    const k = this.key(e.x, e.y);
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(e);
  }
  /** visita todas as entidades em células vizinhas ao ponto */
  around(x, y, cb) {
    const cx = (x / this.cs) | 0, cy = (y / this.cs) | 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const arr = this.map.get((cx + i) * 100000 + (cy + j));
        if (arr) for (let n = 0; n < arr.length; n++) cb(arr[n]);
      }
    }
  }
}
