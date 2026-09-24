// Gera um diagrama (PNG, via ImageMagick) do layout da cena do formigueiro a
// partir das CONSTANTES REAIS de game/js/nest.js e das medidas da janela
// "OLHO LÁ FORA" (PIP em render.js). É só inspeção visual — o jogo de verdade
// roda no preview.
// Uso: node test/nestmap.mjs  ->  /home/user/formigueiro-layout.png  (NESTMAP_OUT muda o destino)
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// caminhos relativos ao PRÓPRIO teste — roda de qualquer diretório
const GAME = decodeURIComponent(new URL("..", import.meta.url).pathname);

const src = fs.readFileSync(GAME + "/js/nest.js", "utf8");
const rooms = [...src.matchAll(/\{ id: "(\w+)",\s+x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+),\s*accent: "([^"]+)" \}/g)]
  .map((m) => ({ id: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], accent: m[6] }));
const edges = [...src.matchAll(/\["(\w+)", "(\w+)"\]/g)].map((m) => [m[1], m[2]]);
const BOTTOM = +src.match(/const BOTTOM = (\d+)/)[1];

// a janela de fora: mesmas medidas usadas em render.js/nest.js
const ren = fs.readFileSync(GAME + "/js/render.js", "utf8");
const [, PIP_W, PIP_H] = ren.match(/PIP = \{ w: (\d+), h: (\d+), zoom/).map(Number);
const PIP = { x: 960 - PIP_W - 22, y: 46, w: PIP_W, h: PIP_H };

const VIEW_W = 960, VIEW_H = 540;
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";

const A = [];
const draw = (...d) => A.push(...d);
const rect = (x, y, w, h, fill, stroke = fill, sw = 1) =>
  draw("-fill", fill, "-stroke", stroke, "-strokewidth", String(sw),
    "-draw", `rectangle ${x},${y} ${x + w},${y + h}`);
const ell = (x, y, w, h, fill, stroke = fill, sw = 1) =>
  draw("-fill", fill, "-stroke", stroke, "-strokewidth", String(sw),
    "-draw", `ellipse ${x + w / 2},${y + h / 2} ${w / 2},${h / 2} 0,360`);
const line = (x1, y1, x2, y2, color, w) =>
  draw("-stroke", color, "-strokewidth", String(w), "-fill", "none",
    "-draw", `line ${x1},${y1} ${x2},${y2}`);
const text = (x, y, str, size, color) =>
  draw("-font", FONT, "-pointsize", String(size), "-fill", color, "-stroke", "none",
    "-gravity", "NorthWest", "-annotate", `+${Math.round(x)}+${Math.round(y)}`, str);
const center = (id) => {
  const r = rooms.find((v) => v.id === id);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};
const textC = (cx, y, str, size, color) => text(cx - str.length * size * 0.30, y, str, size, color);
const textR = (rx, y, str, size, color) => text(rx - str.length * size * 0.60, y, str, size, color);

// ------------------------------------------------------------- a cena de dentro
rect(0, 0, VIEW_W, VIEW_H, "#0b0704");
rect(0, 0, VIEW_W, BOTTOM, "#150e07");
for (let i = 0; i < 120; i++) {
  const x = (i * 137) % VIEW_W, y = (i * 421) % BOTTOM;
  rect(x, y, 22 + (i % 5) * 9, 9 + (i % 3) * 5, i % 3 ? "#3a2814" : "#221710");
}
for (const [a, b] of edges) {
  const p = center(a), q = center(b);
  line(p.x, p.y, q.x, q.y, "#2a1c0f", 26);
  line(p.x, p.y, q.x, q.y, "#3a2716", 14);
}
for (const r of rooms) {
  const built = r.id === "royal" || r.id === "entrance";
  ell(r.x, r.y, r.w, r.h, built ? "#2f2113" : "#1d140a", built ? "#6b4a24" : "#3a2a16", 2);
  textC(r.x + r.w / 2, r.y + 10, r.id.toUpperCase(), 13, "#ffd479");
}
// barra superior: status do lado de fora, como o drawNestHud mostra
rect(0, 0, VIEW_W, 40, "#080604");
line(0, 40, VIEW_W, 40, "#4a3a6e", 1);
text(16, 12, "COMIDA", 12, "#ffd479");
text(132, 12, "ESSENCIA", 12, "#c77dff");
text(250, 12, "NIVEL", 12, "#6db7ff");
text(380, 14, "MAPA 1/6   ONDA 0   POP 7/16", 12, "#efe9ff");
textR(VIEW_W - 16, 14, "ENTREGUE POR ELAS: +0", 12, "#7fd6a0");
textR(VIEW_W - 16, 30, "6 TRABALHANDO AQUI DENTRO (DE 6 NO NINHO)", 11, "#8f86b8");

// --------------------------------------------------- a janela "OLHO LÁ FORA"
rect(PIP.x, PIP.y, PIP.w, PIP.h, "#0d0a14", "#ffd479", 2);
ell(PIP.x + PIP.w / 2 - 60, PIP.y + PIP.h / 2 - 22, 120, 54, "#2a1c0f", "#3a2716", 2);
for (let i = 0; i < 6; i++) {
  const ax = PIP.x + 52 + i * 36, ay = PIP.y + 96 + (i % 3) * 12;
  ell(ax, ay, 10, 6, "#ffb347", "#7a4b16", 1);
}
ell(PIP.x + PIP.w - 74, PIP.y + 122, 12, 8, "#ff4d5a", "#7a1420", 1);
// faixas da janela: título em cima, status embaixo
rect(PIP.x, PIP.y, PIP.w, 15, "#0a0810");
rect(PIP.x, PIP.y + PIP.h - 14, PIP.w, 14, "#0a0810");
text(PIP.x + 5, PIP.y + 2, "OLHO LÁ FORA", 12, "#ffd479");
textR(PIP.x + PIP.w - 5, PIP.y + 2, "ONDA 0", 11, "#b7a9d6");
text(PIP.x + 5, PIP.y + PIP.h - 12, "FORA 4", 11, "#8fd3ff");
textR(PIP.x + PIP.w - 5, PIP.y + PIP.h - 12, "DENTRO 3", 11, "#7fd6a0");
textC(PIP.x + PIP.w / 2, PIP.y + PIP.h + 6,
  "mundo vivo enquanto voce esta dentro", 11, "#8a7a5e");

// ------------------------------------------------------- rodapé da cena (B)
rect(0, BOTTOM, VIEW_W, VIEW_H - BOTTOM, "#080604");
line(0, BOTTOM, VIEW_W, BOTTOM, "#4a3a6e", 1);
const btn = (x, w, label, accent) => {
  rect(x, BOTTOM + 10, w, 34, "#141020", accent, 2);
  textC(x + w / 2, BOTTOM + 20, label, 14, "#efe9ff");
};
btn(16, 210, "VOLTAR A COLONIA (B)", "#37e6c8");
btn(238, 186, "SAIR PELA BOCA (L)", "#ffd479");
btn(430, 196, "CHAMAR P/ DENTRO (P)", "#7fd6a0");
textC(VIEW_W / 2, BOTTOM + 54, "CLIQUE NUMA CAMARA PARA ESCAVAR  -  CLIQUE NA ENTRADA PARA ABRIR A BOCA", 11, "#b7a9d6");
textC(VIEW_W / 2, BOTTOM + 72, "O MUNDO LA FORA CONTINUA VIVO AGORA MESMO - E O QUE MOSTRA O OLHO LA FORA", 11, "#8a7a5e");

const out = process.env.NESTMAP_OUT || "/home/user/formigueiro-layout.png";   // fora do repo
execFileSync("convert", ["-size", `${VIEW_W}x${VIEW_H}`, "xc:#0b0704", ...A, out]);
console.log("salas:", rooms.length, "| tuneis:", edges.length,
  "| olho la fora:", PIP.w + "x" + PIP.h, "em (" + PIP.x + "," + PIP.y + ") ->", out);
