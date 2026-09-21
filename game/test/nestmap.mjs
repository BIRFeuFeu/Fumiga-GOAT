// Gera um diagrama (PNG, via ImageMagick) do layout da cena do formigueiro a
// partir das CONSTANTES REAIS de game/js/nest.js e do rodapé de game/js/game.js.
// É só inspeção visual — o jogo de verdade roda no preview.
// Uso: node test/nestmap.mjs  ->  /home/user/formigueiro-layout.png
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// caminhos relativos ao PRÓPRIO teste — roda de qualquer diretório
const GAME = decodeURIComponent(new URL("..", import.meta.url).pathname);

const src = fs.readFileSync(GAME + "/js/nest.js", "utf8");
const rooms = [...src.matchAll(/\{ id: "(\w+)",\s+x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+),\s*accent: "([^"]+)" \}/g)]
  .map((m) => ({ id: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], accent: m[6] }));
const edges = [...src.matchAll(/\["(\w+)", "(\w+)"\]/g)].map((m) => [m[1], m[2]]);
const BOTTOM = +src.match(/const BOTTOM = (\d+)/)[1];

const game = fs.readFileSync(GAME + "/js/game.js", "utf8");
const SHOP_N = (game.match(/const SHOP = \[([\s\S]*?)\];/)[1].match(/type:/g) || []).length;
const [, SHOP_W, SHOP_PITCH] = game.match(/const SHOP_W = (\d+), SHOP_PITCH = (\d+)/).map(Number);
const VIEW_W = 960, VIEW_H = 540, MINI = { w: 180, h: 135 };
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
// rodapé: FORMIGAS recolhido + fileira + FORMIGUEIRO no canto
const footY = VIEW_H - 100;
rect(10, footY, 104, 88, "#241c38", "#37e6c8", 2);
textC(62, footY + 30, "FORMIGAS", 12, "#efe9ff");
textC(62, footY + 48, "ABRIR (Q)", 11, "#37e6c8");
for (let i = 0; i < SHOP_N; i++) {
  const x = 10 + 104 + 6 + i * SHOP_PITCH;
  rect(x, footY, SHOP_W, 88, "#241c38", "#4a3a6e");
  textC(x + SHOP_W / 2, footY + 34, String(i + 1), 15, "#8f86b8");
}
textC(10 + 104 + 6 + (SHOP_N * SHOP_PITCH) / 2, footY - 18,
  `fileira das ${SHOP_N} classes (botao FORMIGAS ou Q)`, 12, "#8f86b8");
const nw = 132, nx = VIEW_W - 10 - nw;
rect(nx, footY, nw, 88, "#241c38", "#ffd479", 2);
textC(nx + nw / 2, footY + 34, "FORMIGUEIRO", 12, "#efe9ff");
textC(nx + nw / 2, footY + 52, "ENTRAR (B)", 11, "#ffd479");
// minimapa no canto superior-direito
rect(VIEW_W - MINI.w - 13, 7, MINI.w + 6, MINI.h + 6, "#0a0810");
rect(VIEW_W - MINI.w - 10, 10, MINI.w, MINI.h, "#171221", "#4a3a6e");
textC(VIEW_W - 100, 10 + MINI.h / 2 - 16, "MINIMAPA", 13, "#8f86b8");
textC(VIEW_W - 100, 10 + MINI.h / 2 + 2, "canto superior-direito", 11, "#5a4f78");
// barra de status
rect(0, 0, VIEW_W, 40, "#080604");
text(16, 12, "COMIDA  .  ESSENCIA  .  NIVEL  .  MAPA/ONDA  .  POP", 14, "#ffd479");
text(560, 12, "ENTREGUE POR ELAS: +N", 13, "#7fd6a0");
// rodapé da cena
rect(16, BOTTOM + 20, 210, 40, "#241c38", "#37e6c8", 2);
textC(16 + 105, BOTTOM + 32, "VOLTAR A COLONIA (B)", 14, "#37e6c8");
text(300, BOTTOM + 34, "clique numa camara: as formigas carregam comida, escavam e cuidam das larvas", 11, "#8f86b8");

const out = "/home/user/formigueiro-layout.png";
execFileSync("convert", ["-size", `${VIEW_W}x${VIEW_H}`, "xc:#0b0704", ...A, out]);
console.log("salas:", rooms.length, "| tuneis:", edges.length, "| classes na fileira:", SHOP_N, "->", out);
