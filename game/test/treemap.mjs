// Gera um diagrama (PNG, via ImageMagick) da ÁRVORE DA EVOLUÇÃO a partir das
// CONSTANTES REAIS de game/js/config.js (META_NODES/META_BRANCHES) e das
// constantes de enquadramento de game/js/meta.js.
// É só inspeção visual — o jogo de verdade roda no preview.
// Uso: node test/treemap.mjs  ->  <tmp>/arvore-layout.png  (TREEMAP_OUT muda o destino)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

// caminhos relativos ao PRÓPRIO teste — roda de qualquer diretório
const GAME = decodeURIComponent(new URL("..", import.meta.url).pathname);

const meta = fs.readFileSync(GAME + "/js/meta.js", "utf8");

// Lê os dados do PRÓPRIO módulo (config.js não importa nada): o parser por
// regex antigo quebrava a cada campo novo nos nós (tier/sprite zeraram a árvore).
const { META_NODES, META_BRANCHES } = await import(new URL("../js/config.js", import.meta.url));
const branches = META_BRANCHES;
// cada nó: id, ramo, ícone, nome, custos e posição na grade
const nodes = META_NODES.map((n) => ({
  id: n.id, br: n.br, icon: n.icon, name: n.name, desc: n.desc,
  cost: n.cost, req: n.requires || [], x: n.x, y: n.y, tier: n.tier || 0,
}));
if (nodes.length < 30) {
  console.error("não consegui ler os nós da árvore (achei " + nodes.length + ")");
  process.exit(1);
}
const SP = +meta.match(/const SP = (\d+)/)[1];
const YF = +meta.match(/const YF = ([\d.]+)/)[1];
// raio por tier (0 comum, 1 marco, 2 raiz/lendário) — igual a meta.js
const NODE_R = JSON.parse(meta.match(/const NODE_R = (\[[\d, ]+\])/)[1]);
const [, TOP_UI, BOTTOM_UI] = meta.match(/const TOP_UI = (\d+), BOTTOM_UI = (\d+)/).map(Number);
const ZMIN = +meta.match(/const MIN_ZOOM = ([\d.]+), MAX_ZOOM/)[1];

const VIEW_W = 960, VIEW_H = 540;
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
const B = {
  minX: Math.min(...xs), maxX: Math.max(...xs),
  minY: Math.min(...ys), maxY: Math.max(...ys),
};
B.cx = (B.minX + B.maxX) / 2; B.cy = (B.minY + B.maxY) / 2;
B.w = (B.maxX - B.minX) * SP; B.h = (B.maxY - B.minY) * SP * YF;
const fit = Math.min((VIEW_W - 90) / B.w, (VIEW_H - TOP_UI - BOTTOM_UI - 18) / B.h, 1) * 0.98;
const zoom = Math.max(ZMIN, fit);                       // enquadramento "VER TUDO"
const CY = TOP_UI + (VIEW_H - TOP_UI - BOTTOM_UI) / 2;
const screen = (n) => ({
  x: VIEW_W / 2 + (n.x - B.cx) * SP * zoom,
  y: CY + (n.y - B.cy) * SP * YF * zoom,
});

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";
const A = [];
const draw = (...d) => A.push(...d);
const rect = (x, y, w, h, fill, stroke = fill, sw = 1) =>
  draw("-fill", fill, "-stroke", stroke, "-strokewidth", String(sw),
    "-draw", `rectangle ${x},${y} ${x + w},${y + h}`);
const line = (x1, y1, x2, y2, color, w) =>
  draw("-stroke", color, "-strokewidth", String(w), "-fill", "none", "-draw", `line ${x1},${y1} ${x2},${y2}`);
const text = (x, y, str, size, color) =>
  draw("-font", FONT, "-pointsize", String(size), "-fill", color, "-stroke", "none",
    "-gravity", "NorthWest", "-annotate", `+${Math.round(x)}+${Math.round(y)}`, str);
const textC = (cx, y, str, size, color) => text(cx - str.length * size * 0.30, y, str, size, color);
const textR = (rx, y, str, size, color) => text(rx - str.length * size * 0.62, y, str, size, color);

// ------------------------------------------------------------------ fundo ---
rect(0, 0, VIEW_W, VIEW_H, "#120d1e");
rect(0, 0, VIEW_W, 74, "#1c1430");
for (let i = 0; i < 90; i++) rect((i * 173) % VIEW_W, (i * 97) % VIEW_H, 3, 3, i % 3 ? "#241b3a" : "#2e2247");

// ------------------------------------------------------------------ arestas -
for (const n of nodes) {
  const s = screen(n);
  for (const r of n.req) {
    const p = byId[r]; if (!p) continue;
    const sp = screen(p);
    line(sp.x, sp.y, s.x, s.y, "#3a3054", Math.max(1, 3 * zoom));
    line(sp.x, sp.y, s.x, s.y, branches[n.br].color, Math.max(1, 1.4 * zoom));
  }
}

// --------------------------------------------------------------------- nós --
for (const n of nodes) {
  const R = Math.max(6, NODE_R[n.tier] * zoom);
  const s = screen(n);
  const br = branches[n.br];
  draw("-fill", "#18122a", "-stroke", br.color, "-strokewidth", "2",
    "-draw", `ellipse ${s.x},${s.y} ${R},${R} 0,360`);
  if (n.cost.length > 1) {
    for (let i = 0; i < n.cost.length; i++) {
      rect(s.x - (n.cost.length - 1) * 2.2 - 1.5, s.y + R + 2.4, 4, 2.6, br.color);
    }
  }
  if (R > 11) textC(s.x, s.y - 4, n.name.split(" ")[0].slice(0, 8), 8, "#efe9ff");
  textC(s.x, s.y + R + (n.cost.length > 1 ? 8 : 3), n.cost.join("."), 7, "#c77dff");
}

// --------------------------------------------------------------------- HUD --
rect(12, 10, 430, 54, "#241c38", "#4a3a6e", 2);
text(28, 18, "ÁRVORE DA EVOLUÇÃO", 15, "#ffd479");
text(28, 40, "Evolua a colônia para sempre", 10, "#a99fc4");
text(300, 18, "NÓS 0/" + nodes.length, 10, "#efe9ff");
text(300, 38, "0%", 10, "#c77dff");
rect(VIEW_W - 500, 10, 150, 54, "#241c38", "#4a3a6e", 2);
text(VIEW_W - 480, 30, "ESSÊNCIA", 10, "#a99fc4");
rect(VIEW_W - 340, 18, 156, 40, "#241c38", "#37e6c8", 2);
textC(VIEW_W - 262, 30, "VER TUDO", 11, "#efe9ff");
rect(VIEW_W - 170, 18, 156, 40, "#241c38", "#ff4d5a", 2);
textC(VIEW_W - 92, 30, "VOLTAR", 11, "#efe9ff");

// legenda dos ramos
const ids = Object.keys(branches);
const LW = 118;
rect(12, 72, ids.length * LW + 16, 38, "#241c38", "#4a3a6e", 2);
ids.forEach((id, i) => {
  const br = branches[id];
  const count = nodes.filter((n) => n.br === id).length;
  const cx = 12 + 14 + i * LW;
  rect(cx, 86, 8, 8, br.color);
  text(cx + 14, 82, br.name, 10, br.color);
  text(cx + 14, 94, "0/" + count, 9, "#a99fc4");
});

// rodapé: a dica real da tela
textC(VIEW_W / 2, VIEW_H - 26, "CLIQUE PARA EVOLUIR  •  ARRASTE PARA MOVER  •  RODA OU VER TUDO: ZOOM (" + Math.round(zoom * 100) + "%)", 10, "#a99fc4");
textR(VIEW_W - 12, VIEW_H - 14, "layout real: " + nodes.length + " nós • zoom " + zoom.toFixed(2) + " • " + SP + "px de respiro", 9, "#6f6590");

const out = process.env.TREEMAP_OUT || path.join(tmpdir(), "arvore-layout.png");   // fora do repo (é só inspeção)
execFileSync("convert", ["-size", `${VIEW_W}x${VIEW_H}`, "xc:#120d1e", ...A, "-quality", "92", out]);
const per = {};
for (const n of nodes) per[n.br] = (per[n.br] || 0) + 1;
console.log("arvore-layout.png gerado (" + VIEW_W + "x" + VIEW_H + ")");
console.log("nós: " + nodes.length + " | por ramo: " +
  Object.entries(per).map(([k, v]) => branches[k].name + " " + v).join(" | "));
console.log("layout: eixo x " + B.minX + ".." + B.maxX + " | y " + B.minY + ".." + B.maxY +
  " | zoom de enquadramento " + zoom.toFixed(2) + " (" + Math.round(zoom * 100) + "%)");
console.log("níveis compráveis: " + nodes.reduce((a, n) => a + n.cost.length, 0));
