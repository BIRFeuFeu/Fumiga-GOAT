// FUMIGA — Árvore ancestral: sete galhos, cor restaurada e compras explícitas.
// PC e mobile compartilham arte, câmera, progressão e interface.
import { PAL, META_BRANCHES, META_STAGES, VIEW_W, VIEW_H, FRUIT_TREES } from "./config.js";
import { G, metaLevel, metaCanBuy, metaBuy, isFruitUnlocked, isTreeStageUnlocked, treeStageRequirement } from "./state.js";
import { drawText, textWidth, wrapText, fontScale, layoutRec } from "./font.js";
import { IMG } from "./assets.js";
import { panel, button, pointInRect, isTouchUI } from "./ui.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";
import { clamp, TAU } from "./utils.js";
import {
  TREE_ART, TREE_NODES, TREE_BY_ID, TREE_ALL, TREE_STAGE_NODES, TREE_STAGE_BOUNDS,
  TREE_NODE_RADII, fruitCenter, fruitGridSlot,
} from "./tree_layout.js";
import { treeArtCanvas, treeGrowth } from "./tree_art.js";

export const TREE_VIEW = { x: 184, y: 100, w: 764, h: 386 };
const DETAIL = { x: 608, y: 100, w: 340, h: 386 };
const MINI_TOP = 162, MIN_ZOOM = .10, MAX_ZOOM = 1.25;
const ART_W = TREE_ART.width * TREE_ART.scale, ART_H = TREE_ART.height * TREE_ART.scale;
const reduced = () => !!G.save.accessibility?.reducedParticles || G.save.settings?.particles === false;
const time = () => reduced() ? 0 : G.time;
const pan = { x: ART_W / 2, y: ART_H / 2 };
let zoom = .14, focusedStage = 0, drag = null, clickTarget = null;
let hoverNode = null, hoverFruit = null, selectedNode = null, activeFruit = null, legacyView = false;
const screenPoints = new Map(TREE_NODES.map(n => [n.id, { x: 0, y: 0 }]));
const fruitPoints = FRUIT_TREES.map(() => ({ x: 0, y: 0 }));
const origin = { x: 0, y: 0 }, worldOrigin = { x: 0, y: 0 };

function viewWidth() { return selectedNode ? DETAIL.x - TREE_VIEW.x - 12 : TREE_VIEW.w; }
function cx() { return TREE_VIEW.x + viewWidth() / 2; }
function cy() { return TREE_VIEW.y + TREE_VIEW.h / 2; }
function project(n, out) {
  out.x = cx() + (n.x - pan.x) * zoom;
  out.y = cy() + (n.y - pan.y) * zoom;
  return out;
}
function positions() {
  for (const n of TREE_NODES) project(n, screenPoints.get(n.id));
  for (let i = 0; i < 7; i++) project(fruitCenter(i), fruitPoints[i]);
}
function clampPan() {
  const mx = Math.min(ART_W / 2, viewWidth() / (2 * zoom));
  const my = Math.min(ART_H / 2, TREE_VIEW.h / (2 * zoom));
  pan.x = clamp(pan.x, mx - 100, ART_W - mx + 100);
  pan.y = clamp(pan.y, my - 100, ART_H - my + 100);
}
function zoomAt(factor, x = cx(), y = cy()) {
  const wx = pan.x + (x - cx()) / zoom, wy = pan.y + (y - cy()) / zoom;
  zoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
  pan.x = wx - (x - cx()) / zoom; pan.y = wy - (y - cy()) / zoom;
  clampPan();
}
export function treeFit() {
  selectedNode = null; focusedStage = 0;
  zoom = clamp(Math.min((TREE_VIEW.w - 30) / ART_W, (TREE_VIEW.h - 16) / ART_H), MIN_ZOOM, 1);
  pan.x = ART_W / 2; pan.y = ART_H / 2;
  drag = clickTarget = null;
}
export function enterTree() {
  activeFruit = null; legacyView = false; hoverNode = hoverFruit = null;
  treeFit();
}
export function treeFocusStage(stage) {
  const b = TREE_STAGE_BOUNDS[stage - 1];
  if (!b) return;
  activeFruit = selectedNode = null; focusedStage = stage;
  zoom = clamp(Math.min((TREE_VIEW.w - 60) / (b.maxX - b.minX),
    (TREE_VIEW.h - 70) / (b.maxY - b.minY)), .32, .80);
  pan.x = (b.minX + b.maxX) / 2; pan.y = (b.minY + b.maxY) / 2;
  drag = clickTarget = null;
  clampPan();
}
function inWorld(x, y) { return pointInRect(x, y, TREE_VIEW.x, TREE_VIEW.y, viewWidth(), TREE_VIEW.h); }
function pickAt(x, y) {
  hoverNode = hoverFruit = null;
  let nearest = Infinity;
  for (const n of TREE_NODES) {
    const p = screenPoints.get(n.id), d = Math.hypot(x - p.x, y - p.y);
    if (d < Math.max(isTouchUI() ? 22 : 10, TREE_NODE_RADII[n.tier || 0] * zoom + 5) && d < nearest) {
      nearest = d; hoverNode = n;
    }
  }
  for (let i = 0; i < 7; i++) {
    const p = fruitPoints[i], d = Math.hypot(x - p.x, y - p.y);
    if (d < Math.max(22, 60 * zoom) && d < nearest) {
      nearest = d; hoverFruit = FRUIT_TREES[i]; hoverNode = null;
    }
  }
}
export function updateTree() {
  hoverNode = hoverFruit = null; clickTarget = null;
  if (activeFruit) { drag = null; return; }
  if (mouse.wheel && inWorld(mouse.x, mouse.y)) {
    zoomAt(mouse.wheel > 0 ? .90 : 1.11, mouse.x, mouse.y);
    drag = null; // pinça nunca se converte em seleção ao soltar
  }
  positions();
  if (mouse.justDown && inWorld(mouse.x, mouse.y)) {
    drag = { x: mouse.x, y: mouse.y, px: pan.x, py: pan.y, distance: 0 };
  }
  if (drag && (mouse.down || mouse.justUp)) {
    const dx = mouse.x - drag.x, dy = mouse.y - drag.y;
    drag.distance = Math.max(drag.distance, Math.hypot(dx, dy));
    if (mouse.down && drag.distance > 8) {
      pan.x = drag.px - dx / zoom; pan.y = drag.py - dy / zoom;
      clampPan(); positions();
    }
  }
  if (inWorld(mouse.x, mouse.y)) pickAt(mouse.x, mouse.y);
  if (mouse.justUp && drag && drag.distance <= 8) clickTarget = hoverFruit || hoverNode;
  if (!mouse.down) drag = null;
}
export function treeWasDragging() { return !!drag && drag.distance > 8; }
export function treeClick() {
  const target = clickTarget; clickTarget = null;
  if (!target) return false;
  if (target.map) { openFruit(target); return true; }
  // Na visão geral do celular os nós são pequenos: o primeiro toque aproxima
  // o galho; a compra continua sempre em EVOLUIR, jamais no desenho da árvore.
  if (isTouchUI() && zoom < .32 && target.id !== "raiz") { treeFocusStage(target.stage); return true; }
  selectNode(target);
  return true;
}

function selectNode(n) {
  selectedNode = n; focusedStage = n.stage;
  pan.x = n.x; pan.y = n.y; zoom = Math.max(.55, zoom);
  clampPan();
}

function backdrop(ctx) {
  ctx.fillStyle = "#15101e"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Mesmo céu da TITLE, estático e discreto: não muda o parallax do menu.
  if (IMG.parallax_sky) {
    ctx.globalAlpha = .16;
    ctx.drawImage(IMG.parallax_sky, 0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 180, 0, VIEW_H);
  g.addColorStop(0, "#15101e00"); g.addColorStop(1, "#130f1df0");
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
function nodePath(ctx, x, y, r, tier) {
  ctx.beginPath();
  const sides = tier === 2 ? 6 : 8;
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + i * TAU / sides;
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawConnections(ctx) {
  // A madeira da ilustração substitui o emaranhado de linhas da versão antiga.
  // Conexões de pré-requisito aparecem no galho em foco e ao inspecionar um nó.
  if (!focusedStage && !selectedNode) return;
  for (const n of TREE_NODES) {
    if (selectedNode ? n.id !== selectedNode.id && !n.requires.includes(selectedNode.id) : n.stage !== focusedStage) continue;
    const p = screenPoints.get(n.id);
    for (const id of n.requires) {
      const q = screenPoints.get(id), owned = metaLevel(id) > 0;
      ctx.strokeStyle = owned ? "#ffd479" : "#aca3b5";
      ctx.globalAlpha = selectedNode ? .75 : .25; ctx.lineWidth = owned ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(q.x, q.y);
      ctx.quadraticCurveTo((q.x + p.x) / 2, p.y + 20 * zoom, p.x, p.y); ctx.stroke();
      if (owned && !reduced()) {
        const t = (time() * .3 + n.x * .001) % 1;
        ctx.fillStyle = "#ffe6a3";
        ctx.fillRect(q.x + (p.x - q.x) * t - 1, q.y + (p.y - q.y) * t - 1, 2, 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}
function drawNode(ctx, n) {
  const p = screenPoints.get(n.id), tier = n.tier || 0;
  const radius = Math.max(6, TREE_NODE_RADII[tier] * zoom);
  if (p.x + radius < TREE_VIEW.x || p.x - radius > TREE_VIEW.x + viewWidth() ||
      p.y + radius < TREE_VIEW.y || p.y - radius > TREE_VIEW.y + TREE_VIEW.h) return;
  const lvl = metaLevel(n.id), chk = metaCanBuy(n.id), max = n.cost.length;
  const hot = hoverNode === n || selectedNode?.id === n.id;
  const col = META_BRANCHES[n.br].color, unlocked = isTreeStageUnlocked(n.stage);
  const relevant = !focusedStage || n.stage === focusedStage || hot || selectedNode?.requires.includes(n.id);
  ctx.fillStyle = !relevant ? "#17141e90" : lvl ? "#28212c" : "#191720";
  ctx.strokeStyle = !relevant ? "#84708080" : hot ? "#fff0c7" : lvl ? col : chk.ok ? "#ffd479" : unlocked ? "#8e8694" : "#615c69";
  ctx.lineWidth = hot ? 2.5 : lvl ? 2 : 1;
  nodePath(ctx, p.x, p.y, radius, tier); ctx.fill(); ctx.stroke();
  if (relevant && tier > 0 && zoom >= .32) {
    ctx.strokeStyle = lvl ? (tier === 2 ? "#ffd479" : "#6ee7ff") : "#71647f";
    ctx.lineWidth = 1; nodePath(ctx, p.x, p.y, radius + 4, tier); ctx.stroke();
  }
  if (relevant && chk.ok && !reduced()) {
    ctx.globalAlpha = .25 + .1 * Math.sin(time() * 2);
    ctx.strokeStyle = "#ffd479"; nodePath(ctx, p.x, p.y, radius + 5, tier); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const icon = IMG[n.sprite] || IMG["i_" + n.icon];
  if (icon) {
    const size = Math.max(9, Math.min(radius * 1.5, 46 * zoom));
    ctx.globalAlpha = relevant ? (lvl || unlocked ? 1 : .50) : .35;
    ctx.drawImage(icon, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    ctx.globalAlpha = 1;
  }
  if (!relevant || zoom < .32 && !hot) return;
  const pipW = Math.max(3, 5 * zoom), pipGap = pipW + 3;
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < lvl ? col : "#514957";
    ctx.fillRect(Math.round(p.x - (max * pipGap - 3) / 2 + i * pipGap), Math.round(p.y + radius + 5), pipW, 3);
  }
  const label = lvl >= max ? "MAX" : String(n.cost[lvl]);
  const scale = .63, tw = textWidth(label, { scale }) + 10;
  const py = p.y + radius + 13, th = Math.ceil(18 * scale * fontScale()) + 4;
  // Preços fora do recorte não passam por baixo de painéis/botões.
  if (py + th < TREE_VIEW.y + TREE_VIEW.h && p.x - tw / 2 >= TREE_VIEW.x && p.x + tw / 2 <= TREE_VIEW.x + viewWidth()) {
    ctx.fillStyle = "#17121fe8"; ctx.fillRect(p.x - tw / 2, py, tw, th);
    drawText(ctx, label, p.x, py + 1, { align: "center", scale, color: lvl >= max ? "#ffd479" : unlocked ? PAL.text : PAL.textDim });
  }
}
function drawFruit(ctx, fruit, i) {
  const p = fruitPoints[i], r = clamp(60 * zoom, 12, 30);
  if (p.x + r < TREE_VIEW.x || p.x - r > TREE_VIEW.x + viewWidth() || p.y + r < TREE_VIEW.y || p.y - r > TREE_VIEW.y + TREE_VIEW.h) return;
  const unlocked = isFruitUnlocked(fruit.map), hot = hoverFruit === fruit;
  // Fruto em âmbar facetado, com caule/folha pixelados e número do mundo.
  ctx.fillStyle = unlocked ? "#a6ae70" : "#817988";
  ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - r - 7), 4, 9);
  ctx.fillRect(Math.round(p.x + 2), Math.round(p.y - r - 7), 9, 4);
  ctx.fillStyle = unlocked ? fruit.color : "#35303e";
  ctx.strokeStyle = hot ? "#fff0c7" : unlocked ? "#ffd479" : "#a69aa9";
  ctx.lineWidth = hot ? 3 : 2; nodePath(ctx, p.x, p.y, r, 2); ctx.fill(); ctx.stroke();
  drawText(ctx, String(i + 1), p.x, p.y - 9, { align: "center", scale: .85, color: unlocked ? "#19131d" : "#ebe4f3" });
  if (zoom >= .32 && (focusedStage === i + 1 || hot)) {
    const label = fruit.pending ? "FRUTO FUTURO" : unlocked ? "ABRIR FRUTO" : "FRUTO BLOQUEADO";
    drawText(ctx, label, clamp(p.x, TREE_VIEW.x + 66, TREE_VIEW.x + viewWidth() - 66), p.y - r - 25, { align: "center", scale: .60, color: unlocked ? fruit.color : PAL.textDim, maxWidth: 132 });
  }
}

export function drawTree(ctx) {
  if (activeFruit) return drawFruitMini(ctx);
  const growth = treeGrowth();
  backdrop(ctx);
  ctx.save(); ctx.beginPath(); ctx.rect(TREE_VIEW.x, TREE_VIEW.y, viewWidth(), TREE_VIEW.h); ctx.clip();
  layoutRec.layer = "world";
  ctx.imageSmoothingEnabled = false;
  const art = treeArtCanvas(growth);
  project(worldOrigin, origin);
  if (art) ctx.drawImage(art, Math.round(origin.x), Math.round(origin.y), ART_W * zoom, ART_H * zoom);
  positions(); drawConnections(ctx);
  for (const n of TREE_NODES) drawNode(ctx, n);
  for (let i = 0; i < 7; i++) drawFruit(ctx, FRUIT_TREES[i], i);
  const root = screenPoints.get("raiz");
  if (!focusedStage) drawText(ctx, "COLÔNIA ANCESTRAL", root.x, root.y + 24, { align: "center", scale: .65, color: PAL.textDim });
  ctx.restore(); layoutRec.layer = "ui";
  if (selectedNode) drawNodeTip(ctx, selectedNode);
  const action = drawTreeHUD(ctx, growth);
  return action;
}
function drawTreeHUD(ctx, growth) {
  panel(ctx, 12, 10, 366, 82, { border: "#8c7552" });
  drawText(ctx, "ÁRVORE DA EVOLUÇÃO", 26, 18, { font: "big", color: "#ffd479", maxWidth: 338 });
  drawText(ctx, growth.ownedNodes + "/" + TREE_ALL.length + " MEMÓRIAS • COR " + growth.restoredPercent + "%", 26, 58,
    { scale: .72, color: PAL.textDim, maxWidth: 338 });
  panel(ctx, 386, 10, 154, 82, { border: "#8f6fd6" });
  drawText(ctx, "ESSÊNCIA", 400, 17, { scale: .7, color: PAL.textDim });
  drawText(ctx, G.save.essence, 400, 44, { font: "big", color: "#d7a2ff", maxWidth: 126 });
  if (button(ctx, { x: 552, y: 14, w: 124, h: 44, compact: true, label: "MEMÓRIAS", id: "treeMemories", scale: .85, accent: "#ffd479" })) return "memories";
  if (button(ctx, { x: 684, y: 14, w: 124, h: 44, compact: true, label: "PROFECIAS", id: "treeProphecy", scale: .85, accent: "#6ee7ff" })) return "prophecies";
  if (button(ctx, { x: 820, y: 14, w: 124, h: 44, compact: true, label: "VOLTAR", id: "treeBack", scale: .85, accent: "#ff8a96" })) return "back";
  let lx = 555;
  for (const br of Object.values(META_BRANCHES)) {
    drawText(ctx, br.name, lx, 72, { scale: .65, color: br.color, maxWidth: 90 }); lx += 99;
  }

  panel(ctx, 12, 100, 164, 386, { border: "#64566d" });
  for (let i = 6; i >= 0; i--) {
    const stage = META_STAGES[i], y = 104 + (6 - i) * 48;
    const unlocked = isTreeStageUnlocked(i + 1), owned = growth.baseOwned[i];
    if (button(ctx, { x: 22, y, w: 144, h: 44, compact: true, label: "", id: "treeStage" + (i + 1), accent: focusedStage === i + 1 ? stage.color : "#64586e" })) {
      treeFocusStage(i + 1);
    }
    drawText(ctx, (i + 1) + " • " + stage.name, 34, y + 4, { scale: .72, color: unlocked ? stage.color : "#b2a8bb", maxWidth: 118 });
    drawText(ctx, unlocked ? owned + "/" + TREE_STAGE_NODES[i].length + " • EXPLORAR" : "VENÇA MUNDO " + i, 34, y + 26,
      { scale: .56, color: PAL.textDim, maxWidth: 118 });
  }
  if (button(ctx, { x: 22, y: 440, w: 144, h: 44, compact: true, label: "", id: "treeRoot", accent: "#ffd479" })) selectNode(TREE_BY_ID.get("raiz"));
  drawText(ctx, "RAIZ ANCESTRAL", 34, 444, { scale: .66, color: "#ffd479", maxWidth: 118 });
  drawText(ctx, metaLevel("raiz") ? "MEMÓRIA VIVA" : "GRÁTIS • COMEÇAR", 34, 466, { scale: .55, color: PAL.textDim, maxWidth: 118 });
  panel(ctx, 12, 492, 936, 44, { border: "#51465e" });
  drawText(ctx, isTouchUI() ? "ARRASTE • PINÇA" : "ARRASTE • RODA", 24, 505, { scale: .65, color: PAL.textDim, maxWidth: 146 });
  if (button(ctx, { x: 184, y: 492, w: 122, h: 44, compact: true, label: "VER TUDO", id: "treeFit", scale: .8 })) treeFit();
  if (button(ctx, { x: 314, y: 492, w: 44, h: 44, compact: true, label: "-", id: "treeZoomOut" })) zoomAt(.8);
  if (button(ctx, { x: 366, y: 492, w: 44, h: 44, compact: true, label: "+", id: "treeZoomIn" })) zoomAt(1.25);
  const note = focusedStage ? (treeStageRequirement(focusedStage) || "GALHO " + focusedStage + " • SELECIONE PARA LER") : metaLevel("raiz") ? "DA RAIZ À COPA • ESCOLHA UM GALHO" : "COMECE PELA RAIZ ANCESTRAL";
  drawText(ctx, note, 426, 496, { scale: .67, color: "#ddc9a6", maxWidth: 504 });
  drawText(ctx, "FRUTOS NUMERADOS ABREM HABILIDADES • ZOOM " + Math.round(zoom * 100) + "%", 426, 517,
    { scale: .55, color: PAL.textDim, maxWidth: 504 });
  return null;
}

function drawNodeTip(ctx, n) {
  const { x, w } = DETAIL, y = activeFruit ? MINI_TOP : DETAIL.y, h = 486 - y;
  const chk = metaCanBuy(n.id), lvl = metaLevel(n.id), col = n._fruit?.color || META_BRANCHES[n.br].color;
  panel(ctx, x, y, w, h, { border: col });
  const blocks = [
    [n.name, col, .93],
    [(n._fruit ? (legacyView ? "LEGADO • " : "GLOBAL • ") : "GALHO " + n.stage + " • " + META_BRANCHES[n.br].name + " • ") + lvl + "/" + n.cost.length, PAL.textDim, .72],
    [n.desc, PAL.text, .80],
    [lvl < n.cost.length ? "CUSTO: " + n.cost[lvl] + " ESSÊNCIA" : "NÍVEL MÁXIMO", "#ffd479", .76],
  ];
  if (!chk.ok && lvl < n.cost.length) blocks.push([chk.why, "#ffb4bc", .74]);
  if (!n._fruit && lvl > 0 && !isTreeStageUnlocked(n.stage)) blocks.push(["COMPRA ANTIGA PRESERVADA E ATIVA", PAL.textDim, .65]);
  // Espaço real, inclusive fonte grande e descrições longas: encolhe o bloco
  // como último recurso, nunca corta o requisito nem cobre a confirmação.
  const heightAt = factor => blocks.reduce((sum, [text, , scale]) =>
    sum + wrapText(text, w - 28, { scale: scale * factor }).length * Math.ceil(18 * scale * factor * fontScale()) + 9, 0);
  let factor = 1;
  while (factor > .75 && heightAt(factor) > h - 78) factor -= .025;
  let ty = y + 12;
  for (const [text, color, baseScale] of blocks) {
    const scale = baseScale * factor;
    for (const line of wrapText(text, w - 28, { scale })) {
      drawText(ctx, line, x + 14, ty, { scale, color }); ty += Math.ceil(18 * scale * fontScale());
    }
    ty += 9;
  }
  if (button(ctx, { x: x + 12, y: y + h - 54, w: 196, h: 44, compact: true, label: "EVOLUIR", id: "treeBuy", disabled: !chk.ok, accent: col })) {
    if (metaBuy(n.id)) { SFX.buy(); if (n.tier === 2) SFX.chime(); }
  }
  if (button(ctx, { x: x + 220, y: y + h - 54, w: 108, h: 44, compact: true, label: "FECHAR", id: "treeClose", scale: .85 })) selectedNode = null;
}
function openFruit(fruit) { activeFruit = fruit; selectedNode = null; legacyView = false; drag = clickTarget = null; }
function visibleFruitNodes() { return legacyView ? activeFruit.legacyNodes : activeFruit.newNodes; }
function miniPosition(n) {
  const i = visibleFruitNodes().findIndex(x => x.id === n.id), { x: col, y: row } = fruitGridSlot(i);
  return { x: 112 + col * 190, y: MINI_TOP + 26 + row * 72 };
}
function drawFruitMini(ctx) {
  backdrop(ctx); layoutRec.layer = "ui";
  const f = activeFruit, unlocked = isFruitUnlocked(f.map), stage = FRUIT_TREES.indexOf(f) + 1;
  panel(ctx, 12, 10, 590, 104, { border: f.color });
  drawText(ctx, f.name, 26, 20, { font: "big", color: f.color, maxWidth: 560 });
  drawText(ctx, unlocked ? "FRUTO CONQUISTADO • PODERES GLOBAIS" : "PRÉVIA BLOQUEADA • " + (f.pending ? "PÁLIDA: FUTURO" : "DERROTE " + f.bossName),
    26, 59, { scale: .8, color: unlocked ? PAL.text : PAL.textDim, maxWidth: 560 });
  drawText(ctx, "GALHO " + stage + " • ESSÊNCIA " + G.save.essence + " • " + f.newNodes.filter(n => metaLevel(n.id) > 0).length + "/10 NOVAS",
    26, 87, { scale: .68, color: "#ffd479", maxWidth: 560 });
  if (button(ctx, { x: 624, y: 14, w: 320, h: 44, compact: true, label: "VOLTAR À ÁRVORE", id: "treeMiniBack" })) {
    activeFruit = selectedNode = null; return null;
  }
  if (button(ctx, { x: 624, y: 68, w: 152, h: 44, compact: true, label: "NOVAS", id: "fruitNew", accent: legacyView ? "#64556e" : f.color })) {
    legacyView = false; selectedNode = null;
  }
  if (f.legacyNodes.length && button(ctx, { x: 788, y: 68, w: 156, h: 44, compact: true, label: "LEGADO", id: "fruitLegacy", accent: legacyView ? f.color : "#64556e" })) {
    legacyView = true; selectedNode = null;
  }
  drawText(ctx, legacyView ? "COMPRAS ANTIGAS PRESERVADAS • EFEITOS LOCAIS" : "TRÊS CAMINHOS • UM ÁPICE • SELECIONE PARA LER", 26, 130,
    { scale: .78, color: PAL.textDim, maxWidth: 910 });
  const list = visibleFruitNodes();
  for (const n of list) {
    const p = miniPosition(n);
    for (const id of n.requires) {
      const req = list.find(x => x.id === id); if (!req) continue;
      const q = miniPosition(req);
      ctx.strokeStyle = metaLevel(n.id) ? "#ffd479" : "#64546e"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(q.x, q.y + 27); ctx.lineTo(p.x, p.y - 27); ctx.stroke();
    }
  }
  for (const n of list) {
    const p = miniPosition(n), owned = metaLevel(n.id) > 0;
    if (button(ctx, { x: p.x - 88, y: p.y - 27, w: 176, h: 54, compact: true, label: "", id: "fruitNode_" + n.id, accent: owned ? "#ffd479" : f.color })) selectedNode = { ...n, _fruit: f };
    if (selectedNode?.id === n.id) { ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.strokeRect(p.x - 85, p.y - 24, 170, 48); }
    const lines = wrapText(n.name, 156, { scale: .65 }), step = Math.ceil(16 * .65 * fontScale());
    lines.forEach((line, i) => drawText(ctx, line, p.x, p.y - lines.length * step / 2 + i * step,
      { align: "center", scale: .65, color: owned ? "#ffd479" : unlocked ? PAL.text : PAL.textDim }));
  }
  if (selectedNode) drawNodeTip(ctx, selectedNode);
  else {
    panel(ctx, DETAIL.x, MINI_TOP, DETAIL.w, 486 - MINI_TOP, { border: f.color });
    const text = f.pending
      ? "A copa abre após o Pico, mas este fruto aguarda o sétimo mundo e a derrota da Pálida. Nenhuma vitória no Devastador permite comprar seus poderes."
      : unlocked ? "Este fruto guarda dez poderes globais. Escolha um caminho, leia os efeitos e confirme em EVOLUIR. Compras anteriores continuam em LEGADO."
        : "Derrote " + f.bossName + " na campanha para conquistar este fruto. Abrir o galho não libera seu fruto: você pode ler, mas ainda não comprar.";
    wrapText(text, 312, { scale: .87 }).forEach((line, i) => drawText(ctx, line, DETAIL.x + 14, MINI_TOP + 18 + i * Math.ceil(19 * .87 * fontScale()),
      { scale: .87, color: PAL.text }));
  }
  drawText(ctx, "SELECIONAR NÃO GASTA ESSÊNCIA • EVOLUIR CONFIRMA A COMPRA", 480, VIEW_H - 29,
    { align: "center", scale: .8, color: PAL.textDim, maxWidth: 920 });
  return null;
}

export function treeBack() {
  if (selectedNode) { selectedNode = null; return true; }
  if (activeFruit) { activeFruit = null; return true; }
  return false;
}
// Diagnóstico utiliza as mesmas coordenadas do desenho e do clique/toque.
export function treeNodePosition(id) {
  const n = TREE_ALL.find(n => n.id === id);
  return n ? (activeFruit && n._fruit ? miniPosition(n) : project(n, { x: 0, y: 0 })) : null;
}
export function treeFocusNode(id) {
  const n = TREE_ALL.find(n => n.id === id);
  if (!n) return;
  if (n._fruit) { openFruit(n._fruit); legacyView = !n.global; }
  else {
    activeFruit = selectedNode = null; focusedStage = n.stage;
    pan.x = n.x; pan.y = n.y; zoom = 1; clampPan();
  }
}
export function treeFruitPosition(map) {
  const i = FRUIT_TREES.findIndex(f => f.map === map);
  return i < 0 ? null : project(fruitCenter(i), { x: 0, y: 0 });
}
export function treeViewState() {
  return { zoom, focusedStage, selected: selectedNode?.id || null, fruit: activeFruit?.map || null, x: pan.x, y: pan.y };
}
