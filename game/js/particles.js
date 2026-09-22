// ============================================================================
// FUMIGA-GOAT — partículas, ondas de choque, textos flutuantes (com pooling)
// V2: efeitos Dead Cells / Celeste — impactos, críticos, slash, cura, levelup
// ============================================================================
import { rand, TAU, clamp } from "./utils.js";

const MAX_P = 900;
const parts = [];   // partículas
const rings = [];   // ondas de choque
const floats = [];  // textos flutuantes
const trails = [];  // trilhas de feromônio
const decals = [];  // marcas no chão (sangue, queimado)

export function clearParticles() {
  parts.length = 0; rings.length = 0; floats.length = 0; trails.length = 0; decals.length = 0;
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
    rot: o.rot || 0,
    vr: o.vr || 0,
    shape: o.shape || "square", // square, circle, diamond, spark, hex (cristal memória FASE 2)
  });
}

export function spawnDecal(x, y, opt = {}) {
  if (decals.length > 80) decals.shift();
  decals.push({
    x, y,
    r: opt.r || 12,
    life: opt.life || 6,
    maxLife: opt.life || 6,
    color: opt.color || "#1a0f1e",
    type: opt.type || "blood",
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
      rot: rand(0, TAU),
      vr: rand(-6, 6),
      shape: opt.shape || (opt.glow ? "circle" : "square"),
    });
  }
}

export function ring(x, y, opt) {
  rings.push({
    x, y,
    r: opt.r0 || 6, r1: opt.r1 || 80,
    r0: opt.r0 || 6,
    life: opt.life || 0.5, maxLife: opt.life || 0.5,
    color: opt.color || "#fff", width: opt.width || 3,
    type: opt.type || "normal", // normal, double, pulse
    shake: opt.shake || 0,
  });
  if (rings.length > 50) rings.shift();
}

export function floatText(x, y, text, opt = {}) {
  if (floats.length > 56) floats.shift();
  floats.push({
    x, y: y - 8, vy: -34,
    vx: opt.vx || rand(-8, 8),
    text: String(text),
    life: opt.life || 1.1, maxLife: opt.life || 1.1,
    color: opt.color || "#fff",
    scale: opt.scale || 1,
    font: opt.font || "small",
    outline: opt.outline !== false,
    pop: opt.pop || 0, // scale pop effect
  });
}

/** trilha de feromônio (operárias/inimigos) */
export function scent(x, y, color) {
  if (trails.length > 320) trails.shift();
  trails.push({ x, y, life: 1.6, maxLife: 1.6, color });
}

// =========================================================== NOVOS EFEITOS ==
// Impacto de combate — estrelas, faíscas e onda
export function impact(x, y, opt = {}) {
  const col = opt.color || "#ffd479";
  const power = opt.power || 1;
  // núcleo
  burst(x, y, { n: Math.round(6 * power), color: col, spMin: 20, spMax: 80 * power, life: 0.28, sizeMin: 1.5, sizeMax: 3, glow: true });
  // faíscas
  burst(x, y, { n: Math.round(4 * power), color: "#fff", spMin: 60, spMax: 140 * power, life: 0.22, sizeMin: 1, sizeMax: 1.8, glow: true, shape: "spark" });
  // anel rápido
  ring(x, y, { r0: 2, r1: 18 * power, life: 0.18, color: col, width: 2 });
  // decal no chão
  if (power > 1.2) spawnDecal(x, y, { r: 8 * power, color: "rgba(30,15,10,0.4)", life: 4, type: "scorch" });
}

export function critBurst(x, y) {
  // crítico: explosão amarela + texto já vem de fora, mas adiciona estrelas
  burst(x, y, { n: 16, color: ["#ffd479", "#fff", "#ff4d5a"], spMin: 40, spMax: 180, life: 0.5, sizeMin: 1.5, sizeMax: 4, glow: true, up: 20 });
  burst(x, y, { n: 10, color: "#fff", spMin: 80, spMax: 220, life: 0.35, sizeMin: 1, sizeMax: 2.2, glow: true, shape: "spark" });
  ring(x, y, { r0: 4, r1: 44, life: 0.32, color: "#ffd479", width: 3 });
  ring(x, y, { r0: 6, r1: 62, life: 0.42, color: "#ff4d5a", width: 2 });
  spawnDecal(x, y, { r: 18, color: "rgba(255,212,121,0.15)", life: 3, type: "light" });
}

export function slashTrail(x, y, angle, color = "#8fd3ff") {
  // rastro de corte — 3 partículas alongadas
  for (let i = 0; i < 5; i++) {
    const off = (i - 2) * 6;
    spawnPart({
      x: x + Math.cos(angle + Math.PI/2) * off,
      y: y + Math.sin(angle + Math.PI/2) * off,
      vx: Math.cos(angle) * rand(20, 40),
      vy: Math.sin(angle) * rand(20, 40),
      life: 0.18, size: rand(2, 4), sizeEnd: 0.2,
      color, glow: true, drag: 0.92,
      rot: angle, vr: rand(-2, 2),
      shape: "diamond",
    });
  }
}

export function healPulse(x, y) {
  burst(x, y, { n: 12, color: ["#7fd6a0", "#bfffa8", "#fff"], spMin: 10, spMax: 60, life: 0.65, sizeMin: 1.5, sizeMax: 3, glow: true, up: 10, g: -10 });
  ring(x, y, { r0: 6, r1: 36, life: 0.55, color: "#7fd6a0", width: 2 });
  ring(x, y, { r0: 2, r1: 24, life: 0.35, color: "#bfffa8", width: 1.5 });
}

export function levelUpBurst(x, y) {
  burst(x, y, { n: 28, color: ["#6db7ff", "#8fd3ff", "#c77dff", "#fff"], spMin: 30, spMax: 160, life: 0.85, sizeMin: 1.8, sizeMax: 4, glow: true, up: 30 });
  ring(x, y, { r0: 12, r1: 120, life: 0.7, color: "#6db7ff", width: 4 });
  ring(x, y, { r0: 8, r1: 90, life: 0.5, color: "#c77dff", width: 2.5 });
  // estrelas cadentes
  for (let i = 0; i < 8; i++) {
    const a = rand(0, TAU);
    spawnPart({ x, y, vx: Math.cos(a)*rand(20,80), vy: Math.sin(a)*rand(20,80)-60, life: 1.1, size: 2.5, sizeEnd: 0.5, color: "#fff", glow: true, shape: "spark" });
  }
}

export function explosion(x, y, radius = 56, color = "#ff7a3d") {
  burst(x, y, { n: 32, color: [color, "#ffd479", "#ff4d5a", "#fff"], spMin: 40, spMax: 260, life: 0.6, sizeMin: 2, sizeMax: 5, glow: true, g: 40 });
  burst(x, y, { n: 18, color: ["#2a1a0f", "#3a2418"], spMin: 20, spMax: 120, life: 0.9, sizeMin: 2, sizeMax: 4.5, g: 120 });
  ring(x, y, { r0: 8, r1: radius, life: 0.38, color, width: 4 });
  ring(x, y, { r0: 4, r1: radius * 1.5, life: 0.55, color: "#ff4d5a", width: 2 });
  spawnDecal(x, y, { r: radius * 0.6, color: "rgba(40,15,10,0.5)", life: 8, type: "scorch" });
}

export function dustPoof(x, y, n = 10) {
  burst(x, y, { n, color: ["#8a7a6a", "#6b5a4a", "#d8cba8"], spMin: 10, spMax: 70, life: 0.7, sizeMin: 1.5, sizeMax: 3.5, g: -20, drag: 0.88 });
}

export function bloodSplatter(x, y, color = "#a32e46") {
  burst(x, y, { n: 14, color: [color, "#5a1a2a", "#ff4d5a"], spMin: 15, spMax: 110, life: 0.55, sizeMin: 1.2, sizeMax: 3, g: 80 });
  spawnDecal(x, y, { r: rand(6,14), color: color+"cc", life: 7, type: "blood" });
}

export function magicOrb(x, y, color = "#c77dff") {
  burst(x, y, { n: 10, color: [color, "#fff", "#8f6fd6"], spMin: 5, spMax: 40, life: 0.7, sizeMin: 1.5, sizeMax: 3, glow: true, drag: 0.96 });
  spawnPart({ x, y, vx: 0, vy: -20, life: 0.9, size: 5, sizeEnd: 1, color, glow: true, shape: "circle" });
}

export function dashTrail(x, y, color = "#37e6c8") {
  spawnPart({ x, y, life: 0.35, size: 4, sizeEnd: 0.5, color, glow: true, drag: 1, shape: "circle" });
}

export function essenceCollect(x, y) {
  burst(x, y, { n: 8, color: ["#c77dff", "#9a6bff", "#fff"], spMin: 10, spMax: 50, life: 0.45, sizeMin: 1.2, sizeMax: 2.5, glow: true, up: 10 });
}

export function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
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
    f.x += (f.vx || 0) * dt;
    f.vy *= Math.pow(0.92, dt * 60);
    if (f.vx) f.vx *= Math.pow(0.92, dt * 60);
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= dt;
    if (t.life <= 0) trails.splice(i, 1);
  }
  for (let i = decals.length - 1; i >= 0; i--) {
    const d = decals[i];
    d.life -= dt;
    if (d.life <= 0) decals.splice(i, 1);
  }
}

// ------------------------------------------------------------------- draw ---
export function drawDecals(ctx, w2s) {
  for (const d of decals) {
    const a = clamp(d.life / d.maxLife, 0, 1);
    const s = w2s(d.x, d.y);
    ctx.globalAlpha = a * 0.6;
    if (d.type === "scorch") {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, d.r, d.r * 0.5, 0, 0, TAU);
      ctx.fill();
    } else if (d.type === "blood") {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, d.r * 0.5, 0, TAU);
      ctx.fill();
      // splatter irregular
      ctx.fillRect(s.x - d.r*0.3, s.y, d.r*0.6, 2);
    } else if (d.type === "light") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, d.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = d.color;
      ctx.fillRect(s.x - d.r/2, s.y - d.r/4, d.r, d.r*0.5);
    }
  }
  ctx.globalAlpha = 1;
}

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
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(p.rot);
    if (p.shape === "diamond") {
      ctx.fillRect(-sz/2, -sz/2, sz, sz);
      ctx.rotate(Math.PI/4);
      ctx.fillRect(-sz*0.3, -sz*0.3, sz*0.6, sz*0.6);
    } else if (p.shape === "circle") {
      ctx.beginPath(); ctx.arc(0,0,sz/2,0,TAU); ctx.fill();
    } else if (p.shape === "hex") {
      // FASE 2: cristal de memória geométrico (âmbar = Colônia, violeta = Névoa)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU - Math.PI / 2;
        const px = Math.cos(a) * sz / 2, py = Math.sin(a) * sz / 2;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    }
    ctx.restore();
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
    ctx.globalAlpha = clamp(t, 0, 1) * 0.95;
    ctx.fillStyle = p.color;
    const sz = Math.max(1, (p.size + (p.sizeEnd - p.size) * (1 - t)) * 1.6);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(p.rot);
    if (p.shape === "spark") {
      // faísca alongada na direção do movimento
      const ang = Math.atan2(p.vy, p.vx);
      ctx.rotate(ang);
      ctx.fillRect(-sz*0.8, -sz*0.2, sz*1.6, sz*0.4);
    } else if (p.shape === "circle") {
      ctx.beginPath(); ctx.arc(0,0,sz/2,0,TAU); ctx.fill();
      ctx.globalAlpha *= 0.35;
      ctx.beginPath(); ctx.arc(0,0,sz,0,TAU); ctx.fill();
    } else if (p.shape === "diamond") {
      ctx.rotate(Math.PI/4);
      ctx.fillRect(-sz/2, -sz/2, sz, sz);
    } else if (p.shape === "hex") {
      // FASE 2: cristal geométrico com luz interna (núcleo branco no centro)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU - Math.PI / 2;
        const px = Math.cos(a) * sz / 2, py = Math.sin(a) * sz / 2;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha *= 0.8;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-1, -1, 2, 2);
    } else {
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawRings(ctx, w2s, zoom) {
  for (const r of rings) {
    const t = 1 - r.life / r.maxLife;
    const s = w2s(r.x, r.y);
    const eased = 1 - Math.pow(1 - t, 3); // easeOut cubic
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1, r.width * zoom * (1 - t * 0.5));
    if (r.type === "double") {
      ctx.beginPath();
      ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * eased) * zoom, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha *= 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * eased * 0.6) * zoom, 0, TAU);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * eased) * zoom, 0, TAU);
      ctx.stroke();
    }
    // brilho interno
    if (t < 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (1 - t/0.3) * 0.15;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (r.r0 + (r.r1 - r.r0) * eased) * zoom, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Textos flutuantes vivem em coordenadas de MUNDO (como as partículas).
 * w2s = worldToScreen da câmera
 */
export function drawFloats(ctx, font_drawText, w2s) {
  for (const f of floats) {
    const t = f.life / f.maxLife;
    const s = w2s ? w2s(f.x, f.y) : { x: f.x, y: f.y };
    const scalePop = f.pop ? (1 + f.pop * Math.max(0, 1 - t*3)) : 1;
    const finalScale = f.scale * scalePop;
    // sombra extra para críticos
    if (f.color === "#ff4d5a" || finalScale > 1.5) {
      // glow atrás
      ctx.save();
      ctx.globalAlpha = clamp(t * 0.5, 0, 0.5);
      font_drawText(ctx, f.text, s.x + 1, s.y + 1, {
        font: f.font, scale: finalScale, color: "#000",
        align: "center", alpha: 1,
      });
      ctx.restore();
    }
    font_drawText(ctx, f.text, s.x, s.y, {
      font: f.font, scale: finalScale, color: f.color,
      align: "center", alpha: clamp(t * 1.8, 0, 1),
    });
  }
  ctx.globalAlpha = 1;
}

export function counts() { return parts.length; }
