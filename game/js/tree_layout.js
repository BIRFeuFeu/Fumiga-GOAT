// Coordenadas exclusivamente visuais. IDs, custos e saves são independentes.
import { META_NODES, FRUIT_TREES } from './config.js';
export const TREE_NODES = META_NODES.map(n => ({ ...n,
  ...(n.id === 'raiz' ? { x: 0, y: 6 } : n.br === 'H'
    ? { x: n.x * 1.3, y: -8 - (n.y - 1.5) * 1.1 }
    : { x: n.x * 1.3 + (n.id === "k_acrobata" ? 0.5 : 0), y: n.y }),
}));
export function fruitCenter(i) { return { x: [-12, -8, -4, 0, 4, 8, 12][i], y: -14.5 }; }
// Coordenadas de grade LOCAIS: cada fruto/aba possui viewport independente.
export function fruitGridSlot(i) { return {x:i===9?1:i%3,y:Math.floor(i/3)}; }
export function fruitNodePos(fi, ni) {
  const legacyCount=FRUIT_TREES[fi].legacyNodes.length;
  return fruitGridSlot(ni < legacyCount ? ni : ni-legacyCount);
}
export const TREE_FRUITS = FRUIT_TREES.flatMap((f, fi) => f.nodes.map((n, ni) => ({ ...n, ...fruitNodePos(fi, ni), _fruitIdx: fi, _nodeIdx: ni, _fruit: f })));
export const TREE_ALL = [...TREE_NODES, ...TREE_FRUITS];
