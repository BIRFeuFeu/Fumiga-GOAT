// ============================================================================
// FUMIGA — mundo: geração procedural POR BIOMA, terreno assado, recursos,
// colisões. Cada mapa tem paleta e conjunto de adereços próprios (config.MAPS)
// ============================================================================
import { WORLD_W, WORLD_H, PAL, MAPS } from "./config.js";
import { mulberry32, rand, TAU, clamp } from "./utils.js";
import { SpatialGrid } from "./utils.js";
import { IMG } from "./assets.js";
import { G } from "./state.js";

export const world = {
  seed: 0,
  mapIdx: 0,
  def: null,        // definição do bioma ativo (config.MAPS[i])
  // A BOCA do formigueiro é a porta da colônia: o buraco central do sprite
  // (desenhado em A.y + 8 — ver drawNest). Toda formiga entra e sai por aqui.
  anthill: {
    x: WORLD_W / 2, y: WORLD_H / 2, r: 96,
    door: { x: WORLD_W / 2, y: WORLD_H / 2 + 8, r: 26 },
  },
  props: [],        // {x,y,img,scale,shadowR,collR,flip,tint}
  statics: null,    // grade espacial de colisores
  piles: [],        // {kind:'food', x,y, amount,max,r, sprite}
  nodes: [],        // {kind:'essence'|'amber', x,y, amount,max,r, img, glowT}
  gates: [],        // {x,y, name}
  ground: null,     // canvas (metade da resolução)
  mini: null,       // minimapa assado
  time: 0,
};

let biome = MAPS[0];

// ------------------------------------------------------------------- gera ---
export function genWorld(seed, mapIdx = 0) {
  world.seed = seed;
  world.mapIdx = mapIdx;
  biome = MAPS[Math.min(mapIdx, MAPS.length - 1)];
  world.def = biome;
  const rng = mulberry32(seed + mapIdx * 977);
  world.props = [];
  world.piles = [];
  world.nodes = [];
  world.time = 0;

  const A = world.anthill;
  A.x = WORLD_W / 2; A.y = WORLD_H / 2;
  A.door.x = A.x; A.door.y = A.y + 8;      // a boca acompanha o ninho
  const distA = (x, y) => Math.hypot(x - A.x, y - A.y);
  const margin = 90;
  // MEGA LORE: Eras - mundo muda por Era (mais trilhas, seda, portas)
  const era = (G.save && G.save.era) ? G.save.era : 0;

  const taken = []; // pontos ocupados (espalhamento)
  function free(x, y, minD) {
    for (const p of taken) if (Math.hypot(p.x - x, p.y - y) < minD) return false;
    return true;
  }
  function place(x, y, minD) { taken.push({ x, y, minD }); }

  // ------------------------------------------------------------- portões ---
  world.gates = [
    { x: 180, y: 200, name: "N" }, { x: WORLD_W - 180, y: 200, name: "N" },
    { x: 180, y: WORLD_H - 200, name: "S" }, { x: WORLD_W - 180, y: WORLD_H - 200, name: "S" },
    { x: WORLD_W / 2, y: 120, name: "N" }, { x: WORLD_W / 2, y: WORLD_H - 120, name: "S" },
  ];

  const BP = biome.props;

  // ------------------------------------------------------------ clusters ---
  const clusters = 13;
  for (let c = 0; c < clusters; c++) {
    let cx = 0, cy = 0, tries = 0;
    do {
      cx = margin + rng() * (WORLD_W - margin * 2);
      cy = margin + rng() * (WORLD_H - margin * 2);
      tries++;
    } while (tries < 40 && (distA(cx, cy) < 520 || !free(cx, cy, 330)));
    place(cx, cy, 330);
    const n = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const x = clamp(cx + (rng() - 0.5) * 260, margin, WORLD_W - margin);
      const y = clamp(cy + (rng() - 0.5) * 260, margin, WORLD_H - margin);
      if (distA(x, y) < 400) continue;
      const key = BP.trees[(rng() * BP.trees.length) | 0];
      addProp(x, y, key, 1.05 + rng() * 0.45, 15, rng() < 0.5);
    }
  }
  // árvores frutíferas/aninhadas perto das pilhas de comida
  for (let i = 0; i < 9; i++) addFruitTreeSpot(rng);

  // ---------------------------------------------------------------- pedras --
  for (let i = 0; i < 42; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 330 || !free(x, y, 60)) continue;
    place(x, y, 60);
    addProp(x, y, BP.rocks[(rng() * BP.rocks.length) | 0], 0.8 + rng() * 0.8, 12, rng() < 0.5);
  }

  // --------------------------------------------------------------- arbustos -
  for (let i = 0; i < 66; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 240) continue;
    addProp(x, y, BP.bushes[(rng() * BP.bushes.length) | 0], 0.9 + rng() * 0.5, 0, rng() < 0.5);
  }
  for (let i = 0; i < 80; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 200) continue;
    addProp(x, y, BP.decos[(rng() * BP.decos.length) | 0], 0.65 + rng() * 0.5, 0, rng() < 0.5);
  }

  // ------------------------------------------------- pilhas de comida ------
  const pileSpots = [];
  // 3 próximas (aprendizado)
  for (let i = 0; i < 3; i++) {
    const a = rng() * TAU, d = 300 + rng() * 160;
    pileSpots.push({ x: A.x + Math.cos(a) * d, y: A.y + Math.sin(a) * d, near: true });
  }
  for (let i = 0; i < 14; i++) {
    const x = 160 + rng() * (WORLD_W - 320);
    const y = 160 + rng() * (WORLD_H - 320);
    // comida dentro do formigueiro é comida que ninguém alcança: a colisão do
    // formigueiro (raio 70) barra a aproximação e a operária ficava presa no
    // "goto" para sempre. 320px de folga mantém a pilha fora do sprite e do
    // caminho de entrada.
    if (distA(x, y) < 320) continue;
    pileSpots.push({ x, y, near: distA(x, y) < 700 });
  }
  for (const s of pileSpots) {
    const x = clamp(s.x, 120, WORLD_W - 120), y = clamp(s.y, 120, WORLD_H - 120);
    if (world.piles.some(p => Math.hypot(p.x - x, p.y - y) < 190)) continue;
    const amount = s.near ? 60 + rng() * 50 : 90 + (distA(x, y) / 14) + rng() * 60;
    const pile = { kind: "food", x, y, amount: Math.round(amount), max: 0, r: 30, sprite: null, seed: rng() * 1000 };
    pile.max = pile.amount;
    pile.sprite = bakePileSprite(rng);
    world.piles.push(pile);
    if (rng() < 0.7) addProp(x + (rng() - 0.5) * 90, y + (rng() - 0.5) * 60,
      biome.id === "deserto" ? "cactus2" : "bush_orange1", 0.9 + rng() * 0.4, 0, rng() < 0.5);
  }

  // ------------------------------------------------------ nós de essência ---
  const nodeCount = 7;
  for (let i = 0; i < nodeCount; i++) {
    let x = 0, y = 0, tries = 0;
    do {
      x = 180 + rng() * (WORLD_W - 360); y = 180 + rng() * (WORLD_H - 360);
      tries++;
    } while (tries < 30 && (distA(x, y) < 380 || world.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 420)));
    const violet = rng() < 0.3;
    const node = {
      kind: "essence", x, y,
      amount: violet ? 55 : 38, max: violet ? 55 : 38, r: 26,
      img: violet ? "crys_violet1" : (rng() < 0.5 ? "crys_blue1" : "crys_blue2"),
      glowT: rng() * TAU,
    };
    world.nodes.push(node);
    addCrystal(node, rng);
  }
  // âmbar (comida rara e rica) nos cantos
  for (let i = 0; i < 2; i++) {
    const corner = world.gates[(rng() * world.gates.length) | 0];
    const x = clamp(corner.x + (rng() - 0.5) * 500, 140, WORLD_W - 140);
    const y = clamp(corner.y + (rng() - 0.5) * 500, 140, WORLD_H - 140);
    const node = { kind: "amber", x, y, amount: 220, max: 220, r: 28, img: "crys_yellow1", glowT: rng() * TAU };
    world.nodes.push(node);
    addCrystal(node, rng);
  }
  // cristais decorativos do bioma
  for (let i = 0; i < 12; i++) {
    const x = margin + rng() * (WORLD_W - margin * 2);
    const y = margin + rng() * (WORLD_H - margin * 2);
    if (distA(x, y) < 260) continue;
    addProp(x, y, BP.crys[(rng() * BP.crys.length) | 0], 0.7 + rng() * 0.5, 10, rng() < 0.5);
  }

  clearResourcesFromAnthill();
  buildStatics();
  bakeGround(rng);
  bakeMinimap();
}

/**
 * Rede de segurança do genWorld: recurso nenhum pode ficar na área do
 * formigueiro (nem no sprite, nem na faixa onde a colisão impede a formiga de
 * chegar). Quem estiver lá é empurrado radialmente para a borda da área — a
 * comida continua existindo, só sai de dentro da parede.
 */
export function clearResourcesFromAnthill() {
  const A = world.anthill;
  const SAFE = 190;                 // collR 70 + folga para a formiga trabalhar
  for (const t of [...world.piles, ...world.nodes]) {
    const dx = t.x - A.x, dy = t.y - A.y;
    const d = Math.hypot(dx, dy);
    if (d >= SAFE) continue;
    const a = d < 0.001 ? (Math.random() * TAU) : Math.atan2(dy, dx);
    t.x = A.x + Math.cos(a) * SAFE;
    t.y = A.y + Math.sin(a) * SAFE;
    t.moved = true;
  }
}

function addCrystal(node, rng) {
  world.props.push({ x: node.x, y: node.y, img: node.img, scale: node.kind === "amber" ? 1.3 : 1.15, collR: 14, flip: rng() < 0.5, noShadow: true, shR: 14, node });
}

function addProp(x, y, img, scale, collR, flip, noShadow) {
  world.props.push({ x, y, img, scale, collR, flip: !!flip, noShadow: !!noShadow, shR: collR });
}

function addFruitTreeSpot(rng) {
  const A = world.anthill;
  const BP = biome.props;
  let x = 0, y = 0, tries = 0;
  do {
    x = 200 + rng() * (WORLD_W - 400); y = 200 + rng() * (WORLD_H - 400);
    tries++;
  } while (tries < 30 && Math.hypot(x - A.x, y - A.y) < 480);
  const tkey = BP.trees[(rng() * BP.trees.length) | 0];
  addProp(x, y, tkey, 1.0 + rng() * 0.3, 15, rng() < 0.5);
  // canteiro embaixo da árvore
  const pile = { kind: "food", x: x + (rng() - 0.5) * 60, y: y + 30 + rng() * 20, amount: 80 + rng() * 40, max: 0, r: 30, sprite: null, seed: rng() * 1000 };
  pile.max = pile.amount;
  pile.sprite = bakePileSprite(rng);
  world.piles.push(pile);
}

// ------------------------------------------------------------ colisões ------
function buildStatics() {
  world.statics = new SpatialGrid(96);
  for (const p of world.props) {
    if (p.collR > 0) {
      const cells = Math.ceil(p.collR / 96) + 1;
      const cx = (p.x / 96) | 0, cy = (p.y / 96) | 0;
      for (let i = -cells; i <= cells; i++) for (let j = -cells; j <= cells; j++) {
        const key = (cx + i) * 100000 + (cy + j);
        let arr = world.statics.map.get(key);
        if (!arr) { arr = []; world.statics.map.set(key, arr); }
        arr.push(p);
      }
    }
  }
  // formigueiro: a COLINA é caminhável (as formigas descem a cratera até a
  // boca), mas o buraco central é sólido — ninguém fica parado dentro dele.
  // A boca (world.anthill.door) é a porta por onde a colônia entra e sai.
  const A = world.anthill;
  world.statics.insert({ x: A.door.x, y: A.door.y, collR: 20 });
  // portais não colidem
}

/** Remove adereços colidíveis num raio (chefes esmagam árvores/pedras pelo caminho). */
export function smashProps(cx, cy, r) {
  const hit = [];
  for (let i = world.props.length - 1; i >= 0; i--) {
    const p = world.props[i];
    if (!p.collR || p.node) continue; // cristais de recurso são firmes
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < r + p.collR) {
      hit.push(p);
      world.props.splice(i, 1);
    }
  }
  if (hit.length) buildStatics();
  return hit;
}

/** Empurra (x,y,r) para fora dos obstáculos; retorna {x,y}. */
export function collide(x, y, r) {
  if (x < 26) x = 26; else if (x > WORLD_W - 26) x = WORLD_W - 26;
  if (y < 26) y = 26; else if (y > WORLD_H - 26) y = WORLD_H - 26;
  world.statics.around(x, y, (s) => {
    if (!s.collR) return;
    const dx = x - s.x, dy = y - s.y;
    const rr = r + s.collR;
    const d2 = dx * dx + dy * dy;
    if (d2 > 0.001 && d2 < rr * rr) {
      const d = Math.sqrt(d2);
      x = s.x + (dx / d) * rr;
      y = s.y + (dy / d) * rr;
    }
  });
  return { x, y };
}

// ------------------------------------------------------- sprites de pilha ---
function bakePileSprite(rng) {
  const cv = document.createElement("canvas");
  cv.width = 56; cv.height = 40;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  // monte de terra
  c.fillStyle = "#4a3226";
  c.beginPath(); c.ellipse(28, 30, 22, 9, 0, 0, TAU); c.fill();
  c.fillStyle = "#33221a";
  c.beginPath(); c.ellipse(28, 32, 15, 6, 0, 0, TAU); c.fill();
  // frutinhas / sementes
  const cols = ["#ff7a3d", "#ffb347", "#e84545", "#d94f6a"];
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, d = rng() * 14;
    const px = 28 + Math.cos(a) * d, py = 28 - 2 + Math.sin(a) * d * 0.45;
    const r2 = 2.5 + rng() * 2.5;
    c.fillStyle = cols[(rng() * cols.length) | 0];
    c.fillRect(px - r2 / 2, py - r2 / 2, r2, r2);
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.fillRect(px - r2 / 2, py - r2 / 2, 1.5, 1.5);
  }
  // folha
  c.fillStyle = "#4e9a51";
  c.fillRect(20, 22, 5, 2); c.fillRect(33, 20, 4, 2);
  return cv;
}

// ----------------------------------------------------------- chão assado ----
function bakeGround(rng) {
  const G2 = biome.ground;
  const cv = document.createElement("canvas");
  const S = 0.5; // metade da resolução
  cv.width = WORLD_W * S; cv.height = WORLD_H * S;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // base: gradiente vertical sutil de sombra
  const grad = c.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, G2.top);
  grad.addColorStop(0.5, G2.mid);
  grad.addColorStop(1, G2.bot);
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // manchas grandes de solo
  for (let i = 0; i < 240; i++) {
    const x = rng() * W, y = rng() * H, r = 20 + rng() * 90;
    c.fillStyle = G2.soils[(rng() * G2.soils.length) | 0];
    c.globalAlpha = 0.16 + rng() * 0.22;
    c.beginPath(); c.ellipse(x, y, r, r * (0.5 + rng() * 0.6), rng() * TAU, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;

  // clareiras musgosas (acento estilo Dead Cells)
  for (let i = 0; i < 90; i++) {
    const x = rng() * W, y = rng() * H, r = 14 + rng() * 46;
    c.fillStyle = G2.moss[(rng() * G2.moss.length) | 0];
    c.globalAlpha = 0.14 + rng() * 0.16;
    c.beginPath(); c.ellipse(x, y, r, r * 0.6, rng() * TAU, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;

  // faixas de feromônio batidas (caminhos de formiga) do formigueiro
  const A = world.anthill;
  c.strokeStyle = G2.trail;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + rng();
    c.globalAlpha = 0.5;
    c.lineWidth = 6 + rng() * 8;
    c.beginPath();
    c.moveTo(A.x * S, A.y * S);
    const mx = (A.x + Math.cos(a) * 700) * S, my = (A.y + Math.sin(a) * 700) * S;
    const ex = (A.x + Math.cos(a) * 1500) * S, ey = (A.y + Math.sin(a) * 1500) * S;
    c.quadraticCurveTo(mx + (rng() - 0.5) * 300, my + (rng() - 0.5) * 300, ex, ey);
    c.stroke();
  }
  c.globalAlpha = 1;

  // cratera suja em volta do formigueiro
  const ax = A.x * S, ay = A.y * S;
  const cr = c.createRadialGradient(ax, ay, 10, ax, ay, 170 * S);
  cr.addColorStop(0, shade(G2.trail, 0.0));
  cr.addColorStop(0.6, G2.trail + "");
  cr.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = cr;
  c.beginPath(); c.arc(ax, ay, 170 * S, 0, TAU); c.fill();
  for (let i = 0; i < 26; i++) {
    const a = rng() * TAU, d = (110 + rng() * 80) * S;
    c.fillStyle = G2.soils[(rng() * G2.soils.length) | 0];
    c.globalAlpha = 0.5;
    c.fillRect(ax + Math.cos(a) * d - 1.5, ay + Math.sin(a) * d - 1.5, 3 + rng() * 3, 2 + rng() * 2);
  }
  c.globalAlpha = 1;

  // grãos de solo (speckle)
  for (let i = 0; i < 11000; i++) {
    c.fillStyle = G2.speck[(rng() * G2.speck.length) | 0];
    c.globalAlpha = 0.25 + rng() * 0.45;
    const sz = rng() < 0.85 ? 1 : 2;
    c.fillRect(rng() * W, rng() * H, sz, sz);
  }
  c.globalAlpha = 1;

  // tufozinhos + flores de pixel (vida no bioma)
  for (let i = 0; i < 700; i++) {
    const x = rng() * W, y = rng() * H;
    c.fillStyle = G2.tuft[(rng() * G2.tuft.length) | 0];
    c.globalAlpha = 0.5 + rng() * 0.4;
    c.fillRect(x, y, 1, 2);
    c.fillRect(x + 2, y, 1, 2);
    c.fillRect(x + 1, y - 1, 1, 2);
    if (rng() < 0.13) {
      c.fillStyle = G2.flowers[(rng() * G2.flowers.length) | 0];
      c.fillRect(x + 1, y - 3, 2, 2);
    }
  }
  c.globalAlpha = 1;

  // sombras assadas: coladas no pé de cada elemento (nada mais "flutuando")
  for (const p of world.props) {
    if (p.noShadow || !p.collR) continue;
    c.fillStyle = "#0c0912";
    c.globalAlpha = 0.36;
    c.beginPath();
    c.ellipse(p.x * S + 2 * S * p.scale, p.y * S + 4 * S * p.scale,
      p.collR * 1.5 * S * p.scale, p.collR * 0.78 * S * p.scale, 0, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;

  // ------------------------------------------------ estilo próprio do bioma -
  groundFlourish(c, W, H, S, rng);

  // borda externa do mapa mais escura (escuridão além da colônia)
  c.globalAlpha = 0.5;
  c.strokeStyle = "#0a0810";
  c.lineWidth = 70 * S;
  c.strokeRect(0, 0, W, H);
  c.globalAlpha = 1;

  world.ground = cv;
}

// Enfeites de chão distintos por bioma (estilo pintado de Dead Cells)
function groundFlourish(c, W, H, S, rng) {
  const id = biome.id;
  switch (id) {
    case "planicie": {
      // manchas de cascalho clarinho + maciços de trevo
      for (let i = 0; i < 40; i++) {
        const x = rng() * W, y = rng() * H, r = (10 + rng() * 26);
        c.fillStyle = "rgba(200,220,160,0.10)";
        c.beginPath(); c.ellipse(x, y, r, r * 0.5, rng() * TAU, 0, TAU); c.fill();
      }
      for (let i = 0; i < 90; i++) {
        const x = rng() * W, y = rng() * H;
        c.fillStyle = ["#4f9550", "#5ca85a"][(rng() * 2) | 0];
        c.globalAlpha = 0.75;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * TAU + rng();
          c.fillRect(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 2, 2);
        }
        if (rng() < 0.3) { c.fillStyle = "#fff2c8"; c.fillRect(x, y - 3, 1, 1); }
      }
      c.globalAlpha = 1;
      break;
    }
    case "floresta": {
      // raízes escuras serpenteando + musgo profundo
      c.globalAlpha = 0.5;
      for (let i = 0; i < 60; i++) {
        const x = rng() * W, y = rng() * H;
        c.strokeStyle = "#12241a";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + rand(-50, 50), y + rand(-30, 30), x + rand(-90, 90), y + rand(-40, 40));
        c.stroke();
      }
      c.globalAlpha = 1;
      break;
    }
    case "pantano": {
      // poças de água parada com filete de luz + vitórias-régias
      for (let i = 0; i < 26; i++) {
        const x = rng() * W, y = rng() * H, r = (14 + rng() * 34);
        c.fillStyle = "rgba(90,184,190,0.16)";
        c.beginPath(); c.ellipse(x, y, r, r * 0.6, rng() * TAU, 0, TAU); c.fill();
        c.strokeStyle = "rgba(150,235,225,0.22)";
        c.lineWidth = 1.5;
        c.beginPath(); c.ellipse(x, y, r, r * 0.6, rng() * TAU, 0, TAU); c.stroke();
      }
      for (let i = 0; i < 60; i++) {
        const x = rng() * W, y = rng() * H;
        c.fillStyle = "#3f8a5c";
        c.globalAlpha = 0.8;
        c.fillRect(x, y, 4, 2); c.fillRect(x + 1, y - 1, 2, 1);
      }
      c.globalAlpha = 1;
      break;
    }
    case "deserto": {
      // incisões de vento + riachos de dunas
      c.globalAlpha = 0.35;
      c.strokeStyle = "#2b1f10";
      for (let i = 0; i < 120; i++) {
        const x = rng() * W, y = rng() * H, len = 20 + rng() * 60;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + len, y + len * 0.15);
        c.stroke();
        c.strokeStyle = "#6b5330";
        c.beginPath();
        c.moveTo(x, y + 2);
        c.lineTo(x + len * 0.6, y + 2 + len * 0.09);
        c.stroke();
        c.strokeStyle = "#2b1f10";
      }
      c.globalAlpha = 1;
      // fendas de solo ressecado
      c.strokeStyle = "#241a0c";
      c.globalAlpha = 0.55;
      for (let i = 0; i < 40; i++) {
        const x = rng() * W, y = rng() * H;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + rand(-14, 14), y + rand(-14, 14));
        c.lineTo(x + rand(-22, 22), y + rand(-22, 22));
        c.stroke();
      }
      c.globalAlpha = 1;
      break;
    }
    case "outono": {
      // tapetes de folhas caídas
      const cols = ["#c07a33", "#b06a2e", "#d88a3d", "#8a5628", "#e09a4a"];
      for (let i = 0; i < 130; i++) {
        const x = rng() * W, y = rng() * H, r = (8 + rng() * 22);
        c.fillStyle = cols[(rng() * cols.length) | 0];
        c.globalAlpha = 0.16 + rng() * 0.2;
        c.beginPath(); c.ellipse(x, y, r, r * 0.5, rng() * TAU, 0, TAU); c.fill();
      }
      c.globalAlpha = 0.75;
      for (let i = 0; i < 900; i++) {
        c.fillStyle = cols[(rng() * cols.length) | 0];
        c.fillRect(rng() * W, rng() * H, 2, 2);
      }
      c.globalAlpha = 1;
      break;
    }
    case "gelo": {
      // montes de neve amontoada + rachaduras de gelo azulado
      for (let i = 0; i < 90; i++) {
        const x = rng() * W, y = rng() * H, r = (12 + rng() * 30);
        c.fillStyle = "rgba(200,220,245,0.18)";
        c.beginPath(); c.ellipse(x, y, r, r * 0.45, rng() * TAU, 0, TAU); c.fill();
        c.strokeStyle = "rgba(235,245,255,0.25)";
        c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, y, r, r * 0.45, rng() * TAU, -0.4, 1.1); c.stroke();
      }
      c.strokeStyle = "#9fc4e8";
      c.globalAlpha = 0.5;
      for (let i = 0; i < 50; i++) {
        const x = rng() * W, y = rng() * H;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + rand(-20, 20), y + rand(-20, 20));
        c.lineTo(x + rand(-32, 32), y + rand(-32, 32));
        c.stroke();
      }
      c.globalAlpha = 1;
      break;
    }
  }
}

function shade(hex, t) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
  const f = 1 - 0.35 * (1 - t);
  return `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`;
}

// ------------------------------------------------------------- minimapa -----
export const MINI = { w: 180, h: 135 };

function bakeMinimap() {
  const cv = document.createElement("canvas");
  cv.width = MINI.w; cv.height = MINI.h;
  const c = cv.getContext("2d");
  const sx = MINI.w / WORLD_W, sy = MINI.h / WORLD_H;
  c.fillStyle = "#171221"; c.fillRect(0, 0, MINI.w, MINI.h);
  for (const p of world.props) {
    if (/tree|cactus/.test(p.img)) { c.fillStyle = "rgba(90,167,92,0.8)"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
    else if (/rock/.test(p.img)) { c.fillStyle = "rgba(150,140,160,0.6)"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
    else if (/crys_blue|crys_violet/.test(p.img)) { c.fillStyle = "#8f7bd6"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
  }
  for (const p of world.piles) { c.fillStyle = "#ffb347"; c.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
  world.mini = cv;
}

// ------------------------------------------------------------- utilidades ---
export function nearestPile(x, y, onlyKind = "food") {
  let best = null, bd = Infinity;
  for (const p of world.piles) {
    if (p.amount <= 0 || p.kind !== onlyKind) continue;
    if (p.blocked) continue;
    if (Math.hypot(p.x - world.anthill.x, p.y - world.anthill.y) < 150) continue; // dentro da parede
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

export function nearestNode(x, y, kind) {
  let best = null, bd = Infinity;
  for (const n of world.nodes) {
    if (n.amount <= 0 || n.kind !== kind) continue;
    if (n.blocked) continue;
    if (Math.hypot(n.x - world.anthill.x, n.y - world.anthill.y) < 150) continue; // dentro da parede
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function randGate() { return world.gates[(Math.random() * world.gates.length) | 0]; }
