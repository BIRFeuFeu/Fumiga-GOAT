// Coordenadas visuais em pixels de mundo, ancoradas na arte aprovada.
// Nunca usadas para custos, desbloqueios ou saves. Uma unidade de arte = 4 de mundo.
import { META_NODES, FRUIT_TREES } from "./config.js";

export const TREE_ART = { width: 768, height: 672, scale: 4 };
export const TREE_NODE_RADII = [34, 42, 52];
const at = (x, y) => ({ x: x * TREE_ART.scale, y: y * TREE_ART.scale });
const SLOTS = {
  raiz: [385, 610], g_dan: [282, 378], g_vid: [244, 385], t_col: [203, 371],
  t_vel: [157, 367], n_dig: [322, 392], r_vida: [359, 450], r_reg: [325, 435],
  g_cri: [440, 375], g_grd: [478, 358], t_carga: [518, 342], t_rap: [562, 335],
  n_corr: [603, 348], n_berco: [639, 331], r_ovo: [481, 404],
  g_cad: [197, 260], g_arm: [239, 273], g_alc: [280, 287], t_ini: [157, 250],
  t_ambar: [120, 214], n_fung: [314, 318], r_pop: [357, 337],
  g_bomb: [461, 293], g_esq: [500, 274], g_fogo: [541, 254], t_rede: [574, 236],
  t_estoque: [601, 205], n_ovo: [454, 249], n_eco: [521, 211],
  g_esp: [267, 154], t_atalho: [238, 125], n_desp: [291, 187], n_zelo: [314, 220],
  r_casca: [342, 198], r_xp: [327, 160], r_essin: [308, 124],
  k_bala: [435, 204], k_prata: [454, 166], k_cortadeira: [490, 155], k_mel: [522, 135],
  k_matabele: [558, 132], r_regen: [493, 194], r_ess: [473, 115],
  k_arpao: [344, 99], k_acrobata: [372, 66], k_cefalote: [412, 77], k_tecela: [444, 70],
  k_dinoponera: [405, 122], r_ren: [385, 165],
};
export const TREE_NODES = META_NODES.map(n => ({ ...n, ...at(...SLOTS[n.id]) }));
export const TREE_BY_ID = new Map(TREE_NODES.map(n => [n.id, n]));
// Frutos naturais, alternados nos galhos, não mais em uma fila na copa.
const FRUIT_SLOTS = [[92, 382], [708, 324], [99, 259], [675, 203], [190, 132], [603, 100], [388, 30]];
const FRUIT_POSITIONS = FRUIT_SLOTS.map(p => at(...p));
export function fruitCenter(i) { return FRUIT_POSITIONS[i]; }

// Regiões orgânicas da cor (coordenadas da imagem, não da interface).
// Raízes/tronco baixo pertencem ao galho inicial; a copa pertence ao sétimo.
export const TREE_COLOR_REGIONS = [
  [[201, 385], [373, 550], [374, 626]],
  [[540, 360], [660, 330], [410, 407]],
  [[172, 260], [326, 307]],
  [[562, 234], [449, 280]],
  [[265, 143], [314, 204]],
  [[527, 142], [448, 198]],
  [[392, 65], [388, 147]],
];
export const TREE_STAGE_NODES = Array.from({ length: 7 }, (_, i) => TREE_NODES.filter(n => n.stage === i + 1));
export const TREE_STAGE_BOUNDS = TREE_STAGE_NODES.map((nodes, i) => {
  // A raiz é o elo entre gerações, não deve afastar a câmera do primeiro galho.
  const points = [...nodes.filter(n => n.id !== "raiz"), fruitCenter(i)];
  const xs = points.map(n => n.x), ys = points.map(n => n.y);
  return { minX: Math.min(...xs) - 120, maxX: Math.max(...xs) + 120,
    minY: Math.min(...ys) - 160, maxY: Math.max(...ys) + 160 };
});

// Miniárvores mantêm coordenadas de grade LOCAIS e todos os IDs antigos.
export function fruitGridSlot(i) { return { x: i === 9 ? 1 : i % 3, y: Math.floor(i / 3) }; }
export function fruitNodePos(fi, ni) {
  const legacyCount = FRUIT_TREES[fi].legacyNodes.length;
  return fruitGridSlot(ni < legacyCount ? ni : ni - legacyCount);
}
export const TREE_FRUITS = FRUIT_TREES.flatMap((f, fi) => f.nodes.map((n, ni) => ({
  ...n, ...fruitNodePos(fi, ni), _fruitIdx: fi, _nodeIdx: ni, _fruit: f,
})));
export const TREE_ALL = [...TREE_NODES, ...TREE_FRUITS];
