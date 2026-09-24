// ============================================================================
// FUMIGA-GOAT — primitivos de UI desenhados em canvas (estilo Dead Cells V2)
// Painéis refinados, botões com profundidade, caixas de texto in-game
// ============================================================================
import { PAL, VIEW_W, VIEW_H } from "./config.js";
import { drawText, textWidth, FONT, layoutBox } from "./font.js";
import { mouse, touchMode } from "./input.js";
import { SFX } from "./audio.js";
import { G } from "./state.js";
import { drawLoreTextbox, hudBiome, drawWoodBarFrame } from "./lore_hud.js";

let buttons = [];
// Animação de interface: hover/pressão de cada botão são NÚMEROS que correm
// atrás do estado real (0..1), então entrar e sair do botão é suave em vez de
// piscar. A chave é o id do botão.
const anim = new Map();
let lastT = 0, frameDt = 1 / 60;

export function uiBegin() {
  buttons = [];
  frameDt = Math.max(0.001, Math.min(0.05, G.time - lastT || 1 / 60));
  lastT = G.time;
}
export function uiButtons() { return buttons; }

/** Persegue o alvo com easing exponencial (independente do framerate). */
function chase(cur, target, speed) {
  const k = 1 - Math.pow(0.0009, frameDt * speed);
  return cur + (target - cur) * k;
}

function animOf(id, hot, down) {
  let a = anim.get(id);
  if (!a) { a = { hover: 0, press: 0 }; anim.set(id, a); }
  a.hover = chase(a.hover, hot ? 1 : 0, 1);
  a.press = chase(a.press, down ? 1 : 0, 1.8);
  return a;
}

export function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// É MOBILE? A resposta vem do shell, não do tamanho da janela.
//   • touchMode.on   → true só na versão mobile (game/mobile/ carrega touch.js)
//   • pointer:coarse → aparelho de toque de verdade (celular/tablet)
// Antes bastava `innerWidth < 900`, que tratava como "mobile" qualquer janela
// estreita no PC — e era isso que estourava o layout (ver hitRect).
export function isTouchUI() {
  if (touchMode.on) return true;
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  } catch (e) { /* sem matchMedia: segue como PC */ }
  return false;
}

function isTouchDevice() { return isTouchUI(); }

// ----------------------------------------------------------------------------
// ALVO DE TOQUE — o tamanho do DEDO é a área SENSÍVEL, nunca o painel desenhado.
// No mobile o canvas 960x540 é REDUZIDO para caber no celular (ex.: 844x390 →
// escala 0.72), então ~61px do canvas já são os 44pt que a Apple pede e os
// 48dp do Material (a WCAG 2.2 exige só 24px). Encher o botão de 104px "para
// caber no dedo" foi o que quebrou as telas no celular: as pilhas de botões
// saíam do canvas (botões cortados e sem legenda) e os alvos vizinhos se
// sobrepunham (um toque acionava dois controles). Agora o desenho fica intacto
// e a hitbox cresce no máximo HIT_PAD por lado — folga menor que qualquer
// espaçamento de layout, então vizinhos nunca se encostam.
// ----------------------------------------------------------------------------
const MIN_TOUCH = 61;   // px do canvas (≈44px reais no iPhone em paisagem)
const HIT_PAD = 10;     // teto da folga por lado (px do canvas)

/** Guarda qualquer retângulo de UI dentro do canvas — nada mais fora da tela. */
export function clampToView(r) {
  let { x, y, w, h } = r;
  if (w > VIEW_W) { x = 0; w = VIEW_W; }
  if (h > VIEW_H) { y = 0; h = VIEW_H; }
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > VIEW_W) x = VIEW_W - w;
  if (y + h > VIEW_H) y = VIEW_H - h;
  return { x, y, w, h };
}

/** Área sensível de um retângulo desenhado à mão (fora de button()): mesmo
 *  aumento de alvo do toque, sem mexer no desenho. */
export function touchPad(x, y, w, h) { return hitRect(x, y, w, h); }

// aumenta a hitbox para toque SEM mudar o desenho do botão
function hitRect(x, y, w, h) {
  if (!isTouchDevice()) return { x, y, w, h };
  const padX = Math.min(HIT_PAD, Math.max(0, (MIN_TOUCH - w) / 2));
  const padY = Math.min(HIT_PAD, Math.max(0, (MIN_TOUCH - h) / 2));
  return clampToView({ x: x - padX, y: y - padY, w: w + padX * 2, h: h + padY * 2 });
}

/** Painel com borda dupla, cantos chanfrados e estética Dead Cells refinada */
export function panel(ctx, x, y, w, h, opt = {}) {
  layoutBox(ctx, opt.kind || "painel", x, y, w, h, opt.layoutId);
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

  // textura: hachura fixa (o ruído aleatório de antes piscava a cada frame —
  // agora o painel tem granulado estável, derivado da própria posição)
  if (opt.noise !== false) {
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let ny = y + 3; ny < y + h - 3; ny += 5) {
      const nx = x + 4 + (((ny * 7 + x) | 0) % Math.max(6, (w - 12) | 0));
      ctx.fillRect(nx, ny, 2, 1);
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

/** Botão refinado — Dead Cells style. No mobile o DESENHO é o do PC; o que
 *  cresce é só a área sensível ao dedo (hitRect), que nunca sai do canvas. */
export function button(ctx, opt) {
  const { x, y, w, h } = clampToView(opt);
  let hr = opt.compact ? { x, y, w, h } : hitRect(x, y, w, h);
  // opt.clip: botão dentro de uma área ROLÁVEL. A parte fora do recorte não é
  // clicável nem publicada (senão o botão escondido atrás do cabeçalho ou do
  // rodapé roubaria o clique das abas e do VOLTAR).
  if (opt.clip) {
    const c = opt.clip;
    const x0 = Math.max(hr.x, c.x), y0 = Math.max(hr.y, c.y);
    const x1 = Math.min(hr.x + hr.w, c.x + c.w), y1 = Math.min(hr.y + hr.h, c.y + c.h);
    hr = (x1 > x0 && y1 > y0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
    if (!hr) hr = { x: -9999, y: -9999, w: 0, h: 0, hidden: true };
  }
  const hot = pointInRect(mouse.x, mouse.y, hr.x, hr.y, hr.w, hr.h);
  const dis = !!opt.disabled;
  const down = hot && mouse.down && !dis;
  // opt.tap: botão dentro de área rolável — dispara ao SOLTAR sem ter
  // arrastado (mouse.clickX/Y guardam onde o gesto começou), então rolar a
  // lista por cima do botão não o aciona por acidente. Botão normal dispara
  // ao pressionar, como sempre.
  const tapped = hot && mouse.justUp && !dis &&
    Math.hypot(mouse.x - mouse.clickX, mouse.y - mouse.clickY) <= (opt.tapSlop || 14);
  const clicked = opt.tap ? tapped : (hot && mouse.justDown && !dis);
  const A = animOf(opt.id || (opt.label + x + y), hot && !dis, down);
  const hv = dis ? 0 : A.hover;
  const pr = dis ? 0 : A.press;

  // o botão "levanta" no hover e afunda no clique
  const lift = -1.6 * hv + 1.2 * pr;
  const bx = x, by = y + lift;
  const pulse = 0.5 + Math.sin(G.time * 3) * 0.5;

  const border = dis ? "#2c2440" : mix(PAL.border, PAL.borderHi, hv);
  const fill = dis ? "#171222" : mix(PAL.panel, PAL.panelHi, hv * 0.9);

  panel(ctx, bx, by, w, h, {
    kind: "botao", layoutId: opt.id || opt.label,
    fill,
    border,
    r: 5,
    glow: hv > 0.02 ? (opt.accent || PAL.borderHi) : null,
    accentLine: opt.accent && !dis ? opt.accent : null,
  });

  // banho de luz no hover (gradiente de cima, some suave ao sair)
  if (hv > 0.01) {
    const hg = ctx.createLinearGradient(bx, by, bx, by + h);
    hg.addColorStop(0, "rgba(255,212,121," + (0.10 * hv).toFixed(3) + ")");
    hg.addColorStop(1, "rgba(255,212,121," + (0.02 * hv).toFixed(3) + ")");
    ctx.fillStyle = hg;
    chamfer(ctx, bx + 1, by + 1, w - 2, h - 2, 4);
    ctx.fill();

    // brilho pulsante na borda
    ctx.strokeStyle = opt.accent || PAL.amber;
    ctx.globalAlpha = (0.12 + pulse * 0.18) * hv;
    ctx.lineWidth = 1;
    chamfer(ctx, bx + 2, by + 2, w - 4, h - 4, 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (opt.accent && !dis) {
    // barra de accent: cresce no hover
    const bw = 3 + 2 * hv;
    const ag = ctx.createLinearGradient(bx, by, bx, by + h);
    ag.addColorStop(0, lighten(opt.accent, 0.12 * hv));
    ag.addColorStop(1, darken(opt.accent, 0.3));
    ctx.fillStyle = ag;
    ctx.globalAlpha = 0.6 + 0.4 * hv;
    ctx.fillRect(bx + 2, by + 2, bw, h - 4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.15 + 0.3 * hv;
    ctx.fillRect(bx + 2, by + 2, bw + 4, h - 4);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ícone opcional à esquerda
  if (opt.icon) {
    ctx.globalAlpha = dis ? 0.3 : 1;
    ctx.drawImage(opt.icon, bx + 10, by + h / 2 - 8, 16, 16);
    ctx.globalAlpha = 1;
  }

  // rótulo: clareia e cresce um toque no hover (o texto acompanha o botão)
  const col = dis ? "#5a4f78" : (opt.color || mix(PAL.text, "#ffffff", hv * 0.55));
  const scale = (opt.scale || 1) * (1 + 0.05 * hv - 0.02 * pr);
  drawText(ctx, opt.label, bx + w / 2 + (opt.icon ? 10 : 0),
    by + h / 2 - (opt.font === "big" ? 15 : 8) - 2,
    { font: opt.font || "small", scale, color: col, align: "center", shadow: true, maxWidth: w - (opt.icon ? 40 : 20) });

  // o retângulo publicado é o da HITBOX: é ele que decide se o toque é da UI
  // (uiCapture) — publicar o desenho deixaria o dedo "atravessar" a borda do
  // botão no mobile (acionava o botão E a ordem no mundo ao mesmo tempo)
  if (!hr.hidden) buttons.push({ x: hr.x, y: hr.y, w: hr.w, h: hr.h, id: opt.id, disabled: dis });
  if (clicked) SFX.uiClick();
  return clicked;
}

/** Mistura dois "#rrggbb" (t = 0 -> a, t = 1 -> b). */
function mix(a, b, t) {
  if (t <= 0.001) return a;
  if (t >= 0.999) return b;
  const pa = hex2rgb(a), pb = hex2rgb(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return "rgb(" + r + "," + g + "," + bl + ")";
}
function hex2rgb(hex) {
  const h = String(hex).replace("#", "");
  if (h.length !== 6) return null;
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

/** Botão de ícone (loja / hotbar). No mobile o desenho é o do PC: só a hitbox
 *  cresce (e continua dentro do canvas), senão o rodapé engoliria o mundo. */
export function iconButton(ctx, opt) {
  const { x, y, w, h } = clampToView(opt);
  let hr = hitRect(x, y, w, h);
  // cards compactos: limita a margem extra horizontal do toque para que as
  // hitboxes de vizinhos (pitch pequeno) não se sobreponham
  if (opt.maxPadX !== undefined && (hr.w - w) / 2 > opt.maxPadX) {
    const px = (hr.w - w) / 2 - opt.maxPadX;
    hr = { x: hr.x + px, y: hr.y, w: hr.w - px * 2, h: hr.h };
  }
  // linhas de cards: mesma ideia na vertical (grade de memórias/draft)
  if (opt.maxPadY !== undefined && (hr.h - h) / 2 > opt.maxPadY) {
    const py2 = (hr.h - h) / 2 - opt.maxPadY;
    hr = { x: hr.x, y: hr.y + py2, w: hr.w, h: hr.h - py2 * 2 };
  }
  const hot = pointInRect(mouse.x, mouse.y, hr.x, hr.y, hr.w, hr.h);
  const dis = !!opt.disabled;
  const clicked = hot && mouse.justDown && !dis;
  const A = animOf("ic" + (opt.id || "") + x + y, hot && !dis, hot && mouse.down && !dis);
  const hv = dis ? 0 : A.hover;
  const sel = opt.selected ? 1 : 0;
  const lift = -1.4 * hv + 1 * A.press;
  let border = dis ? "#2c2440" : mix(PAL.border, opt.frame || PAL.amber, Math.max(hv, sel));

  panel(ctx, x, y + lift, w, h, {
    kind: "botao", layoutId: "ic:" + (opt.id || ""),
    fill: mix(PAL.panel, PAL.panelHi, hv),
    border,
    r: 4,
    glow: (hv > 0.02 || sel) && !dis ? (opt.frame || PAL.amber) : null,
    accentLine: opt.selected ? (opt.frame || PAL.amber) : null,
  });

  if (opt.selected) {
    ctx.strokeStyle = opt.frame || PAL.amber;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2.5, y + lift + 2.5, w - 5, h - 5);
    // inner glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = opt.frame || PAL.amber;
    ctx.fillRect(x + 3, y + lift + 3, w - 6, h - 6);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (hv > 0.01 && !opt.selected) {
    ctx.fillStyle = "rgba(255,255,255," + (0.06 * hv).toFixed(3) + ")";
    ctx.fillRect(x + 2, y + lift + 2, w - 4, h - 4);
  }

  // idem button(): publica a hitbox, para o toque não vazar para o mundo
  buttons.push({ x: hr.x, y: hr.y, w: hr.w, h: hr.h, id: opt.id, disabled: dis });
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

  // borda externa: Fase 2 — moldura de madeira do bioma (kit), senão procedural
  if (opt.wood !== false && drawWoodBarFrame(ctx, x - 2, y - 2, w + 4, h + 4, opt.biome || hudBiome())) {
    // moldura assada por cima; o centro transparente deixa o fill à mostra
  } else {
    ctx.strokeStyle = opt.border || "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

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
  layoutBox(ctx, "caixa", x, y, w, h, opt.layoutId);
  const border = opt.border || PAL.borderHi;
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  chamfer(ctx, x + 4, y + 5, w, h, opt.r || 6);
  ctx.fill();

  // Fase 2: caixa de texto orgânica 9-slice do bioma atual (menus = colônia).
  // Sem arte (testes headless) cai no painel procedural clássico.
  const lore = opt.lore !== false &&
    drawLoreTextbox(ctx, x, y, w, h, opt.biome || hudBiome());

  if (!lore) {
    // painel principal
    panel(ctx, x, y, w, h, {
      fill: opt.fill || "#1e1932",
      border,
      r: opt.r || 6,
      accentLine: opt.accent || border,
      glow: opt.glow ? border : null,
    });
  }

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
