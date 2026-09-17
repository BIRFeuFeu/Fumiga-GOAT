// ============================================================================
// FUMIGA-GOAT — carregamento e "baking" de sprites
// ============================================================================

const MANIFEST = {
  // formigas
  worker: "sprites/ants/worker.png",
  soldier: "sprites/ants/soldier.png",
  spitter: "sprites/ants/spitter.png",
  tank: "sprites/ants/tank.png",
  queen: "sprites/ants/queen.png",
  scout: "sprites/ants/scout.png",
  healer: "sprites/ants/healer.png",
  bomber: "sprites/ants/bomber.png",
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
};

export const IMG = {};   // key -> HTMLImageElement (sprites crus)
const ROT = {};          // key -> { frames:[canvas], w, h } (24 rotações)
const WROT = {};         // silhuetas brancas rotacionadas (hit flash)

// -------------------------------------------------------------------- load --
export function loadAll(onProgress) {
  const keys = Object.keys(MANIFEST);
  let done = 0;
  return Promise.all(keys.map((k) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { IMG[k] = img; done++; onProgress && onProgress(done / keys.length); res(); };
    img.onerror = () => rej(new Error("Falha ao carregar " + MANIFEST[k]));
    img.src = "assets/" + MANIFEST[k];
  })));
}

// --------------------------------------------------------------- rotações ---
// Formigas são top-down: pré-renderizamos 24 ângulos para girar com nitidez.
const ROT_ANGLES = 24;

export function bakeRot(key, outSize) {
  if (ROT[key]) return ROT[key];
  const img = IMG[key];
  const scale = outSize / Math.max(img.width, img.height);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const pad = Math.ceil(Math.hypot(w, h)) + 2;
  const frames = [];
  for (let i = 0; i < ROT_ANGLES; i++) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = pad;
    const c = cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.translate(pad / 2, pad / 2);
    c.rotate((i / ROT_ANGLES) * Math.PI * 2 + Math.PI / 2); // sprite aponta "para cima"
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

/** Assa uma variante tingida de um sprite (ex.: operária -> coletora). */
export function bakeRotTinted(srcKey, dstKey, outSize, color, alpha = 0.45) {
  if (ROT[dstKey]) return ROT[dstKey];
  const img = IMG[srcKey];
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = "source-atop";
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalAlpha = 1;
  IMG[dstKey] = cv;
  return bakeRot(dstKey, outSize);
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
