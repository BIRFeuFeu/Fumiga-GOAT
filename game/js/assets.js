// ============================================================================
// FUMIGA-GOAT — carregamento e "baking" de sprites
// ============================================================================

const MANIFEST = {
  // névoa — manto de fog branca dos inimigos (spritesheet 6x48x48)
  fog_mantle: "sprites/fx/fog_mantle.png",
  // formigas
  worker: "sprites/ants/worker.png",
  soldier: "sprites/ants/soldier.png",
  spitter: "sprites/ants/spitter.png",
  tank: "sprites/ants/tank.png",
  queen: "sprites/ants/queen.png",
  scout: "sprites/ants/scout.png",
  healer: "sprites/ants/healer.png",
  bomber: "sprites/ants/bomber.png",
  gatherer: "sprites/ants/gatherer.png",
  trapjaw: "sprites/ants/trapjaw.png",
  weaver: "sprites/ants/weaver.png",
  e_runner: "sprites/ants/e_runner.png",
  e_swarm: "sprites/ants/e_swarm.png",
  e_warrior: "sprites/ants/e_warrior.png",
  e_spitter: "sprites/ants/e_spitter.png",
  e_reaper: "sprites/ants/e_reaper.png",
  e_matron: "sprites/ants/e_matron.png",
  e_sentinel: "sprites/ants/e_sentinel.png",
  // animais (sheets direcionais 64px)
  boar_idle: "sprites/animals/boar_idle.png",
  boar_walk: "sprites/animals/boar_walk.png",
  boar_run: "sprites/animals/boar_run.png",
  boar_attack: "sprites/animals/boar_attack.png",
  boar_hurt: "sprites/animals/boar_hurt.png",
  boar_death: "sprites/animals/boar_death.png",
  fox_idle: "sprites/animals/fox_idle.png",
  fox_walk: "sprites/animals/fox_walk.png",
  fox_run: "sprites/animals/fox_run.png",
  fox_hurt: "sprites/animals/fox_hurt.png",
  fox_death: "sprites/animals/fox_death.png",
  hare_idle: "sprites/animals/hare_idle.png",
  hare_walk: "sprites/animals/hare_walk.png",
  hare_run: "sprites/animals/hare_run.png",
  hare_hurt: "sprites/animals/hare_hurt.png",
  hare_death: "sprites/animals/hare_death.png",
  deer_idle: "sprites/animals/deer_idle.png",
  deer_walk: "sprites/animals/deer_walk.png",
  deer_run: "sprites/animals/deer_run.png",
  deer_hurt: "sprites/animals/deer_hurt.png",
  deer_death: "sprites/animals/deer_death.png",
  grouse_idle: "sprites/animals/grouse_idle.png",
  grouse_walk: "sprites/animals/grouse_walk.png",
  grouse_flight: "sprites/animals/grouse_flight.png",
  grouse_hurt: "sprites/animals/grouse_hurt.png",
  grouse_death: "sprites/animals/grouse_death.png",
  // formigueiro (3 estados de dano — a rainha vive dentro)
  nest: "sprites/props/nest.png",
  nest_d1: "sprites/props/nest_d1.png",
  nest_d2: "sprites/props/nest_d2.png",
  // props
  tree1: "sprites/props/tree1.png",
  tree2: "sprites/props/tree2.png",
  tree3: "sprites/props/tree3.png",
  tree_moss1: "sprites/props/tree_moss1.png",
  tree_flower1: "sprites/props/tree_flower1.png",
  tree_fruit1: "sprites/props/tree_fruit1.png",
  tree_fruit2: "sprites/props/tree_fruit2.png",
  tree_autumn1: "sprites/props/tree_autumn1.png",
  tree_broken1: "sprites/props/tree_broken1.png",
  bush_blue1: "sprites/props/bush_blue1.png",
  bush_blue2: "sprites/props/bush_blue2.png",
  bush_pink1: "sprites/props/bush_pink1.png",
  bush_red1: "sprites/props/bush_red1.png",
  bush_orange1: "sprites/props/bush_orange1.png",
  bush_orange2: "sprites/props/bush_orange2.png",
  bush_plain1: "sprites/props/bush_plain1.png",
  bush_plain2: "sprites/props/bush_plain2.png",
  fern1: "sprites/props/fern1.png",
  fern2: "sprites/props/fern2.png",
  crys_blue1: "sprites/props/crys_blue1.png",
  crys_blue2: "sprites/props/crys_blue2.png",
  crys_violet1: "sprites/props/crys_violet1.png",
  crys_yellow1: "sprites/props/crys_yellow1.png",
  crys_white1: "sprites/props/crys_white1.png",
  crys_green1: "sprites/props/crys_green1.png",
  crys_red1: "sprites/props/crys_red1.png",
  tree_moss2: "sprites/props/tree_moss2.png",
  tree_broken2: "sprites/props/tree_broken2.png",
  bush_burned1: "sprites/props/bush_burned1.png",
  tree_palm1: "sprites/props/tree_palm1.png",
  tree_palm2: "sprites/props/tree_palm2.png",
  cactus1: "sprites/props/cactus1.png",
  cactus2: "sprites/props/cactus2.png",
  cactus3: "sprites/props/cactus3.png",
  tree_autumn2: "sprites/props/tree_autumn2.png",
  bush_autumn1: "sprites/props/bush_autumn1.png",
  bush_autumn2: "sprites/props/bush_autumn2.png",
  bush_autumn3: "sprites/props/bush_autumn3.png",
  tree_snow1: "sprites/props/tree_snow1.png",
  tree_snow2: "sprites/props/tree_snow2.png",
  tree_snowpine1: "sprites/props/tree_snowpine1.png",
  bush_snow1: "sprites/props/bush_snow1.png",
  bush_snow2: "sprites/props/bush_snow2.png",
  bush_snow3: "sprites/props/bush_snow3.png",
  rock_a: "sprites/props/rock_a.png",
  rock_b: "sprites/props/rock_b.png",
  rock_c: "sprites/props/rock_c.png",
  rock_d: "sprites/props/rock_d.png",
  rock_e: "sprites/props/rock_e.png",
  // ícones
  i_food: "sprites/icons/food.png",
  i_essence: "sprites/icons/essence.png",
  i_lock: "sprites/icons/lock.png",
  i_fire_sword: "sprites/icons/fire_sword.png",
  i_shield: "sprites/icons/shield.png",
  i_bolt: "sprites/icons/bolt.png",
  i_hourglass: "sprites/icons/hourglass.png",
  i_crown: "sprites/icons/crown.png",
  i_spider: "sprites/icons/spider.png",
  i_spider_gold: "sprites/icons/spider_gold.png",
  i_fist: "sprites/icons/fist.png",
  i_snow: "sprites/icons/snow.png",
  i_heal: "sprites/icons/heal.png",
  i_sun: "sprites/icons/sun.png",
  i_wing_gem: "sprites/icons/wing_gem.png",
  i_scale: "sprites/icons/scale.png",
  i_ember: "sprites/icons/ember.png",
  i_egg: "sprites/icons/egg.png",
  i_clover: "sprites/icons/clover.png",
  i_horseshoe: "sprites/icons/horseshoe.png",
  i_fungo: "sprites/icons/fungo.png",
  i_sk_slash: "sprites/icons/sk_slash.png",
  i_sk_tornado: "sprites/icons/sk_tornado.png",
  i_sk_frost: "sprites/icons/sk_frost.png",
  i_sk_acid: "sprites/icons/sk_acid.png",
  i_sk_fury: "sprites/icons/sk_fury.png",
  i_sk_time: "sprites/icons/sk_time.png",
  i_sk_banner: "sprites/icons/sk_banner.png",
  i_sk_rico: "sprites/icons/sk_rico.png",
  i_sk_heart: "sprites/icons/sk_heart.png",
  i_sk_bomb: "sprites/icons/sk_bomb.png",
  i_potion: "sprites/icons/potion.png",
  // parallax menu - alta resolução estilo formigueiro
  // numeração 1(frente)..4(fundo): 1=vinhas, 2=principal, 3=montanhas, 4=céu
  parallax_sky: "parallax/menu/layer4_sky_sunset_moon.png",
  parallax_mountains: "parallax/menu/layer3_mountains_silhouette.png",
  parallax_main: "parallax/menu/layer2_main_grass_ruins_anthill.png",
  parallax_foreground: "parallax/menu/layer1_foreground_vines.png",
};

export const IMG = {};   // key -> HTMLImageElement (sprites crus)
const ROT = {};          // key -> { frames:[canvas], w, h } (24 rotações)
const WROT = {};         // silhuetas brancas rotacionadas (hit flash)

// ---------------------------------------------------------------------------
// Versão dos assets servidos. BUMP OBRIGATÓRIO toda vez que qualquer PNG em
// game/assets/ for regenerado (pipeline, rework de arte etc.): o ?v= abaixo
// invalida o cache do navegador/CDN. Sem isso o jogador continua vendo a arte
// ANTIGA nos mesmos nomes de arquivo (foi assim que o rework dos inimigos da
// Fase 2 "não apareceu" para quem já tinha jogado antes dele).
// ---------------------------------------------------------------------------
export const ASSET_V = "20260926";

/**
 * URL final de um asset do jogo: base certa para a página atual + anti-cache.
 * O shell mobile (game/mobile/) mora um nível abaixo do PC: lá a base é
 * ../assets/, no PC é assets/. `path` aceita com ou sem o prefixo "assets/".
 */
export function assetUrl(path) {
  const rel = String(path).replace(/^(\.\.\/)*assets\//, "");
  return assetBase() + rel + "?v=" + ASSET_V;
}

function assetBase() {
  // 1) caminho da página (browser de verdade)
  try {
    if (typeof location !== "undefined" && location.pathname &&
        location.pathname.indexOf("/mobile/") !== -1) return "../assets/";
  } catch (e) { /* sem location (testes headless) */ }
  // 2) marca do shell mobile (game/mobile/index.html define antes do motor)
  try {
    if (typeof globalThis !== "undefined" &&
        globalThis.FUMIGA_SAVE_KEY === "fumiga_goat_mobile_save_v1") return "../assets/";
  } catch (e) { /* ok */ }
  return "assets/";
}

// -------------------------------------------------------------------- load --
// O boot puxa ~140 imagens. A versão antiga mandava TODAS de uma vez dentro de
// um Promise.all SEM prazo e SEM retry — no celular (4G/5G instável, iOS
// limitando conexões, Wi-Fi cativo, aba suspensa) bastava UMA requisição
// engasgar para a barra de carregamento congelar no meio PARA SEMPRE, sem
// erro nenhum: era exatamente o "preso na tela de carregamento".
// Agora: fila com poucas conexões simultâneas, prazo por imagem, uma segunda
// tentativa (muda a query, furando a entrada envenenada do cache) e o estado
// da fila visível na tela de carregamento (LOAD).
export const LOAD = { total: 0, done: 0, inflight: 0, retries: 0, last: "", t0: 0 };

// Ajustável por quem carrega o motor (testes headless encurtam o prazo).
export const LOAD_CFG = {
  concurrency: 8,     // ~o limite real de conexões do navegador no celular
  timeoutMs: 12000,   // prazo de UMA tentativa: acima disso, tenta de novo
  attempts: 2,        // tentativas por imagem antes de desistir dela
};

const nowMs = () => (typeof performance !== "undefined" && performance.now)
  ? performance.now() : Date.now();

/** Uma imagem, com prazo. Nunca fica pendurada: resolve ou rejeita. */
export function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    let timer = 0, settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      img.onload = img.onerror = null;
      if (ok) res(img); else rej(new Error("sem resposta"));
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    if (typeof setTimeout === "function") timer = setTimeout(() => finish(false), LOAD_CFG.timeoutMs);
    img.src = url;
  });
}

export async function loadAll(onProgress) {
  const keys = Object.keys(MANIFEST);
  LOAD.total = keys.length; LOAD.done = 0; LOAD.inflight = 0; LOAD.retries = 0;
  LOAD.last = ""; LOAD.t0 = nowMs();
  let next = 0;
  const failed = [];

  async function worker() {
    while (next < keys.length) {
      const k = keys[next++];
      let img = null;
      for (let a = 0; a < LOAD_CFG.attempts && !img; a++) {
        if (a) LOAD.retries++;
        LOAD.inflight++;
        LOAD.last = MANIFEST[k];
        try { img = await loadImage(assetUrl(MANIFEST[k]) + (a ? "&r=" + a : "")); }
        catch (e) { img = null; }
        LOAD.inflight--;
      }
      if (img) {
        IMG[k] = img;
        LOAD.done++;
        if (onProgress) onProgress(LOAD.done / keys.length);
      } else {
        failed.push(MANIFEST[k]);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(LOAD_CFG.concurrency, keys.length); i++) workers.push(worker());
  await Promise.all(workers);
  if (failed.length) {
    throw new Error("Falha ao carregar " + failed[0] +
      (failed.length > 1 ? " (+" + (failed.length - 1) + " outros)" : ""));
  }
}

// --------------------------------------------------------------- rotações ---
// Formigas são top-down: pré-renderizamos 24 ângulos para girar com nitidez.
const ROT_ANGLES = 24;

// ------------------------------------------------------ acabamento visual ---
// Cores ORIGINAIS do sprite, pixel a pixel: NENHUM retoque de cor (sem contraste,
// sem sombra quente, sem rim light, sem tingeamento). A única camada adicionada
// é o contorno escuro de 1px em toda a silhueta — leitura no meio do mato sem
// alterar UMA cor sequer da arte. Tudo é aplicado ANTES da rotação, então gira
// junto com a formiga e continua alinhado à grade de pixels.
const OUTLINE_COL = "#08060f";
// 8 direções: contorno de 1px ao redor da silhueta
const OUT_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const FINISHED = new Map();

/** Silhueta sólida de um sprite (para contorno / rim / sombra). */
function silhouette(img, color) {
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color;
  c.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

/** Sprite pronto para assar: cores originais + silhueta do contorno (com cache). */
function finishSprite(key) {
  let f = FINISHED.get(key);
  if (f) return f;
  const body = IMG[key];
  f = { body, out: silhouette(body, OUTLINE_COL) };
  FINISHED.set(key, f);
  return f;
}

export function bakeRot(key, outSize) {
  if (ROT[key]) return ROT[key];
  const F = finishSprite(key);
  const img = F.body;
  const scale = outSize / Math.max(img.width, img.height);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const pad = Math.ceil(Math.hypot(w, h)) + 2;
  // espessura do contorno cresce junto com o sprite (1px a cada ~28px assados)
  const o = Math.max(1, Math.round(scale * 0.9));
  const frames = [];
  for (let i = 0; i < ROT_ANGLES; i++) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = pad;
    const c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.translate(pad / 2, pad / 2);
    c.rotate((i / ROT_ANGLES) * Math.PI * 2 + Math.PI / 2); // sprite aponta "para cima"
    // 1) contorno
    for (const [ox, oy] of OUT_DIRS) c.drawImage(F.out, -w / 2 + ox * o, -h / 2 + oy * o, w, h);
    // 2) o sprite em si — cores originais, sem retoque
    c.drawImage(img, -w / 2, -h / 2, w, h);
    frames.push(cv);
  }
  ROT[key] = { frames, size: pad };
  WROT[key] = bakeWhiteOf(frames);
  return ROT[key];
}

function bakeWhiteOf(frames) {
  const white = frames.map((f) => {
    const cv = document.createElement("canvas");
    cv.width = f.width; cv.height = f.height;
    const c = cv.getContext("2d");
    c.drawImage(f, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, cv.width, cv.height);
    return cv;
  });
  return { frames: white, size: frames[0].width };
}

/** Cria um apelido de sprite: mesma arte, outro tamanho de assado. */
export function dupSprite(srcKey, dstKey) {
  if (IMG[dstKey]) return IMG[dstKey];
  const src = IMG[srcKey];
  const cv = document.createElement("canvas");
  cv.width = src.width; cv.height = src.height;
  cv.getContext("2d").drawImage(src, 0, 0);
  IMG[dstKey] = cv;
  return cv;
}

/**
 * Diz que o sprite `key` deve ser DESENHADO `times` vezes o tamanho desenhado
 * de `refKey`, mesmo tendo sido assado pequeno. É o caso da FORMIGA GIGANTE:
 * assar o tamanho final (20x a soldado) custaria centenas de MB de canvas —
 * assar 1/5 disso e ampliar na hora sai igual (nearest-neighbor) e cabe.
 */
export function setRotDrawScale(key, refKey, times) {
  const f = ROT[key], r = ROT[refKey];
  if (!f || !r || !f.size) return 0;
  f.drawScale = (r.size * times) / f.size;
  return f.drawScale;
}

/** Tamanho desenhado do frame assado de `key`, em px de tela com zoom 1. */
export function rotDrawSize(key) {
  const r = ROT[key];
  return r ? r.size * (r.drawScale || 1) : 0;
}

export function rotFrame(key, angle) {
  const b = bakeRot(key, ROT[key] ? ROT[key].size : 64);
  let i = Math.round((angle / (Math.PI * 2)) * ROT_ANGLES) % ROT_ANGLES;
  if (i < 0) i += ROT_ANGLES;
  return b.frames[i];
}

export function whiteRotFrame(key, angle) {
  bakeRot(key, 64);
  let i = Math.round((angle / (Math.PI * 2)) * ROT_ANGLES) % ROT_ANGLES;
  if (i < 0) i += ROT_ANGLES;
  return WROT[key].frames[i];
}

export function rotSize(key) { return ROT[key] ? ROT[key].size : 64; }

// -------------------------------------------------- sheets de animais 4-dir --
// rows: 0=baixo 1=esquerda 2=direita 3=cima ; células de 64px (após scale 2x)
const SHEETS = {}; // key -> {rows:[[cv...]], fw, fh}

export function bakeSheet(key, cols, outFW = 96) {
  if (SHEETS[key]) return SHEETS[key];
  const img = IMG[key];
  const fw = 64, fh = 64; // célula original (32px * 2)
  const scale = outFW / fw;
  const rows = 4;
  const ofw = Math.round(fw * scale), ofh = Math.round(fh * scale);
  const sheet = { rows: [], fw: ofw, fh: ofh };
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let cix = 0; cix < cols; cix++) {
      const cv = document.createElement("canvas");
      cv.width = ofw; cv.height = ofh;
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, cix * fw, r * fh, fw, fh, 0, 0, ofw, ofh);
      row.push(cv);
    }
    sheet.rows.push(row);
  }
  // silhueta branca para hit-flash
  sheet.white = sheet.rows.map((row) => row.map((f) => {
    const cv = document.createElement("canvas");
    cv.width = f.width; cv.height = f.height;
    const c = cv.getContext("2d");
    c.drawImage(f, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = "#fff";
    c.fillRect(0, 0, cv.width, cv.height);
    return cv;
  }));
  SHEETS[key] = sheet;
  return sheet;
}

// ------------------------------------------------------------------ névoa ---
// MANTO DA NÉVOA: fatia a faixa horizontal (N frames lado a lado) em canvases.
// Lazy + cacheado — o primeiro inimigo desenhado assa, o resto reutiliza.
export const FOG_FRAMES = 6;
const FOG = {}; // key -> { frames:[canvas] }
export function bakeFog(key, n = FOG_FRAMES) {
  if (FOG[key]) return FOG[key];
  const img = IMG[key];
  const frames = [];
  if (img && img.width > 0) {
    const fw = Math.round(img.width / n), fh = img.height;
    for (let i = 0; i < n; i++) {
      const cv = document.createElement("canvas");
      cv.width = fw; cv.height = fh;
      const c = cv.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
      frames.push(cv);
    }
  }
  FOG[key] = { frames };
  return FOG[key];
}
export function fogFrame(key, idx) {
  const s = bakeFog(key);
  if (!s.frames.length) return null;
  const n = s.frames.length;
  return s.frames[((idx % n) + n) % n];
}
