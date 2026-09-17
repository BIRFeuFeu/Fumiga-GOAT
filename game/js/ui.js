// ============================================================================
// FUMIGA-GOAT — primitivos de UI desenhados em canvas (estilo Dead Cells)
// ============================================================================
import { PAL } from "./config.js";
import { drawText, textWidth, FONT } from "./font.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";

let buttons = [];

export function uiBegin() { buttons = []; }
export function uiButtons() { return buttons; }

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** Painel com borda dupla e cantos chanfrados. */
export function panel(ctx, x, y, w, h, opt = {}) {
  const r = opt.r !== undefined ? opt.r : 6;
  ctx.fillStyle = opt.fill || PAL.panel;
  chamfer(ctx, x, y, w, h, r);
  ctx.fill();
  // borda externa
  ctx.strokeStyle = opt.border || PAL.border;
  ctx.lineWidth = 2;
  chamfer(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
  ctx.stroke();
  // luz superior interna
  ctx.strokeStyle = "rgba(143,111,214,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 2.5);
  ctx.lineTo(x + w - r, y + 2.5);
  ctx.stroke();
  // sombra inferior
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 3, y + h - 4, w - 6, 2);
}

function chamfer(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.lineTo(x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.lineTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.lineTo(x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.closePath();
}

/** Botão textual; retorna true se clicado. */
export function button(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const clicked = hot && mouse.justDown && !dis;

  let border = dis ? "#2c2440" : hot ? PAL.borderHi : PAL.border;
  let fill = dis ? "#171222" : hot ? PAL.panelHi : PAL.panel;
  panel(ctx, x, y, w, h, { fill, border, r: 5 });

  if (hot && !dis) {
    ctx.fillStyle = "rgba(255,212,121,0.08)";
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  }
  if (opt.accent && !dis) {
    ctx.fillStyle = opt.accent;
    ctx.globalAlpha = hot ? 0.9 : 0.5;
    ctx.fillRect(x + 2, y + 2, 3, h - 4);
    ctx.globalAlpha = 1;
  }
  const col = dis ? "#5a4f78" : opt.color || PAL.text;
  drawText(ctx, opt.label, x + w / 2, y + h / 2 - (opt.font === "big" ? 15 : 8) - 2,
    { font: opt.font || "small", scale: opt.scale || 1, color: col, align: "center", shadow: true });

  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return clicked;
}

/** Botão de ícone (loja / hotbar). */
export function iconButton(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const clicked = hot && mouse.justDown && !dis;
  let border = dis ? "#2c2440" : hot || opt.selected ? opt.frame || PAL.amber : PAL.border;
  panel(ctx, x, y, w, h, { fill: hot && !dis ? PAL.panelHi : PAL.panel, border, r: 4 });
  if (opt.selected) {
    ctx.strokeStyle = opt.frame || PAL.amber;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.globalAlpha = 1;
  }
  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return { clicked, hot };
}

/** Barra de vida / progresso. */
export function bar(ctx, x, y, w, h, frac, opt = {}) {
  frac = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = opt.bg || "#120d1c";
  ctx.fillRect(x, y, w, h);
  // segmentos estilo celeste
  const n = opt.segments || 0;
  const innerX = x + 1, innerW = w - 2, innerY = y + 1, innerH = h - 2;
  const grad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
  grad.addColorStop(0, opt.c1 || "#ffd479");
  grad.addColorStop(1, opt.c2 || "#ff7a3d");
  ctx.fillStyle = grad;
  ctx.fillRect(innerX, innerY, Math.round(innerW * frac), innerH);
  // brilho do topo
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(innerX, innerY, Math.round(innerW * frac), 1);
  if (n > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    for (let i = 1; i < n; i++) {
      const sx = innerX + (innerW / n) * i;
      ctx.fillRect(sx, innerY, 1, innerH);
    }
  }
  ctx.strokeStyle = opt.border || "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** Texto com ícone à esquerda. */
export function labelIcon(ctx, img, x, y, scale = 2) {
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
}
