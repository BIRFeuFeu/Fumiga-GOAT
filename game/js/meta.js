// ============================================================================
// FUMIGA-GOAT — ÁRVORE DA EVOLUÇÃO (V2 Dead Cells refinada)
// Visual: dungeon escura, nós com glow, conexões com partículas, UI polida
// ============================================================================
import { PAL, META_NODES, META_BRANCHES, VIEW_W, VIEW_H } from "./config.js";
import { G, metaLevel, metaCanBuy, metaBuy } from "./state.js";
import { drawText, textWidth, wrapText } from "./font.js";
import { IMG } from "./assets.js";
import { panel, button, pointInRect } from "./ui.js";
import { mouse, pressed } from "./input.js";
import { SFX } from "./audio.js";
import { clamp, lerp, TAU } from "./utils.js";

const NODE_R = 36;
const SP = 142;
const YF = 0.88;
const MIN_ZOOM = 0.28, MAX_ZOOM = 2.4;
const TOP_UI = 124, BOTTOM_UI = 48;
const CY = TOP_UI + (VIEW_H - TOP_UI - BOTTOM_UI) / 2;

const BOUNDS = (() => {
  const xs = META_NODES.map((n) => n.x), ys = META_NODES.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = (maxX - minX) * SP, h = (maxY - minY) * SP * YF;
  return { minX, maxX, minY, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
})();

let pan = { x: 0, y: 0 };
let zoom = 0.62;
let dragStart = null;
let hoverNode = null;
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
  const zy = (VIEW_H - TOP_UI - BOTTOM_UI - 18) / BOUNDS.h;
  return clamp(Math.min(zx, zy) * 0.98, MIN_ZOOM, 1);
}

function clampPan() {
  const mx = Math.max(24, BOUNDS.w / 2 - (VIEW_W / 2 - 30) / zoom + 60);
  const my = Math.max(24, BOUNDS.h / 2 - (VIEW_H / 2 - 90) / zoom + 60);
  pan.x = clamp(pan.x, -mx, mx);
  pan.y = clamp(pan.y, -my, my);
}

export function enterTree() {
  pan.x = 0; pan.y = 0;
  zoom = clamp(fitZoom() * 1.7, 0.5, 1.05);
  clampPan();
  dragStart = null;
  hoverNode = null;
  ensureParticles();
}

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
    if (Math.hypot(mouse.x - s.x, mouse.y - s.y) < R + 8) { hoverNode = n; break; }
  }
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
  for (const p of treeParticles) {
    p.x += p.vx * dt * 0.3;
    p.y += p.vy * dt * 0.3 + Math.sin(G.time * 0.5 + p.phase) * 0.1;
    if (p.x < 0) p.x = VIEW_W;
    if (p.x > VIEW_W) p.x = 0;
    if (p.y < 0) p.y = VIEW_H;
    if (p.y > VIEW_H) p.y = 0;
  }
}

export function treeWasDragging() { return !dragStart || dragStart.d > 8; }

export function drawTree(ctx, dt) {
  ensureParticles();

  // fundo Dead Cells dungeon refinado
  drawTreeBackground(ctx);

  // partículas de fundo
  for (const p of treeParticles) {
    ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(G.time * 1.2 + p.phase));
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

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
      ctx.strokeStyle = owned ? br.color : avai ? "#5a4f88" : "#2c2444";
      ctx.lineWidth = owned ? 3.5 : 1.8;
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
        ctx.globalAlpha = 0.15 + Math.sin(G.time * 3 + sp.x * 0.01) * 0.1;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.quadraticCurveTo(mx + offset, my, s.x, s.y);
        ctx.stroke();
        ctx.restore();

        // partícula viajando na conexão
        const t = (G.time * 0.8 + sp.x * 0.005) % 1;
        const qx = sp.x + (s.x - sp.x) * t;
        const qy = sp.y + (s.y - sp.y) * t;
        ctx.fillStyle = br.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(qx, qy, 2.5 * zoom, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.globalAlpha = 1;

  // nós com design refinado
  const R = NODE_R * zoom;
  for (const n of META_NODES) {
    const s = nodeScreen(n);
    const lvl = metaLevel(n.id);
    const max = n.cost.length;
    const chk = metaCanBuy(n.id);
    const hot = hoverNode === n;
    const br = META_BRANCHES[n.br];

    // aura pulsante para disponível
    if (chk.ok) {
      const pulse = 0.4 + Math.sin(G.time * 3.5) * 0.25;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = br.color;
      ctx.globalAlpha = pulse * 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 10 + Math.sin(G.time * 3.5) * 3, 0, TAU); ctx.stroke();
      ctx.globalAlpha = pulse * 0.15;
      ctx.beginPath(); ctx.arc(s.x, s.y, R + 18, 0, TAU); ctx.fillStyle = br.color; ctx.fill();
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
    ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.fill();

    // borda com brilho
    ctx.strokeStyle = lvl > 0 ? br.color : chk.ok ? br.color : "#3a3054";
    ctx.lineWidth = hot ? 4 : lvl > 0 ? 3 : 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, TAU); ctx.stroke();

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

    // ícone com fundo
    const icon = IMG["i_" + n.icon];
    if (icon) {
      ctx.imageSmoothingEnabled = false;
      if (lvl === 0 && !chk.ok) ctx.globalAlpha = 0.35;
      const size = (n.icon.startsWith("sk_") ? 34 : 38) * zoom;
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
      const tw = label.length * 7 * zoom + 22 * zoom;

      // fundo do preço
      ctx.fillStyle = "rgba(10,8,16,0.85)";
      ctx.fillRect(s.x - tw / 2 - 1, py - 1, tw + 2, 16 * zoom);
      ctx.strokeStyle = afford ? "rgba(199,125,255,0.5)" : "rgba(163,46,70,0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - tw / 2 - 0.5, py - 0.5, tw + 1, 16 * zoom - 1);

      // ícone de essência
      ctx.fillStyle = afford ? "#c77dff" : "#a32e46";
      ctx.fillRect(s.x - tw / 2 + 4 * zoom, py + 4 * zoom, 8 * zoom, 8 * zoom);

      drawText(ctx, label, s.x - tw / 2 + 16 * zoom, py + 3 * zoom, {
        color: afford ? "#efe9ff" : "#ff8a96",
        scale: zoom
      });
    } else {
      drawText(ctx, "MAX", s.x, s.y + R + 22 * zoom, { color: "#ffd479", align: "center", scale: zoom });
    }
  }

  // tooltip
  if (hoverNode) drawNodeTip(ctx, hoverNode);

  // HUD superior refinado
  drawTreeHUD(ctx);

  // dica inferior
  const hintBg = "rgba(10,8,16,0.7)";
  ctx.fillStyle = hintBg;
  ctx.fillRect(0, VIEW_H - 32, VIEW_W, 32);
  drawText(ctx, "CLIQUE PARA EVOLUIR  •  ARRASTE PARA MOVER  •  RODA: ZOOM (" + Math.round(zoom * 100) + "%)  •  DUPLO CLIQUE: VER TUDO",
    VIEW_W / 2, VIEW_H - 20, { color: PAL.textDim, align: "center" });

  return null;
}

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

  // vinheta
  const vg = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 100, VIEW_W/2, VIEW_H/2, 600);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

function drawTreeHUD(ctx) {
  const owned = META_NODES.filter((n) => metaLevel(n.id) > 0).length;

  // painel título
  panel(ctx, 12, 10, 440, 60, { border: "#8f6fd6", accentLine: "#8f6fd6" });
  drawText(ctx, "ÁRVORE DA EVOLUÇÃO", 28, 20, { font: "big", scale: 1, color: "#ffd479" });
  drawText(ctx, "Evolua a colônia para sempre", 28, 44, { color: PAL.textDim });
  // progresso circular
  const pct = Math.round((owned / META_NODES.length) * 100);
  ctx.strokeStyle = "#2c2444"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(380, 38, 18, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "#c77dff"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(380, 38, 18, -Math.PI/2, -Math.PI/2 + (pct/100)*TAU); ctx.stroke();
  drawText(ctx, pct + "%", 380, 34, { color: "#efe9ff", align: "center" });
  drawText(ctx, owned + "/" + META_NODES.length, 300, 22, { color: "#efe9ff" });

  // essência
  panel(ctx, VIEW_W - 520, 10, 160, 60, { border: "#c77dff" });
  drawEssence(ctx, VIEW_W - 512, 16);

  // botões
  if (button(ctx, { x: VIEW_W - 350, y: 18, w: 156, h: 40, label: "VER TUDO", id: "treeFit", font: "small", accent: "#6db7ff" })) {
    treeFit();
    SFX.uiClick();
  }
  if (button(ctx, { x: VIEW_W - 180, y: 18, w: 156, h: 40, label: "VOLTAR", id: "treeBack", font: "small", accent: "#ff4d5a" })) {
    return "back";
  }

  drawLegend(ctx, 12, 78);
}

function drawLegend(ctx, x, y) {
  const ids = Object.keys(META_BRANCHES);
  const w = 124, h = 32;
  panel(ctx, x, y, ids.length * w + 16, h + 8, { border: "#4a3a6e" });
  ids.forEach((id, i) => {
    const br = META_BRANCHES[id];
    const nodes = META_NODES.filter((n) => n.br === id);
    const done = nodes.filter((n) => metaLevel(n.id) > 0).length;
    const cx = x + 14 + i * w;
    // bolinha colorida com glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = br.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(cx + 4, y + 18, 8, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = br.color;
    ctx.beginPath(); ctx.arc(cx + 4, y + 18, 4, 0, TAU); ctx.fill();
    drawText(ctx, br.name, cx + 14, y + 14, { color: br.color, font: "small" });
    drawText(ctx, done + "/" + nodes.length, cx + 14, y + 26, { color: PAL.textDim, font: "small" });
  });
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
  drawText(ctx, G.save.essence, x + 44, y + 18, { font: "big", scale: 1, color: "#c77dff" });
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
  const s = nodeScreen(n);
  const lvl = metaLevel(n.id);
  const max = n.cost.length;
  const br = META_BRANCHES[n.br];

  const w = 320;
  const lines = wrapText(n.desc, w - 28, { font: "small", scale: 1 });
  const h = 72 + lines.length * 20 + 28 + 8;
  let x = clamp(s.x - w / 2, 12, VIEW_W - w - 12);
  let y = s.y - NODE_R - h - 20;
  if (y < 80) y = s.y + NODE_R + 22;

  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x + 3, y + 4, w, h);

  panel(ctx, x, y, w, h, { border: br.color, accentLine: br.color, glow: br.color });
  ctx.fillStyle = br.color;
  ctx.fillRect(x, y, w, 4);
  // brilho
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.2;
  ctx.fillRect(x, y, w, 12);
  ctx.restore();

  drawText(ctx, n.name, x + 14, y + 18, { font: "big", scale: 1, color: br.color });
  drawText(ctx, br.name + "  —  NÍVEL " + lvl + "/" + max, x + 14, y + 42, { color: PAL.textDim });
  lines.forEach((L, i) => drawText(ctx, L, x + 14, y + 66 + i * 20, { color: PAL.text }));

  const ptY = y + h - 24;
  let ptx = x + 14;
  for (let i = 0; i < max; i++) {
    const bought = i < lvl;
    const isNext = i === lvl;
    const afford = G.save.essence >= n.cost[i];
    if (bought) {
      drawText(ctx, "✓", ptx, ptY, { color: br.color });
    } else {
      ctx.fillStyle = isNext ? (afford ? "#c77dff" : "#a32e46") : "#4a3a6e";
      if (isNext) {
        ctx.fillRect(ptx, ptY + 1, 8, 8);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(ptx, ptY + 1, 8, 2);
      } else {
        ctx.strokeStyle = "#4a3a6e";
        ctx.lineWidth = 1;
        ctx.strokeRect(ptx + 0.5, ptY + 1.5, 7, 7);
      }
    }
    drawText(ctx, String(n.cost[i]), ptx + 12, ptY + 1,
      { color: bought ? br.color : isNext ? (afford ? "#efe9ff" : "#ff8a96") : PAL.textDim });
    ptx += textWidth(String(n.cost[i]), {}) + 36;
  }
}

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
