// ============================================================================
// FUMIGA-GOAT — ÁRVORE DA EVOLUÇÃO (meta-progressão persistente, tela cheia)
// ============================================================================
import { PAL, META_NODES, META_BRANCHES, VIEW_W, VIEW_H } from "./config.js";
import { G, metaLevel, metaCanBuy, metaBuy } from "./state.js";
import { drawText, textWidth, wrapText } from "./font.js";
import { IMG } from "./assets.js";
import { uiBegin, button, panel, pointInRect } from "./ui.js";
import { mouse, pressed } from "./input.js";
import { SFX } from "./audio.js";
import { clamp, lerp } from "./utils.js";

const NODE_R = 34;      // raio do nó em px (sem zoom)
const SP = 134;         // respiro horizontal entre os nós
const YF = 0.85;        // respiro vertical (proporcional ao horizontal)
const MIN_ZOOM = 0.30, MAX_ZOOM = 2.2;
const TOP_UI = 118, BOTTOM_UI = 44;   // faixas ocupadas pelo HUD/dica
// centro vertical útil: a árvore é enquadrada entre o HUD do topo e a dica
const CY = TOP_UI + (VIEW_H - TOP_UI - BOTTOM_UI) / 2;

// Limites da árvore (em unidades de grade) — servem para enquadrar tudo,
// prender o pan e desenhar a legenda dos ramos.
const BOUNDS = (() => {
  const xs = META_NODES.map((n) => n.x), ys = META_NODES.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) * SP, h = (maxY - minY) * SP * YF;
  return { minX, maxX, minY, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
})();

let pan = { x: 0, y: 0 };
let zoom = 0.62;        // roda do mouse aproxima/afasta
let dragStart = null;
let hoverNode = null;

/** Zoom que mostra a árvore inteira (usado no botão VER TUDO e no início). */
function fitZoom() {
  const zx = (VIEW_W - 90) / BOUNDS.w;
  const zy = (VIEW_H - TOP_UI - BOTTOM_UI - 18) / BOUNDS.h;
  return clamp(Math.min(zx, zy) * 0.98, MIN_ZOOM, 1);
}

/** Prende o pan para a árvore nunca sair de vista (limite depende do zoom). */
function clampPan() {
  const mx = Math.max(24, BOUNDS.w / 2 - (VIEW_W / 2 - 30) / zoom + 60);
  const my = Math.max(24, BOUNDS.h / 2 - (VIEW_H / 2 - 90) / zoom + 60);
  pan.x = clamp(pan.x, -mx, mx);
  pan.y = clamp(pan.y, -my, my);
}

export function enterTree() {
  pan.x = 0; pan.y = 0;
  // abre já enquadrando boa parte da árvore (o resto é rolagem/zoom)
  zoom = clamp(fitZoom() * 1.7, 0.5, 1.05);
  clampPan();
  dragStart = null;
  hoverNode = null;
}

/** Botão VER TUDO / duplo clique: volta para o enquadramento completo. */
export function treeFit() {
  zoom = fitZoom();
  pan.x = 0; pan.y = 0;
  clampPan();
}

function nodeScreen(n) {
  return {
    x: VIEW_W / 2 + (pan.x + (n.x - BOUNDS.cx) * SP) * zoom,
    y: CY + (pan.y + (n.y - BOUNDS.cy) * SP * YF) * zoom,
  };
}

export function updateTree(dt) {
    hoverNode = null;
  // zoom com a roda (âncora no centro da tela)
  if (mouse.wheel) {
    const beforeZ = zoom;
    zoom = clamp(zoom * (mouse.wheel > 0 ? 0.9 : 1.11), MIN_ZOOM, MAX_ZOOM);
    pan.x = pan.x * beforeZ / zoom;
    pan.y = pan.y * beforeZ / zoom;
    clampPan();
  }
  const R = NODE_R * zoom;
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    if (Math.hypot(mouse.x - s.x, mouse.y - s.y) < R + 6) { hoverNode = n; break; }
  }
  // arrastar para mover a vista
  if (mouse.justDown && !hoverNode) dragStart = { mx: mouse.x, my: mouse.y, px: pan.x, py: pan.y, d: 0 };
  if (mouse.down && dragStart) {
    const dx = mouse.x - dragStart.mx, dy = mouse.y - dragStart.my;
    dragStart.d = Math.max(dragStart.d, Math.hypot(dx, dy));
    pan.x = dragStart.px + dx / zoom;
    pan.y = dragStart.py + dy / zoom;
    clampPan();
  }
  if (!mouse.down) dragStart = null;
}

export function treeWasDragging() { return !dragStart || dragStart.d > 8; }

export function drawTree(ctx, dt) {
  // fundo
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "#120d1e");
  g.addColorStop(1, "#1c1430");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // poeiras estáticas de fundo
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 60; i++) {
    const px = (i * 173) % VIEW_W, py = (i * 97 + ((G.time * 6) % 700)) % (VIEW_H + 60) - 30;
    ctx.fillStyle = i % 3 ? "#3a2c4c" : "#4a3a6e";
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 1;

  // arestas
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    for (const reqId of n.requires) {
      const p = META_NODES.find(m => m.id === reqId);
      const sp = nodeScreen(p);
      const owned = metaLevel(n.id) > 0 && metaLevel(reqId) > 0;
      const avai = metaLevel(reqId) > 0;
      ctx.strokeStyle = owned ? META_BRANCHES[n.br].color : avai ? "#5a4f88" : "#2c2444";
      ctx.lineWidth = owned ? 3 : 2;
      ctx.globalAlpha = owned ? 0.95 : 0.8;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // nós
  const R = NODE_R * zoom;
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    const lvl = metaLevel(n.id);
    const max = n.cost.length;
    const chk = metaCanBuy(n.id);
    const hot = hoverNode === n;
    const br = META_BRANCHES[n.br];

    // aura do disponível
    if (chk.ok) {
      const pulse = 0.5 + Math.sin(G.time * 3.5) * 0.25;
      ctx.strokeStyle = br.color;
      ctx.globalAlpha = pulse * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 7 + Math.sin(G.time * 3.5) * 2, 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // corpo do nó
    ctx.fillStyle = lvl > 0 ? shade(br.color, "#18122a") : PAL.panel;
    ctx.strokeStyle = lvl > 0 ? br.color : chk.ok ? br.color : "#3a3054";
    ctx.lineWidth = hot ? 4 : 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.29);
    ctx.fill(); ctx.stroke();
    if (lvl >= max) {
      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 4, 0, 6.29); ctx.stroke();
    }

    // ícone
    const icon = IMG["i_" + n.icon];
    if (icon) {
      ctx.imageSmoothingEnabled = false;
      if (lvl === 0 && !chk.ok) ctx.globalAlpha = 0.3;
      const size = (n.icon.startsWith("sk_") ? 32 : 36) * zoom;
      ctx.drawImage(icon, s.x - size / 2, s.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }

    // pips de nível
    for (let i = 0; i < max; i++) {
      const px = s.x - (max - 1) * 5.5 * zoom + i * 11 * zoom;
      ctx.fillStyle = i < lvl ? br.color : "#2c2444";
      ctx.fillRect(px - 3, s.y + R + 7 * zoom, 7, 4.5);
    }

    // PREÇO: próximo nível sempre visível sob o nó
    if (lvl < max) {
      const price = n.cost[lvl];
      const afford = G.save.essence >= price;
      const py = s.y + R + 16 * zoom;
      const label = String(price);
      const tw = label.length * 7 + 20;
      ctx.fillStyle = "rgba(10,8,16,0.78)";
      ctx.fillRect(s.x - tw / 2 - 1, py - 1, tw + 2, 14);
      ctx.strokeStyle = "rgba(74,58,110,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - tw / 2 - 0.5, py - 0.5, tw + 1, 15);
      ctx.fillStyle = afford ? "#c77dff" : "#a32e46";
      ctx.fillRect(s.x - tw / 2 + 3, py + 3, 8, 8);
      drawText(ctx, label, s.x - tw / 2 + 15, py + 3, { color: afford ? "#efe9ff" : "#ff8a96" });
    } else {
      drawText(ctx, "MAX", s.x, s.y + R + 17 * zoom, { color: "#ffd479", align: "center" });
    }
  }

  // etiqueta hover do nó
  if (hoverNode) drawNodeTip(ctx, hoverNode);

  // ------------------------------------------------------------- HUD topo --
  const owned = META_NODES.filter((n) => metaLevel(n.id) > 0).length;
  panel(ctx, 12, 10, 430, 54);
  drawText(ctx, "ÁRVORE DA EVOLUÇÃO", 28, 20, { font: "big", scale: 1, color: "#ffd479" });
  drawText(ctx, "Evolua a colônia para sempre", 28, 48, { color: PAL.textDim });
  drawText(ctx, "NÓS " + owned + "/" + META_NODES.length, 300, 22, { color: "#efe9ff" });
  drawText(ctx, Math.round((owned / META_NODES.length) * 100) + "%", 300, 42, { color: "#c77dff" });
  // essência (à esquerda dos botões)
  panel(ctx, VIEW_W - 500, 10, 150, 54);
  drawEssence(ctx, VIEW_W - 492, 16);

  // botão voltar + ver tudo
  if (button(ctx, { x: VIEW_W - 340, y: 18, w: 156, h: 40, label: "VER TUDO", id: "treeFit", font: "small" })) {
    treeFit();
    SFX.uiClick();
  }
  if (button(ctx, { x: VIEW_W - 170, y: 18, w: 156, h: 40, label: "VOLTAR", id: "treeBack", font: "small" })) {
    return "back";
  }

  // legenda dos ramos: quantos nós de cada ramo já foram comprados
  drawLegend(ctx, 12, 72);

  // dica
  drawText(ctx, "CLIQUE PARA EVOLUIR  •  ARRASTE PARA MOVER  •  RODA OU VER TUDO: ZOOM (" + Math.round(zoom * 100) + "%)",
    VIEW_W / 2, VIEW_H - 26, { color: PAL.textDim, align: "center" });
  return null;
}

/** Legenda dos ramos (com progresso) — a árvore grande precisa de bússola. */
function drawLegend(ctx, x, y) {
  const ids = Object.keys(META_BRANCHES);
  const w = 118, h = 30;
  panel(ctx, x, y, ids.length * w + 16, h + 8);
  ids.forEach((id, i) => {
    const br = META_BRANCHES[id];
    const nodes = META_NODES.filter((n) => n.br === id);
    const done = nodes.filter((n) => metaLevel(n.id) > 0).length;
    const cx = x + 14 + i * w;
    ctx.fillStyle = br.color;
    ctx.fillRect(cx, y + 14, 8, 8);
    drawText(ctx, br.name, cx + 14, y + 14, { color: br.color, font: "small" });
    drawText(ctx, done + "/" + nodes.length, cx + 14, y + 26, { color: PAL.textDim, font: "small" });
  });
}

function drawEssence(ctx, x, y) {
  const ic = IMG.i_essence;
  ctx.imageSmoothingEnabled = false;
  if (ic) ctx.drawImage(ic, x, y + 8, 34, 34);
  drawText(ctx, G.save.essence, x + 44, y + 18, { font: "big", scale: 1, color: "#c77dff" });
}

function shade(hex, over) {
  // mistura simples cor->fundo
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const ro = parseInt(over.slice(1, 3), 16), go = parseInt(over.slice(3, 5), 16), bo = parseInt(over.slice(5, 7), 16);
  const t = 0.3;
  const m = (c, o) => Math.round(c * t + o * (1 - t));
  return `rgb(${m(r, ro)},${m(g, go)},${m(b, bo)})`;
}

function drawNodeTip(ctx, n) {
  const s = nodeScreen(n);
  const lvl = metaLevel(n.id);
  const max = n.cost.length;
  const chk = metaCanBuy(n.id);
  const br = META_BRANCHES[n.br];

  const w = 300;
  const lines = wrapText(n.desc, w - 28, { font: "small", scale: 1 });
  const h = 66 + lines.length * 20 + 24 + 8;
  let x = clamp(s.x - w / 2, 12, VIEW_W - w - 12);
  let y = s.y - NODE_R - h - 16;
  if (y < 76) y = s.y + NODE_R + 18;

  panel(ctx, x, y, w, h, { border: br.color });
  ctx.fillStyle = br.color;
  ctx.fillRect(x, y, w, 3);
  drawText(ctx, n.name, x + 14, y + 16, { font: "big", scale: 1, color: br.color });
  drawText(ctx, br.name + "  —  NÍVEL " + lvl + "/" + max, x + 14, y + 42, { color: PAL.textDim });
  lines.forEach((L, i) => drawText(ctx, L, x + 14, y + 64 + i * 20, { color: PAL.text }));

  // preço de CADA nível
  const ptY = y + h - 22;
  let ptx = x + 14;
  for (let i = 0; i < max; i++) {
    const bought = i < lvl;
    const isNext = i === lvl;
    const afford = G.save.essence >= n.cost[i];
    if (bought) {
      drawText(ctx, "✓", ptx, ptY, { color: br.color });
    } else {
      ctx.fillStyle = isNext ? (afford ? "#c77dff" : "#a32e46") : "#4a3a6e";
      ctx.fillRect(ptx, ptY + 1, 7, 7);
    }
    drawText(ctx, String(n.cost[i]), ptx + 10, ptY + 1,
      { color: bought ? br.color : isNext ? (afford ? "#efe9ff" : "#ff8a96") : PAL.textDim });
    ptx += textWidth(String(n.cost[i]), {}) + 34;
  }
}

/** clique do mouse — chamado por game.js quando a tela TREE está ativa */
export function treeClick() {
  if (hoverNode) {
    const chk = metaCanBuy(hoverNode.id);
    if (chk.ok) {
      metaBuy(hoverNode.id);
      SFX.buy();
      SFX.chime();
    } else {
      SFX.deny();
    }
    return true;
  }
  return false;
}
