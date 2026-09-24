// A arte é um único PNG RGBA. Saturação e máscaras são assadas somente quando
// compras mudam, nunca por frame. Sem Canvas.filter (compatível também no mobile).
import { META_STAGES, FRUIT_TREES } from "./config.js";
import { metaLevel } from "./state.js";
import { IMG } from "./assets.js";
import { TREE_STAGE_NODES, TREE_COLOR_REGIONS, TREE_ALL } from "./tree_layout.js";

const GROUPS = META_STAGES.map((s, i) => [
  ...TREE_STAGE_NODES[i], ...(!FRUIT_TREES[i].pending ? FRUIT_TREES[i].nodes : []),
]);
const growth = {
  levels: new Uint16Array(7), totals: GROUPS.map(nodes => nodes.reduce((n, node) => n + node.cost.length, 0)),
  stages: new Float32Array(7), baseOwned: new Uint8Array(7), restoredPercent: 0, ownedNodes: 0,
};

export function treeGrowth() {
  let sum = 0, total = 0;
  for (let i = 0; i < 7; i++) {
    let levels = 0; growth.baseOwned[i] = 0;
    for (const n of GROUPS[i]) {
      const owned = Math.max(0, Math.min(n.cost.length, metaLevel(n.id)));
      levels += owned;
      if (n.stage && owned > 0) growth.baseOwned[i]++;
    }
    growth.levels[i] = levels;
    growth.stages[i] = levels / growth.totals[i];
    sum += levels; total += growth.totals[i];
  }
  // Uma primeira compra já conta; 100% é reservado à restauração completa.
  growth.restoredPercent = sum === 0 ? 0 : sum === total ? 100 : Math.max(1, Math.floor(100 * sum / total));
  growth.ownedNodes = 0;
  for (const n of TREE_ALL) if (metaLevel(n.id) > 0) growth.ownedNodes++;
  return growth;
}

let source = null, canvas = null, painter = null, original = null, output = null;
let regionA = null, regionB = null, weight = null, gray = null;
const lastLevels = new Int16Array(7).fill(-1), saturation = new Float32Array(7);
let bakes = 0;

function prepare(image) {
  source = image;
  canvas = null;
  if (typeof document === "undefined" || !image?.width) return;
  const cv = document.createElement("canvas");
  cv.width = image.width; cv.height = image.height;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return;
  c.drawImage(image, 0, 0);
  const data = c.getImageData(0, 0, cv.width, cv.height);
  // Os testes de lógica usam um canvas simulado sem pixels reais.
  if (!data || data.data.length !== cv.width * cv.height * 4 ||
      typeof c.createImageData !== "function" || typeof c.putImageData !== "function") return;
  original = data.data;
  output = c.createImageData(cv.width, cv.height);
  const count = cv.width * cv.height;
  regionA = new Uint8Array(count); regionB = new Uint8Array(count);
  weight = new Uint8Array(count); gray = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    const k = p * 4;
    if (!original[k + 3]) continue;
    gray[p] = Math.round(original[k] * .2126 + original[k + 1] * .7152 + original[k + 2] * .0722);
    const x = p % cv.width, y = Math.floor(p / cv.width);
    let first = Infinity, second = Infinity, a = 0, b = 0;
    for (let r = 0; r < TREE_COLOR_REGIONS.length; r++) {
      let distance = Infinity;
      for (const point of TREE_COLOR_REGIONS[r]) {
        const dx = (x - point[0]) / 110, dy = (y - point[1]) / 75;
        distance = Math.min(distance, dx * dx + dy * dy);
      }
      if (distance < first) { second = first; b = a; first = distance; a = r; }
      else if (distance < second) { second = distance; b = r; }
    }
    regionA[p] = a; regionB[p] = b;
    // Mescla suave entre galhos, sem faixas retangulares ou emendas na casca.
    const da = (first + .02) ** 2, db = (second + .02) ** 2;
    weight[p] = Math.round(255 * db / (da + db));
  }
  canvas = cv; painter = c;
  lastLevels.fill(-1);
}

export function treeArtCanvas(progress = treeGrowth()) {
  const image = IMG.tree_ancestral;
  if (image !== source) prepare(image);
  if (!canvas) return null;
  let changed = false;
  for (let i = 0; i < 7; i++) {
    if (lastLevels[i] !== progress.levels[i]) changed = true;
    lastLevels[i] = progress.levels[i];
    // As primeiras compras já são visíveis; 100% só ao completar a região.
    saturation[i] = Math.sqrt(progress.stages[i]);
  }
  if (!changed) return canvas;
  const dst = output.data;
  for (let p = 0; p < gray.length; p++) {
    const k = p * 4;
    if (!original[k + 3]) continue;
    const w = weight[p] / 255;
    const amount = saturation[regionA[p]] * w + saturation[regionB[p]] * (1 - w);
    dst[k] = Math.round(gray[p] + (original[k] - gray[p]) * amount);
    dst[k + 1] = Math.round(gray[p] + (original[k + 1] - gray[p]) * amount);
    dst[k + 2] = Math.round(gray[p] + (original[k + 2] - gray[p]) * amount);
    dst[k + 3] = original[k + 3];
  }
  painter.putImageData(output, 0, 0);
  bakes++;
  return canvas;
}

// Diagnóstico de regressão: leitura apenas, não altera saves nem progresso.
export function treeArtInfo() {
  return { bakes, width: canvas?.width || 0, height: canvas?.height || 0 };
}
