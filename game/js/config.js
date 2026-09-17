// ============================================================================
// FUMIGA — dados de balanceamento e conteúdo
// ============================================================================

export const VIEW_W = 960, VIEW_H = 540;
export const WORLD_W = 3200, WORLD_H = 2400;

// Paleta (inspiração: Dead Cells / Celeste — sombras frias e luz âmbar)
export const PAL = {
  bg:        "#14101d",
  soilDark:  "#241b2e",
  soil:      "#332645",
  soilLight: "#42325a",
  moss:      "#3d5a45",
  amber:     "#ffb347",
  amberHot:  "#ffd479",
  ember:     "#ff7a3d",
  red:       "#ff4d5a",
  redDark:   "#a32e46",
  teal:      "#37e6c8",
  tealDark:  "#1d9c8c",
  blue:      "#6db7ff",
  violet:    "#c77dff",
  essence:   "#9a6bff",
  food:      "#ffd479",
  green:     "#7fd6a0",
  ink:       "#17121f",
  panel:     "#1d1730",
  panelHi:   "#2c2144",
  border:    "#4a3a6e",
  borderHi:  "#8f6fd6",
  textDim:   "#9a8fc0",
  text:      "#efe9ff",
  white:     "#ffffff",
};

// ---------------------------------------------------------------- Formigas --
// role: "worker" coleta | "fighter" combate corpo-a-corpo | "ranged" ataque à
// distância | "healer" suporte | "bomber" área + queimadura
export const UNITS = {
  worker: {
    id: "worker", key: null, name: "OPERÁRIA",
    tip: "Coleta comida e essência. Fraca mas incansável.",
    cost: 12, costGrow: 0.06, hatchTime: 2.0,
    hp: 26, dmg: 2.5, speed: 98, range: 13, atkCd: 0.7,
    gatherRate: 2.1, carry: 5, sprite: "worker", role: "worker",
  },
  gatherer: {
    id: "gatherer", key: null, name: "COLETORA",
    tip: "Especialista em colheita: mais rápida e carrega mais comida.",
    cost: 18, costGrow: 0.06, hatchTime: 2.2,
    hp: 24, dmg: 1.5, speed: 110, range: 12, atkCd: 0.9,
    gatherRate: 3.0, carry: 8, sprite: "gatherer", role: "worker",
  },
  soldier: {
    id: "soldier", key: null, name: "SOLDADO",
    tip: "Linha de frente com mandíbulas de sabre.",
    cost: 30, costGrow: 0.06, hatchTime: 3.2,
    hp: 175, dmg: 18, speed: 74, range: 17, atkCd: 0.62,
    sprite: "soldier", role: "fighter",
  },
  spitter: {
    id: "spitter", key: null, name: "CUSPIDORA",
    tip: "Dispara ácido de cristal à distância.",
    cost: 42, costGrow: 0.06, hatchTime: 3.8,
    hp: 60, dmg: 15, speed: 62, range: 125, atkCd: 1.1,
    projSpeed: 300, sprite: "spitter", role: "ranged",
  },
  tank: {
    id: "tank", key: null, name: "GUARDA DE ÉBANO",
    tip: "Muralha viva. Atrai a fúria dos inimigos.",
    cost: 62, costGrow: 0.06, hatchTime: 5.0,
    hp: 360, dmg: 12, speed: 48, range: 19, atkCd: 0.8,
    taunt: 155, sprite: "tank", role: "fighter",
  },
  scout: {
    id: "scout", key: null, name: "BATEDORA",
    tip: "Veloz e barata. Fareja inimigos de longe e intercepta.",
    cost: 22, costGrow: 0.06, hatchTime: 2.4,
    hp: 52, dmg: 6.5, speed: 152, range: 13, atkCd: 0.4,
    aggro: 430, sprite: "scout", role: "fighter",
  },
  healer: {
    id: "healer", key: null, name: "CURANDEIRA",
    tip: "Restaura as feridas das irmãs em batalha. Não luta.",
    cost: 46, costGrow: 0.06, hatchTime: 4.2,
    hp: 44, dmg: 0, speed: 92, range: 26, atkCd: 1,
    healRate: 13, healRange: 230, sprite: "healer", role: "healer",
  },
  bomber: {
    id: "bomber", key: null, name: "BOMBEIRA",
    tip: "Explode em brasa: dano em área e queimadura contínua.",
    cost: 58, costGrow: 0.06, hatchTime: 4.6,
    hp: 84, dmg: 13, speed: 66, range: 96, atkCd: 1.6,
    projSpeed: 250, aoe: 56, burnDps: 7, burnDur: 3.2,
    sprite: "bomber", role: "ranged",
  },
};

export const QUEEN = {
  hp: 1000, eatFood: 2, eatHp: 40, eatCd: 1.8, hpWarn: 0.3, sprite: "queen",
};

// ---------------------------------------------------------------- Inimigos --
export const ENEMIES = {
  runner:  { name: "RASTEJANTE",  hp: 22,  dmg: 3.5, speed: 84, range: 13, atkCd: 0.85, ess: 1,  pts: 1,   sprite: "e_runner" },
  swarm:   { name: "SAÚVA",       hp: 26,  dmg: 5,  speed: 74, range: 13, atkCd: 0.8,  ess: 1,  pts: 1.5, sprite: "e_swarm" },
  reaper:  { name: "CEIFADORA",   hp: 56,  dmg: 10, speed: 62, range: 16, atkCd: 0.9,  ess: 2,  pts: 2.5, sprite: "e_reaper" },
  espitter:{ name: "COSPE-PRAGA", hp: 44,  dmg: 9,  speed: 56, range: 108, atkCd: 1.5, ess: 2,  pts: 3,   sprite: "e_spitter", projSpeed: 270 },
  warrior: { name: "CARRASCA",    hp: 108, dmg: 15, speed: 52, range: 17, atkCd: 0.95, ess: 3,  pts: 4,   sprite: "e_warrior" },
  sentinel:{ name: "SENTINELA",   hp: 185, dmg: 18, speed: 46, range: 18, atkCd: 1.1,  ess: 5,  pts: 7,   sprite: "e_sentinel" },
  matron:  { name: "MATRONA",     hp: 470, dmg: 24, speed: 34, range: 22, atkCd: 1.2,  ess: 14, pts: 14,  sprite: "e_matron", spawns: "runner" },
};

// Escalonamento de inimigos por onda global
export const ENEMY_SCALE = { hp: 0.07, dmg: 0.045 }; // +7% hp / +4.5% dano por onda global

// ----------------------------------------------------------------- Chefões --
// px = altura assada da sheet de animais; rotMode = sprite de formiga giratório
export const BOSSES = {
  hare: {
    name: "O TAMBORILADOR", hp: 950, dmg: 15, speed: 148,
    dashDmg: 24, dashCd: 5.2, dashChain: 3,
    thumpDmg: 17, thumpRange: 135, thumpCd: 6.5,
    contactDmg: 11, ess: 70, sprite: "hare", px: 104,
  },
  fox: {
    name: "A CAÇADORA ASTUTA", hp: 1250, dmg: 20, speed: 112,
    pounceDmg: 26, pounceRange: 230, pounceCd: 6.2, contactDmg: 12,
    ess: 95, sprite: "fox", px: 112,
  },
  grouse: {
    name: "A SOMBRA ALADA", hp: 1700, dmg: 24, speed: 98,
    diveDmg: 30, diveCd: 5.8,
    shriekRange: 250, shriekCd: 9.0,
    contactDmg: 17, ess: 120, sprite: "grouse", px: 122,
  },
  matriarch: {
    name: "A MATRIARCA RIVAL", hp: 2100, dmg: 26, speed: 32,
    spitDmg: 13, spitCd: 2.8, summonCd: 9.5,
    contactDmg: 22, ess: 145, sprite: "e_matron", rotMode: true,
  },
  deer: {
    name: "O GALHADA REAL", hp: 2900, dmg: 30, speed: 106,
    chargeDmg: 42, chargeCd: 6.0,
    sweepDmg: 25, sweepRange: 158, sweepCd: 5.0,
    contactDmg: 19, ess: 185, sprite: "deer", px: 134,
  },
  boar: {
    name: "O DEVASTADOR", hp: 3800, dmg: 36, speed: 58,
    chargeDmg: 46, chargeCd: 7.0, slamDmg: 27, slamRange: 178, slamCd: 5.2,
    contactDmg: 22, ess: 240, sprite: "boar", px: 128,
  },
};

// ---------------------------------------------------------------- Mutações ---
// raridade: 0 = comum, 1 = rara, 2 = épica
export const RARITY = [
  { name: "COMUM", color: "#7fd6a0", w: 60 },
  { name: "RARA",  color: "#6db7ff", w: 30 },
  { name: "ÉPICA", color: "#c77dff", w: 10 },
];

export const MUTATIONS = [
  { id: "lamina",     icon: "sk_slash",  rar: 0, name: "LÂMINAS DE FERRO",
    desc: "+25% de dano para todas as aliadas." },
  { id: "casulo",     icon: "bolt",      rar: 0, name: "CASULO LEVE",
    desc: "+18% de velocidade de movimento." },
  { id: "exo",        icon: "shield",    rar: 0, name: "EXOESQUELETO DENSO",
    desc: "+30% de vida máxima para aliadas." },
  { id: "coracao",    icon: "sk_heart",  rar: 1, name: "CORAÇÃO REAL",
    desc: "Rainha: +40% de vida e regenera 3/s." },
  { id: "fungo",      icon: "fungo",     rar: 0, name: "FUNGO ENRIQUECIDO",
    desc: "+35% de comida coletada das pilhas." },
  { id: "ferment",    icon: "heal",      rar: 0, name: "FERMENTAÇÃO REAL",
    desc: "Operárias depositam +2 de comida bônus por viagem." },
  { id: "acido",      icon: "sk_acid",   rar: 1, name: "ÁCIDO CONCENTRADO",
    desc: "Cuspidoras: +30% de dano e alvos ficam 25% lentos (2s)." },
  { id: "rico",       icon: "sk_rico",   rar: 2, name: "ÁCIDO RICOCHETE",
    desc: "Projéteis aliados ricocheteiam para outro inimigo (1x)." },
  { id: "belico",     icon: "sk_fury",   rar: 1, name: "FEROMÔNIO BÉLICO",
    desc: "Inimigos atingidos causam -15% de dano por 3s." },
  { id: "larvas",     icon: "egg",       rar: 0, name: "MATRIZ DE LARVAS",
    desc: "-20% no custo das formigas e -30% no tempo de chocar." },
  { id: "nobre",      icon: "spider_gold", rar: 0, name: "ELITE NASCIDA",
    desc: "+6 de população máxima." },
  { id: "fome",       icon: "sk_banner", rar: 2, name: "FOME COLETIVA",
    desc: "+4% de dano por aliada próxima (máx 5)." },
  { id: "pedra",      icon: "scale",     rar: 2, name: "PELE-DE-PEDRA",
    desc: "Aliadas sofrem -20% de dano." },
  { id: "brasa",      icon: "ember",     rar: 1, name: "BRASA INTERIOR",
    desc: "Aliadas queimam atacantes corpo-a-corpo (4 de dano)." },
  { id: "tornado",    icon: "sk_tornado", rar: 0, name: "ÍMPETO SELVAGEM",
    desc: "12% de chance de crítico (dano x2)." },
  { id: "semente",    icon: "clover",    rar: 1, name: "SEMENTE VOADORA",
    desc: "Coletas têm 20% de chance de dropar +1 essência." },
  { id: "veneno",     icon: "sk_bomb",   rar: 1, name: "SANGUE ÁCIDO",
    desc: "Inimigos que mordem aliadas ficam queimando (2s)." },
  { id: "nectar",     icon: "sk_frost",  rar: 2, name: "NÉCTAR MILAGROSO",
    desc: "Curandeiras curam 50% mais rápido e mais longe." },
  { id: "rapina",     icon: "hourglass", rar: 0, name: "ENXAME APRESSADO",
    desc: "-15% no tempo entre ondas de todo o mapa." },
];

export const MAX_MUTS = 12;

// --------------------------------------------------------------- Meta árvore --
// Branches: T = TRABALHO (âmbar), G = GUERRA (vermelho), R = REAL (violeta)
export const META_BRANCHES = {
  T: { name: "TRABALHO", color: "#ffb347" },
  G: { name: "GUERRA",   color: "#ff4d5a" },
  R: { name: "REAL",     color: "#c77dff" },
};

export const META_NODES = [
  { id: "raiz", br: "R", icon: "crown", name: "COLÔNIA ANCESTRAL",
    desc: "O coração do formigueiro eterno.", cost: [0], requires: [], x: 0, y: 0 },

  // TRABALHO (esquerda)
  { id: "t_col", br: "T", icon: "food", name: "FORAGEM",
    desc: "+15% de comida por pilha coletada.", cost: [25, 45, 70], requires: ["raiz"], x: -2, y: 0 },
  { id: "t_vel", br: "T", icon: "bolt", name: "MARCHA RÁPIDA",
    desc: "+10% de velocidade das operárias.", cost: [20, 35, 55], requires: ["t_col"], x: -3.2, y: -0.9 },
  { id: "t_carga", br: "T", icon: "scale", name: "BOLSAS PROFUNDAS",
    desc: "Operárias carregam +1 de carga.", cost: [30, 50, 70], requires: ["t_col"], x: -3.2, y: 0.9 },
  { id: "t_ini", br: "T", icon: "egg", name: "PROLE INICIAL",
    desc: "Começa a expedição com +2 operárias.", cost: [40, 75], requires: ["t_vel"], x: -4.4, y: -1.5 },
  { id: "t_ambar", br: "T", icon: "wing_gem", name: "VEIOS DE ÂMBAR",
    desc: "Cristais de essência rendem +2 por extração.", cost: [50, 85], requires: ["t_carga"], x: -4.4, y: 1.5 },

  // GUERRA (direita)
  { id: "g_dan", br: "G", icon: "fire_sword", name: "MANDÍBULA DE GUERRA",
    desc: "+10% de dano para todas as aliadas.", cost: [20, 35, 50, 70, 95], requires: ["raiz"], x: 2, y: 0 },
  { id: "g_vid", br: "G", icon: "sk_heart", name: "CARAPAÇA DURA",
    desc: "+12% de vida para todas as aliadas.", cost: [20, 35, 50, 70, 95], requires: ["raiz"], x: 2.9, y: -1.1 },
  { id: "g_cri", br: "G", icon: "fist", name: "FÚRIA CEGA",
    desc: "+4% de chance de crítico (dano x2).", cost: [45, 70, 100], requires: ["g_dan"], x: 3.4, y: 1.0 },
  { id: "g_grd", br: "G", icon: "shield", name: "PATRULHA INICIAL",
    desc: "Começa a expedição com +1 soldado.", cost: [50, 90], requires: ["g_dan"], x: 4.2, y: -0.5 },

  // REAL (topo / baixo)
  { id: "r_vida", br: "R", icon: "sk_heart", name: "SANGUE REAL",
    desc: "Rainha: +15% de vida máxima.", cost: [25, 45, 65], requires: ["raiz"], x: 0, y: -1.6 },
  { id: "r_reg", br: "R", icon: "heal", name: "NÉCTAR REAL",
    desc: "A rainha se alimenta 30% mais rápido.", cost: [25, 45, 65], requires: ["r_vida"], x: -0.9, y: -2.6 },
  { id: "r_ovo", br: "R", icon: "hourglass", name: "ÍNCUBO",
    desc: "Tempo de chocar -12%.", cost: [30, 50, 70], requires: ["r_vida"], x: 0.9, y: -2.6 },
  { id: "r_pop", br: "R", icon: "spider", name: "SUPERORGANISMO",
    desc: "+4 de população máxima.", cost: [35, 55, 80, 110], requires: ["raiz"], x: 0, y: 1.6 },
  { id: "r_ess", br: "R", icon: "sun", name: "ALMA DA COLÔNIA",
    desc: "+15% de toda essência ganha.", cost: [30, 55, 80], requires: ["r_pop"], x: 0.9, y: 2.6 },
  { id: "r_ren", br: "R", icon: "crown", name: "RENASCIMENTO",
    desc: "1x por expedição: a rainha renasce com 50% de vida.", cost: [160], requires: ["r_vida", "r_ovo"], x: 0, y: -3.7 },
];

// ------------------------------------------------------------- Recursos iniciais
export const START = {
  food: 80,
  essence: 0,
  popCap: 16,
  workers: 2,      // operárias
  gatherers: 2,    // coletoras
  scouts: 1,       // exploradora
};

// ------------------------------------------- nível & experiência da colônia
export const XP_KILL_FRAC = 0.5;       // xp por abate = ess do inimigo * fator
export const XP_WAVE_BASE = 22;        // xp por onda repelida
export const XP_WAVE_PER = 2;          // + por onda global
export const XP_BOSS = 90;             // xp por chefe de mapa
export function xpForLevel(lv) { return 40 + (lv - 1) * 38; } // xp p/ o próximo
export const LEVEL_HP = 0.03, LEVEL_DMG = 0.03; // bônus por nível (composto)

// ------------------------------------------------- construção dentro do ninho
export const CHAMBERS = {
  nursery: {
    id: "nursery", name: "BERÇÁRIO", icon: "i_egg", max: 3,
    tip: "Ovos chocam mais rápido.",
    per: "+18% velocidade de choco por nível",
    costs: [{ food: 60, ess: 0 }, { food: 110, ess: 18 }, { food: 180, ess: 36 }],
  },
  pantry: {
    id: "pantry", name: "DESPENSA", icon: "i_food", max: 3,
    tip: "Depósitos de comida rendem mais.",
    per: "+15% comida por depósito por nível",
    costs: [{ food: 50, ess: 0 }, { food: 100, ess: 16 }, { food: 170, ess: 32 }],
  },
  barracks: {
    id: "barracks", name: "QUARTEL", icon: "i_shield", max: 3,
    tip: "Lutadoras e atiradoras treinam músculos de guerra.",
    per: "+12% dano de classes de combate por nível",
    costs: [{ food: 70, ess: 10 }, { food: 130, ess: 26 }, { food: 200, ess: 48 }],
  },
  fungus: {
    id: "fungus", name: "FUNGÁRIO", icon: "i_fungo", max: 3,
    tip: "Cultiva fungo: goteja comida com o tempo.",
    per: "+1 comida a cada 9s por nível",
    costs: [{ food: 55, ess: 8 }, { food: 105, ess: 20 }, { food: 175, ess: 40 }],
  },
  refinery: {
    id: "refinery", name: "REFINARIA", icon: "i_essence", max: 3,
    tip: "Refina cristais: mais essência de tudo.",
    per: "+15% essência ganha por nível",
    costs: [{ food: 60, ess: 12 }, { food: 115, ess: 28 }, { food: 190, ess: 52 }],
  },
};

// Ritmo de ondas
export const CALM_START = 24;      // paz antes da 1ª onda
export const CALM_BETWEEN = 24;    // paz entre ondas
export const SKIP_BONUS = 15;      // essência por invocar onda cedo

// ============================================================ MAPAS / BIOMAS =
// Cada mapa (estilo Dead Cells) termina num CHEFÃO. Limpar o mapa avança a
// expedição para um bioma novo — a colônia migra com você.
export const MAPS = [
  {
    id: "planicie", name: "PLANÍCIE DO AMANHECER",
    sub: "Um gramado amplo onde a colônia fincou suas raízes.",
    boss: "hare",
    ground: {
      top: "#33452c", mid: "#2c3d26", bot: "#22301d",
      soils: ["#31482a", "#2c3f24", "#3a5230", "#263a20", "#334b2b", "#2a3d23"],
      moss: ["#41663a", "#4a7a42", "#386134"],
      speck: ["#4a6540", "#1f2d1a", "#3c5734", "#57794c", "#1a2614"],
      trail: "#1c2415",
      tuft: ["#5c9c4c", "#4e8a45", "#6aa855", "#3f7a3c"],
      flowers: ["#ffd479", "#ff8fa8", "#c98df5", "#e8f4ff"],
    },
    props: {
      trees: ["tree1", "tree2", "tree3", "tree_flower1"],
      bushes: ["bush_plain1", "bush_plain2", "bush_blue1", "bush_pink1", "bush_red1", "bush_blue2"],
      decos: ["fern1", "fern2"],
      rocks: ["rock_a", "rock_b", "rock_c", "rock_e"],
      crys: ["crys_white1", "crys_green1"],
    },
    ambient: { colors: ["#fff6c8", "#ffd479", "#bfffa8"], style: "pollen" },
    tint: "#26301c",
    waves: [
      { budget: 9,  title: "PRIMEIRO SANGUE",   tip: "Eles sentiram o cheiro da colônia..." },
      { budget: 15, title: "ENXAME RASTEJANTE" },
      { budget: 22, title: "MANDÍBULAS",         draftAfter: true },
      { budget: 30, title: "MARÉ CRESCENTE" },
      { boss: true, budget: 10, title: "O TAMBORILADOR", tip: "A terra ressoa com pulos pesados..." },
    ],
  },
  {
    id: "floresta", name: "FLORESTA DE MUSGO",
    sub: "Árvores antigas guardam segredos — e predadores.",
    boss: "fox",
    ground: {
      top: "#24382a", mid: "#1f3124", bot: "#18261c",
      soils: ["#24402c", "#2a4630", "#1e3626", "#2f4a34", "#23402b", "#1c3222"],
      moss: ["#2f5238", "#38603e", "#2a4c32"],
      speck: ["#3c5c44", "#17251b", "#32513a", "#46664c", "#12200f"],
      trail: "#131f14",
      tuft: ["#3f7a4e", "#4e9a51", "#356143"],
      flowers: ["#c26be0", "#7fd6ff", "#ffd479"],
    },
    props: {
      trees: ["tree_moss1", "tree_moss2", "tree_fruit1", "tree_fruit2", "tree1"],
      bushes: ["bush_plain1", "bush_blue1", "bush_pink1", "bush_blue2"],
      decos: ["fern1", "fern2"],
      rocks: ["rock_a", "rock_b", "rock_d"],
      crys: ["crys_green1", "crys_white1"],
    },
    ambient: { colors: ["#bfffa8", "#8f6fd6", "#37e6c8"], style: "spores" },
    tint: "#1c2a1f",
    waves: [
      { budget: 26, title: "SOMBRAS DO BOSQUE",  tip: "A floresta observa o formigueiro." },
      { budget: 34, title: "GANÂNCIA DAS SAÚVAS" },
      { budget: 42, title: "LEGIONÁRIAS",        draftAfter: true },
      { budget: 52, title: "CERCO DE MUSGO" },
      { boss: true, budget: 12, title: "A CAÇADORA ASTUTA", tip: "Algo grande fareja a floresta..." },
    ],
  },
  {
    id: "pantano", name: "PÂNTANO PÚTRIDO",
    sub: "Águas paradas, insetos gordos e fome velha.",
    boss: "grouse",
    ground: {
      top: "#213031", mid: "#1c2a2b", bot: "#152021",
      soils: ["#243636", "#203131", "#2a3d3a", "#1c2c2a", "#26403c", "#1a2a28"],
      moss: ["#2c4a3f", "#254038", "#2f544a"],
      speck: ["#37544c", "#12201d", "#2f4c44", "#3f5f52", "#0f1a17"],
      trail: "#10201d",
      tuft: ["#3f7a5e", "#4e9a6a", "#2f6b4e"],
      flowers: ["#7fd6ff", "#c26be0"],
    },
    props: {
      trees: ["tree_broken1", "tree_broken2", "tree_moss1", "tree2"],
      bushes: ["bush_plain2", "bush_blue2", "bush_blue1"],
      decos: ["fern1", "fern2", "bush_burned1"],
      rocks: ["rock_c", "rock_d", "rock_b"],
      crys: ["crys_green1", "crys_blue1"],
    },
    ambient: { colors: ["#37e6c8", "#8fd3ff", "#bfffa8"], style: "wisps" },
    tint: "#16211f",
    waves: [
      { budget: 42, title: "BOLHUM PODRE", tip: "O pântano exala velhas pegadas." },
      { budget: 50, title: "VOADORAS FAMINTAS" },
      { budget: 60, title: "PESTE CRISTALINA", draftAfter: true },
      { budget: 70, title: "LODO E SANGUE" },
      { budget: 82, title: "O CHAMADO DAS ÁGUAS" },
      { boss: true, budget: 14, title: "A SOMBRA ALADA", tip: "Um grito corta o nevoeiro..." },
    ],
  },
  {
    id: "deserto", name: "DESERTO CALCINADO",
    sub: "Areia, ossos e o zumbido de uma colônia rival.",
    boss: "matriarch",
    ground: {
      top: "#4a3a28", mid: "#41321f", bot: "#35271a",
      soils: ["#53402a", "#4a3826", "#5c482e", "#453522", "#3f301f", "#574530"],
      moss: ["#6b532f", "#5c4a2c", "#4a3d28"],
      speck: ["#6b5335", "#2b2013", "#5c4630", "#7a5f3c", "#241a0f"],
      trail: "#2e2314",
      tuft: ["#a8874a", "#96753e", "#7a6236"],
      flowers: ["#ffd479", "#ff9a5c"],
    },
    props: {
      trees: ["tree_palm1", "tree_palm2"],
      bushes: ["bush_plain2", "bush_orange1"],
      decos: ["cactus1", "cactus2", "cactus3"],
      rocks: ["rock_a", "rock_c", "rock_d", "rock_e"],
      crys: ["crys_yellow1", "crys_red1"],
    },
    ambient: { colors: ["#ffd479", "#ffb347", "#ff9a5c"], style: "sand" },
    tint: "#2c2214",
    waves: [
      { budget: 66, title: "PÓ E MANDÍBULAS", tip: "Um formigueiro rival reclama a areia." },
      { budget: 78, title: "CAVALCADA SECA" },
      { budget: 90, title: "DUNAS HOSTIS", draftAfter: true },
      { budget: 104, title: "LEGIONÁRIAS DA COLÔNIA RIVAL" },
      { budget: 118, title: "O EXÉRCITO DA MATRIARCA" },
      { boss: true, budget: 16, title: "A MATRIARCA RIVAL", tip: "A falsa rainha vem cobrar tributo." },
    ],
  },
  {
    id: "outono", name: "BOSQUE DOURADO",
    sub: "Um outono eterno. As folhas caem; a fome não.",
    boss: "deer",
    ground: {
      top: "#3d2f22", mid: "#352920", bot: "#2a201a",
      soils: ["#463526", "#3e2f22", "#4e3b28", "#382a1e", "#42301f", "#332619"],
      moss: ["#5c4626", "#4e3d24", "#6b5028"],
      speck: ["#5c4630", "#221a10", "#4a3826", "#6b5235", "#1c1409"],
      trail: "#241a0e",
      tuft: ["#b06a2e", "#c07a33", "#8a5628"],
      flowers: ["#ff9a5c", "#ffd479", "#c26be0"],
    },
    props: {
      trees: ["tree_autumn1", "tree_autumn2", "tree_fruit1", "tree1"],
      bushes: ["bush_autumn1", "bush_autumn2", "bush_autumn3", "bush_orange2"],
      decos: ["fern2", "bush_orange1"],
      rocks: ["rock_b", "rock_d", "rock_a"],
      crys: ["crys_red1", "crys_yellow1"],
    },
    ambient: { colors: ["#ff9a5c", "#c07a33", "#ffd479"], style: "leaves" },
    tint: "#261d12",
    waves: [
      { budget: 96, title: "FOLHAS E ESPINHAS", tip: "Sob as folhas, patrulhas em formação." },
      { budget: 110, title: "CAÇA DE OUTONO" },
      { budget: 126, title: "CASCOS TROVEJAM", draftAfter: true },
      { budget: 142, title: "O BANDO ESTÉRI" },
      { budget: 160, title: "REI CAÍDO DO BOSQUE" },
      { boss: true, budget: 18, title: "O GALHADA REAL", tip: "Galhos partem. Ele não foge." },
    ],
  },
  {
    id: "gelo", name: "PICO CONGELADO",
    sub: "O topo do mundo, onde só a fome sobrevive.",
    boss: "boar",
    ground: {
      top: "#3a4254", mid: "#333b4c", bot: "#2a3140",
      soils: ["#3e475a", "#364052", "#424c60", "#303849", "#39425a", "#2c3444"],
      moss: ["#4a5470", "#424c64", "#3a4458"],
      speck: ["#525c74", "#20263a", "#485268", "#5c6680", "#1a2030"],
      trail: "#232b3e",
      tuft: ["#8a99b8", "#a8b4cc", "#6a7896"],
      flowers: ["#e8f4ff", "#7fd6ff", "#c98df5"],
    },
    props: {
      trees: ["tree_snow1", "tree_snow2", "tree_snowpine1"],
      bushes: ["bush_snow1", "bush_snow2", "bush_snow3"],
      decos: ["bush_snow2", "rock_b"],
      rocks: ["rock_e", "rock_b", "rock_c"],
      crys: ["crys_white1", "crys_blue1"],
    },
    ambient: { colors: ["#e8f4ff", "#a8b4cc", "#7fd6ff"], style: "snow" },
    tint: "#1e2430",
    waves: [
      { budget: 132, title: "GEADA MORDAZ", tip: "O inverno reúne as feras." },
      { budget: 148, title: "AVALANCHE DE CARAPAÇAS" },
      { budget: 166, title: "VENTO CORTANTE", draftAfter: true },
      { budget: 186, title: "MARCHA GLACIAL" },
      { budget: 206, title: "A TORA FINAL" },
      { budget: 228, title: "O CERCO FINAL" },
      { boss: true, budget: 20, title: "O DEVASTADOR", tip: "A terra treme. O rei dos predadores despertou." },
    ],
  },
];

// Textos de ajuda
export const HELP_LINES = [
  ["OBJETIVO", ""],
  ["Proteja a RAINHA através de " + MAPS.length + " mapas —", ""],
  ["cada um termina num CHEFÃO. Derrote o DEVASTADOR no fim.", ""],
  ["", ""],
  ["CONTROLES", ""],
  ["ESQ. (ARRASTAR)", "Mover a câmera / explorar o mapa"],
  ["ESQ. (CLIQUE)", "Ordenar unidades selecionadas"],
  ["DIR. (ARRASTAR)", "Caixa de seleção"],
  ["DIR. (CLIQUE)", "Selecionar 1 formiga / vazio desmarca"],
  ["DIR. DUPLO", "Selecionar tipo visível na tela"],
  ["WASD / SETAS", "Mover câmera"],
  ["RODA DO MOUSE", "Zoom"],
  ["G", "Invocar a próxima onda (+essência)"],
  ["F", "Convocar a guarda ao formigueiro"],
  ["ESPAÇO", "Centralizar no formigueiro"],
  ["1 A 7", "Chocar classes de formigas"],
  ["ESC", "Pausar / voltar"],
  ["", ""],
  ["DICAS", ""],
  ["CURANDEIRAS curam o exército. BOMBEIRAS queimam em área.", ""],
  ["BATEDORAS são baratas, velozes e interceptam invasores.", ""],
  ["Cristais ROXOS dão essência — a moeda da evolução eterna.", ""],
  ["Mutações valem na expedição. A ÁRVORE é para sempre.", ""],
];
