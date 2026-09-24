// Diagnóstico da geometria REAL: ilustração + posições de nós/frutos.
// Não finge ser o HUD: screenshots do render ficam em inspect / inspect:tree.
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { META_STAGES } from "../js/config.js";
import { TREE_ART, TREE_NODES, TREE_NODE_RADII, fruitCenter } from "../js/tree_layout.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = ["-size", "960x800", "xc:#181226", path.join(root, "assets/ui/tree_ancestral.png"),
  "-geometry", "+96+74", "-composite"];
const text = (x, y, value, color, size = 10) => args.push("-font", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
  "-pointsize", String(size), "-fill", color, "-stroke", "none", "-gravity", "NorthWest", "-annotate", `+${x}+${y}`, value);
text(32, 20, "ÁRVORE ANCESTRAL — coordenadas da arte (não é captura da interface)", "#ffd479", 15);
for (const n of TREE_NODES) {
  const x = 96 + n.x / TREE_ART.scale, y = 74 + n.y / TREE_ART.scale, r = TREE_NODE_RADII[n.tier || 0] / TREE_ART.scale;
  assert(x - r > 96 && x + r < 864 && y - r > 74 && y + r < 746, n.id + " fora da arte");
  args.push("-fill", "#17121f", "-stroke", META_STAGES[n.stage - 1].color, "-strokewidth", "1",
    "-draw", `circle ${x},${y} ${x + r},${y}`);
  text(Math.round(x + r + 2), Math.round(y - 4), n.id, "#f2eafa", 8);
}
for (let i = 0; i < 7; i++) {
  const p = fruitCenter(i), x = 96 + p.x / TREE_ART.scale, y = 74 + p.y / TREE_ART.scale;
  args.push("-fill", META_STAGES[i].color, "-stroke", "#ffd479", "-strokewidth", "2",
    "-draw", `circle ${x},${y} ${x + 15},${y}`);
  text(Math.round(x - 5), Math.round(y - 9), String(i + 1), "#181226", 14);
  if (i) assert(p.y < fruitCenter(i - 1).y, "os frutos sobem na ordem dos mundos");
}
text(32, 770, "49 melhorias principais • 7 frutos • compras, cores e câmera verificadas no navegador", "#ac9abb", 12);
const out = process.env.TREEMAP_OUT || path.join(tmpdir(), "arvore-layout.png");
execFileSync("convert", [...args, out]);
console.log(`GEOMETRIA OK — ${TREE_NODES.length} nós e sete frutos ascendentes, ${out}`);
