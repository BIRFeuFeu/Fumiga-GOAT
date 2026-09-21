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
// Quantas vezes a FORMIGA GIGANTE é maior que uma soldado comum. Muda aqui:
// o assado (main.js) e o desenho (render.js) se ajustam sozinhos.
export const GIANT_SCALE = 20;

// ---------------------------------------------------------------------------
// TAMANHO DE ASSADO dos sprites de formiga (em pixels do sprite girado).
// Fonte única: main.js assa com estes números e os testes (assets.mjs,
// layout.mjs) conferem contra eles — antes cada um tinha a própria cópia e
// podiam divergir em silêncio.
//
// A GIGANTE tem uma amarra extra: o "pad" dela precisa ser exatamente 5x o da
// soldado para que o fator de desenho saia inteiro (test/assets.mjs confere).
//   soldado 64 -> pad 83   |   gigante 326 -> pad 415 = 5x83  ✓
// ---------------------------------------------------------------------------
export const ANT_SIZES = {
  worker: 45, soldier: 64, spitter: 58, tank: 72, queen: 189,
  scout: 48, healer: 53, bomber: 61,
  trapjaw: 40, weaver: 45,
  giant: 326,                       // 5x o pad da soldado (ver conta acima)
  e_runner: 40, e_swarm: 45, e_warrior: 64, e_spitter: 61, e_reaper: 58,
  e_matron: 106, e_sentinel: 82,
};
/** A POTE-DE-MEL tem sprite próprio — assa no mesmo tamanho da operária. */
export const GATHERER_SIZE = ANT_SIZES.worker;

export const UNITS = {
  // ── COLETA/EXPLORAÇÃO ──────────────────────────────────────────────────
  // FORMIGA-CORTADEIRA (Atta cephalotes): corta folhas para cultivar o
  // fungo do ninho — cada entrega apressa o FUNGÁRIO (ver deposit()).
  worker: {
    id: "worker", key: null, fn: "OPERÁRIA", name: "FORMIGA-CORTADEIRA, A AGRICULTORA",
    tip: "Atta cephalotes: corta folhas para cultivar o fungo do ninho. Cada entrega apressa o FUNGÁRIO.",
    cost: 12, costGrow: 0.06, hatchTime: 2.0,
    hp: 26, dmg: 2.5, speed: 98, range: 13, atkCd: 0.7,
    gatherRate: 2.1, carry: 5, sprite: "worker", role: "worker",
    attack: false,
  },
  // FORMIGA-POTE-DE-MEL (Myrmecocystus mexicanus): operárias repletas são a
  // despensa viva — carregam mais e, na escassez, gotejam comida no ninho.
  gatherer: {
    id: "gatherer", key: null, fn: "COLETORA", name: "FORMIGA-POTE-DE-MEL, A DESPENSA",
    tip: "Myrmecocystus mexicanus: o gaster inchado de mel carrega bem mais - e, na escassez, goteja comida no formigueiro.",
    cost: 18, costGrow: 0.06, hatchTime: 2.2,
    hp: 24, dmg: 1.5, speed: 110, range: 12, atkCd: 0.9,
    gatherRate: 3.0, carry: 8, sprite: "gatherer", role: "worker",
    attack: false,
  },
  // FORMIGA-PRATA (Cataglyphis bombycina): a formiga mais rápida do mundo
  // (855mm/s) — arrancadas relâmpago em pleno deserto (ver moveToward).
  scout: {
    id: "scout", key: null, fn: "BATEDORA", name: "FORMIGA-PRATA, A VELOZ",
    tip: "Cataglyphis bombycina: a formiga mais rápida do mundo (855mm/s). Arrancadas de prata que revelam o mapa.",
    cost: 22, costGrow: 0.06, hatchTime: 2.4,
    hp: 52, dmg: 6.5, speed: 152, range: 13, atkCd: 0.4,
    aggro: 430, sprite: "scout", role: "fighter",
    attack: false,
  },
  // ── COMBATE/DEFESA ─────────────────────────────────────────────────────
  // FORMIGA-BALA (Paraponera clavata): o ferrão mais doloroso do mundo —
  // a poneratoxina deixa o inimigo LENTO (ver attackMelee).
  soldier: {
    id: "soldier", key: null, fn: "SOLDADO", name: "FORMIGA-BALA, A ATIRADORA",
    tip: "Paraponera clavata: o ferrão mais doloroso do mundo. Suas ferroadas deixam o inimigo LENTO.",
    cost: 30, costGrow: 0.06, hatchTime: 3.2,
    hp: 175, dmg: 18, speed: 74, range: 17, atkCd: 0.62,
    sprite: "soldier", role: "fighter",
  },
  // QUEIXO-DE-ARPÃO (Odontomachus bauri): mandíbulas a 200km/h em 0,13ms —
  // a mordida mais rápida do reino animal. Executa feridos e salta fora.
  trapjaw: {
    id: "trapjaw", key: null, fn: "ASSALTANTE", name: "QUEIXO-DE-ARPÃO, A ESTRONDOSA",
    tip: "Odontomachus bauri: mandíbulas a 200km/h em 0,13ms. Golpes em rajada, executa feridos e salta longe quando atingida.",
    cost: 48, costGrow: 0.06, hatchTime: 3.6,
    hp: 70, dmg: 14, speed: 96, range: 24, atkCd: 0.42,
    sprite: "trapjaw", role: "fighter",
  },
  // FORMIGA-ACROBATA (Crematogaster): ergue o gaster em coração e borrifa
  // veneno espumante que corrói com o tempo (ver spitAt/combat.js).
  spitter: {
    id: "spitter", key: null, fn: "CUSPIDORA", name: "FORMIGA-ACROBATA, A BAILARINA",
    tip: "Crematogaster: ergue o gaster em coração e borrifa veneno que corrói o inimigo com o tempo.",
    cost: 42, costGrow: 0.06, hatchTime: 3.8,
    hp: 60, dmg: 15, speed: 62, range: 125, atkCd: 1.1,
    projSpeed: 300, sprite: "spitter", role: "ranged",
  },
  // FORMIGA-DE-FOGO (Solenopsis invicta): o nome é o programa — brasa em
  // área com queimadura contínua.
  bomber: {
    id: "bomber", key: null, fn: "BOMBEIRA", name: "FORMIGA-DE-FOGO, A INCENDIÁRIA",
    tip: "Solenopsis invicta: o nome é o programa - bombas de brasa em área com queimadura contínua.",
    cost: 58, costGrow: 0.06, hatchTime: 4.6,
    hp: 84, dmg: 13, speed: 66, range: 96, atkCd: 1.6,
    projSpeed: 250, aoe: 56, burnDps: 7, burnDur: 3.2,
    // role "ranged" = posicionamento de atiradora; quem faz o projétil virar
    // bomba é a flag abaixo (o teste por role deixava a bomba sem efeito).
    bomb: true, sprite: "bomber", role: "ranged",
  },
  // CEFALOTE (Cephalotes varians): a cabeça em disco fecha a porta do ninho
  // (fragmose) — perto do formigueiro a casca quase dobra (ver takeDamage).
  tank: {
    id: "tank", key: null, fn: "GUARDA", name: "CEFALOTE, A PORTA-VIVA",
    tip: "Cephalotes varians: a cabeça em disco fecha a porta do ninho. Perto do formigueiro sua casca quase dobra (-45% de dano).",
    cost: 62, costGrow: 0.06, hatchTime: 5.0,
    hp: 360, dmg: 12, speed: 48, range: 19, atkCd: 0.8,
    taunt: 155, sprite: "tank", role: "fighter",
  },
  // ── CONSTRUÇÃO/CURA/CRIAÇÃO ────────────────────────────────────────────
  // FORMIGA-MATABELE (Megaponera analis): os únicos insetos que tratam
  // feridas com antibióticos — triagem: feridas críticas curam em dobro.
  healer: {
    id: "healer", key: null, fn: "CURANDEIRA", name: "FORMIGA-MATABELE, A RESGATADORA",
    tip: "Megaponera analis: os únicos insetos que tratam feridas com antibióticos. TRIAGEM: feridas críticas recebem cura em dobro.",
    cost: 46, costGrow: 0.06, hatchTime: 4.2,
    hp: 44, dmg: 0, speed: 92, range: 26, atkCd: 1,
    healRate: 13, healRange: 230, sprite: "healer", role: "healer",
    attack: false,
  },
  // FORMIGA-TECELÃ (Oecophylla smaragdina): costura o ninho com a seda das
  // larvas — cada Tecelã viva acelera escavação e berçário (ver nest.js).
  weaver: {
    id: "weaver", key: null, fn: "CONSTRUTORA", name: "FORMIGA-TECELÃ, A COSTUREIRA",
    tip: "Oecophylla smaragdina: costura o ninho com a seda das larvas. Cada Tecelã viva acelera escavação e berçário.",
    cost: 40, costGrow: 0.06, hatchTime: 4.5,
    hp: 55, dmg: 0, speed: 55, range: 13, atkCd: 1,
    gatherRate: 1.5, carry: 4, sprite: "weaver", role: "worker",
    attack: false,
  },
  // ── COLOSSO ────────────────────────────────────────────────────────────
  // DINOPONERA (Dinoponera australis): a maior formiga operária real. Vinte
  // soldados de ponta a ponta (drawScale sobre um assado 5x maior = 20x
  // exatos o frame da soldado), lenta, cara e única por expedição: atrai a
  // horda (taunt), esmaga com um golpe só e passa por cima do mato (smash).
  giant: {
    id: "giant", key: null, fn: "COLOSSA", name: "DINOPONERA, A COLOSSA",
    tip: "Dinoponera australis: a maior formiga operária real - 20 soldados de comprimento. Puxa a horda, esmaga a mata e mata com um golpe. Só cabe uma por expedição.",
    cost: 320, costGrow: 0.06, hatchTime: 7.0,
    hp: 3000, dmg: 95, speed: 30, range: 130, atkCd: 1.6,
    taunt: 420, sight: 720, smash: 300,
    sprite: "giant", role: "fighter",
    // o fator de desenho (GIANT_SCALE x a soldado) é amarrado no boot por
    // setRotDrawScale — ver main.js
    bodyR: 12 * GIANT_SCALE, maxAlive: 1,
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

// ---------------------------------------------------- PÓS-FINAL: ASCENSÃO ---
// A Névoa nunca morre de verdade: cada vitória da CAMPANHA destrava um nível
// a mais de desafio consciente (inspirado no Pacto do Castigo de Hades e na
// Ascensão de Slay the Spire). ascMods(lv) é a fonte única dos modificadores.
export const ASC_MAX = 20;
export const ASC_MILESTONES = [
  { lv: 2,  label: "ONDAS ROBUSTAS" },
  { lv: 5,  label: "FUGA RÁPIDA" },
  { lv: 8,  label: "CHEFES CRUÉIS" },
  { lv: 11, label: "CALMARIA CURTA" },
  { lv: 14, label: "COLHEITA MAGRA" },
  { lv: 17, label: "MARÉ INFINITA" },
  { lv: 20, label: "A NÉVOA PLENA" },
];
export function ascMods(lv = 0) {
  lv = Math.max(0, Math.min(ASC_MAX, lv | 0));
  return {
    hp: 1 + 0.08 * lv,                        // horda: vida
    dmg: 1 + 0.04 * lv,                       // horda: dano
    speed: 1 + (lv >= 5 ? 0.06 : 0),          // horda: pressa
    budget: 1 + (lv >= 2 ? 0.10 : 0) + (lv >= 17 ? 0.15 : 0),
    calm: lv >= 11 ? 0.7 : 1,                 // calmaria entre ondas
    foodMult: lv >= 14 ? 0.85 : 1,            // colheita rende menos
    bossHp: 1 + 0.06 * lv + (lv >= 20 ? 0.25 : 0),
    bossDmg: 1 + (lv >= 8 ? 0.15 : 0),
    ess: 1 + 0.15 * lv,                       // essência paga o desafio
  };
}
export function ascLabel(lv = 0) {
  let label = "A BRUMA DORME";
  for (const m of ASC_MILESTONES) if (lv >= m.lv) label = m.label;
  return label;
}

// ----------------------------------------------- PÓS-FINAL: ERAS E PROFECIAS ---
// As ERAS marcam as gerações do Formigueiro Eterno (uma por vitória); as
// PROFECIAS são os vaticínios da Matriarca, cumpridos por essência.
export const ERA_LINES = [
  "A PRIMEIRA GERAÇÃO DESCE DA MONTANHA",
  "O VALE APRENDE O CHEIRO DA COLÔNIA",
  "AS TRILHAS VIRAM ESTRADAS DE MUSGO",
  "A CHUVA ENCONTRA TÚNEIS QUE A ESPERAM",
  "O FUNGO CANTA AS ESTAÇÕES ANTES DA HORA",
  "A SEDA VIRA BANDEIRA NO TOPO DO MUNDO",
  "OUTRAS RAINHAS VÊM PEDIR MEMÓRIA",
  "A NÉVOA VOLTA — E ENCONTRA PORTAS",
  "O MAPA JÁ NASCE COM AS TRILHAS POSTAS",
  "A COLÔNIA JÁ É PAISAGEM",
];
export const PROPHECIES = [
  { id: "p_primeira", name: "O PRIMEIRO DEGRAU",    desc: "Vença a CAMPANHA", reward: 60 },
  { id: "p_asc5",     name: "MEMÓRIA DE BRUMA",     desc: "Vença a CAMPANHA na ASCENSÃO 5 ou mais", reward: 120 },
  { id: "p_asc10",    name: "A TRAVESSIA REFEITA",  desc: "Vença a CAMPANHA na ASCENSÃO 10 ou mais", reward: 200 },
  { id: "p_asc20",    name: "A NÉVOA PLENA",        desc: "Vença a CAMPANHA na ASCENSÃO 20", reward: 400 },
  { id: "p_onze",     name: "ARCA DE NOÉ",          desc: "Choque as 11 espécies em um único run", reward: 150 },
  { id: "p_dino",     name: "A COLOSSA VIVE",       desc: "Vença com uma DINOPONERA viva em campo", reward: 100 },
  { id: "p_nacao",    name: "NAÇÃO EM PÉ",          desc: "Vença com 16 formigas vivas ou mais", reward: 120 },
  { id: "p_rainha",   name: "SANGUE FRIO",          desc: "Vença sem a rainha cair de 50% de vida", reward: 100 },
  { id: "p_imacula",  name: "FLOR IMACULADA",       desc: "Vença a CAMPANHA sem perder formigas", reward: 250 },
  { id: "p_ciclo3",   name: "O CICLO SEMPRE VOLTA", desc: "Chegue ao CICLO 3 na SOBREVIVÊNCIA", reward: 150 },
  { id: "p_cacada",   name: "COLÔNIA ALFA",         desc: "Vença a CAÇADA de chefões", reward: 120 },
  { id: "p_ondas25",  name: "MARÉ QUE NÃO CESSA",   desc: "Repila 25 ondas em um único run", reward: 100 },
  { id: "p_mil",      name: "CEIFA MIL",            desc: "Acumule 1000 abates no total", reward: 150 },
  { id: "p_arvore",   name: "ÁRVORE EM FLOR",       desc: "Tenha 15 nós na Árvore da Evolução", reward: 120 },
  { id: "p_keystone", name: "SANGUE DE ESPÉCIE",    desc: "Maximize um keystone lendário", reward: 150 },
  { id: "p_era5",     name: "O REINO QUE NÃO TERMINA", desc: "Alcance a ERA 5 (cinco vitórias)", reward: 200 },
];

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
// Os MESMOS grupos e cores da fileira de formigas (loja) — a árvore e a
// colônia falam a mesma língua visual.
export const META_BRANCHES = {
  G: { name: "GUERRA",  color: "#ff4d5a" },  // ⚔️ combate/defesa
  C: { name: "COLETA",  color: "#7fd6a0" },  // 🍃 coleta/exploração
  H: { name: "CRIAÇÃO", color: "#6db7ff" },  // 🏥 construção/cura/criação
  R: { name: "REAL",    color: "#ffd479" },  // 👑 espinha da rainha
};

export const META_NODES = [
  { id: "raiz", br: "R", icon: "crown", name: "COLÔNIA ANCESTRAL",
    desc: "O coração do formigueiro eterno.", cost: [0], requires: [], x: 0, y: 0,
    tier: 2, sprite: "queen" },

  // ============================================================== ⚔️ GUERRA (combate/defesa) — as cores da fileira de formigas,
  { id: "g_dan", br: "G", icon: "fire_sword", name: "MANDÍBULA DE GUERRA",
    desc: "+10% de dano para todas as aliadas.", cost: [20, 35, 50, 70, 95], requires: ["raiz"], x: 2.1, y: 0,
    tier: 1, sprite: "soldier" },
  { id: "g_cri", br: "G", icon: "sk_fury", name: "FÚRIA CEGA",
    desc: "+4% de chance de crítico (dano x2).", cost: [45, 70, 100], requires: ["g_dan"], x: 3.2, y: 1.15,
    tier: 0 },
  { id: "g_cad", br: "G", icon: "sk_time", name: "CADÊNCIA DE GUERRA",
    desc: "+8% de velocidade de ataque.", cost: [40, 65, 95], requires: ["g_cri"], x: 4.3, y: 2.3,
    tier: 0 },
  { id: "g_bomb", br: "G", icon: "sk_bomb", name: "PÓLVORA NEGRA",
    desc: "+15% de raio da explosão da bombeira.", cost: [50, 85, 120], requires: ["g_cad"], x: 5.4, y: 3.45,
    tier: 1 },
  { id: "g_vid", br: "G", icon: "sk_heart", name: "CARAPAÇA DURA",
    desc: "+12% de vida para todas as aliadas.", cost: [20, 35, 50, 70, 95], requires: ["raiz"], x: 2.2, y: -1.4,
    tier: 1 },
  { id: "g_arm", br: "G", icon: "shield", name: "CARAPAÇA BLINDADA",
    desc: "-4% de dano recebido por todas as aliadas.", cost: [60, 100, 150], requires: ["g_vid"], x: 3.3, y: -2.5,
    tier: 0 },
  { id: "g_esq", br: "G", icon: "sk_tornado", name: "ESQUIVA",
    desc: "+5% de chance de esquivar por completo de um golpe.", cost: [45, 75, 110], requires: ["g_arm"], x: 4.4, y: -3.6,
    tier: 0 },
  { id: "g_esp", br: "G", icon: "sk_acid", name: "ESPINHOS DE QUITINA",
    desc: "Quem morde uma aliada leva 3 de dano por nível.", cost: [55, 90, 140], requires: ["g_esq"], x: 5.4, y: -4.5,
    tier: 0 },
  { id: "g_grd", br: "G", icon: "spider", name: "PATRULHA INICIAL",
    desc: "Começa a expedição com +1 soldado.", cost: [50, 90], requires: ["g_dan"], x: 3.3, y: -0.2,
    tier: 0 },
  { id: "g_alc", br: "G", icon: "sk_slash", name: "MANDÍBULAS LONGAS",
    desc: "+14 de alcance para as lutadoras.", cost: [35, 60, 90], requires: ["g_grd"], x: 4.4, y: -0.8,
    tier: 0 },
  { id: "g_fogo", br: "G", icon: "ember", name: "BRASA CONTÍNUA",
    desc: "+15% de dano de queimadura.", cost: [45, 75], requires: ["g_alc"], x: 5.5, y: -1.4,
    tier: 0 },
  { id: "k_bala", br: "G", icon: "sk_fury", name: "FERRÃO DA BALA",
    desc: "A poneratoxina da FORMIGA-BALA reforça a ferroada: +0,35s de lentidão por nível.", cost: [55, 110, 180], requires: ["g_dan"], x: 6.4, y: 4.5,
    tier: 2, sprite: "soldier" },
  { id: "k_arpao", br: "G", icon: "sk_slash", name: "CEIFA DA ARPÃO",
    desc: "O limiar da CEIFA sobe +8% por nível (de 22% a 46%), mas TODAS as aliadas perdem 5% de vida por nível.", cost: [60, 120, 190], requires: ["g_grd"], x: 6.6, y: -2.2,
    tier: 2, sprite: "trapjaw" },
  { id: "k_acrobata", br: "G", icon: "sk_acid", name: "VENENO DA ACROBATA",
    desc: "O borrifo corrosivo da ACROBATA dura +20% e corrói +25% mais forte por nível.", cost: [50, 100, 160], requires: ["g_alc"], x: 6.7, y: -0.9,
    tier: 2, sprite: "spitter" },
  { id: "k_cefalote", br: "G", icon: "shield", name: "CABEÇA DE CEFALOTE",
    desc: "A PORTA-VIVA aguenta mais: +5% de redução de dano e +30px de raio de guarda por nível (de 45% a 60%).", cost: [55, 105, 170], requires: ["g_esp"], x: 6.5, y: -5.3,
    tier: 2, sprite: "tank" },

  // ============================================================== 🍃 COLETA (coleta/exploração),
  { id: "t_col", br: "C", icon: "food", name: "FORAGEM",
    desc: "+15% de comida por pilha coletada.", cost: [25, 45, 70], requires: ["raiz"], x: -2.1, y: 0,
    tier: 0, sprite: "worker" },
  { id: "t_vel", br: "C", icon: "bolt", name: "MARCHA RÁPIDA",
    desc: "+10% de velocidade das operárias.", cost: [20, 35, 55], requires: ["t_col"], x: -3.3, y: -0.85,
    tier: 0 },
  { id: "t_carga", br: "C", icon: "scale", name: "BOLSAS PROFUNDAS",
    desc: "Operárias carregam +1 de carga.", cost: [30, 50, 70], requires: ["t_col"], x: -3.3, y: 0.85,
    tier: 0 },
  { id: "t_ini", br: "C", icon: "egg", name: "PROLE INICIAL",
    desc: "Começa a expedição com +2 operárias.", cost: [40, 75], requires: ["t_vel"], x: -4.5, y: -1.7,
    tier: 0 },
  { id: "t_ambar", br: "C", icon: "wing_gem", name: "VEIOS DE ÂMBAR",
    desc: "Cristais de essência rendem +2 por extração.", cost: [50, 85], requires: ["t_carga"], x: -4.5, y: 1.7,
    tier: 0 },
  { id: "t_rap", br: "C", icon: "clover", name: "COLHEITA RÁPIDA",
    desc: "+12% de velocidade de coleta em pilhas e veios.", cost: [35, 60, 95], requires: ["t_col"], x: -3.95, y: 0,
    tier: 0 },
  { id: "t_rede", br: "C", icon: "sk_banner", name: "REDE DE TRILHAS",
    desc: "+5% de velocidade para TODAS as formigas (fora do ninho).", cost: [40, 70, 110], requires: ["t_rap"], x: -5.4, y: 0,
    tier: 1 },
  { id: "t_estoque", br: "C", icon: "lock", name: "ESTOQUE INICIAL",
    desc: "Começa a expedição com +20 de comida.", cost: [30, 60], requires: ["t_ambar"], x: -5.6, y: 2.6,
    tier: 0 },
  { id: "t_atalho", br: "C", icon: "hourglass", name: "ATALHO",
    desc: "+5 de essência por invocar uma onda adiantada.", cost: [30, 55, 90], requires: ["t_rede"], x: -6.4, y: 0.9,
    tier: 0 },
  { id: "k_prata", br: "C", icon: "sun", name: "PASSO DA PRATA",
    desc: "As arrancadas relâmpago da FORMIGA-PRATA ficam 10% mais frequentes por nível.", cost: [45, 90, 140], requires: ["t_ini"], x: -5.6, y: -2.7,
    tier: 2, sprite: "scout" },
  { id: "k_mel", br: "C", icon: "potion", name: "ÂMBAR DA DESPENSA",
    desc: "O POTE-DE-MEL goteja com o estoque até +20 mais alto e 20% mais rápido por nível.", cost: [50, 100, 160], requires: ["t_estoque"], x: -6.7, y: 3.5,
    tier: 2, sprite: "gatherer" },
  { id: "k_cortadeira", br: "C", icon: "fungo", name: "JARDIM DA CORTADEIRA",
    desc: "Cada entrega de comida da CORTADEIRA apressa o fungário em +0,3s extra por nível.", cost: [45, 95, 150], requires: ["t_rede"], x: -6.7, y: -0.9,
    tier: 2, sprite: "worker" },

  // ============================================================== 🏥 CRIAÇÃO (construção/cura/criação de formigas),
  { id: "n_dig", br: "H", icon: "fist", name: "PATAS ESCAVADORAS",
    desc: "+30% de velocidade de escavação das câmaras.", cost: [35, 60, 95], requires: ["raiz"], x: 0, y: 1.5,
    tier: 0, sprite: "weaver" },
  { id: "n_corr", br: "H", icon: "bolt", name: "CORREDOR RÁPIDO",
    desc: "+10% de velocidade das formigas dentro do formigueiro.", cost: [30, 55, 85], requires: ["n_dig"], x: -1.3, y: 2.4,
    tier: 0 },
  { id: "n_berco", br: "H", icon: "egg", name: "BERÇÁRIO FECUNDO",
    desc: "-12% no tempo de chocar operárias no berçário.", cost: [35, 65, 100], requires: ["n_dig"], x: 1.3, y: 2.4,
    tier: 1 },
  { id: "n_ovo", br: "H", icon: "hourglass", name: "POSTURA REAL",
    desc: "A rainha bota ovos 10% mais rápido.", cost: [40, 70, 110], requires: ["n_corr"], x: -2.5, y: 3.3,
    tier: 0 },
  { id: "n_fung", br: "H", icon: "fungo", name: "FUNGÁRIO DO NINHO",
    desc: "+1 comida a cada ciclo do fungário.", cost: [40, 70, 105], requires: ["n_berco"], x: 0, y: 3.3,
    tier: 1 },
  { id: "n_eco", br: "H", icon: "sk_rico", name: "PLANTA ECONÔMICA",
    desc: "-8% no custo de escavar/evoluir câmaras.", cost: [35, 65, 100], requires: ["n_berco"], x: 2.5, y: 3.3,
    tier: 0 },
  { id: "n_desp", br: "H", icon: "food", name: "DESPENSA FUNDA",
    desc: "+1 comida em cada entrega feita dentro do formigueiro.", cost: [45, 80, 120], requires: ["n_fung"], x: -1.3, y: 4.4,
    tier: 0 },
  { id: "n_zelo", br: "H", icon: "horseshoe", name: "ZELO DA COLÔNIA",
    desc: "6% de chance da operária sobreviver a um golpe fatal (fica com 1).", cost: [45, 75, 110], requires: ["n_fung"], x: 1.3, y: 4.4,
    tier: 0 },
  { id: "k_tecela", br: "H", icon: "spider", name: "SEDA DA TECELÃ",
    desc: "A seda rende mais: os bônus de cada TECELÃ valem +15% mais por nível.", cost: [50, 100, 160], requires: ["n_desp", "n_zelo"], x: 0, y: 5.5,
    tier: 2, sprite: "weaver" },
  { id: "k_matabele", br: "H", icon: "heal", name: "BÁLSAMO DA MATABELE",
    desc: "A cura da MATABELE é +8% mais forte e a triagem ativa com feridas até +4% mais leves por nível.", cost: [50, 100, 160], requires: ["n_zelo"], x: 3.8, y: 4.4,
    tier: 2, sprite: "healer" },

  // ============================================================== 👑 REAL (a espinha da rainha),
  { id: "r_vida", br: "R", icon: "sk_heart", name: "SANGUE REAL",
    desc: "Rainha: +15% de vida máxima.", cost: [25, 45, 65], requires: ["raiz"], x: 0, y: -1.5,
    tier: 0 },
  { id: "r_reg", br: "R", icon: "heal", name: "NÉCTAR REAL",
    desc: "A rainha se alimenta 30% mais rápido.", cost: [25, 45, 65], requires: ["r_vida"], x: -1.3, y: -2.4,
    tier: 0 },
  { id: "r_ovo", br: "R", icon: "egg", name: "ÍNCUBO",
    desc: "Tempo de chocar -12%.", cost: [30, 50, 70], requires: ["r_vida"], x: 1.3, y: -2.4,
    tier: 0 },
  { id: "r_casca", br: "R", icon: "sk_frost", name: "CASCA DA RAINHA",
    desc: "-8% de dano recebido pela rainha.", cost: [40, 70, 110], requires: ["r_reg"], x: -2.5, y: -3.3,
    tier: 0 },
  { id: "r_xp", br: "R", icon: "clover", name: "SABEDORIA DA COLÔNIA",
    desc: "+10% de XP ganho (nível da colônia sobe mais rápido).", cost: [45, 80, 120], requires: ["r_ovo"], x: -0.1, y: -3.6,
    tier: 0 },
  { id: "r_regen", br: "R", icon: "potion", name: "VITALIDADE REAL",
    desc: "A rainha regenera 1,5 de vida por segundo.", cost: [40, 70, 110], requires: ["r_ovo"], x: 1.4, y: -3.6,
    tier: 0 },
  { id: "r_essin", br: "R", icon: "essence", name: "ESSÊNCIA ANCESTRAL",
    desc: "Começa a expedição com +20 de essência.", cost: [30, 55, 90], requires: ["r_casca"], x: -2.5, y: -4.6,
    tier: 0 },
  { id: "r_pop", br: "R", icon: "spider", name: "SUPERORGANISMO",
    desc: "+4 de população máxima.", cost: [35, 55, 80, 110], requires: ["raiz"], x: -1.35, y: -0.95,
    tier: 1 },
  { id: "r_ess", br: "R", icon: "sun", name: "ALMA DA COLÔNIA",
    desc: "+15% de toda essência ganha.", cost: [30, 55, 80], requires: ["r_regen"], x: 1.5, y: -4.8,
    tier: 1 },
  { id: "r_ren", br: "R", icon: "crown", name: "RENASCIMENTO",
    desc: "1x por expedição: a rainha renasce com 50% de vida.", cost: [160], requires: ["r_xp", "r_regen"], x: 0, y: -5.4,
    tier: 2 },
  { id: "k_dinoponera", br: "R", icon: "fist", name: "FÚRIA DA DINOPONERA",
    desc: "A colosso nasce com +25% de vida por nível, mas cada nível custa +40 de comida extra.", cost: [60, 120, 200], requires: ["r_vida"], x: -2.6, y: -1.9,
    tier: 2, sprite: "giant" },
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
    id: "nursery", name: "BERÇÁRIO", icon: "egg", max: 3,
    tip: "Ovos chocam mais rápido.",
    per: "+18% velocidade de choco por nível",
    costs: [{ food: 60, ess: 0 }, { food: 110, ess: 18 }, { food: 180, ess: 36 }],
  },
  pantry: {
    id: "pantry", name: "DESPENSA", icon: "food", max: 3,
    tip: "Depósitos de comida rendem mais.",
    per: "+15% comida por depósito por nível",
    costs: [{ food: 50, ess: 0 }, { food: 100, ess: 16 }, { food: 170, ess: 32 }],
  },
  barracks: {
    id: "barracks", name: "QUARTEL", icon: "shield", max: 3,
    tip: "Lutadoras e atiradoras treinam músculos de guerra.",
    per: "+12% dano de classes de combate por nível",
    costs: [{ food: 70, ess: 10 }, { food: 130, ess: 26 }, { food: 200, ess: 48 }],
  },
  fungus: {
    id: "fungus", name: "FUNGÁRIO", icon: "fungo", max: 3,
    tip: "Cultiva fungo: goteja comida com o tempo.",
    per: "+1 comida a cada 9s por nível",
    costs: [{ food: 55, ess: 8 }, { food: 105, ess: 20 }, { food: 175, ess: 40 }],
  },
  refinery: {
    id: "refinery", name: "REFINARIA", icon: "essence", max: 3,
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
      { budget: 9,  title: "PRIMEIRO SANGUE",   tip: "Primeiro sangue da travessia. A Névoa ficou lá embaixo." },
      { budget: 15, title: "ENXAME RASTEJANTE" },
      { budget: 22, title: "MANDÍBULAS",         draftAfter: true },
      { budget: 30, title: "MARÉ CRESCENTE" },
      { boss: true, budget: 10, title: "O TAMBORILADOR", tip: "A lebre tamborila o amanhecer. A planície cobra passagem." },
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
      { budget: 26, title: "SOMBRAS DO BOSQUE",  tip: "A floresta observa. Aqui a raposa caça colônias há cem gerações." },
      { budget: 34, title: "GANÂNCIA DAS SAÚVAS" },
      { budget: 42, title: "LEGIONÁRIAS",        draftAfter: true },
      { budget: 52, title: "CERCO DE MUSGO" },
      { boss: true, budget: 12, title: "A CAÇADORA ASTUTA", tip: "Ela conhece o cheiro de rainha melhor que ninguém." },
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
      { budget: 42, title: "BOLHUM PODRE", tip: "O brejo é a boca da Névoa. Atravessem depressa." },
      { budget: 50, title: "VOADORAS FAMINTAS" },
      { budget: 60, title: "PESTE CRISTALINA", draftAfter: true },
      { budget: 70, title: "LODO E SANGUE" },
      { budget: 82, title: "O CHAMADO DAS ÁGUAS" },
      { boss: true, budget: 14, title: "A SOMBRA ALADA", tip: "A tetraz mergulha sem aviso. Até a Névoa recua daqui." },
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
      { budget: 66, title: "PÓ E MANDÍBULAS", tip: "A areia guarda um trato antigo: filhas em troca de perdão." },
      { budget: 78, title: "CAVALCADA SECA" },
      { budget: 90, title: "DUNAS HOSTIS", draftAfter: true },
      { budget: 104, title: "LEGIONÁRIAS DA COLÔNIA RIVAL" },
      { budget: 118, title: "O EXÉRCITO DA MATRIARCA" },
      { boss: true, budget: 16, title: "A MATRIARCA RIVAL", tip: "Ela beijou a Névoa para sobreviver. A rainha não perdoa." },
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
      { budget: 96, title: "FOLHAS E ESPINHAS", tip: "O último verde antes do inverno patrulha em formação." },
      { budget: 110, title: "CAÇA DE OUTONO" },
      { budget: 126, title: "CASCOS TROVEJAM", draftAfter: true },
      { budget: 142, title: "O BANDO ESTÉRI" },
      { budget: 160, title: "REI CAÍDO DO BOSQUE" },
      { boss: true, budget: 18, title: "O GALHADA REAL", tip: "O outono coroado guarda o bosque. A coroa cobra um reino." },
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
      { budget: 132, title: "GEADA MORDAZ", tip: "O frio é só o hálito dela. A Névoa subiu junto." },
      { budget: 148, title: "AVALANCHE DE CARAPAÇAS" },
      { budget: 166, title: "VENTO CORTANTE", draftAfter: true },
      { budget: 186, title: "MARCHA GLACIAL" },
      { budget: 206, title: "A TORA FINAL" },
      { budget: 228, title: "O CERCO FINAL" },
      { boss: true, budget: 20, title: "O DEVASTADOR", tip: "O arauto do inverno desperta. No alto do pico, algo pálido observa." },
    ],
  },
];

// Textos de ajuda (tela COMO JOGAR) — o layout vive em game.js
export const HELP_GOAL = [
  "Proteja a RAINHA através de " + MAPS.length + " mapas —",
  "cada um termina num CHEFÃO. Derrote o DEVASTADOR no fim.",
];
export const HELP_CONTROLS = [
  ["ESQ. (ARRASTAR)", "Mover a câmera / explorar o mapa"],
  ["ESQ. (CLIQUE)", "Ordenar unidades selecionadas"],
  ["DIR. (ARRASTAR)", "Caixa de seleção"],
  ["DIR. (CLIQUE)", "Selecionar 1 formiga / limpar"],
  ["DIR. DUPLO", "Selecionar tipo visível na tela"],
  ["WASD / SETAS", "Mover câmera"],
  ["RODA DO MOUSE", "Zoom"],
  ["G", "Invocar a próxima onda (+ess)"],
  ["F", "Convocar a guarda ao formigueiro"],
  ["ESPAÇO", "Centralizar no formigueiro"],
  ["1 A 0", "Chocar classes (0 = Tecelã). A Dinoponera é só no card"],
  ["ESC", "Pausar / voltar"],
];
export const HELP_TIPS = [
  "MATABELES curam o exército - feridas críticas em dobro.",
  "PRATA é veloz e barata: intercepta invasores e revela o mapa.",
  "Cristais ROXOS dão essência — a moeda da evolução eterna.",
  "Mutações valem na expedição. A ÁRVORE é para sempre.",
];
