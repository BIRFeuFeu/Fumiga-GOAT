// ============================================================================
// FUMIGA-GOAT — ÁRVORE DA EVOLUÇÃO (V2 Dead Cells refinada)
// Visual: dungeon escura, nós com glow, conexões com partículas, UI polida
// ============================================================================
import { PAL, META_BRANCHES, VIEW_W, VIEW_H, FRUIT_TREES } from "./config.js";
import { G, metaLevel, metaCanBuy, metaBuy, isFruitUnlocked } from "./state.js";
import { drawText, textWidth, wrapText, fitTextBlock, fontScale, layoutRec } from "./font.js";
import { IMG } from "./assets.js";
import { panel, button, pointInRect, isTouchUI } from "./ui.js";
import { mouse, pressed } from "./input.js";
import { SFX } from "./audio.js";
import { clamp, lerp, TAU } from "./utils.js";

import { TREE_NODES as META_NODES, TREE_FRUITS as FRUIT_NODES_CACHE, TREE_ALL, fruitCenter, fruitGridSlot } from "./tree_layout.js";
const reduced = () => !!G.save.accessibility?.reducedParticles || G.save.settings?.particles === false;
const treeTime = () => reduced() ? 0 : G.time;

// rework das raridades: raio por tier (0 comum · 1 raro · 2 lendário)
const NODE_R = [34, 42, 52];
const TIER_NAME = ["COMUM", "RARO", "LENDÁRIO"];
const TIER_COLOR = ["#9a8fc0", "#6ee7ff", "#ffd479"];
const SP = 142;
const YF = 0.5;
const MIN_ZOOM = 0.08, MAX_ZOOM = 2.4;
const TOP_UI = 124, BOTTOM_UI = 48;
// A moldura do topo (título, essência, frutos, botões e legenda) tem duas
// linhas fixas: sem isso ela estourava por cima da árvore com FONTE GRANDE.
const HUD_ROW1 = 100, HUD_GAP = 8;
function topUI() { return 10 + HUD_ROW1 + HUD_GAP + hudRow2H() + 6; }
function hudRow2H() { return fontScale() > 1 ? 68 : 46; }
function centerY() { return topUI() + (VIEW_H - topUI() - BOTTOM_UI) / 2; }

const BOUNDS = (() => {
  const points = [...META_NODES, ...FRUIT_TREES.map((f,i) => fruitCenter(i))];
  const xs = points.map(n=>n.x), ys = [...points.map(n=>n.y),8];
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys) - 1.5, maxY = Math.max(...ys);
  const w = (maxX - minX) * SP, h = (maxY - minY) * SP * YF;
  return { minX, maxX, minY, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
})();

let pan = { x: 0, y: 0 };
let zoom = 0.62;
let dragStart = null;
let hoverNode = null;
let selectedNode = null;
let activeFruit = null, legacyView = false, hoverFruit = null;
let treeParticles = [];

function ensureParticles() {
  if (treeParticles.length) return;
  for (let i = 0; i < 40; i++) {
    treeParticles.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      col: Math.random() < 0.5 ? "#c77dff" : "#4a3a6e",
      phase: Math.random() * TAU,
    });
  }
}

function fitZoom() {
  const zx = (VIEW_W - 90) / BOUNDS.w;
  const zy = (VIEW_H - topUI() - BOTTOM_UI - 18) / BOUNDS.h;
  return clamp(Math.min(zx, zy) * 0.98, MIN_ZOOM, 1);
}

function clampPan() {
  const mx = Math.max(24, BOUNDS.w / 2 - (VIEW_W / 2 - 30) / zoom + 60);
  const my = Math.max(24, BOUNDS.h / 2 - (VIEW_H / 2 - 90) / zoom + 60);
  pan.x = clamp(pan.x, -mx, mx);
  pan.y = clamp(pan.y, -my, my);
}

export function enterTree() {
  activeFruit = null; legacyView = false;
  pan.x = 0; pan.y = 0;
  zoom = clamp(fitZoom() * 1.7, 0.5, 1.05);
  clampPan();
  dragStart = null;
  hoverNode = null;
  selectedNode = null;
  treeFit();
  ensureParticles();
}

export function treeFit() {
  selectedNode = null;
  zoom = fitZoom();
  pan.x = 0; pan.y = 0;
  clampPan();
}

function nodeScreen(n) {
  return {
    x: VIEW_W / 2 + (pan.x + (n.x - BOUNDS.cx) * SP) * zoom,
    y: centerY() + (pan.y + (n.y - BOUNDS.cy) * SP * YF) * zoom,
  };
}

export function updateTree(dt) {
  hoverNode = null; hoverFruit = null;
  if (activeFruit) return;
  if (mouse.wheel && mouse.y >= topUI() && mouse.y < VIEW_H - 40) {
    const beforeZ = zoom;
    zoom = clamp(zoom * (mouse.wheel > 0 ? 0.9 : 1.11), MIN_ZOOM, MAX_ZOOM);
    pan.x = pan.x * beforeZ / zoom;
    pan.y = pan.y * beforeZ / zoom;
    clampPan();
  }
  if (mouse.y < topUI() || mouse.y >= VIEW_H - 40 || (selectedNode && mouse.x > 596)) return;
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    if (Math.hypot(mouse.x - s.x, mouse.y - s.y) < NODE_R[n.tier || 0] * zoom + 8) { hoverNode = n; break; }
  }
  if (!hoverNode) FRUIT_TREES.forEach((f,i) => {
    const c=nodeScreen(fruitCenter(i));
    if (Math.hypot(mouse.x-c.x,mouse.y-c.y)<Math.max(22,70*zoom)) hoverFruit=f;
  });
  if (mouse.justDown && !hoverNode) dragStart = { mx: mouse.x, my: mouse.y, px: pan.x, py: pan.y, d: 0 };
  if (mouse.down && dragStart) {
    const dx = mouse.x - dragStart.mx, dy = mouse.y - dragStart.my;
    dragStart.d = Math.max(dragStart.d, Math.hypot(dx, dy));
    pan.x = dragStart.px + dx / zoom;
    pan.y = dragStart.py + dy / zoom;
    clampPan();
  }
  if (!mouse.down) dragStart = null;

  // partículas
  if (reduced()) return;
  for (const p of treeParticles) {
    p.x += p.vx * dt * 0.3;
    p.y += p.vy * dt * 0.3 + Math.sin(treeTime() * 0.5 + p.phase) * 0.1;
    if (p.x < 0) p.x = VIEW_W;
    if (p.x > VIEW_W) p.x = 0;
    if (p.y < 0) p.y = VIEW_H;
    if (p.y > VIEW_H) p.y = 0;
  }
}

export function treeWasDragging() { return !dragStart || dragStart.d > 8; }

export function drawTree(ctx, dt) {
  if (activeFruit) return drawFruitMini(ctx);
  ensureParticles();

  // fundo Dead Cells dungeon refinado
  drawTreeBackground(ctx);

  ctx.save(); ctx.beginPath(); ctx.rect(0, topUI(), VIEW_W, VIEW_H - topUI() - 40); ctx.clip();
  layoutRec.layer = "world";
  drawLivingTree(ctx);
  // partículas de fundo
  for (const p of reduced() ? [] : treeParticles) {
    ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(treeTime() * 1.2 + p.phase));
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // O mapa da árvore (nós, etiquetas de preço e nomes de zona) é conteúdo de
  // MUNDO: pode encostar em si mesmo à vontade, como o campo da expedição. Só o
  // HUD, a legenda, a dica do nó e o rodapé são interface e entram na auditoria
  // de sobreposição.
  layoutRec.layer = "world";

  // arestas com glow e fluxo
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    for (const reqId of n.requires) {
      const p = META_NODES.find(m => m.id === reqId);
      const sp = nodeScreen(p);
      const owned = metaLevel(n.id) > 0 && metaLevel(reqId) > 0;
      const avai = metaLevel(reqId) > 0;
      const br = META_BRANCHES[n.br];

      // linha base
      const leg = (n.tier || 0) === 2;
      ctx.strokeStyle = owned ? (leg ? "#ffd479" : br.color) : avai ? "#5a4f88" : "#2c2444";
      ctx.lineWidth = owned ? (leg ? 5 : 3.5) : 1.8;
      ctx.globalAlpha = owned ? 0.95 : avai ? 0.5 : 0.25;
      ctx.beginPath();
      // curva suave ao invés de reta
      const mx = (sp.x + s.x) / 2, my = (sp.y + s.y) / 2;
      const offset = 12 * Math.sin((sp.x + s.x) * 0.01);
      ctx.moveTo(sp.x, sp.y);
      ctx.quadraticCurveTo(mx + offset, my, s.x, s.y);
      ctx.stroke();

      // fluxo de energia se comprado
      if (owned) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = br.color;
        ctx.globalAlpha = 0.15 + Math.sin(treeTime() * 3 + sp.x * 0.01) * 0.1;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.quadraticCurveTo(mx + offset, my, s.x, s.y);
        ctx.stroke();
        ctx.restore();

        // partícula viajando na conexão
        const t = reduced() ? 0.5 : (treeTime() * 0.8 + sp.x * 0.005) % 1;
        const qx = sp.x + (s.x - sp.x) * t;
        const qy = sp.y + (s.y - sp.y) * t;
        ctx.fillStyle = "#ffd479";
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(qx, qy, (leg ? 3.5 : 2.5) * zoom, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.globalAlpha = 1;

  // Sete frutos são PORTAS das miniárvores, não compras da árvore principal.
  FRUIT_TREES.forEach((f,i) => {
    const c=nodeScreen(fruitCenter(i)), unlocked=isFruitUnlocked(f.map);
    const r=Math.max(8,52*zoom);
    ctx.fillStyle=unlocked?f.color:"#40384b";ctx.strokeStyle=unlocked?"#ffd479":"#80708e";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.fill();ctx.stroke();
    if(f.pending)drawText(ctx,"?",c.x,c.y-8,{align:"center",scale:.6,color:PAL.textDim});
    drawText(ctx,String(i+1),c.x,c.y+r+5,{align:"center",scale:.6,color:unlocked?f.color:PAL.textDim});
  });

    // nós com RARIDADES: COMUM (círculo, cor do grupo) · RARO (anel duplo
  // ciano) · LENDÁRIO (hexágono dourado com o sprite da espécie)
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    const lvl = metaLevel(n.id);
    const max = n.cost.length;
    const chk = metaCanBuy(n.id);
    const hot = hoverNode === n;
    const br = META_BRANCHES[n.br];
    const tier = n.tier || 0;
    const R = NODE_R[tier] * zoom;

    // aura pulsante para disponível
    if (chk.ok) {
      const pulse = 0.4 + Math.sin(treeTime() * 3.5) * 0.25;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = tier === 2 ? "#ffd479" : br.color;
      ctx.globalAlpha = pulse * (0.4 + tier * 0.1);
      ctx.lineWidth = 2 + tier;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 10 + Math.sin(treeTime() * 3.5) * 3, 0, TAU); ctx.stroke();
      ctx.globalAlpha = pulse * (0.15 + tier * 0.05);
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 18, 0, TAU); ctx.fillStyle = tier === 2 ? "#ffd479" : br.color; ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // sombra do nó
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.arc(s.x + 3 * zoom, s.y + 4 * zoom, R, 0, TAU); ctx.fill();

    // corpo do nó com gradiente
    const grad = ctx.createRadialGradient(s.x - R*0.2, s.y - R*0.3, R*0.2, s.x, s.y, R);
    if (lvl > 0) {
      grad.addColorStop(0, lighten(br.color, 0.3));
      grad.addColorStop(0.4, br.color);
      grad.addColorStop(1, darken(br.color, 0.4));
    } else {
      grad.addColorStop(0, "#2c2444");
      grad.addColorStop(1, "#1a1628");
    }
    ctx.fillStyle = grad;
    nodePath(ctx, s.x, s.y, R, tier);
    ctx.fill();

    // borda com brilho (lendário: aro dourado)
    ctx.strokeStyle = tier === 2 ? (lvl > 0 ? "#ffd479" : chk.ok ? "#b99a4f" : "#5a4a2e")
      : lvl > 0 ? br.color : chk.ok ? br.color : "#3a3054";
    ctx.lineWidth = hot ? 4 + tier : lvl > 0 ? 3 : 2;
    nodePath(ctx, s.x, s.y, R, tier);
    ctx.stroke();

    // RARO: anel duplo ciano
    if (tier === 1) {
      ctx.strokeStyle = lvl > 0 ? "#6ee7ff" : "#3d5a7a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 5 * zoom, 0, TAU); ctx.stroke();
    }

    // highlight interno
    if (lvl > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, R - 3 * zoom, 0, TAU); ctx.stroke();
    }

    // anel dourado para MAX
    if (lvl >= max) {
      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 2.5;
      if (ctx.setLineDash) {
        ctx.setLineDash([6 * zoom, 4 * zoom]);
        ctx.beginPath(); ctx.arc(s.x, s.y, R + 6 * zoom, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, R + 6 * zoom, 0, TAU); ctx.stroke();
      }
      // brilho
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ffd479";
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 6 * zoom, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // sprite da espécie (raiz/hubs/lendários) ou ícone do atlas
    const spr = n.sprite && IMG[n.sprite] ? IMG[n.sprite] : null;
    const icon = spr || IMG["i_" + n.icon];
    if (icon) {
      ctx.imageSmoothingEnabled = false;
      if (lvl === 0 && !chk.ok) ctx.globalAlpha = 0.35;
      const size = (spr ? (tier === 2 ? 48 : 40) : (n.icon.startsWith("sk_") ? 34 : 38)) * zoom;
      // glow atrás do ícone se comprado
      if (lvl > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = br.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, size * 0.6, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = lvl === 0 && !chk.ok ? 0.35 : 1;
      }
      ctx.drawImage(icon, s.x - size / 2, s.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }

    // pips de nível refinados
    for (let i = 0; i < max; i++) {
      const px = s.x - (max - 1) * 6 * zoom + i * 12 * zoom;
      const py = s.y + R + 9 * zoom;
      ctx.fillStyle = i < lvl ? br.color : "#2c2444";
      if (i < lvl) {
        // pip preenchido com brilho
        ctx.fillRect(px - 3.5 * zoom, py, 7 * zoom, 5 * zoom);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(px - 3.5 * zoom, py, 7 * zoom, 1.5 * zoom);
      } else {
        ctx.strokeStyle = "#3a3054";
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 3.5 * zoom + 0.5, py + 0.5, 7 * zoom - 1, 5 * zoom - 1);
      }
    }

    // PREÇO com design Dead Cells
    if (lvl < max) {
      const price = n.cost[lvl];
      const afford = G.save.essence >= price;
      const py = s.y + R + 20 * zoom;
      const label = String(price);
      // largura de verdade do texto (a heurística antiga, length*7, dava uma
      // caixa 40% menor que a tinta e o número saía da moldura)
      const tw = textWidth(label, { scale: zoom }) + 24 * zoom;
      const th = Math.max(16 * zoom, 14 * fontScale() * zoom + 6 * zoom);

      // Não desenha o preço que ficaria embaixo do HUD (a moldura do topo e a
      // dica do rodapé são opacas) nem o que sairia pela borda do canvas —
      // nós fora de vista não precisam de etiqueta.
      const hx0 = s.x - tw / 2 - 1, hx1 = s.x + tw / 2 + 1;
      if (py < topUI() - 2 || py + th > VIEW_H - 40 || hx0 < 2 || hx1 > VIEW_W - 2) continue;

      // fundo do preço
      ctx.fillStyle = "rgba(10,8,16,0.85)";
      ctx.fillRect(s.x - tw / 2 - 1, py - 1, tw + 2, th);
      ctx.strokeStyle = afford ? "rgba(199,125,255,0.5)" : "rgba(163,46,70,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - tw / 2 - 0.5, py - 0.5, tw + 1, th - 1);

      // ícone de essência
      ctx.fillStyle = afford ? "#c77dff" : "#a32e46";
      ctx.fillRect(s.x - tw / 2 + 4 * zoom, py + (th - 8 * zoom) / 2, 8 * zoom, 8 * zoom);

      drawText(ctx, label, s.x - tw / 2 + 16 * zoom, py + 3 * zoom, {
        color: afford ? "#efe9ff" : "#ff8a96",
        scale: zoom
      });
    } else {
      const my2 = s.y + R + 22 * zoom;
      if (my2 >= topUI() - 2 && my2 <= VIEW_H - 60 && s.x > 30 && s.x < VIEW_W - 30) {
        drawText(ctx, "MAX", s.x, my2, { color: "#ffd479", align: "center", scale: zoom });
      }
    }
  }

  ctx.restore();
  // Detalhes fixos: ler antes de comprar, também no toque.
  layoutRec.layer = "ui";
  if (selectedNode) drawNodeTip(ctx, selectedNode);

  // HUD superior refinado — o retorno do VOLTAR precisa SUBIR: antes o
  // drawTreeHUD devolvia "back" e o drawTree jogava fora (sempre `return null`),
  // então o botão era decorativo e só o ESC funcionava.
  const hud = drawTreeHUD(ctx);

  // dica inferior: sobe para o texto não sair do canvas com FONTE GRANDE
  // (a tinta da fonte pequena em 1.3x tem 18px de altura) e ganha largura
  // máxima para nunca passar da borda
  ctx.fillStyle = "rgba(10,8,16,0.7)";
  ctx.fillRect(0, VIEW_H - 40, VIEW_W, 40);
  const hint = (isTouchUI()
    ? "RAMO: ZOOM • FRUTO: ABRIR • ARRASTE • PINÇA ("
    : "RAMO: ZOOM • FRUTO: ABRIR • ARRASTE • RODA (") + Math.round(zoom * 100) + "%)  •  " +
    (isTouchUI() ? "VOLTAR" : "ESC: VOLTAR");
  drawText(ctx, hint, VIEW_W / 2, VIEW_H - 28, { color: PAL.textDim, align: "center", maxWidth: VIEW_W - 40 });

  return hud;
}

// caminho do nó: LENDÁRIO é um hexágono (gema da colônia), demais círculos
function nodePath(ctx, x, y, r, tier) {
  if (tier === 2) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * TAU;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  }
}

// centróide de cada grupo — banha o fundo com a cor do grupo da loja
const ZONES = (() => {
  const z = {};
  for (const id of Object.keys(META_BRANCHES)) {
    const ns = META_NODES.filter((n) => n.br === id);
    z[id] = { x: ns.reduce((s, n) => s + n.x, 0) / ns.length,
              y: ns.reduce((s, n) => s + n.y, 0) / ns.length };
  }
  return z;
})();

function drawTreeBackground(ctx) {
  // fundo dungeon escuro
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "#0e0a18");
  g.addColorStop(0.5, "#120d1e");
  g.addColorStop(1, "#1a1430");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // tijolos sutis no fundo
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 1;
  for (let y = 0; y < VIEW_H; y += 40) {
    const off = (y / 40 % 2) * 50;
    for (let x = -20; x < VIEW_W; x += 100) {
      ctx.strokeRect(x + off, y, 100, 40);
    }
  }
  ctx.globalAlpha = 1;

  // zonas dos grupos — as MESMAS cores da fileira de formigas (guerra à
  // direita, coleta à esquerda, criação embaixo, real no topo)
  for (const id of Object.keys(ZONES)) {
    const p = nodeScreen(ZONES[id]);
    const c = META_BRANCHES[id].color;
    const zg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 460);
    zg.addColorStop(0, c + "16");
    zg.addColorStop(1, c + "00");
    ctx.fillStyle = zg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // vinheta
  const vg = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 100, VIEW_W/2, VIEW_H/2, 600);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

function drawTreeHUD(ctx) {
  const FS = fontScale();
  const owned = TREE_ALL.filter((n) => metaLevel(n.id) > 0).length;
  const pct = Math.round((owned / TREE_ALL.length) * 100);
  const row2Y = 10 + HUD_ROW1 + HUD_GAP;

  // ---------------------------------- linha 1: título | essência | frutos | botões
  panel(ctx, 12, 10, 300, HUD_ROW1, { border: "#8f6fd6", accentLine: "#8f6fd6" });
  drawText(ctx, "ÁRVORE DA EVOLUÇÃO", 28, 18, { font: "big", scale: 1, color: "#ffd479", maxWidth: 268 });
  const subLines = wrapText("Evolua a colônia para sempre", 268, { scale: 0.8 });
  subLines.forEach((L, i) => drawText(ctx, L, 28, 50 + i * Math.ceil(15 * 0.8 * FS), { color: PAL.textDim, scale: 0.8, maxWidth: 268 }));

  panel(ctx, 320, 10, 150, HUD_ROW1, { border: "#c77dff" });
  drawEssence(ctx, 328, 14);
  drawText(ctx, "NÓS " + owned + "/" + TREE_ALL.length, 328, 74, { color: "#efe9ff", scale: 0.7, maxWidth: 134 });
  drawText(ctx, "ÁRVORE " + pct + "%", 328, 90, { color: "#c77dff", scale: 0.7, maxWidth: 134 });

  // frutos = mini-árvores por mapa — FASE 3 anéis orbitais (desbloqueio por vitória)
  panel(ctx, 478, 10, 238, HUD_ROW1, { border: "#4a3a6e" });
  const fruitCap = wrapText("FRUTOS DA COPA", 222, { scale: 0.7 });
  fruitCap.forEach((L, i) => drawText(ctx, L, 486, 16 + i * Math.ceil(13 * 0.7 * FS), { color: "#6b5a8a", scale: 0.7, maxWidth: 222 }));
  FRUIT_TREES.forEach((fruit, i) => {
    const unlocked = isFruitUnlocked(fruit.map);
    const ownedCount = fruit.nodes.filter(n=> (G.save.nodes[n.id]|0) > 0).length;
    const total = fruit.nodes.length;
    const cx = 486 + i * 31 + 14, cy = 10 + HUD_ROW1 - 28;
    if (!isTouchUI() && mouse.justDown && pointInRect(mouse.x, mouse.y, cx-15, cy-18, 30, 46)) openFruit(fruit);
    ctx.globalAlpha = unlocked ? 0.9 : 0.35;
    ctx.fillStyle = unlocked ? fruit.color : "#2a2340";
    ctx.beginPath(); ctx.arc(cx, cy, ownedCount ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    if (unlocked && ownedCount) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = fruit.color;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = unlocked ? 0.95 : 0.28;
      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, 9, -Math.PI/2, -Math.PI/2 + (ownedCount/total)*Math.PI*2); ctx.stroke();
    }
    if (!unlocked) {
      ctx.fillStyle = "rgba(10,8,16,0.7)";
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4a3a6e";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawText(ctx, String(ownedCount), cx, cy + 12, { color: unlocked ? fruit.color : "#4a3a6e", align: "center", scale: 0.7, maxWidth: 28 });
  });

  // botões em grade 2x2 no canto: em fila única (como antes) eles cobriam o
  // painel de essência e os frutos, porque a faixa é a mesma
  const bW = 106, bX = [724, 838], bY = [16, 60], bH = 40;
  if (button(ctx, { x: bX[0], y: bY[0], w: bW, h: bH, label: "MEMÓRIAS", id: "treeMemories", font: "small", accent: "#ffd479" })) {
    return "memories";
  }
  if (button(ctx, { x: bX[1], y: bY[0], w: bW, h: bH, label: "PROFECIAS", id: "treeProphecy", font: "small", accent: "#6ee7ff" })) {
    return "prophecies";
  }
  if (button(ctx, { x: bX[0], y: bY[1], w: bW, h: bH, label: "VER TUDO", id: "treeFit", font: "small", accent: "#6db7ff" })) {
    treeFit();
    SFX.uiClick();
  }
  if (button(ctx, { x: bX[1], y: bY[1], w: bW, h: bH, label: "VOLTAR", id: "treeBack", font: "small", accent: "#ff4d5a" })) {
    return "back";
  }

  drawLegend(ctx, 12, row2Y);
}

function drawLegend(ctx, x, y) {
  const FS = fontScale();
  const h = hudRow2H();
  const ids = Object.keys(META_BRANCHES);
  const w = 118;
  panel(ctx, x, y, 760, h, { border: "#4a3a6e" });
  ids.forEach((id, i) => {
    const br = META_BRANCHES[id];
    const nodes = META_NODES.filter((n) => n.br === id);
    const done = nodes.filter((n) => metaLevel(n.id) > 0).length;
    const cx = x + 14 + i * w;
    const cy = y + (FS > 1 ? 22 : 18);
    if (mouse.justDown && pointInRect(mouse.x, mouse.y, cx-8, y, w, h)) focusTree(ZONES[id], 0.58);
    // bolinha colorida com glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = br.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx + 4, cy, 8, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = br.color;
    ctx.beginPath(); ctx.arc(cx + 4, cy, 4, 0, TAU); ctx.fill();
    // duas linhas com passo que respeita o tamanho real do texto (com FONTE
    // GRANDE nome e contagem ficavam um sobre o outro)
    drawText(ctx, br.name, cx + 14, y + (FS > 1 ? 6 : 8), { color: br.color, font: "small", maxWidth: w - 22 });
    drawText(ctx, done + "/" + nodes.length, cx + 14, y + (FS > 1 ? 36 : 26), { color: PAL.textDim, font: "small", maxWidth: w - 22 });
  });
  // raridades: quanto mais raro, maior e mais rebuscado o nó.
  // GRADE em uma linha (antes eram 3 linhas de 12px, que se sobrepunham)
  const rx0 = x + ids.length * w + 16;
  for (let t = 0; t < 3; t++) {
    const rx = rx0 + t * 88;
    const cy = y + (FS > 1 ? 22 : 18);
    ctx.fillStyle = TIER_COLOR[t];
    if (t === 2) { // losango do lendário
      ctx.save(); ctx.translate(rx + 4, cy); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(rx + 4, cy, t === 1 ? 4 : 3, 0, TAU); ctx.fill();
    }
    drawText(ctx, TIER_NAME[t], rx + 14, cy - 8, { color: TIER_COLOR[t], font: "small", scale: 0.7, maxWidth: 74 });
  }
}

function drawEssence(ctx, x, y) {
  const ic = IMG.i_essence;
  ctx.imageSmoothingEnabled = false;
  if (ic) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.3;
    ctx.drawImage(ic, x - 2, y + 6, 38, 38);
    ctx.restore();
    ctx.drawImage(ic, x, y + 8, 34, 34);
  }
  drawText(ctx, G.save.essence, x + 44, y + 18, { font: "big", scale: 1, color: "#c77dff", maxWidth:90 });
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
function shade(hex, over) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const ro = parseInt(over.slice(1, 3), 16), go = parseInt(over.slice(3, 5), 16), bo = parseInt(over.slice(5, 7), 16);
  const t = 0.3;
  const m = (c, o) => Math.round(c * t + o * (1 - t));
  return `rgb(${m(r, ro)},${m(g, go)},${m(b, bo)})`;
}

function drawNodeTip(ctx, n) {
  const x = 600, y = topUI() + 4, w = 348, h = VIEW_H - y - 46, FS = fontScale();
  const chk = metaCanBuy(n.id), lvl = metaLevel(n.id), col = n._fruit?.color || META_BRANCHES[n.br].color;
  panel(ctx, x, y, w, h, { border: col });
  let ty = y + 12;
  const line = (text, color, scale = 0.8) => {
    for (const l of wrapText(text, w - 28, { scale })) {
      drawText(ctx, l, x + 14, ty, { scale, color }); ty += Math.ceil(17 * scale * FS);
    }
    ty += 7;
  };
  line(n.name, col, 0.95);
  line((n._fruit?.name || META_BRANCHES[n.br].name) + " • " + lvl + "/" + n.cost.length, PAL.textDim, 0.7);
  line(n.desc, PAL.text, 0.8);
  line(chk.ok ? "CUSTO: " + chk.price + " ESSÊNCIA" : chk.why, chk.ok ? "#ffd479" : "#ff8a96", 0.8);
  if (button(ctx, { x: x+12, y: y+h-50, w: 204, h: 44, label: "EVOLUIR", id: "treeBuy", disabled: !chk.ok, accent: col })) {
    if (metaBuy(n.id)) { SFX.buy(); if (n.tier === 2) SFX.chime(); }
  }
  if (button(ctx, { x: x+228, y: y+h-50, w: 108, h: 44, label: "FECHAR", id: "treeClose" })) selectedNode = null;
}

export function treeClick() {
  if (hoverFruit) {openFruit(hoverFruit);return true;}
  if (!hoverNode) return false;
  selectedNode = hoverNode;
  return true;
}

function focusTree(p, z) {
  zoom = z;
  pan.x = -(p.x - BOUNDS.cx) * SP;
  pan.y = -(p.y - BOUNDS.cy) * SP * YF;
  selectedNode = null;
  clampPan();
}

// Diagnóstico para testes de navegação: mesmas coordenadas usadas no desenho.
export function treeNodePosition(id) {
  const n = TREE_ALL.find(n => n.id === id);
  return n ? (activeFruit && n._fruit ? miniPosition(n) : nodeScreen(n)) : null;
}
export function treeFocusNode(id) {
  const n = TREE_ALL.find(n => n.id === id);
  if (n?._fruit) {openFruit(n._fruit);legacyView=!n.global;}
  else if (n) {activeFruit=null;focusTree(n, 1);}
}

function drawLivingTree(ctx) {
  // Madeira e raízes desenhadas em coordenadas de mundo: sem PNG pesado,
  // sem variação aleatória por frame, e o mesmo desenho serve PC e mobile.
  const stroke = (points, width, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, width * zoom);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    points.forEach((p,i) => { const q = nodeScreen(p); if(i) ctx.lineTo(q.x,q.y); else ctx.moveTo(q.x,q.y); });
    ctx.stroke();
  };
  for (const n of [...META_NODES,...FRUIT_TREES.map((f,i)=>({...fruitCenter(i),id:f.id,br:"H",_fruit:f}))]) {
    if(n.id === 'raiz' || n.br === 'R' && !n._fruit) continue;
    const p = nodeScreen(n), learned = metaLevel(n.id) > 0;
    const color = n._fruit?.color || META_BRANCHES[n.br].color;
    for (let k=0;k<7;k++) {
      const a = k * 2.4 + n.x;
      const x = p.x + Math.cos(a)*100*zoom, y = p.y + Math.sin(a)*75*zoom;
      ctx.fillStyle = learned ? color + '80' : ['#303c35','#3d4836','#4c4938'][k%3];
      ctx.beginPath();
      ctx.moveTo(x-75*zoom,y); ctx.lineTo(x-32*zoom,y-45*zoom);
      ctx.lineTo(x+26*zoom,y-50*zoom); ctx.lineTo(x+78*zoom,y);
      ctx.lineTo(x+20*zoom,y+44*zoom); ctx.lineTo(x-45*zoom,y+36*zoom);ctx.closePath();ctx.fill();
      ctx.fillStyle=learned?'#d8bd7040':'#a19b4930'; ctx.fillRect(x-25*zoom,y-25*zoom,50*zoom,5*zoom);
    }
  }
  const trunk = [{x:0,y:7},{x:0.3,y:3},{x:-0.2,y:-2},{x:0.2,y:-8},{x:0,y:-14}];
  stroke(trunk, 112, "#201720"); stroke(trunk, 84, "#634733"); stroke(trunk, 52, "#8f6440"); stroke(trunk, 14, "#b28a53");
  for (const n of META_NODES) for (const r of n.requires) {
    const parent = META_NODES.find(p => p.id === r);
    stroke([parent, n], n.br === 'R' ? 34 : 20, "#684c36");
    stroke([parent, n], 5, "#987447");
  }
  for (let i=0; i<FRUIT_TREES.length; i++) {
    const f=fruitCenter(i);
    stroke([{x:0,y:-8}, {x:f.x*0.5,y:-12}, f], 30, "#705238");
    stroke([{x:0,y:-8}, {x:f.x*0.5,y:-12}, f], 7, "#ac8452");
    const c=nodeScreen(f);
    ctx.fillStyle = isFruitUnlocked(FRUIT_TREES[i].map) ? FRUIT_TREES[i].color + "35" : "#34344455";
    for(let j=0;j<5;j++) { ctx.beginPath(); ctx.ellipse(c.x+(j-2)*42*zoom,c.y-65*zoom-(j%2)*35*zoom,95*zoom,70*zoom,0,0,TAU);ctx.fill(); }
  }
  for (let i=-3; i<=3; i++) {
    stroke([{x:0,y:6},{x:i*.65,y:7},{x:i*1.3,y:7.8}], 26, "#49362c");
    stroke([{x:0,y:6},{x:i*.65,y:7},{x:i*1.3,y:7.8}], 5, "#876c49");
  }
  const root=nodeScreen({x:0,y:7.2});
  ctx.fillStyle="#b6accc30";
  for(let i=0;i<5;i++) {ctx.beginPath();ctx.ellipse(root.x+(i-2)*65*zoom,root.y+(reduced()?0:Math.sin(treeTime()*.5+i)*8*zoom),100*zoom,22*zoom,0,0,TAU);ctx.fill();}
  drawText(ctx, "COLÔNIA ANCESTRAL", root.x, root.y+48*zoom, {align:"center",color:PAL.textDim,scale:zoom});
  ctx.lineCap="butt";
}

function openFruit(f) {activeFruit=f;selectedNode=null;legacyView=false;}
function visibleFruitNodes() {return legacyView ? activeFruit.legacyNodes : activeFruit.newNodes;}
function miniPosition(n) {
  const list=visibleFruitNodes(), i=list.findIndex(x=>x.id===n.id);
  const {x:col,y:row}=fruitGridSlot(i);
  return {x:24+col*190+88,y:topUI()+12+row*68+24};
}
function drawFruitMini(ctx) {
  drawTreeBackground(ctx); layoutRec.layer="ui";
  const f=activeFruit, unlocked=isFruitUnlocked(f.map);
  panel(ctx,12,10,590,100,{border:f.color});
  drawText(ctx,f.name,26,20,{font:"big",color:f.color,maxWidth:560});
  drawText(ctx,unlocked?"FRUTO CONQUISTADO • PODERES GLOBAIS":"PRÉVIA BLOQUEADA • "+(f.pending?"PÁLIDA: FUTURO":"DERROTE "+f.bossName),26,56,{scale:.8,color:unlocked?PAL.text:PAL.textDim,maxWidth:560});
  drawText(ctx,"ESSÊNCIA "+G.save.essence+" • "+f.newNodes.filter(n=>metaLevel(n.id)>0).length+"/10 NOVAS",26,84,{scale:.75,color:"#ffd479",maxWidth:560});
  if(button(ctx,{x:624,y:14,w:320,h:44,label:"VOLTAR À ÁRVORE",id:"treeMiniBack"})) {activeFruit=null;selectedNode=null;return null;}
  if(button(ctx,{x:624,y:68,w:152,h:44,label:"NOVAS",id:"fruitNew",accent:legacyView?"#4a3a6e":f.color})) {legacyView=false;selectedNode=null;}
  if(f.legacyNodes.length && button(ctx,{x:788,y:68,w:156,h:44,label:"LEGADO",id:"fruitLegacy",accent:legacyView?f.color:"#4a3a6e"})) {legacyView=true;selectedNode=null;}
  drawText(ctx,legacyView?"COMPRAS ANTIGAS PRESERVADAS • EFEITOS LOCAIS":"TRÊS CAMINHOS • UM ÁPICE LENDÁRIO • SELECIONE PARA LER",26,126,{scale:.8,color:PAL.textDim,maxWidth:910});
  const list=visibleFruitNodes();
  for(const n of list) {
    const p=miniPosition(n);
    for(const id of n.requires) {
      const req=list.find(x=>x.id===id);if(!req)continue;
      const a=miniPosition(req);ctx.strokeStyle=metaLevel(n.id)?"#ffd479":"#4a3a6e";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(a.x,a.y+24);ctx.lineTo(p.x,p.y-24);ctx.stroke();
    }
  }
  for(const n of list) {
    const p=miniPosition(n),owned=metaLevel(n.id)>0;
    if(button(ctx,{x:p.x-88,y:p.y-24,w:176,h:48,label:"",id:"fruitNode_"+n.id,accent:owned?"#ffd479":f.color})) selectedNode={...n,_fruit:f};
    if(selectedNode?.id===n.id){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.strokeRect(p.x-86,p.y-22,172,44);}
    const lines=wrapText(n.name,156,{scale:.65}),step=Math.ceil(15*.65*fontScale());
    lines.forEach((line,i)=>drawText(ctx,line,p.x,p.y-lines.length*step/2+i*step,{align:"center",scale:.65,color:owned?"#ffd479":unlocked?PAL.text:PAL.textDim}));
  }
  if(selectedNode)drawNodeTip(ctx,selectedNode);
  else {
    panel(ctx,600,topUI()+4,348,VIEW_H-topUI()-50,{border:f.color});
    const text=f.pending?"O fruto da Névoa-Mãe só poderá ser conquistado após a implementação do sétimo mapa e a derrota da Pálida. Nenhuma vitória no Pico libera este fruto.":unlocked?"Este fruto guarda dez novos poderes para qualquer mapa. Escolha um caminho, leia os efeitos e confirme em EVOLUIR. Compras anteriores ficam em LEGADO.":"Derrote "+f.bossName+" na campanha para conquistar este fruto. Você pode ler as habilidades, mas não comprá-las ainda.";
    wrapText(text,318,{scale:.9}).forEach((line,i)=>drawText(ctx,line,614,topUI()+20+i*Math.ceil(18*.9*fontScale()),{scale:.9,color:PAL.text}));
  }
  drawText(ctx,"SELECIONAR NÃO GASTA ESSÊNCIA • EVOLUIR CONFIRMA A COMPRA",480,VIEW_H-28,{align:"center",scale:.8,color:PAL.textDim,maxWidth:920});
  return null;
}

export function treeBack() {
  if(selectedNode){selectedNode=null;return true;}
  if(activeFruit){activeFruit=null;return true;}
  return false;
}

export function treeFruitPosition(map) {
  const i=FRUIT_TREES.findIndex(f=>f.map===map);
  return i<0?null:nodeScreen(fruitCenter(i));
}
