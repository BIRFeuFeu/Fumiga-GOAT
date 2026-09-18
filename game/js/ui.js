// ============================================================================
// FUMIGA-GOAT — primitivos de UI desenhados em canvas (estilo Dead Cells V2)
// Painéis refinados, botões com profundidade, caixas de texto in-game
// ============================================================================
import { PAL } from "./config.js";
import { drawText, textWidth, FONT } from "./font.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";
import { G } from "./state.js";

let buttons = [];

export function uiBegin() { buttons = []; }
export function uiButtons() { return buttons; }

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** Painel com borda dupla, cantos chanfrados e estética Dead Cells refinada */
export function panel(ctx, x, y, w, h, opt = {}) {
  const r = opt.r !== undefined ? opt.r : 6;
  const fill = opt.fill || PAL.panel;
  const border = opt.border || PAL.border;

  // sombra projetada suave
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  chamfer(ctx, x + 3, y + 4, w, h, r);
  ctx.fill();

  // corpo principal com gradiente sutil
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, fill);
  grad.addColorStop(0.15, lighten(fill, 0.08));
  grad.addColorStop(1, darken(fill, 0.12));
  ctx.fillStyle = grad;
  chamfer(ctx, x, y, w, h, r);
  ctx.fill();

  // borda externa com brilho
  ctx.strokeStyle = border;
  ctx.lineWidth = opt.borderW !== undefined ? opt.borderW : 2;
  chamfer(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5);
  ctx.stroke();

  // borda interna highlight (luz superior)
  ctx.strokeStyle = opt.highlight || "rgba(143,111,214,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r + 2, y + 2.5);
  ctx.lineTo(x + w - r - 2, y + 2.5);
  ctx.stroke();

  // brilho lateral esquerdo sutil se accent
  if (opt.accentLine) {
    ctx.fillStyle = opt.accentLine;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x + 1, y + 3, 2, h - 6);
    ctx.globalAlpha = 1;
  }

  // textura de ruído sutil (Dead Cells)
  if (opt.noise !== false) {
    ctx.fillStyle = "rgba(255,255,255,0.015)";
    for (let i = 0; i < 3; i++) {
      const nx = x + Math.random() * w;
      const ny = y + Math.random() * h;
      ctx.fillRect(nx, ny, 1, 1);
    }
  }

  // sombra interna inferior
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x + 3, y + h - 3, w - 6, 1.5);

  // glow interno se hover (opt.glow)
  if (opt.glow) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = opt.glow;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    chamfer(ctx, x + 2, y + 2, w - 4, h - 4, r - 1);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function lighten(hex, amt) {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255, r + 255*amt)|0},${Math.min(255, g + 255*amt)|0},${Math.min(255, b + 255*amt)|0})`;
}
function darken(hex, amt) {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0, r - 255*amt)|0},${Math.max(0, g - 255*amt)|0},${Math.max(0, b - 255*amt)|0})`;
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

/** Botão textual refinado — Dead Cells style com animação suave */
export function button(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const clicked = hot && mouse.justDown && !dis;

  // animação de hover
  const t = G.time * 3;
  const pulse = hot ? 0.5 + Math.sin(t) * 0.1 : 0;

  let border = dis ? "#2c2440" : hot ? PAL.borderHi : PAL.border;
  let fill = dis ? "#171222" : hot ? PAL.panelHi : PAL.panel;

  // variação de cor por accent
  if (opt.accent && !dis) {
    fill = hot ? lighten(PAL.panelHi, 0.05) : PAL.panel;
  }

  panel(ctx, x, y, w, h, {
    fill,
    border,
    r: 5,
    glow: hot && !dis ? (opt.accent || PAL.borderHi) : null,
    accentLine: opt.accent && !dis ? opt.accent : null,
  });

  if (hot && !dis) {
    // overlay de hover com gradiente
    const hg = ctx.createLinearGradient(x, y, x, y + h);
    hg.addColorStop(0, "rgba(255,212,121,0.06)");
    hg.addColorStop(1, "rgba(255,212,121,0.02)");
    ctx.fillStyle = hg;
    chamfer(ctx, x + 1, y + 1, w - 2, h - 2, 4);
    ctx.fill();

    // brilho pulsante na borda
    ctx.strokeStyle = opt.accent || PAL.amber;
    ctx.globalAlpha = 0.15 + pulse * 0.15;
    ctx.lineWidth = 1;
    chamfer(ctx, x + 2, y + 2, w - 4, h - 4, 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (opt.accent && !dis) {
    // barra de accent mais estilizada
    ctx.fillStyle = opt.accent;
    ctx.globalAlpha = hot ? 0.95 : 0.6;
    // gradiente vertical na barra
    const ag = ctx.createLinearGradient(x, y, x, y + h);
    ag.addColorStop(0, opt.accent);
    ag.addColorStop(1, darken(opt.accent, 0.3));
    ctx.fillStyle = ag;
    ctx.fillRect(x + 2, y + 2, 3, h - 4);
    // glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = hot ? 0.4 : 0.15;
    ctx.fillRect(x + 2, y + 2, 6, h - 4);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ícone opcional à esquerda
  if (opt.icon) {
    ctx.globalAlpha = dis ? 0.3 : 1;
    ctx.drawImage(opt.icon, x + 10, y + h/2 - 8, 16, 16);
    ctx.globalAlpha = 1;
  }

  const col = dis ? "#5a4f78" : opt.color || PAL.text;
  const scale = hot && !dis ? (opt.scale || 1) * 1.05 : (opt.scale || 1);
  drawText(ctx, opt.label, x + w / 2 + (opt.icon ? 10 : 0), y + h / 2 - (opt.font === "big" ? 15 : 8) - 2,
    { font: opt.font || "small", scale, color: col, align: "center", shadow: true });

  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return clicked;
}

/** Botão de ícone (loja / hotbar) refinado */
export function iconButton(ctx, opt) {
  const { x, y, w, h } = opt;
  const hot = pointInRect(mouse.x, mouse.y, x, y, w, h);
  const dis = !!opt.disabled;
  const clicked = hot && mouse.justDown && !dis;
  let border = dis ? "#2c2440" : hot || opt.selected ? opt.frame || PAL.amber : PAL.border;

  panel(ctx, x, y, w, h, {
    fill: hot && !dis ? PAL.panelHi : PAL.panel,
    border,
    r: 4,
    glow: (hot || opt.selected) && !dis ? (opt.frame || PAL.amber) : null,
    accentLine: opt.selected ? (opt.frame || PAL.amber) : null,
  });

  if (opt.selected) {
    ctx.strokeStyle = opt.frame || PAL.amber;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    // inner glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = opt.frame || PAL.amber;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (hot && !dis && !opt.selected) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  }

  buttons.push({ x, y, w, h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return { clicked, hot };
}

/** Barra de vida / progresso refinada — estilo Dead Cells */
export function bar(ctx, x, y, w, h, frac, opt = {}) {
  frac = Math.max(0, Math.min(1, frac));
  // fundo com profundidade
  ctx.fillStyle = opt.bg || "#0e0a18";
  ctx.fillRect(x, y, w, h);
  // borda interna escura
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);

  const innerX = x + 1, innerW = w - 2, innerY = y + 1, innerH = h - 2;
  // gradiente da barra
  const grad = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
  grad.addColorStop(0, lighten(opt.c1 || "#ffd479", 0.15));
  grad.addColorStop(0.5, opt.c1 || "#ffd479");
  grad.addColorStop(1, opt.c2 || "#ff7a3d");
  ctx.fillStyle = grad;
  const fillW = Math.round(innerW * frac);
  ctx.fillRect(innerX, innerY, fillW, innerH);

  // brilho superior
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.fillRect(innerX, innerY, fillW, 1);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(innerX, innerY + 1, fillW, 1);

  // segmentos
  const n = opt.segments || 0;
  if (n > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    for (let i = 1; i < n; i++) {
      const sx = innerX + (innerW / n) * i;
      if (sx < innerX + fillW) ctx.fillRect(sx, innerY, 1, innerH);
    }
  }

  // borda externa
  ctx.strokeStyle = opt.border || "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // brilho de preenchimento animado
  if (frac > 0.05 && opt.shimmer !== false) {
    const shimmerX = innerX + (G.time * 80 % (innerW + 40)) - 20;
    if (shimmerX < innerX + fillW) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#fff";
      ctx.fillRect(shimmerX, innerY, 12, innerH);
      ctx.restore();
    }
  }
}

/** Caixa de diálogo / tooltip refinada */
export function dialogBox(ctx, x, y, w, h, opt = {}) {
  const border = opt.border || PAL.borderHi;
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  chamfer(ctx, x + 4, y + 5, w, h, opt.r || 6);
  ctx.fill();

  // painel principal
  panel(ctx, x, y, w, h, {
    fill: opt.fill || "#1e1932",
    border,
    r: opt.r || 6,
    accentLine: opt.accent || border,
    glow: opt.glow ? border : null,
  });

  // linha decorativa superior
  if (opt.title) {
    ctx.fillStyle = border;
    ctx.fillRect(x + 12, y + 2, w - 24, 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 12, y + 4, w - 24, 1);
  }
}

/** Tooltip flutuante */
export function tooltip(ctx, x, y, lines, opt = {}) {
  const pad = 12;
  const lineH = 16;
  const w = opt.w || 240;
  const h = pad * 2 + lines.length * lineH + (opt.title ? 28 : 0);

  // ajusta posição para não sair da tela
  let tx = x, ty = y;
  if (tx + w > 950) tx = 950 - w;
  if (ty + h > 530) ty = y - h - 10;
  if (tx < 10) tx = 10;
  if (ty < 10) ty = 10;

  dialogBox(ctx, tx, ty, w, h, {
    border: opt.border || PAL.borderHi,
    fill: "#1a1628",
    r: 5,
    accent: opt.accent,
  });

  let cy = ty + pad + 4;
  if (opt.title) {
    drawText(ctx, opt.title, tx + pad, cy, { font: "small", color: opt.accent || "#ffd479" });
    cy += 22;
    ctx.fillStyle = "rgba(74,58,110,0.6)";
    ctx.fillRect(tx + pad, cy - 4, w - pad*2, 1);
  }
  for (const line of lines) {
    drawText(ctx, line, tx + pad, cy, { color: opt.color || PAL.text });
    cy += lineH;
  }
}

/** Texto com ícone à esquerda */
export function labelIcon(ctx, img, x, y, scale = 2) {
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
}

/** Efeito de digitação para caixas de texto */
export function typewriterText(ctx, text, x, y, progress, opt = {}) {
  const visible = text.slice(0, Math.floor(text.length * progress));
  drawText(ctx, visible, x, y, opt);
  if (progress < 1 && Math.floor(G.time * 8) % 2 === 0) {
    // cursor piscando
    const tw = textWidth(visible, opt);
    ctx.fillStyle = opt.color || "#fff";
    ctx.fillRect(x + tw + 1, y, 2, (FONT[opt.font || "small"].ch * (opt.scale || 1)));
  }
}
