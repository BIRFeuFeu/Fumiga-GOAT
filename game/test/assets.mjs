// Teste de integridade de sprites: TODO nome de imagem usado pelo jogo
// (props de bioma, unidades, inimigos, chefes, ícones) precisa existir no
// MANIFEST de js/assets.js. Uso: node test/assets.mjs
//
// Regressão que motivou este teste: os cactos do DESERTO CALCINADO existiam em
// assets/sprites/props/ e eram citados por config.js/world.js, mas faltavam no
// MANIFEST — o mapa 4 quebrava no render (IMG[p.img] === undefined).
const grad = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => grad;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {}, createElementNS() { return { getContext: makeCtx }; },
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { if (this.onload) setTimeout(() => this.onload(), 0); }
};

const { loadAll, IMG } = await import("../js/assets.js");
const { MAPS, UNITS, ENEMIES, MUTATIONS, META_NODES, CHAMBERS } = await import("../js/config.js");
const { genWorld, world } = await import("../js/world.js");
const { bossAnimSheets } = await import("../js/render.js");
const { FONT_CHARS, FONT } = await import("../js/font.js");
const fs = await import("node:fs");
const path = await import("node:path");
const { fileURLToPath } = await import("node:url");
// caminhos relativos ao arquivo (não ao diretório de onde o teste é chamado)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await loadAll();
const have = (k) => !!IMG[k];
const problems = [];
const check = (scope, keys) => {
  const miss = [...new Set(keys)].filter((k) => k && !have(k));
  console.log((miss.length ? "ERRO " : "ok   ") + scope + " (" + [...new Set(keys)].filter(Boolean).length + " sprites)");
  if (miss.length) problems.push(scope + ": " + miss.join(", "));
};

// ------------------------------------------------------------- estáticos ----
check("formigas aliadas", Object.keys(UNITS).filter((u) => u !== "gatherer"));
check("formigas inimigas", Object.values(ENEMIES).map((e) => e.sprite));
check("chefes (sheets direcionais)", bossAnimSheets());
check("ícones de mutação", MUTATIONS.map((m) => "i_" + m.icon));
check("ícones da árvore", META_NODES.map((n) => "i_" + n.icon));
check("ícones das câmaras", Object.values(CHAMBERS).map((c) => "i_" + c.icon));
check("formigueiro", ["nest", "nest_d1", "nest_d2"]);

// ------------------------------------------------ props gerados no mundo ----
const perBiome = MAPS.map(() => new Set());
const SEEDS = [1, 2, 3, 7, 42, 1234, 99999];
for (let m = 0; m < MAPS.length; m++) {
  for (const seed of SEEDS) {
    genWorld(seed, m);
    for (const p of world.props) perBiome[m].add(p.img);
    for (const n of world.nodes) perBiome[m].add(n.img);
  }
}
MAPS.forEach((def, m) => check("props do mapa " + (m + 1) + " — " + def.name, [...perBiome[m]]));

// props citados no config que nunca aparecem (aviso, não falha)
const cited = new Set();
for (const def of MAPS) for (const list of Object.values(def.props)) for (const k of list) cited.add(k);
const unused = [...cited].filter((k) => !perBiome.some((s) => s.has(k)));
if (unused.length) console.log("aviso  props citados no config e não sorteados nos seeds testados: " + unused.join(", "));

// ------------------------------------------------ glifos x textos do jogo ----
// Todo caractere usado nos textos precisa existir no atlas, senão drawText
// desenha "?" no lugar (foi o caso de "—", "•" e "⏵").
const missing = new Map();
const jsDir = path.join(ROOT, "js");
for (const file of fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(jsDir, file), "utf8");
  for (const m of src.matchAll(/"([^"\\\n]*)"/g)) {
    const s = m[1];
    if (!/[A-Za-zÀ-ÿ]{3}/.test(s) || !/ /.test(s)) continue; // só texto visível
    if (/px|https?:|\.png|\.js|monospace/.test(s)) continue; // ruído de código
    for (const ch of s.toUpperCase()) {
      if (ch === " ") continue;
      if (!FONT_CHARS.includes(ch)) missing.set(ch, s.trim());
    }
  }
}
const bad = [...missing.entries()];
console.log((bad.length ? "ERRO " : "ok   ") + "glifos x textos (" + FONT_CHARS.length + " glifos no atlas)");
if (bad.length) problems.push("caracteres sem glifo: " + bad.map(([c, s]) => `${c} em "${s}"`).join(" | "));

// o atlas precisa ter células suficientes para todos os glifos
const rowsNeeded = Math.ceil(FONT_CHARS.length / 12);
const atlasBad = [];
for (const [k, f] of Object.entries(FONT)) {
  const buf = fs.readFileSync(path.join(ROOT, f.src));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const okAtlas = w === 12 * f.cw && h >= rowsNeeded * f.ch;
  console.log(`     atlas ${k}: ${w}x${h}px — 12 colunas de ${f.cw}px, ${rowsNeeded} linhas de ${f.ch}px`);
  if (!okAtlas) atlasBad.push(`${k} (${w}x${h})`);
}
console.log((atlasBad.length ? "ERRO " : "ok   ") + "atlas com células para todos os glifos");
if (atlasBad.length) problems.push("atlas pequeno/envelhecido: " + atlasBad.join(", ") + " — rode tools/prepare_assets.sh");

console.log(problems.length ? "PROBLEMAS: " + problems.join(" | ") : "TESTE DE ASSETS PASSOU");
process.exit(problems.length ? 2 : 0);
