// ============================================================================
// FUMIGA-GOAT — partículas, ondas de choque, textos flutuantes (com pooling)
// ============================================================================
import { rand, TAU, clamp } from "./utils.js";

const MAX_P = 620;
const parts = [];   // partículas
const rings = [];   // ondas de choque
const floats = [];  // textos flutuantes
const trails = [];  // trilhas de feromônio

export function clearParticles() {
  parts.length = 0; rings.length = 0; floats.length = 0; trails.length = 0;
}

export function spawnPart(o) {
  if (parts.length >= MAX_P) parts.shift();
  parts.push({
    x: o.x, y: o.y,
    vx: o.vx || 0, vy: o.vy || 0,
    g: o.g || 0,
    life: o.life || 0.6, maxLife: o.life || 0.6,
    size: o.size || 2,
    sizeEnd: o.sizeEnd !== undefined ? o.sizeEnd : o.size || 2,
    color: o.color || "#fff",
    glow: !!o.glow,
    drag: o.drag !== undefined ? o.drag : 0.94,
  });
}

export function burst(x, y, opt) {
  const n = opt.n || 8;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(opt.spMin || 20, opt.spMax || 90);
    spawnPart({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 0),
      g: opt.g || 0,
      life: rand((opt.life || 0.55) * 0.6, (opt.life || 0.55) * 1.3),
      size: rand(opt.sizeMin || 1.5, opt.sizeMax || 3.5),
      sizeEnd: 0.5,
      color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color || "#fff"),
      glow: opt.glow,
      drag: opt.drag !== undefined ? opt.drag : 0.9,
    });
  }
}

export function ring(x, y, opt) {
  rings.push({
    x, y,
    r: opt.r0 || 6, r1: opt.r1 || 80,
    life: opt.life || 0.5, maxLife: opt.life || 0.5,
    color: opt.color || "#fff", width: opt.width || 3,
  });
  if (rings.length > 40) rings.shift();
}

export function floatText(x, y, text, opt = {}) {
  if (floats.length > 46) floats.shift();
  floats.push({
    x, y: y - 8, vy: -34,
    text: String(text),
    life: opt.life || 1.1, maxLife: opt.life || 1.1,
    color: opt.color || "#fff",
    scale: opt.scale || 1,
    font: opt.font || "small",
  });
}

/** trilha de feromônio (operárias/inimigos) */
export function scent(x, y, color) {
  if (trails.length > 260) trails.shift();
  trails.push({ x, y, life: 1.6, maxLife: 1.6, color });
}

export function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt;
    if (r.life <= 0) rings.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    if (f.life <= 0) { floats.splice(i, 1); continue; }
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.92, dt * 60);
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= dt;
    if (t.life <= 0) trails.splice(i, 1);
  }
}

// ------------------------------------------------------------------- draw ---
export function drawTrails(ctx, w2s) {
  for (const t of trails) {
    const a = 0.32 * (t.life / t.maxLife);
    const s = w2s(t.x, t.y);
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    const sz = 2.2;
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

export function drawParts(ctx, w2s) {
  // camada normal
  for (const p of parts) {
    if (p.glow) continue;
    const t = p.life / p.maxLife;
    const s = w2s(p.x, p.y);
    ctx.globalAlpha = clamp(t * 1.4, 0, 1);
    ctx.fillStyle = p.color;
    const sz = Math.max(1, p.size + (p.sizeEnd - p.size) * (1 - t));
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

export function drawGlows(ctx, w2s) {
  // camada aditiva (brilhos)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of parts) {
    if (!p.glow) continue;
    const t = p.life / p.maxLife;
    const s = w2s(p.x, p.y);
    ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
    ctx.fillStyle = p.color;
    const sz = Math.max(1, (p.size + (p.sizeEnd - p.size) * (1 - t)) * 1.6);
    ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRings(ctx, w2s, zoom) {
  for (const r of rings) {
    const t = 1 - r.life / r.maxLife;
    const s = w2s(r.x, r.y);
    ctx.globalAlpha = (1 - t) * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1, r.width * zoom * (1 - t * 0.6));
    ctx.beginPath();
    ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * t) * zoom, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawFloats(ctx, font_drawText) {
  for (const f of floats) {
    const t = f.life / f.maxLife;
    font_drawText(ctx, f.text, f.x, f.y, {
      font: f.font, scale: f.scale, color: f.color,
      align: "center", alpha: clamp(t * 1.8, 0, 1),
    });
  }
  ctx.globalAlpha = 1;
}

export function counts() { return parts.length; }
