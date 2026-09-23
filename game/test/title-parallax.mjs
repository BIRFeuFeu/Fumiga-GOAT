// Regressão do TITLE: executa as chamadas reais do render com os PNGs reais,
// sem navegador. Mede deslocamento 3x, cobertura, cache 1:1 e vínculo dos FX.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');
const files = {
  sky: 'layer4_sky_sunset_moon.png',
  mountains: 'layer3_mountains_silhouette.png',
  main: 'layer2_main_grass_ruins_anthill.png',
  foreground: 'layer1_foreground_vines.png',
};
const IMG = {};
for (const [key, file] of Object.entries(files)) {
  const png = fs.readFileSync(new URL('../assets/parallax/menu/' + file, import.meta.url));
  IMG['parallax_' + key] = { key, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const bakes = [];
const document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    const canvas = { width: 0, height: 0, blits: [] };
    canvas.getContext = () => ({
      save() {}, restore() {}, translate() {}, scale() {},
      drawImage(...args) { canvas.blits.push(args); },
    });
    bakes.push(canvas);
    return canvas;
  },
};
const draws = [], glows = [], arcs = [], shadows = [];
const noop = () => {};
const ctx = new Proxy({
  drawImage: (...args) => draws.push(args),
  createRadialGradient: (...args) => { glows.push(args); return { addColorStop: noop }; },
  arc: (x, y, r) => arcs.push({ x, y, r }),
  ellipse: (x, y) => shadows.push({ x, y }),
}, { get: (target, prop) => prop in target ? target[prop] : noop });
const env = {
  IMG, ctx, document, G: { time: 0, screen: 'TITLE' }, mouse: { x: 0, y: 0 },
  VIEW_W: 960, VIEW_H: 540, TAU: Math.PI * 2, dayPhase: 0, ensureMotes: noop,
  titleMotes: [], titlePollen: [], titleSnow: [], titleFireflies: [], titleEssence: [], titleAnts: [],
};
vm.createContext(env);
// Declarações e helper de bordas; encerra a função antes dos overlays de dia/noite.
const head = source.slice(source.indexOf('const TITLE_SIDE_PAD ='), source.indexOf('function ensureMotes()'));
const start = source.indexOf('export function drawTitleBg(ctx)');
const end = source.indexOf('    // FASE 1 FINAL - ciclo dia/noite', start);
assert(start >= 0 && end > start, 'localizou o desenho TITLE');
vm.runInContext(head + source.slice(start, end).replace('export ', '') + '}}', env);

function frame(x, y, time) {
  env.mouse.x = x; env.mouse.y = y; env.G.time = time;
  draws.length = 0; glows.length = 0;
  vm.runInContext('drawTitleBg(ctx)', env);
  assert.equal(draws.length, 4, 'quatro camadas, uma chamada cada');
  return { layers: draws.map(([img, dx, dy, ...scale]) => ({ img, dx, dy, scale })), glow: glows[0] };
}
function near(actual, expected, message) {
  assert(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
}

const center = frame(480, 270, 0);
const far = frame(960, 540, 0);
const names = Object.keys(files);
// A movimentação manual (horizontal e vertical) é TRIPLA em todas as camadas.
for (let i = 0; i < names.length; i++) {
  near(far.layers[i].dx - center.layers[i].dx, [14.4, 43.2, 115.2, 216][i], names[i] + ' X 3x');
  near(far.layers[i].dy - center.layers[i].dy, [4.05, 8.1, 20.25, 32.4][i], names[i] + ' Y 3x');
  near(far.layers[i].scale.length, 0, names[i] + ' render 1:1');
}
near(far.glow[0] - center.glow[0], far.layers[2].dx - center.layers[2].dx, 'luz acompanha formigueiro X');
near(far.glow[1] - center.glow[1], far.layers[2].dy - center.layers[2].dy, 'luz acompanha formigueiro Y');
assert.equal(bakes.length, 3, 'montanhas, principal e frente assados uma única vez');
assert.deepEqual([bakes[0].width, bakes[0].height], [IMG.parallax_mountains.width, IMG.parallax_mountains.height + 208]);
assert.deepEqual([bakes[1].width, bakes[1].height], [IMG.parallax_main.width, IMG.parallax_main.height + 12]);
assert.deepEqual([bakes[2].width, bakes[2].height], [IMG.parallax_foreground.width + 144, IMG.parallax_foreground.height + 24]);
assert.equal(bakes[0].blits.length, 2, 'montanhas: arte + solo escuro prolongado');
assert.equal(bakes[0].blits[1][2], IMG.parallax_mountains.height - 2, 'montanhas: não usa a última linha transparente');
assert.equal(bakes[1].blits.length, 2, 'solo: arte original + extensão inferior');
assert.equal(bakes[2].blits.length, 4, 'frente: arte original + duas bordas + base');

// O movimento ocioso (não o tempo/velocidade) também tem amplitude 3x.
for (const [i, hz, amplitude] of [[0, 0.008, 18], [1, 0.012, 24], [2, 0.015, 18], [3, 0.02, 12]]) {
  const idle = frame(480, 270, Math.PI / (2 * hz));
  near(idle.layers[i].dx - center.layers[i].dx, amplitude, names[i] + ' idle 3x');
}
near(frame(480, 270, Math.PI / (2 * 0.005)).layers[0].dy - center.layers[0].dy, 6, 'céu idle Y 3x');
near(frame(480, 270, Math.PI / (2 * 0.01)).layers[1].dy - center.layers[1].dy, 9, 'montanhas idle Y 3x');
near(frame(480, 270, Math.PI / 0.012).layers[2].dy - center.layers[2].dy, -12, 'cenário idle Y 3x');

// Extremos: nenhum PNG deixa vazios nas laterais ou no rodapé.
// Verifica mais de dois ciclos de 60s e até coordenadas externas ao canvas.
for (let time = 0; time <= 1600; time += 7) {
  for (const [x, y] of [[0, 0], [960, 0], [0, 540], [960, 540], [480, 270], [-100, -100], [1060, 640]]) {
    const { layers } = frame(x, y, time);
    for (let i = 0; i < layers.length; i++) {
      const { img, dx, dy, scale } = layers[i];
      assert.equal(scale.length, 0, names[i] + ' sem resize por frame');
      assert(dx <= 0 && dx + img.width >= 960, names[i] + ' cobre ambas laterais');
      if (i === 0) assert(dy <= 0, 'céu cobre topo');
      assert(dy + img.height >= 540, names[i] + ' cobre rodapé');
    }
  }
}
assert.equal(bakes.length, 3, 'sem rebake durante animação');
near(frame(0, 0, 0).layers[0].dx, -182.4, 'mouse x=0 não vira centro');

// Os objetos ligados ao chão usam a mesma translação; os outros menus não
// herdam o offset quando se sai do TITLE.
const motionStart = source.indexOf('export function drawTitleMotes(ctx, time)');
const motionEnd = source.indexOf('// =========================================================================\n// FUNDO TÍTULO', motionStart);
assert(motionStart >= 0 && motionEnd > motionStart, 'localizou as partículas TITLE');
vm.runInContext(source.slice(motionStart, motionEnd).replace('export ', ''), env);
env.titleFireflies.push({ x: 120, y: 320, vx: 0, vy: 0, sway: 1, blinkSpeed: 1, phase: 0, alpha: 1, size: 1, col: '#fff' });
env.titleEssence.push({ x: 680, y: 360, vx: 0, vy: 0, phase: 0, alpha: 1, size: 1, col: '#fff', life: 0 });
env.titleAnts.push({ x: 100, y: 470, vx: 0, bob: 0, type: 'worker' });
frame(960, 540, 0);
arcs.length = 0; shadows.length = 0;
vm.runInContext('drawTitleMotes(ctx, 0)', env);
near(arcs[0].x, 120 + 115.2, 'vaga-lume ligado ao cenário');
near(arcs[2].x, 680 + 115.2, 'essência ligada ao formigueiro');
near(shadows[0].x, 100 + 115.2, 'formiga anda com o solo');
env.G.screen = 'MODE';
arcs.length = 0; shadows.length = 0;
vm.runInContext('drawTitleMotes(ctx, 0)', env);
near(arcs[0].x, 120, 'vaga-lume não herda parallax no MODE');
near(arcs[2].x, 680, 'essência não herda parallax no MODE');
near(shadows[0].x, 100, 'formiga não herda parallax no MODE');

console.log('TITLE PARALLAX OK — 3x X/Y e idle, quatro camadas 1:1, cobertura, FX alinhados e mobile compartilhado.');
