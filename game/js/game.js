// ============================================================================
// FUMIGA — orquestrador V3: PRETITLE -> TITLE -> MODE -> OPTIONS -> RUN + Planície Viva
// ============================================================================
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL, UNITS, START, MAPS, CHAMBERS,
  MUTATIONS, RARITY, HELP_GOAL, HELP_CONTROLS, HELP_CONTROLS_TOUCH, HELP_TIPS, CALM_START, MAX_MUTS, xpForLevel,
  ASC_MAX, ascMods, ascLabel, PROPHECIES, ERA_LINES,
} from "./config.js";
import { fogReset, fogUpdate, fogDraw, fogVisible, fogExplored, fogDrawMini } from "./fog.js";
import {
  G, mods, metaBonus, mutBonus, toggleMute, persistSave, loadSave, checkProphecies,
} from "./state.js";
import { IMG, rotFrame } from "./assets.js";
import { drawText, textWidth, wrapText, FONT } from "./font.js";
import { keys, pressed, mouse, initInput, touchMode } from "./input.js";
import { cam, camReset, updateCam, panCam, zoomCam, shake, screenToWorld, worldToScreen, visibleWorldRect } from "./camera.js";
import {
  spawnPart, burst, ring, floatText, clearParticles, updateParticles,
  impact, critBurst, healPulse, levelUpBurst, explosion, dustPoof, bloodSplatter, magicOrb,
} from "./particles.js";
import { initAudio, audioReady, SFX, setCombat, applyMix } from "./audio.js";
import { world, genWorld, MINI } from "./world.js";
import {
  allies, spawnQueen, spawnAnt, updateAllies, buyUnit, unitCost, popUsed, popCapTotal,
  unitLimitLeft, selectInRect, selectTypeOnScreen, clearSelection, selectedCount,
  orderSelected, orderAttackSelected, rallyDefenders, recomputeAllies,
  antExitNest, insideCount,
} from "./units.js";
import { foes, boss, clearFoes, updateFoes, updateBoss } from "./enemies.js";
import { projectiles, orbs, updateProjectiles, updateOrbs, clearCombat } from "./combat.js";
import {
  director, resetDirector, updateDirector, skipPeace, mapDef, waveDef, isLastMap, nextMapCalm,
  calmFrac, waveProgress,
} from "./waves.js";
import { rollDraft, applyMutation, mutationList } from "./mutations.js";
import {
  drawRun, drawTitleBg, drawSolidMenuBg, drawTitleMotes, drawPreTitle, drawPreTitleBg,
  drawModeSelect, drawModeCards, startTransition, updateTransition, drawTransition, hasTransition,
  transitionFx, notePointer, drawTitleLogo
} from "./render.js";
import { enterTree, updateTree, drawTree, treeClick } from "./meta.js";
import { colony, foodTrailAt, dangerAt } from "./brain.js";
import { BIOME_HUD, drawBiomeTexture, drawGasterBar, drawPheromoneOverlay, drawPheromoneLegend, drawFoodIcon, drawEssenceCrystal, drawTrailAnt, trailProgress, drawTreeRings, drawScentMinimap, drawWoodBanner, drawKitIcon, hudBiome } from "./lore_hud.js";
import { startCutscene, updateCutscene, drawCutscene, handleCutsceneInput, isCutsceneActive, startLoadingCutscene, getCutsceneDefs } from "./cutscenes.js";
import { uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect, dialogBox, isTouchUI, touchPad } from "./ui.js";
import { startTutorial, stopTutorial, updateTutorial, drawTutorial, tutEvent, TUT, tutorialCardRect } from "./tutorial.js";
import {
  nest, nestEnter, nestExit, nestUpdate, nestDraw, nestClick, nestHover,
  nestSendOut, nestCallBack,
} from "./nest.js";
import { rand, clamp, lerp, TAU, fmt } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ------------------------------------------------------------------ loja ----
// As 11 classes da colônia, separadas por grupo — cada uma é uma espécie
// real: ⚔️ combate/defesa · 🍃 coleta/exploração · 🏥 construção/cura/criação
// (e a Dinoponera, o colosso — sem atalho, só no card).
const SHOP = [
  { type: "soldier",  label: "BALA",      group: "combat" },
  { type: "trapjaw",  label: "ARPÃO",     group: "combat" },
  { type: "spitter",  label: "ACROBATA",  group: "combat" },
  { type: "bomber",   label: "FOGO",      group: "combat" },
  { type: "tank",     label: "CEFALOTE",  group: "combat" },
  { type: "worker",   label: "CORTADEIRA", group: "gather" },
  { type: "gatherer", label: "MEL",       group: "gather" },
  { type: "scout",    label: "PRATA",     group: "gather" },
  { type: "healer",   label: "MATABELE", group: "care" },
  { type: "weaver",   label: "TECELÃ",    group: "care" },
  { type: "giant",    label: "DINOPONERA", iconScale: 0.13, accent: "#ffd479", group: "colossus" },
];
const SHOP_GROUPS = { combat: "#ff4d5a", gather: "#7fd6a0", care: "#6db7ff", colossus: "#ffd479" };
const SHOP_W = 38, SHOP_PITCH = 42; // cards compactos da loja (rework HUD minimalista)
let shopOpen = false;
let rallyCooldown = 0; // FASE 4: cooldown rally F quando infiniteDash desligado

// ------------------------------------------------------------- modos de jogo --
const GAME_MODES = [
  {
    id: "campanha",
    name: "CAMPANHA",
    icon: "C",
    color: "#37e6c8",
    diff: "NORMAL • 6 MAPAS",
    desc: "A jornada completa\n6 biomas, 6 chefões\nEvolua a colônia eterna",
    stats: ["• 6 mapas progressivos", "• Chefões únicos", "• Tutorial ativo", "• Recompensa: 100%"],
    mapIdx: 0,
    endless: false,
  },
  {
    id: "sobrevivencia",
    name: "SOBREVIVÊNCIA",
    icon: "S",
    color: "#c77dff",
    diff: "DIFÍCIL • INFINITO",
    desc: "Ondas infinitas\nAté onde a colônia aguenta?\nRecursos escassos",
    stats: ["• Ondas infinitas", "• Dificuldade crescente", "• Sem chefões", "• Recompensa: 150%"],
    mapIdx: 0,
    endless: true,
  },
  {
    id: "enxame",
    name: "ENXAME RÁPIDO",
    icon: "R",
    color: "#ffb347",
    diff: "INTENSO • 10 MIN",
    desc: "Ação sem pausa\nOndas a cada 12s\nPara veteranos famintos",
    stats: ["• Ondas a cada 12s", "• Começa com exército", "• XP x2", "• Recompensa: 200%"],
    mapIdx: 2,
    fast: true,
  },
  {
    id: "cacada",
    name: "CAÇADA",
    icon: "B",
    color: "#ff4d5a",
    diff: "EXTREMO • CHEFES",
    desc: "Só chefões\nUm após o outro\nProve ser a colônia alfa",
    stats: ["• Só chefões", "• Sem coleta", "• Exército pré-montado", "• Recompensa: 300%"],
    mapIdx: 5,
    bossRush: true,
  },
];

let modeHover = -1;
let modeRects = [];
let ascRects = [];          // PÓS-FINAL: zonas de clique do seletor de ASCENSÃO
let selectedMode = GAME_MODES[0];

// ------------------------------------------------------------- options -- 5 abas (Áudio/Vídeo/Controles/Acessibilidade/Idioma)
// Layout medido pelo tamanho real do texto (sem sobreposição) + área de
// conteúdo ROLÁVEL: roda do mouse, setas/PgUp/PgDn ou arrastar vertical
// (mouse ou dedo). Botões da área usam toque (soltar sem arrastar), então
// rolar nunca dispara um controle por acidente.
let optionsReturn = "TITLE";
let optionsTab = 0; // 0=audio,1=video,2=controles,3=acess,4=idioma
let optionsTabPrev = -1;
let optionsScroll = 0;      // px rolados dentro da viewport
let optionsContentH = 0;    // altura do conteúdo (medida a cada render)
let optionsSwipeX = null, optionsSwipeY = null;
let optGrab = null;         // gesto em curso: {x,y,mode,slider}
let optSliders = [];        // barras de volume [{id,x,y,w}] em coords de tela
let modeSwipeX = null;
let modeScrollOffset = 0;
const OPTIONS_TABS = [
  { id: "audio", label: "ÁUDIO", color: "#37e6c8" },
  { id: "video", label: "VÍDEO", color: "#6db7ff" },
  { id: "controles", label: "CONTROLES", color: "#ffb347" },
  { id: "acess", label: "ACESSIBILIDADE", color: "#7fd6a0" },
  { id: "idioma", label: "IDIOMA", color: "#ffd479" },
];

/** Janela do conteúdo rolável (entre as abas e o rodapé). */
function optViewport() { return { x: 52, y: 156, w: VIEW_W - 104, h: 324 }; }
/** Multiplicador da FONTE GRANDE (igual ao de font.js). */
function optFS() { return G.save.accessibility.bigFont ? 1.3 : 1; }
/** Troca de aba pelo teclado: zera a rolagem como os botões fazem. */
function optSetTab(i) {
  i = clamp(i, 0, OPTIONS_TABS.length - 1);
  if (i !== optionsTab) { optionsTab = i; optionsScroll = 0; optGrab = null; SFX.uiClick(); }
}
/** Barra de volume sob o ponto (coords de tela) ou null. */
function optSliderAt(x, y) {
  for (const s of optSliders) {
    if (pointInRect(x, y, s.x, s.y, s.w, s.h)) return s;
  }
  return null;
}
/** Define o volume pela posição horizontal sobre a barra. */
function optSetVolume(sl, x, silent) {
  const v = Math.round(clamp((x - sl.x) / sl.w, 0, 1) * 20) / 20;
  G.save.settings[sl.id === "music" ? "musicVol" : "sfxVol"] = v;
  persistSave();
  applyMix();
  if (!silent) SFX.uiClick();
}

// O "modo mobile" é decidido por QUEM carrega o jogo (o shell de toque) e pelo
// ponteiro do aparelho — NUNCA pela largura da janela. Janela estreita no PC não
// é celular, e o layout de toque não pode inflar botões para fora do canvas.
function isMobileLayout() { return isTouchUI(); }

// ------------------------------------------------------------------ run -----
function newRun(mode = null, seedOverride = null) {
  const mSel = mode || selectedMode;
  // seedOverride: só o modo debug (?seed=) — mesmo mapa gerado toda vez
  const seed = seedOverride != null ? seedOverride >>> 0 : (Math.random() * 0xffffffff) >>> 0;
  resetDirector();
  const startMap = mSel.mapIdx || 0;
  genWorld(seed, startMap);
  director.mapIdx = startMap;
  fogReset();
  clearParticles();
  clearFoes();
  clearCombat();
  allies.length = 0;
  camReset();
  paused = false;
  nestExit();

  const m = metaBonus();
  const run = {
    seed,
    mode: mSel.id,
    modeDef: mSel,
    status: "running",
    endT: 0, payoutDone: false, payout: null,
    food: START.food + m.startFood + (mSel.fast ? 120 : 0) + (mSel.bossRush ? 200 : 0),
    essencePool: m.startEssence + (mSel.bossRush ? 100 : 0),
    level: mSel.fast ? 3 : 0,
    xp: 0, xpNext: xpForLevel(mSel.fast ? 4 : 1),
    fungusT: 9,
    kills: 0, wave: 0, bestWaveThisRun: 0, mapsCleared: startMap,
    mutations: new Set(), mutationLog: [],
    queenJustHit: 0,
    banner: { title: "MAPA " + (startMap+1) + "/" + MAPS.length + " — " + MAPS[startMap].name, sub: MAPS[startMap].sub, t: 4.4 },
    draft: null,
    elapsed: 0,
    heartbeatT: 0,
    rebirthUsed: false,
    selectT: 0,
    bossDefeated: false,
    mapIdx: startMap,
    transition: false,
    endless: !!mSel.endless,
    fast: !!mSel.fast,
    bossRush: !!mSel.bossRush,
    // PÓS-FINAL: ASCENSÃO DA NÉVOA (só campanha, só depois da 1ª vitória)
    ascension: mSel.id === "campanha" && G.save.best.wins > 0
      ? Math.max(0, Math.min(G.pendingAsc | 0, Math.min(G.save.ascension + 1, ASC_MAX))) : 0,
    hatched: new Set(),      // PROFECIAS: espécies nascidas neste run
    queenMinHp: 1,           // PROFECIAS: pior momento da rainha
    deaths: 0,               // PROFECIAS: formigas perdidas
    ascFood: 1,              // ASCENSÃO nv14: COLHEITA MAGRA
    invertT: 0,              // FASE2 grouse inverte controles
    chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  };
  G.run = run;
  if (run.ascension > 0) run.ascFood = ascMods(run.ascension).foodMult;

  spawnQueen(); // allies.queen fica apontando para ela (units.js)

  const A = world.anthill;
  const nW = START.workers + m.startWorkers + (mSel.fast ? 4 : 0) + (mSel.bossRush ? 6 : 0);
  for (let i = 0; i < nW; i++) {
    const a = rand(0, TAU);
    spawnAnt("worker", A.x + Math.cos(a) * (100 + rand(0, 30)), A.y + Math.sin(a) * (100 + rand(0, 30)));
  }
  for (let i = 0; i < START.gatherers + (mSel.fast ? 2 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("gatherer", A.x + Math.cos(a) * (130 + rand(0, 30)), A.y + Math.sin(a) * (130 + rand(0, 30)));
  }
  for (let i = 0; i < START.scouts + (mSel.fast ? 2 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("scout", A.x + Math.cos(a) * 210, A.y + Math.sin(a) * 210);
  }
  for (let i = 0; i < m.startSoldiers + (mSel.fast ? 6 : 0) + (mSel.bossRush ? 10 : 0); i++) {
    const a = rand(0, TAU);
    spawnAnt("soldier", A.x + Math.cos(a) * 190, A.y + Math.sin(a) * 190);
  }
  if (mSel.fast || mSel.bossRush) {
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU);
      spawnAnt("tank", A.x + Math.cos(a) * 180, A.y + Math.sin(a) * 180);
    }
    for (let i = 0; i < 2; i++) {
      const a = rand(0, TAU);
      spawnAnt("spitter", A.x + Math.cos(a) * 200, A.y + Math.sin(a) * 200);
    }
    spawnAnt("healer", A.x + rand(-60,60), A.y + rand(-60,60));
  }

  G.screen = "RUN";
  setCombat(0);

  if (!G.save.tutorial) startTutorial(); else stopTutorial(false);

  // A introdução pertence a esta expedição: sem timer solto que possa abrir
  // depois de o jogador sair, reiniciar ou entrar em outra tela.
  if (!G.save.cutscenes || !G.save.cutscenes.noite_branca) {
    startCutscene("noite_branca");
  } else {
    startCutscene(MAPS[startMap].id);
  }

  // transição de entrada
  startTransition("auto", "MODE", "RUN", 0, null);

  return run;
}

function endRun(won) {
  const run = G.run;
  run.status = won ? "won" : "lost";
  run.endT = won ? 2.0 : 1.9;
  G.timeScale = 0.3;
  G.slowMo = run.endT;
  if (won) SFX.win(); else SFX.lose();
  const A = world.anthill;
  shake(0.8);
  ring(A.x, A.y, { r0: 20, r1: 300, life: 0.8, color: won ? "#ffd479" : "#ff4d5a", width: 5 });
  if (won) {
    levelUpBurst(A.x, A.y);
  } else {
    explosion(A.x, A.y, 80, "#ff4d5a");
  }
}

export function settleRun() {
  const run = G.run;
  if (run.payoutDone) return;
  run.payoutDone = true;
  const em = metaBonus().essMult;
  const won = run.status === "won";
  const modeMult = run.modeDef ? (run.modeDef.id === "campanha" ? 1 : run.modeDef.id === "sobrevivencia" ? 1.5 : run.modeDef.id === "enxame" ? 2 : 3) : 1;
  const mapBonus = run.mapsCleared * 160;
  const waveBonus = run.wave * 8;
  const killBonus = run.kills;
  const relic = Math.round(run.essencePool * 0.1);
  const winBonus = won ? 200 : 0;
  const base = relic + waveBonus + killBonus + mapBonus + winBonus;
  // PÓS-FINAL: a ASCENSÃO paga essência extra proporcional ao desafio aceito
  const ascMult = run.ascension > 0 ? ascMods(run.ascension).ess : 1;
  const total = Math.round(base * em * modeMult * ascMult);
  run.payout = {
    relic, waveBonus, killBonus, mapBonus, winBonus, mult: em * modeMult * ascMult, total, modeMult,
    ascension: run.ascension || 0, ascMult,
  };

  G.save.essence += total;
  const b = G.save.best;
  b.runs++;
  if (won) b.wins++;
  b.wave = Math.max(b.wave, run.wave);
  b.maps = Math.max(b.maps || 0, run.mapsCleared);
  b.kills += run.kills;
  // PÓS-FINAL: a vitória da campanha avança a ERA e o teto da ASCENSÃO
  if (won && run.mode === "campanha") {
    G.save.era = (G.save.era || 0) + 1;
    if (run.ascension === (G.save.ascension || 0) && G.save.ascension < ASC_MAX) G.save.ascension++;
  }
  // PÓS-FINAL: PROFECIAS cumpridas pagam essência na hora
  const aliveTypes = allies.filter(a => !a.dead && !a.dying).map(a => a.type);
  const earned = checkProphecies(run, won, { alive: aliveTypes, cycle: director.cycle || 0 });
  if (earned.length) run.payout.prophecies = earned;
  persistSave();
}

// --------------------------------------------------------- avanço de mapa ---
function advanceMap() {
  const run = G.run;
  director.mapIdx++;
  run.mapIdx = director.mapIdx;
  const m = mapDef();

  genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
  fogReset();
  clearFoes();
  clearCombat();

  const A = world.anthill;
  // a colônia migra inteira: quem estava dentro do formigueiro sobe pela boca
  // antes de a nova terra ser gerada (senão ficaria presa na cena antiga)
  for (let i = allies.inside.length - 1; i >= 0; i--) antExitNest(allies.inside[i]);
  let k = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const ang = (k * 2.399) + 0.7;
    const d = a.type === "worker" ? 120 : 200;
    a.x = A.x + Math.cos(ang) * (d + (k % 5) * 22);
    a.y = A.y + Math.sin(ang) * (d + (k % 5) * 22);
    a.state = "idle";
    a.target = null; a.forcedTarget = null;
    a.pile = null; a.node = null; a.cmdPos = null;
    if (a.def.role !== "worker") a.guardPos = { x: a.x, y: a.y };
    else a.guardPos = null;
    k++;
  }
  const q = allies.queen;
  if (q) { q.x = A.x; q.y = A.y - 10; }
  cam.x = A.x; cam.y = A.y;

  nextMapCalm();

  if (q && !q.dead) {
    q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.4);
    healPulse(A.x, A.y);
    burst(A.x, A.y, { n: 30, color: ["#ffd479", "#7fd6a0", "#fff"], spMin: 30, spMax: 160, life: 0.8, glow: true });
  }

  run.banner = { title: "MAPA " + (director.mapIdx + 1) + "/" + MAPS.length + " — " + m.name, sub: (m.sub ? m.sub + " • " : "") + "O VASO MUDA: " + (m.loreName || ""), t: 4.6 };
  run.transition = false;
  SFX.chime();
  floatText(A.x, A.y - 120, "A COLÔNIA MIGRA PARA NOVAS TERRAS", { color: "#ffd479", life: 2.2, scale: 2 });
}

// -------------------------------------------------------------- seleção -----
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, moved: false };
const pan = { active: false, moved: false };
let touchHintT = -99; // MOBILE: relógio da dica "toque numa formiga"
const SIGHT = { worker: 210, fighter: 280, ranged: 320, healer: 260 };
let fogT = 0;

function resourceAt(wx, wy) {
  for (const p of world.piles) {
    if (p.amount > 0 && Math.hypot(p.x - wx, p.y - wy) < 46) return p;
  }
  for (const n of world.nodes) {
    if (n.amount > 0 && Math.hypot(n.x - wx, n.y - wy) < 48) return n;
  }
  return null;
}

function enemyAt(wx, wy) {
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    if (!(f.revealT > 0) && !fogVisible(f.x, f.y)) continue;
    if (Math.hypot(f.x - wx, f.y - wy) < f.bodyR + 14) return f;
  }
  return null;
}

function allyAt(wx, wy) {
  for (const a of allies) {
    if (a.dead || a.dying || a.inside) continue;
    if (Math.hypot(a.x - wx, a.y - wy) < a.bodyR + 10) return a;
  }
  return null;
}

function uiCapture() {
  for (const b of uiButtons()) {
    if (pointInRect(mouse.x, mouse.y, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

// ----------------------------------------------------------------- update ---
export function update(dt) {
  G.time += dt;

  if (mouse.justDown) notePointer(mouse.x, mouse.y);

  const transTo = updateTransition(dt);
  if (transTo) {
    G.screen = transTo;
  }

  if (pressed.KeyM) {
    const m = toggleMute();
    const p = screenToWorld(VIEW_W / 2, VIEW_H / 2 - 30);
    floatText(p.x, p.y, m ? "SOM: DESLIGADO" : "SOM: LIGADO", { color: "#efe9ff", life: 1.2 });
  }

  switch (G.screen) {
    case "PRETITLE": updatePreTitle(dt); break;
    case "TITLE": break;
    case "MODE": updateMode(dt); break;
    case "OPTIONS": updateOptions(dt); break;
    case "TREE": updateTreeScreen(dt); break;
    case "PROPHECY": updateProphecyScreen(dt); break;
    case "MEMORY": updateMemoryScreen(dt); break;
    case "HELP": break;
    case "RUN": updateRun(dt); break;
  }

  updateParticles(dt * (G.screen === "RUN" ? G.timeScale : 1));

  if (G.slowMo > 0) {
    G.slowMo -= dt;
    if (G.slowMo <= 0) G.timeScale = 1;
  }
}

function updatePreTitle(dt) {
  if (mouse.justDown || pressed.Enter || pressed.Space) {
    notePointer(mouse.x, mouse.y);
    SFX.uiClick();
    startTransition("auto", "PRETITLE", "TITLE", 0, () => {
      G.screen = "TITLE";
    });
  }
}

function updateMode(dt) {
  modeHover = -1;
  for (let i = 0; i < modeRects.length; i++) {
    const r = modeRects[i];
    if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) {
      modeHover = r.idx;
      break;
    }
  }
  // swipe mobile para cards - FASE 6 FINAL: scroll visual + touch feedback
  const mobile = isMobileLayout();
  if (mobile) {
    if (mouse.justDown) modeSwipeX = mouse.x;
    if (mouse.justUp && modeSwipeX !== null) {
      const dx = mouse.x - modeSwipeX;
      if (Math.abs(dx) > 50) {
        // navega entre modos com swipe - scroll visual
        if (dx < 0) modeScrollOffset = Math.min(modeScrollOffset + 1, GAME_MODES.length - 1);
        if (dx > 0) modeScrollOffset = Math.max(modeScrollOffset - 1, 0);
        modeHover = modeScrollOffset;
        if (navigator.vibrate) navigator.vibrate(15);
        SFX.uiClick();
      }
      modeSwipeX = null;
    }
  }
  // FASE 6 FINAL: se modeScrollOffset mudou, garante hover acompanha
  if (mobile && modeScrollOffset >= 0 && modeHover === -1) {
    // não força hover se mouse não sobre card, mas mantém scroll
  }
  // PÓS-FINAL — seletor de ASCENSÃO DA NÉVOA (campanha; destrava após a 1ª vitória)
  if (mouse.justDown && G.save.best.wins > 0) {
    for (const r of ascRects) {
      if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) {
        const maxSel = Math.min(G.save.ascension + 1, ASC_MAX);
        G.pendingAsc = Math.max(0, Math.min(maxSel, (G.pendingAsc | 0) + r.d));
        SFX.uiClick();
        notePointer(mouse.x, mouse.y);
        return;
      }
    }
  }
  if (mouse.justDown && modeHover >= 0) {
    notePointer(mouse.x, mouse.y);
    selectedMode = GAME_MODES[modeHover];
    if (mobile && navigator.vibrate) navigator.vibrate(20);
    SFX.uiClick();
    newRun(selectedMode);
    return;
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    SFX.uiClick();
    startTransition("auto", "MODE", "TITLE", 0, () => { G.screen = "TITLE"; });
  }
}

function updateOptions(dt) {
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    SFX.uiClick();
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  const V = optViewport();
  if (optionsTab !== optionsTabPrev) { optionsTabPrev = optionsTab; optionsScroll = 0; optGrab = null; }
  // rolagem: roda do mouse, setas seguradas e PgUp/PgDn
  if (mouse.wheel) { optionsScroll += mouse.wheel * 40; mouse.wheel = 0; }
  if (keys.ArrowDown) optionsScroll += 300 * dt;
  if (keys.ArrowUp) optionsScroll -= 300 * dt;
  if (pressed.PageDown) optionsScroll += V.h * 0.85;
  if (pressed.PageUp) optionsScroll -= V.h * 0.85;
  if (pressed.ArrowLeft) optSetTab(optionsTab - 1);
  if (pressed.ArrowRight) optSetTab(optionsTab + 1);
  // gesto: começa no pressionar dentro da viewport; vira "slider" se o
  // primeiro movimento for horizontal sobre uma barra de volume, senão
  // vira rolagem vertical (toque = soltar sem arrastar, tratado no botão)
  if (mouse.justDown) {
    optionsSwipeX = mouse.x; optionsSwipeY = mouse.y;
    optGrab = pointInRect(mouse.x, mouse.y, V.x, V.y, V.w, V.h)
      ? { x: mouse.x, y: mouse.y, mode: null, slider: optSliderAt(mouse.x, mouse.y) }
      : null;
  }
  if (optGrab && mouse.down && !optGrab.mode) {
    const dx = mouse.x - optGrab.x, dy = mouse.y - optGrab.y;
    if (Math.hypot(dx, dy) > 10) {
      optGrab.mode = (optGrab.slider && Math.abs(dx) >= Math.abs(dy)) ? "slider" : "scroll";
    }
  }
  if (optGrab && optGrab.mode === "scroll" && mouse.down) {
    optionsScroll -= (mouse.y - mouse.lastY);
  }
  if (optGrab && optGrab.mode === "slider" && mouse.down && optGrab.slider) {
    optSetVolume(optGrab.slider, mouse.x, true);
  }
  if (mouse.justUp) {
    const wasSlider = optGrab && optGrab.mode === "slider";
    if (optGrab && !optGrab.mode && optGrab.slider) optSetVolume(optGrab.slider, mouse.x, false);
    optGrab = null;
    // swipe horizontal troca de aba (mobile); vertical dominante só rola
    if (isMobileLayout() && optionsSwipeX !== null && !wasSlider) {
      const dx = mouse.x - optionsSwipeX, dy = mouse.y - optionsSwipeY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        optSetTab(optionsTab + (dx < 0 ? 1 : -1));
      }
    }
    optionsSwipeX = optionsSwipeY = null;
  }
  optionsScroll = clamp(optionsScroll, 0, Math.max(0, optionsContentH - V.h));
}

function updateTreeScreen(dt) {
  updateTree(dt);
  if (mouse.justDown && mouse.y > 90 && !uiCapture()) treeClick();
  if (pressed.Escape) {
    SFX.uiClick();
    backFromTree();
  }
}

// --------------------------------------------------------------- mundo fora --
// Lista reutilizada por frame: TODAS as aliadas menos quem está dentro do
// formigueiro. Inimigos, chefes e projéteis só enxergam esta lista — quem
// desceu pela boca não pode ser alvo de ninguém lá fora.
const _outside = [];
function outsideAllies() {
  _outside.length = 0;
  for (const a of allies) if (!a.inside) _outside.push(a);
  _outside.queen = allies.queen;
  return _outside;
}

/**
 * Um tick do MUNDO (ondas, formigas de fora, inimigos, projéteis, essência,
 * fungário, níveis e névoa). É o mesmo tick para a expedição normal e para o
 * formigueiro aberto — é isso que faz as duas telas rodarem ao mesmo tempo.
 */
function worldTick(simDt, run) {
  // a colônia de DENTRO também trabalha enquanto o jogador está no mundo
  // (visible=false: o turno produz, mas a chocagem grátis espera a visita)
  if (!run.baseOpen) nestUpdate(simDt, false);
  updateDirector(simDt);
  updateAllies(simDt, foes);
  const outside = outsideAllies();
  updateFoes(simDt, outside);
  if (boss) updateBoss(simDt, outside);
  updateProjectiles(simDt, outside, foes);
  const gained = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
  if (gained > 0) {
    const refMult = 1 + 0.15 * run.chambers.refinery;
    run.essencePool += Math.round(gained * metaBonus().essMult * refMult);
    tutEvent("essence");
  }
  spawnAmbient(simDt);

  run.fungusT -= simDt;
  if (run.fungusT <= 0) {
    run.fungusT = 9;
    const crop = run.chambers.fungus + metaBonus().fungusRate;
    if (crop > 0) run.food += crop;
  }

  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpForLevel(run.level + 1);
    recomputeAllies();
    SFX.chime();
    const A2 = world.anthill;
    ring(A2.x, A2.y, { r0: 24, r1: 190, life: 0.7, color: "#6db7ff", width: 4 });
    levelUpBurst(A2.x, A2.y - 20);
    floatText(A2.x, A2.y - 150, "NÍVEL " + run.level + "! A COLÔNIA FICOU MAIS FORTE", {
      color: "#6db7ff", life: 2.2, scale: 2,
    });
  }

  fogT += simDt;
  if (fogT >= 0.12) {
    fogT = 0;
    const beings = [];
    const nester = allies.queen;
    if (nester && !nester.dead) beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 360 });
    else beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 240 });
    for (const a of allies) {
      if (a.dead || a.dying || a.type === "queen" || a.inside) continue;
      beings.push({ x: a.x, y: a.y, sight: a.def.sight || SIGHT[a.def.role] || 240 });
    }
    if (boss && !boss.dead && (boss.revealT || 0) > 0) beings.push({ x: boss.x, y: boss.y, sight: 320 });
    fogUpdate(beings);
  }
}

// --------------------------------------------------------------------- RUN --
function updateRun(dt) {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  // cutscene HQ update
  if (isCutsceneActive()) {
    const res = updateCutscene(dt);
    if (res === "close") {
      // loading closed, continue
    }
    // input handled in separate?
    if (handleCutsceneInput(pressed, mouse)) {
      // handled
    }
    return;
  }
  // FASE 2: gameSpeed + acessibilidade slowMo combinados
  const baseSpeed = G.save.settings.gameSpeed || 1;
  const slowMult = G.save.accessibility.slowMo ? 0.5 : 1;
  const totalSpeed = baseSpeed * slowMult;
  const simDt = dt * G.timeScale * totalSpeed;
  run.elapsed += simDt;

  // ------------------------------------------------ FORMIGUEIRO (duas telas) --
  // REWORK: abrir o formigueiro NÃO congela mais o mundo. Enquanto o jogador
  // olha o lado de dentro, a colônia continua trabalhando, as ondas continuam
  // vindo e quem está lá fora vive a própria vida — o "OLHO LÁ FORA" mostra
  // exatamente esse mundo rodando (ver drawOutsideEye em render.js).
  if (run.baseOpen) {
    if (pressed.Escape || pressed.KeyB) { closeNest(run, true); hudInputless(dt); return; }
    nestUpdate(dt, true);
    if (run.status === "running" && !paused) worldTick(simDt, run);
    // A BOCA: L solta uma formiga para fora, P chama uma de volta para dentro
    // (o mesmo vale pela camada de toque — ver game/mobile/touch.js)
    if (pressed.KeyL || pressed.PageUp) nestSendOut(1);
    if (pressed.KeyP || pressed.PageDown) nestCallBack(1);
    hudInputless(dt);
    return;
  }

  if (run.status === "running" && pressed.Escape) {
    paused = !paused;
    SFX.uiClick();
  }
  if (G.screen !== "RUN") return;

  if (run.status === "won" || run.status === "lost") {
    run.endT -= dt;
    updateAllies(simDt, foes);
    updateFoes(simDt, allies);
    if (boss) updateBoss(simDt, allies);
    updateProjectiles(simDt, allies, foes);
    if (run.endT <= 0 && run.status !== "ended") {
      settleRun();
      run.status = "ended";
    }
    hudInputless(dt);
    return;
  }

  if (run.status === "ended") { hudInputless(dt); return; }
  if (paused) { hudInputless(dt); return; }

  if (run.transition) {
    hudInputless(dt);
    const g2 = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
    if (g2 > 0) run.essencePool += Math.round(g2 * metaBonus().essMult);
    return;
  }

  // FASE2 SOMBRA ALADA: inverte controles
  if (G.run && G.run.invertT > 0) {
    G.run.invertT -= dt;
  }
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (G.run && G.run.invertT > 0) { mx = -mx; my = -my; }
  if (mx && my) { mx *= 0.7071; my *= 0.7071; }
  if (mx || my) { TUT.camAccum += 400 * dt; }
  updateCam(dt, mx, my);
  if (mouse.wheel) zoomCam(mouse.wheel, mouse.x, mouse.y);
  if (pressed.Space) { cam.x = world.anthill.x; cam.y = world.anthill.y; }

  if (!run.draft && director.pendingDrafts > 0 && director.phase === "calm" && !run.transition) {
    director.pendingDrafts--;
    run.draft = { options: rollDraft(), t: 0 };
    SFX.chime();
    const A = world.anthill;
    magicOrb(A.x, A.y - 40, "#c77dff");
  }
  if (run.draft) {
    run.draft.t += dt;
    for (let i = 0; i < run.draft.options.length; i++) {
      if (pressed["Digit" + (i + 1)]) {
        pickDraft(i);
        return;
      }
    }
    hudInputless(dt);
    return;
  }

  if (TUT.active && pressed.KeyT) stopTutorial(true);
  if (TUT.active) updateTutorial(dt, run);

  if (director.phase === "mapClear" && !run.transition && run.status === "running") {
    // (só CAMPANHA/CAÇADA chegam aqui: no modo SOBREVIVÊNCIA o chefão é marco
    // de ciclo e o fluxo volta direto para a calmaria em waves.js)
    run.transition = true;
    SFX.win();
    return;
  }

  for (let i = 0; i < SHOP.length; i++) {
    // teclas 1-9 nas nove primeiras classes, 0 na décima (Tecelã); a
    // Dinoponera é a 11ª e nasce só pelo card da fileira
    const hot = i < 9 ? "Digit" + (i + 1) : i === 9 ? "Digit0" : null;
    if (hot && pressed[hot]) {
      const r = buyUnit(SHOP[i].type);
      if (!r.ok) {
        const wp = screenToWorld(mouse.x, mouse.y - 20);
        floatText(wp.x, wp.y, r.why, { color: "#ff4d5a", life: 1 });
      }
    }
  }
  if (pressed.KeyQ) { shopOpen = !shopOpen; SFX.uiClick(); }
  if (pressed.KeyG && director.phase === "calm") skipPeace();
  if (pressed.KeyB && run.status === "running") { openNest(run); }
  // FASE 4 FINAL: infiniteDash - sem cooldown quando ligado, 3s cooldown quando desligado
  if (rallyCooldown > 0) rallyCooldown -= simDt;
  if (pressed.KeyF) {
    const infinite = G.save.accessibility.infiniteDash;
    if (!infinite && rallyCooldown > 0) {
      floatText(world.anthill.x, world.anthill.y - 90, "RALI EM RECARGA " + rallyCooldown.toFixed(1) + "s", { color: "#ff4d5a", life: 1.0 });
      SFX.deny && SFX.deny();
    } else {
      const n = rallyDefenders(world.anthill);
      tutEvent("rally", n);
      if (n > 0) floatText(world.anthill.x, world.anthill.y - 110, "GUARDA FORMADA! (" + n + ")" + (infinite ? " ∞" : ""), { color: "#37e6c8", life: 1.4 });
      ring(world.anthill.x, world.anthill.y, { r0: 40, r1: 200, life: 0.5, color: "#37e6c8", width: 3 });
      if (!infinite) rallyCooldown = 3.0;
    }
  }

  worldTick(simDt, run);

  const q = allies.queen;
  if (q && q.hp <= 0 && !q.dead) {
    // acessibilidade invencível
    if (G.save.accessibility.invincible) {
      q.hp = q.maxHp * 0.3;
      floatText(world.anthill.x, world.anthill.y - 80, "MODO ACESSÍVEL: RAINHA PROTEGIDA", { color: "#7fd6a0", life: 1.5 });
      return;
    }
    if (metaBonus().rebirth && !run.rebirthUsed) {
      run.rebirthUsed = true;
      q.hp = q.maxHp * 0.5;
      q.flash = 0.4;
      SFX.rebirth();
      ring(world.anthill.x, world.anthill.y, { r0: 14, r1: 260, life: 0.9, color: "#c77dff", width: 6 });
      burst(world.anthill.x, world.anthill.y, { n: 46, color: ["#c77dff", "#ffd479", "#efe9ff"], spMin: 40, spMax: 220, life: 0.9, glow: true });
      floatText(world.anthill.x, world.anthill.y - 110, "RENASCIMENTO REAL!", { color: "#c77dff", life: 2.2, scale: 2 });
    } else {
      q.dead = true;
      endRun(false);
      return;
    }
  }
  if (run.status === "running" && run.bossDefeated && isLastMap() && run.bossDefeated === mapDef().boss && !run.endless && !run.bossRush) {
    endRun(true);
    return;
  }
  if (run.bossRush && run.kills >= 3 && run.status === "running") {
    if (run.mapsCleared >= 3) { endRun(true); return; }
  }

  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    run.heartbeatT -= dt;
    if (run.heartbeatT <= 0) { run.heartbeatT = 0.95; SFX.heart(); }
  }

  if (!uiCapture()) runMouseWorld(dt);

  hudInputless(dt);
}

function spawnAmbient(simDt) {
  const def = world.def;
  if (!def) return;
  // reduz partículas se acessibilidade
  if (G.save.accessibility.reducedParticles && Math.random() < 0.6) return;
  if (!G.save.settings.particles && Math.random() < 0.7) return;
  const style = def.ambient.style;
  const cols = def.ambient.colors;
  const rate = style === "snow" || style === "sand" ? 14 : 9;
  if (Math.random() > simDt * rate) return;
  const vis = visibleWorldRect(0);
  const x = rand(vis.x0, vis.x1), y = rand(vis.y0, vis.y1);
  let vx = rand(-6, 6), vy = rand(-18, -7), life = rand(2.5, 6), size = rand(1.2, 2.4);
  const col = cols[(Math.random() * cols.length) | 0];
  let glow = true;
  switch (style) {
    case "sand":  vx = rand(60, 130); vy = rand(-4, 10); life = rand(0.9, 1.8); size = rand(1, 2); glow = false; break;
    case "snow":  vx = rand(-14, 4); vy = rand(16, 30); life = rand(3, 6); size = rand(1.2, 2.6); break;
    case "leaves":vx = rand(-24, 10); vy = rand(10, 26); life = rand(2.5, 5); size = rand(1.6, 2.8); glow = false; break;
    case "wisps": vx = rand(-8, 8); vy = rand(-22, -10); life = rand(3, 6.5); break;
    case "spores":vx = rand(-10, 10); vy = rand(-12, -4); life = rand(2.5, 5.5); break;
    case "pollen":vx = rand(-10, 10); vy = rand(-14, -5); life = rand(2.2, 5); break;
  }
  spawnPart({ x, y, vx, vy, life, size, sizeEnd: 0.6, color: col, glow, drag: 1 });
}

function hudInputless(dt) {
  const run = G.run;
  if (run && run.banner && run.banner.t > 0) run.banner.t -= dt;
}

function runMouseWorld(dt) {
  const w = screenToWorld(mouse.x, mouse.y);

  if (mouse.justDown) {
    pan.active = true;
    pan.moved = false;
  }
  if (pan.active && mouse.down) {
    const dx = mouse.x - mouse.lastX, dy = mouse.y - mouse.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      panCam(-dx / cam.zoom, -dy / cam.zoom);
      if (dx * dx + dy * dy > 9) pan.moved = true;
      TUT.camAccum += Math.abs(dx) + Math.abs(dy);
    }
  }
  if (pan.active && mouse.justUp) {
    pan.active = false;
    if (!pan.moved) {
      let consumed = false;
      // MOBILE (gesto inteligente): toque em cima de uma formiga a seleciona;
      // toque longe com nada selecionado dá uma dica rápida. Fora do modo
      // toque (touchMode.smart = false) nada disso roda — PC intacto.
      if (touchMode.smart) {
        const ally = allyAt(w.x, w.y);
        if (ally) {
          clearSelection();
          ally.selected = true;
          SFX.select();
          tutEvent("selected", 1);
          consumed = true;
        } else if (selectedCount() === 0 && G.time - touchHintT > 6) {
          touchHintT = G.time;
          floatText(w.x, w.y - 16, "TOQUE NUMA FORMIGA PARA SELECIONAR", { color: "#9a8fc0", life: 1.4 });
        }
      }
      if (!consumed && selectedCount() > 0) {
        const foe = enemyAt(w.x, w.y);
        if (foe) {
          if (orderAttackSelected(foe) > 0) {
            ring(foe.x, foe.y, { r0: 6, r1: 40, life: 0.4, color: "#ff4d5a", width: 3 });
            impact(foe.x, foe.y, { color: "#ff4d5a", power: 1.2 });
          }
        } else {
          const res = resourceAt(w.x, w.y);
          const n = orderSelected(w.x, w.y, { resourceAt });
          if (n > 0) {
            ring(w.x, w.y, { r0: 4, r1: 28, life: 0.35, color: res ? "#ffd479" : "#37e6c8", width: 2 });
            if (res) tutEvent("gatherOrder", res);
          }
        }
      }
    }
  }

  if (mouse.justRightDown) {
    sel.active = true;
    sel.moved = false;
    sel.x0 = w.x; sel.y0 = w.y; sel.x1 = w.x; sel.y1 = w.y;
  }
  if (sel.active && mouse.right) {
    sel.x1 = w.x; sel.y1 = w.y;
    if (Math.hypot(sel.x1 - sel.x0, sel.y1 - sel.y0) > 8 / cam.zoom) sel.moved = true;
  }
  if (sel.active && mouse.justRightUp) {
    sel.active = false;
    if (sel.moved) {
      const n = selectInRect(sel.x0, sel.y0, sel.x1, sel.y1, keys.ShiftLeft || keys.ShiftRight);
      if (n > 0) tutEvent("selected", n);
      else if (!(keys.ShiftLeft || keys.ShiftRight) && selectedCount() === 0) clearSelection();
    } else {
      const a = allyAt(sel.x0, sel.y0);
      if (a) {
        if (!(keys.ShiftLeft || keys.ShiftRight)) clearSelection();
        a.selected = true;
        SFX.select();
        tutEvent("selected", 1);
      } else {
        clearSelection();
      }
    }
  }
  if (mouse.rdbl) {
    const a = allyAt(w.x, w.y);
    if (a) {
      const vis = visibleWorldRect(0);
      const n = selectTypeOnScreen(a.type, vis);
      if (n > 0) tutEvent("selected", n);
    }
  }
}

function pickDraft(i) {
  const run = G.run;
  const m = run.draft.options[i];
  if (!m) return;
  applyMutation(m);
  run.draft = null;
  SFX.buy();
  const A = world.anthill;
  magicOrb(A.x, A.y - 30, RARITY[m.rar].color);
}

// ------------------------------------------------------------------ render --
let paused = false;

export function render(dt) {
  ctx.imageSmoothingEnabled = false;
  uiBegin();
  const fx = transitionFx();
  ctx.save();
  if (fx.alpha < 1) ctx.globalAlpha = fx.alpha;
  if (fx.scale !== 1 || fx.ox || fx.oy) {
    ctx.translate(VIEW_W / 2 + fx.ox, VIEW_H / 2 + fx.oy);
    ctx.scale(fx.scale, fx.scale);
    ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
  }
  switch (G.screen) {
    case "BOOT": break;
    case "PRETITLE": renderPreTitleScreen(); break;
    case "TITLE": renderTitle(); break;
    case "MODE": renderModeScreen(); break;
    case "OPTIONS": renderOptions(); break;
    case "HELP": renderHelp(); break;
    case "TREE": {
      const hud = drawTree(ctx, dt);
      if (hud === "back") backFromTree();
      else if (hud === "prophecies") openProphecies();
      else if (hud === "memories") openMemories();
      break;
    }
    case "PROPHECY": renderProphecyScreen(); break;
    case "MEMORY": renderMemoryScreen(); break;
    case "RUN": renderRun(); break;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (hasTransition()) drawTransition(ctx);
  cursorCustom();
}

function cursorCustom() {
  if (G.screen !== "RUN") { canvas.style.cursor = "default"; return; }
  canvas.style.cursor = "none";
  ctx.strokeStyle = "rgba(239,233,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mouse.x - 8, mouse.y); ctx.lineTo(mouse.x - 2, mouse.y);
  ctx.moveTo(mouse.x + 2, mouse.y); ctx.lineTo(mouse.x + 8, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 8); ctx.lineTo(mouse.x, mouse.y - 2);
  ctx.moveTo(mouse.x, mouse.y + 2); ctx.lineTo(mouse.x, mouse.y + 8);
  ctx.stroke();
  ctx.fillStyle = "#ffd479";
  ctx.fillRect(mouse.x - 1, mouse.y - 1, 2, 2);
}

// --------------------------------------------------------------- PRE-TITLE --
function renderPreTitleScreen() {
  drawPreTitle(ctx, G.time);
}

// ------------------------------------------------------------------ título ---
function renderTitle() {
  drawTitleBg(ctx);
  drawTitleMotes(ctx, G.time);

  const mobile = isMobileLayout();
  const tY = 54 + Math.sin(G.time * 0.7) * 2.5;
  drawTitleLogo(ctx, G.time, 56, tY, 5.0);

  ctx.fillStyle = "rgba(8,6,14,0.58)";
  ctx.fillRect(56, tY + 124, 360, 24);
  drawText(ctx, "COLÔNIA ETERNA", 60, tY + 128, { font: "small", scale: 2, color: "#ffd479", shadow: false });
  drawText(ctx, "A Névoa levou o velho mundo. A colônia segue em frente.", 60, tY + 158, { color: "#8f7bb5" });

  const bx = 56, bw = mobile ? 320 : 300;
  // Mobile: o DESENHO é o do PC (46/42/40/38). O que muda é só o espaçamento,
  // que precisa de folga >= 2*HIT_PAD para as hitboxes vizinhas não se tocarem.
  const btnH = 46;
  const btns = [
    { label: "JOGAR", id: "start", accent: "#37e6c8", h: btnH, font: "big" },
    { label: "ÁRVORE DA EVOLUÇÃO", id: "tree", accent: "#c77dff", h: 42, font: "big" },
    { label: "OPÇÕES", id: "options", accent: "#ffb347", h: 40, font: "big" },
    { label: "COMO JOGAR", id: "help", accent: "#6db7ff", h: 38 },
  ];
  let by = 252;
  for (const b of btns) {
    if (button(ctx, { x: bx, y: by, w: bw, h: b.h, label: b.label, font: b.font || "small", scale: 1, id: b.id, accent: b.accent })) {
      if (b.id === "start") {
        notePointer(mouse.x, mouse.y);
        initAudio();
        startTransition("auto", "TITLE", "MODE", 0, () => { G.screen = "MODE"; });
        return;
      } else if (b.id === "tree") {
        notePointer(mouse.x, mouse.y);
        enterTree();
        treeReturn = "TITLE";
        startTransition("auto", "TITLE", "TREE", 0, () => { G.screen = "TREE"; });
        return;
      } else if (b.id === "options") {
        notePointer(mouse.x, mouse.y);
        optionsReturn = "TITLE";
        optionsTab = 0; optionsScroll = 0; optGrab = null;
        startTransition("auto", "TITLE", "OPTIONS", 0, () => { G.screen = "OPTIONS"; });
        return;
      } else if (b.id === "help") {
        notePointer(mouse.x, mouse.y);
        helpReturn = "TITLE";
        startTransition("auto", "TITLE", "HELP", 0, () => { G.screen = "HELP"; });
        return;
      }
    }
    by += b.h + (mobile ? 22 : 10);
  }

  // FASE 6 FINAL: área toque maior rodapé 28px -> 44px + touch feedback vibrate + 104px
  const footerH = mobile ? 44 : 28;
  const footerY = VIEW_H - footerH - 10;
  panel(ctx, 12, footerY, VIEW_W - 24, footerH, { fill: "rgba(10,8,16,0.75)", border: "rgba(74,58,110,0.45)", r: 4 });
  drawText(ctx, "v2.4 • PLANÍCIE VIVA • CICLO DIA/NOITE • PARALLAX • 5X ESCALA • SNOW", 20, footerY + (mobile ? 14 : 8), { color: "#6b5a8a", scale: mobile ? 0.85 : 1 });
  // (linha de stats removida da tela de TÍTULO a pedido — só versão + acessibilidade)
  
  if (G.save.accessibility && (G.save.accessibility.invincible || G.save.accessibility.slowMo || G.save.accessibility.infiniteDash)) {
    drawText(ctx, "MODO ACESSÍVEL ATIVO" + (G.save.accessibility.infiniteDash ? " ∞" : ""), VIEW_W - 20, footerY + (mobile ? 14 : 8), { color: "#7fd6a0", align: "right", scale: mobile ? 0.8 : 1 });
  }
}

// -------------------------------------------------------------- MODO SELEÇÃO -- FASE 3 + 6 FINAL: lift 6px + 104px mobile + notePointer + scroll visual offset + touch feedback
function renderModeScreen() {
  drawModeSelect(ctx, G.time);
  // FASE 6 FINAL: passa scrollOffset para render com offset visual
  modeRects = drawModeCards(ctx, GAME_MODES, modeHover, G.time, modeScrollOffset);

  // PÓS-FINAL — barra da ASCENSÃO DA NÉVOA (embaixo dos cards, só campanha)
  const ascUnlocked = G.save.best.wins > 0;
  const ascY = 462, ascW = 424, ascX = (VIEW_W - ascW) / 2;
  ascRects = [];
  panel(ctx, ascX, ascY, ascW, 36, { border: ascUnlocked ? "#ffd479" : "#3a3054", fill: "rgba(10,8,16,0.8)" });
  if (ascUnlocked) {
    const maxSel = Math.min(G.save.ascension + 1, ASC_MAX);
    G.pendingAsc = Math.max(0, Math.min(G.pendingAsc | 0, maxSel));
    const lv = G.pendingAsc;
    drawText(ctx, "<", ascX + 14, ascY + 10, { color: lv > 0 ? "#ffd479" : "#5a4f78" });
    drawText(ctx, ">", ascX + ascW - 22, ascY + 10, { color: lv < maxSel ? "#ffd479" : "#5a4f78" });
    drawText(ctx, "ASCENSÃO DA NÉVOA " + lv + "/" + ASC_MAX, VIEW_W / 2 + 10, ascY + 4, { color: "#ffd479", align: "center" });
    drawText(ctx, ascLabel(lv) + " • ESSÊNCIA x" + ascMods(lv).ess.toFixed(2), VIEW_W / 2 + 10, ascY + 21, { color: PAL.textDim, align: "center", scale: 0.85 });
    ascRects = [
      { x: ascX, y: ascY, w: 44, h: 36, d: -1 },
      { x: ascX + ascW - 44, y: ascY, w: 44, h: 36, d: 1 },
    ];
  } else {
    drawText(ctx, "VENÇA A CAMPANHA PARA DESPERTAR A ASCENSÃO DA NÉVOA", VIEW_W / 2, ascY + 12, { color: "#5a4f78", align: "center" });
  }

  const mobile = isMobileLayout();
  if (button(ctx, { x: 20, y: mobile ? VIEW_H - 90 : VIEW_H - 56, w: mobile ? 220 : 140, h: 32, label: "VOLTAR", id: "modeBack", accent: "#ff4d5a" })) {
    notePointer(mouse.x, mouse.y);
    if (mobile && navigator.vibrate) navigator.vibrate(20);
    startTransition("auto", "MODE", "TITLE", 0, () => { G.screen = "TITLE"; });
  }
  // FASE 6 FINAL: área toque maior rodapé MODE também 44px
  const footerH = mobile ? 44 : 28;
  panel(ctx, 12, VIEW_H - footerH - 8, VIEW_W - 24, footerH, { fill: "rgba(10,8,16,0.65)", border: "rgba(74,58,110,0.35)", r: 3 });
  drawText(ctx, mobile ? "TOQUE NO CARD PARA JOGAR • ARRASTE PARA NAVEGAR • SWIPE" : "ESC: VOLTAR • CLIQUE NO CARD PARA JOGAR • SCROLL VISUAL ATIVO", VIEW_W/2, VIEW_H - (mobile ? 28 : 24), { color: "#5a4f78", align: "center", scale: mobile ? 0.85 : 1, maxWidth: VIEW_W - 40 });
}

// -------------------------------------------------------------- OPÇÕES -- 5 abas, fundo sólido (parallax só no TITLE)
// Toda posição horizontal nasce da largura MEDIDA do texto (textWidth) e
// todo texto tem maxWidth: nada vaza, nada sobrepõe. O conteúdo vive numa
// viewport com recorte + rolagem; a troca de aba zera a rolagem.
function renderOptions() {
  drawSolidMenuBg(ctx, "#0e0c1e");
  drawTitleMotes(ctx, G.time);
  ctx.fillStyle = "rgba(10,8,18,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PX = 24, PY = 16, PW = VIEW_W - 48, PH = VIEW_H - 32;
  dialogBox(ctx, PX, PY, PW, PH, { border: "#ffb347", accent: "#37e6c8" });
  // Chrome fixo: com FONTE GRANDE só o CONTEÚDO cresce (e rola); título,
  // subtítulo, abas e rodapé mantêm o tamanho — senão o cabeçalho engole a
  // tela e colide com o subtítulo. O 1/FS cancela os +30% do drawText.
  const chrome = 1 / optFS();
  drawText(ctx, "OPÇÕES", VIEW_W / 2, PY + 12, { font: "big", scale: 2 * chrome, color: "#ffd479", align: "center" });

  const V = optViewport();
  const FS = optFS();
  if (optionsTab !== optionsTabPrev) { optionsTabPrev = optionsTab; optionsScroll = 0; optGrab = null; }

  // subtítulo curto da aba ativa (sem notas de desenvolvimento)
  const SUBS = [
    "VOLUME DA MÚSICA E DOS EFEITOS",
    "GRÁFICOS, TELA E DESEMPENHO",
    touchMode.on ? "TOQUES E GESTOS" : "TECLADO E MOUSE",
    "JOGUE DO SEU JEITO",
    "MENUS E TUTORIAIS",
  ];
  drawText(ctx, SUBS[optionsTab], VIEW_W / 2, PY + 64, { color: "#9a8fc0", align: "center", scale: 0.85 * chrome, maxWidth: PW - 60 });

  // abas: 5 botões de largura igual preenchendo o diálogo
  const tabGap = 10, tabW = Math.floor((PW - 16 - tabGap * 4) / 5), tabH = 34, tabY = PY + 92;
  const tabX0 = VIEW_W / 2 - (tabW * 5 + tabGap * 4) / 2;
  for (let i = 0; i < OPTIONS_TABS.length; i++) {
    const tab = OPTIONS_TABS[i];
    const x = tabX0 + i * (tabW + tabGap);
    const sel = optionsTab === i;
    if (button(ctx, { x, y: tabY, w: tabW, h: tabH, label: (sel ? "▶ " : "") + tab.label, id: "tab" + i, accent: tab.color, color: sel ? "#000" : undefined, scale: 0.85 * chrome })) {
      optionsTab = i; optionsScroll = 0; optGrab = null;
    }
    if (sel) {
      ctx.fillStyle = tab.color;
      ctx.fillRect(x, tabY + tabH + 2, tabW, 3);
    }
  }

  // conteúdo rolável com recorte (o que passa da janela não desenha nem clica)
  optionsScroll = clamp(optionsScroll, 0, Math.max(0, optionsContentH - V.h));
  const oy = V.y - optionsScroll;
  const TX = V.x + 8;        // margem esquerda do conteúdo
  const RR = V.x + V.w - 24; // margem direita (antes da barra de rolagem)
  optSliders = [];
  ctx.save();
  ctx.beginPath();
  ctx.rect(V.x, V.y, V.w, V.h);
  ctx.clip();
  if (optionsTab === 0) optionsContentH = optContentAudio(TX, RR, oy, V, FS);
  else if (optionsTab === 1) optionsContentH = optContentVideo(TX, RR, oy, V, FS);
  else if (optionsTab === 2) optionsContentH = optContentControls(TX, RR, oy, V, FS);
  else if (optionsTab === 3) optionsContentH = optContentAccess(TX, RR, oy, V, FS);
  else optionsContentH = optContentLang(TX, RR, oy, V, FS);
  ctx.restore();

  // barra de rolagem (só quando o conteúdo passa da janela)
  const maxScroll = Math.max(0, optionsContentH - V.h);
  if (maxScroll > 0) {
    const sbX = V.x + V.w - 14;
    ctx.fillStyle = "rgba(74,58,110,0.4)";
    ctx.fillRect(sbX, V.y, 8, V.h);
    const hh = Math.max(30, V.h * V.h / optionsContentH);
    const hy = V.y + (V.h - hh) * (optionsScroll / maxScroll);
    ctx.fillStyle = "#8f6fd6";
    ctx.fillRect(sbX, hy, 8, hh);
    ctx.fillStyle = "#c9b8f5";
    ctx.fillRect(sbX + 2, hy + 2, 4, hh - 4);
  }

  // rodapé fixo (fora da área rolável: nunca some nem colide com o conteúdo)
  if (button(ctx, { x: VIEW_W / 2 - 250, y: VIEW_H - 48, w: 220, h: 36, label: "VOLTAR", id: "optionsBack", accent: "#8f6fd6", scale: chrome })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  // troca entre as duas versões paralelas (PC ↔ mobile), mesma engine
  if (button(ctx, { x: VIEW_W / 2 + 30, y: VIEW_H - 48, w: 220, h: 36, label: touchMode.on ? "VERSÃO PC" : "VERSÃO MOBILE", id: "switchVersion", accent: "#37e6c8", scale: 0.85 * chrome })) {
    notePointer(mouse.x, mouse.y);
    location.href = touchMode.on ? "../" : "mobile/";
  }
  if (!touchMode.on) {
    drawText(ctx, "ESC VOLTA", VIEW_W - 40, VIEW_H - 44, { color: "#5a4f78", scale: 0.75 * chrome, align: "right", maxWidth: 120 });
  }
}

// Linha LIGADO/DESLIGADO das OPÇÕES: ícone + rótulo à esquerda, botão à
// direita, descrição curta embaixo. Retorna a altura ocupada.
function optToggle(y, TX, RR, oy, V, FS, o) {
  const btnW = 120, btnH = 28, bx = RR - btnW;
  const txX = TX + 24, txW = bx - 14 - txX;
  const kit = drawKitIcon(ctx, o.on ? 0 : 1, TX, y + oy + 2, 16);
  if (!kit) {
    ctx.fillStyle = o.on ? o.color : "#5a4f78";
    ctx.fillRect(TX, y + oy + 3, 12, 12);
  }
  drawText(ctx, o.label + ": " + (o.on ? "LIGADO" : "DESLIGADO"), txX, y + oy,
    { color: o.on ? o.color : "#5a4f78", scale: 0.95, maxWidth: txW });
  if (button(ctx, { x: bx, y: y + oy - 4, w: btnW, h: btnH, label: o.on ? "DESLIGAR" : "LIGAR", id: o.id, accent: o.color, tap: true, clip: V, scale: 0.85 })) {
    o.flip();
  }
  let dy = y + 21 * FS;
  if (o.desc) {
    for (const ln of wrapText(o.desc, txW, { scale: 0.8 * FS })) {
      drawText(ctx, ln, txX, dy + oy, { color: "#6b5a8a", scale: 0.8, maxWidth: txW });
      dy += 16 * FS;
    }
  }
  return dy + 11 * FS;
}

// Painel de aviso com quebra de linha medida. Retorna a altura ocupada.
function optNote(y, TX, RR, oy, FS, lines, border, color) {
  const pad = 8, maxW = RR - TX - pad * 2;
  const wrapped = [];
  for (const ln of lines) for (const w of wrapText(ln, maxW, { scale: 0.8 * FS })) wrapped.push(w);
  const lh = 18 * FS, h = wrapped.length * lh + pad * 2;
  panel(ctx, TX, y + oy, RR - TX, h, { fill: "rgba(255,179,71,0.07)", border: border || "#ffb347", r: 4 });
  let ly = y + pad + 2;
  for (const w of wrapped) {
    drawText(ctx, w, TX + pad, ly + oy, { color: color || "#ffd479", scale: 0.8, maxWidth: maxW });
    ly += lh;
  }
  return y + h + 10 * FS;
}

// Linha de volume: rótulo + % em cima, [-] barra [+] embaixo.
function optVolRow(y, TX, RR, oy, V, FS, id, label, color) {
  const key = id === "music" ? "musicVol" : "sfxVol";
  const v = G.save.settings[key];
  drawText(ctx, label, TX, y + oy, { color: "#efe9ff", scale: 0.95, maxWidth: 340 });
  drawText(ctx, Math.round(v * 100) + "%", RR, y + oy, { color, align: "right", scale: 0.95 });
  const by = y + 22 * FS, bw = 52, bh = 30;
  if (button(ctx, { x: TX, y: by + oy, w: bw, h: bh, label: "-", id: id + "Down", tap: true, clip: V, scale: 1.1 })) {
    G.save.settings[key] = Math.round(clamp(v - 0.1, 0, 1) * 10) / 10;
    persistSave(); applyMix();
  }
  if (button(ctx, { x: RR - bw, y: by + oy, w: bw, h: bh, label: "+", id: id + "Up", accent: color, tap: true, clip: V, scale: 1.1 })) {
    G.save.settings[key] = Math.round(clamp(v + 0.1, 0, 1) * 10) / 10;
    persistSave(); applyMix();
  }
  // barra (toque/arraste ajustam: updateOptions traduz o gesto em volume)
  const tx0 = TX + bw + 10, tw = (RR - bw - 10) - tx0, th = 14, ty = by + oy + (bh - th) / 2;
  ctx.fillStyle = "rgba(10,8,16,0.8)";
  ctx.fillRect(tx0, ty, tw, th);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(tx0 + 0.5, ty + 0.5, tw - 1, th - 1);
  const grad = ctx.createLinearGradient(tx0, ty, tx0, ty + th);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#1a1430");
  ctx.fillStyle = grad;
  ctx.fillRect(tx0 + 2, ty + 2, (tw - 4) * v, th - 4);
  const hx = tx0 + 2 + (tw - 4) * v;
  ctx.fillStyle = "#fff";
  ctx.fillRect(hx - 2, ty - 3, 4, th + 6);
  optSliders.push({ id, x: tx0, y: ty - 6, w: tw, h: th + 12 });
  return by + bh + 14 * FS;
}

function optContentAudio(TX, RR, oy, V, FS) {
  let cy = 8;
  cy = optVolRow(cy, TX, RR, oy, V, FS, "music", "MÚSICA", "#c77dff");
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "SOM", on: !G.muted, id: "muteBtn", color: "#ff4d5a",
    desc: touchMode.on ? "USE ESTE BOTÃO PARA SILENCIAR TUDO" : "A TECLA M TAMBÉM LIGA E DESLIGA",
    flip() { toggleMute(); applyMix(); persistSave(); },
  });
  cy = optVolRow(cy, TX, RR, oy, V, FS, "sfx", "EFEITOS", "#37e6c8");
  for (const ln of wrapText("TOQUE OU ARRASTE A BARRA • - / + AJUSTAM DE 10 EM 10", RR - TX, { scale: 0.8 * FS })) {
    drawText(ctx, ln, TX, cy + oy, { color: "#6b5a8a", scale: 0.8, maxWidth: RR - TX });
    cy += 17 * FS;
  }
  return cy + 8;
}

function optContentVideo(TX, RR, oy, V, FS) {
  const s = G.save.settings;
  let cy = 8;
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "PARTÍCULAS", on: s.particles, id: "vid_particles", color: "#7fd6a0",
    desc: "POEIRA, PÓLEN E BRILHOS — DESLIGAR GANHA DESEMPENHO",
    flip() { s.particles = !s.particles; persistSave(); },
  });
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "TREMOR DE TELA", on: s.screenshake, id: "vid_screenshake", color: "#ffb347",
    desc: "A CÂMERA BALANÇA NOS GOLPES FORTES",
    flip() { s.screenshake = !s.screenshake; persistSave(); },
  });
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "SCANLINES RETRÔ", on: s.scanline, id: "vid_scanline", color: "#6db7ff",
    desc: "LISTRAS DE CRT SOBRE A IMAGEM",
    flip() { s.scanline = !s.scanline; persistSave(); applyScanlines(); },
  });
  const isFull = typeof document !== "undefined" && !!document.fullscreenElement;
  cy = optToggle(cy, TX, RR, oy, V, FS, {
    label: "TELA CHEIA", on: isFull, id: "fullscreen", color: "#c77dff",
    desc: "F11 TAMBÉM ALTERNA NO NAVEGADOR",
    flip() {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      } catch (e) { /* DOM simulado nos testes */ }
    },
  });
  return cy + 8;
}

function optContentControls(TX, RR, oy, V, FS) {
  const rows = touchMode.on ? HELP_CONTROLS_TOUCH : HELP_CONTROLS;
  // coluna da descrição começa depois da TECLA mais larga (medida de verdade)
  let keyW = 0;
  for (const [k] of rows) keyW = Math.max(keyW, textWidth(k, { scale: 0.9 * FS }));
  const dx = TX + keyW + 18, dw = RR - dx;
  let cy = 8;
  for (const [k, d] of rows) {
    drawText(ctx, k, TX, cy + oy, { color: "#37e6c8", scale: 0.9, maxWidth: keyW + 2 });
    drawText(ctx, d, dx, cy + oy, { color: PAL.text, scale: 0.85, maxWidth: dw });
    cy += 19 * FS;
  }
  cy += 10 * FS;
  if (touchMode.on) {
    const s = G.save.settings;
    cy = optToggle(cy, TX, RR, oy, V, FS, {
      label: "MODO ORDENAR / SELECIONAR", on: !!s.touchSelect, id: "ctl_touchSelect", color: "#ffd479",
      desc: s.touchSelect
        ? "BOTÃO NA EXPEDIÇÃO ALTERNANDO ORDEM E SELEÇÃO"
        : "GESTOS INTELIGENTES: TOQUE NA FORMIGA SELECIONA",
      flip() { s.touchSelect = !s.touchSelect; persistSave(); touchMode.smart = !s.touchSelect; touchMode.mode = "ordenar"; },
    });
  }
  cy = optNote(cy, TX, RR, oy, FS, touchMode.on ? [
    "TOQUE ORDENA • ARRASTAR MOVE A CÂMERA • PINÇA DÁ ZOOM",
    "2 DEDOS FAZEM CAIXA • DUPLO SELECIONA O TIPO • SAVE PRÓPRIO",
  ] : [
    "A VERSÃO MOBILE (/GAME/MOBILE/) TEM SAVE PRÓPRIO",
    "SETAS ESQ/DIR TROCAM DE ABA • RODA DO MOUSE ROLA A TELA",
  ], "#ffb347");
  return cy + 8;
}

function optContentAccess(TX, RR, oy, V, FS) {
  const a = G.save.accessibility, s = G.save.settings;
  let cy = 8;
  const rows = [
    { key: "invincible", label: "RAINHA INVENCÍVEL", desc: "A RAINHA NÃO MORRE: VOLTA COM 30% DA VIDA", color: "#7fd6a0" },
    { key: "infiniteDash", label: "AÇÕES SEM RECARGA", desc: "RALI (F) E ATAQUES SEM TEMPO DE ESPERA", color: "#37e6c8" },
    { key: "slowMo", label: "CÂMERA LENTA", desc: "TUDO RODA NA METADE DA VELOCIDADE", color: "#6db7ff" },
    { key: "bigFont", label: "FONTE GRANDE", desc: "TEXTOS 30% MAIORES EM TODO O JOGO", color: "#ffd479" },
    { key: "reducedParticles", label: "POUCAS PARTÍCULAS", desc: "MENOS EFEITOS E DISTRAÇÕES VISUAIS", color: "#c77dff" },
    { key: "highContrast", label: "ALTO CONTRASTE", desc: "CONTORNOS FORTES NOS TEXTOS", color: "#ff4d5a" },
  ];
  for (const o of rows) {
    cy = optToggle(cy, TX, RR, oy, V, FS, {
      label: o.label, desc: o.desc, on: !!a[o.key], id: "acc_" + o.key, color: o.color,
      flip() { a[o.key] = !a[o.key]; persistSave(); },
    });
  }
  // velocidade: rótulo + 4 botões na mesma linha (medidos para caber)
  drawText(ctx, "VELOCIDADE", TX, cy + oy + 6, { color: "#ff7a6a", scale: 0.95, maxWidth: 150 });
  const speeds = [
    { v: 0.5, label: "0.5X LENTO", color: "#7fd6a0" },
    { v: 1, label: "1X NORMAL", color: "#37e6c8" },
    { v: 1.5, label: "1.5X RÁPIDO", color: "#ffb347" },
    { v: 2, label: "2X TURBO", color: "#ff4d5a" },
  ];
  let bw = 0;
  for (const sp of speeds) bw = Math.max(bw, textWidth(sp.label, { scale: 0.8 * FS }));
  bw = Math.min(150, Math.ceil(bw) + 24);
  let sx = TX + 170;
  for (const sp of speeds) {
    const sel = s.gameSpeed === sp.v;
    if (button(ctx, { x: sx, y: cy + oy, w: bw, h: 30, label: sp.label, id: "speed_" + sp.v, accent: sp.color, color: sel ? "#000" : undefined, tap: true, clip: V, scale: 0.8 })) {
      s.gameSpeed = sp.v; persistSave();
    }
    sx += bw + 8;
  }
  cy += 30 + 12 * FS;
  if (a.invincible || a.slowMo || s.gameSpeed !== 1) {
    cy = optNote(cy, TX, RR, oy, FS, [
      "MODO ASSIST ATIVO • VELOCIDADE " + s.gameSpeed + "X • CONQUISTAS CONTINUAM VALENDO",
    ], "#7fd6a0", "#7fd6a0");
  }
  return cy + 8;
}

function optContentLang(TX, RR, oy, V, FS) {
  const s = G.save.settings;
  const langs = [
    { id: "pt-BR", tag: "[BR]", label: "PORTUGUÊS", desc: "TRADUÇÃO COMPLETA E REVISADA", color: "#7fd6a0", ready: true },
    { id: "en-US", tag: "[US]", label: "ENGLISH", desc: "ENGLISH TRANSLATION", color: "#6db7ff", ready: false },
    { id: "es", tag: "[ES]", label: "ESPAÑOL", desc: "TRADUCCIÓN AL ESPAÑOL", color: "#ffb347", ready: false },
  ];
  let cy = 8;
  for (const lg of langs) {
    const sel = s.language === lg.id;
    const btnW = 120, bx = RR - btnW, txW = bx - 14 - TX;
    drawText(ctx, lg.tag + "  " + lg.label, TX, cy + oy,
      { color: sel ? lg.color : "#efe9ff", scale: 0.95, maxWidth: txW });
    if (button(ctx, {
      x: bx, y: cy + oy - 4, w: btnW, h: 28,
      label: sel ? "ATIVO" : (lg.ready ? "USAR" : "EM BREVE"), id: "lang_" + lg.id,
      accent: lg.color, color: sel ? lg.color : undefined,
      disabled: sel || !lg.ready, tap: true, clip: V, scale: 0.85,
    })) {
      s.language = lg.id; persistSave();
    }
    drawText(ctx, lg.desc, TX, cy + oy + 21 * FS, { color: "#6b5a8a", scale: 0.8, maxWidth: txW });
    cy += 21 * FS + 16 * FS + 11 * FS;
  }
  cy = optNote(cy, TX, RR, oy, FS, [
    "O IDIOMA VALE PARA MENUS, TUTORIAIS E DESCRIÇÕES",
  ], "#ffd479");
  return cy + 8;
}

// ------------------------------------------------------------------ ajuda ----
// HELP - fundo sólido gótico, SEM parallax (parallax exclusivo TITLE)
function renderHelp() {
  drawSolidMenuBg(ctx, "#0a0812");
  ctx.fillStyle = "rgba(10,8,16,0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PX = 32, PY = 20, PW = VIEW_W - 64, PH = VIEW_H - 56;
  dialogBox(ctx, PX, PY, PW, PH, { border: "#8f6fd6", accent: "#ffd479" });
  drawText(ctx, "COMO JOGAR", VIEW_W / 2, PY + 16, { font: "big", scale: 2, color: "#ffd479", align: "center" });

  const colW = (PW - 80) / 2;
  const colX = [PX + 24, PX + 40 + colW];
  const descX = 132;

  let y = PY + 68;
  drawText(ctx, "OBJETIVO", colX[0], y, { font: "big", color: "#c77dff" });
  y += 26;
  for (const t of HELP_GOAL) {
    for (const L of wrapText(t, PW - 48, {})) {
      drawText(ctx, L, colX[0], y, { color: PAL.text, scale: 0.9 });
      y += 17;
    }
  }
  y += 14;

  let yl = y;
  // MOBILE: a versão de toque mostra a tabela de gestos no lugar do teclado
  const controlsTable = touchMode.on ? HELP_CONTROLS_TOUCH : HELP_CONTROLS;
  drawText(ctx, touchMode.on ? "CONTROLES (TOQUE)" : "CONTROLES", colX[0], yl, { font: "big", color: "#c77dff" });
  yl += 26;
  for (const [k, d] of controlsTable) {
    drawText(ctx, k, colX[0], yl, { color: "#37e6c8", scale: 0.85 });
    const lines = wrapText(d, colW - descX, { scale: 0.85 });
    lines.forEach((L, li) => drawText(ctx, L, colX[0] + descX, yl + li * 14, { color: PAL.text, scale: 0.85 }));
    yl += Math.max(17, lines.length * 14 + 3);
  }

  let yr = y;
  drawText(ctx, "DICAS", colX[1], yr, { font: "big", color: "#c77dff" });
  yr += 26;
  for (const t of HELP_TIPS) {
    for (const L of wrapText(t, colW, { scale: 0.9 })) {
      drawText(ctx, L, colX[1], yr, { color: PAL.text, scale: 0.9 });
      yr += 16;
    }
    yr += 5;
  }

  const helpMobile = isMobileLayout();
  if (button(ctx, { x: VIEW_W / 2 - 100, y: VIEW_H - 44, w: helpMobile ? 240 : 200, h: 36, label: "VOLTAR", id: "helpBack", accent: "#8f6fd6" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "HELP", helpReturn, 0, () => { G.screen = helpReturn; helpReturn = "TITLE"; });
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    startTransition("auto", "HELP", helpReturn, 0, () => { G.screen = helpReturn; helpReturn = "TITLE"; });
  }
}

// -------------------------------------------------------------------- run ---
let shopTooltip = null;

function renderRun() {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  // cutscene HQ tem prioridade
  if (isCutsceneActive()) {
    drawCutscene(ctx, G.time);
    return;
  }
  // No formigueiro a cena de dentro cobre a tela inteira: desenhar o mundo por
  // baixo seria trabalho jogado fora (e são duas telas vivas no mesmo quadro).
  // O mundo continua visível e simulado pela janela "OLHO LÁ FORA" (drawNest).
  if (!run.baseOpen) drawRun(ctx, dtClampForAnim());

  const modal = paused || !!run.draft || !!run.transition || !!run.baseOpen || run.status !== "running";

  if (!modal) {
    drawHUD();
    if (run.banner && run.banner.t > 0) drawBanner(run.banner);
    if (TUT.active) drawTutorial(ctx, VIEW_W);
  }
  if (run.draft && !paused) drawDraft(run.draft);
  if (run.transition && !paused) drawMapTransition(run);
  if (run.baseOpen) drawNestScreen(run);
  if (paused) drawPause();
  if (run.status === "ended") drawEnd(run);
}

let lastDt = 1 / 60;
export function setLastDt(v) { lastDt = v; }
function dtClampForAnim() { return lastDt; }

function openNest(run) {
  run.baseOpen = true;
  nestEnter();
  SFX.uiClick();
}

function closeNest(run, click) {
  run.baseOpen = false;
  nestExit();
  if (click) SFX.uiClick();
}

function drawNestScreen(run) {
  if (!nest.open) nestEnter();
  nestHover(mouse.x, mouse.y);
  const action = nestDraw(ctx);
  if (action === "back") { closeNest(run, true); return; }
  // a BOCA: os botões do rodapé e o clique na sala da entrada mexem na porta
  if (action === "out") nestSendOut(1);
  else if (action === "in") nestCallBack(1);
  else if (mouse.justDown) {
    const r = nestClick(mouse.x, mouse.y);
    if (r === "out") { /* o clique na entrada já soltou uma formiga */ }
  }
}

function hudTopSlot() {
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  return tut ? tut.y + tut.h + 6 : 72;
}


function drawHUD() {
  const run = G.run;
  const m = mapDef();
  const q = allies.queen;
  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;
  const biomeId = m ? m.id : "planicie";
  const bh = BIOME_HUD[biomeId] || BIOME_HUD.planicie;
  const era = G.save.era || 0;

  // --- FEROMÔNIO OVERLAY H ---
  if (keys.KeyH && live) {
    drawPheromoneOverlay(ctx, cam, VIEW_W, VIEW_H, worldToScreen, foodTrailAt, dangerAt, G.time);
  }

  // --------------------------------------- painel orgânico da colônia (quitina/cera por bioma) ----
  const pw = 320;
  const ph = run.modeDef ? 118 : 100;
  // fundo com textura biome
  drawBiomeTexture(ctx, 10, 8, pw, ph, biomeId, G.time);
  panel(ctx, 10, 8, pw, ph, { border: bh.border, accentLine: bh.accent, fill: "rgba(0,0,0,0)" });
  // brilho topo quitina
  ctx.fillStyle = bh.border;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(10, 8, pw, 3);
  ctx.globalAlpha = 1;

  // botão "+"/"-" orgânico — no toque a ÁREA sensível cresce (o desenho não)
  const moreR = touchPad(304, 12, 18, 16);
  const moreHot = pointInRect(mouse.x, mouse.y, moreR.x, moreR.y, moreR.w, moreR.h);
  ctx.fillStyle = moreHot ? "rgba(58,48,84,0.9)" : "rgba(36,28,56,0.85)";
  ctx.fillRect(304, 12, 18, 16);
  ctx.strokeStyle = bh.border; ctx.lineWidth = 1;
  ctx.strokeRect(304.5, 12.5, 17, 15);
  drawText(ctx, hudExpanded ? "-" : "+", 313, 13, { color: moreHot ? "#efe9ff" : bh.accent, align: "center", maxWidth: 12 });
  uiButtons().push({ x: moreR.x, y: moreR.y, w: moreR.w, h: moreR.h, id: "hudMore" });
  if (live && moreHot && mouse.justDown) { hudExpanded = !hudExpanded; SFX.uiClick(); }

  let yy = 14;
  if (run.modeDef) {
    drawText(ctx, run.modeDef.name + (era ? " • ERA " + era : ""), 20, yy, { color: run.modeDef.color, font: "small", maxWidth: 165 });
    yy += 14;
    drawText(ctx, bh.loreName, 20, yy, { color: bh.border, scale: 1 });
    yy += 26;
  } else {
    drawText(ctx, bh.loreName, 20, yy, { color: bh.border, scale: 1 });
    yy += 14;
  }
  const hpFrac = q && q.maxHp ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  const low = hpFrac < 0.30;
  // Label lore: SILENCIOSA (Rainha Silenciosa)
  drawText(ctx, low ? "FERIDA!" : "SILENCIOSA", 20, yy, { color: low ? "#ff4d5a" : "#ffd479", font: "small", scale: 1, maxWidth: 88 });
  // gaster bar orgânico com coroa fungo/seda
  drawGasterBar(ctx, 116, yy + 1, 102, 12, hpFrac, biomeId, low, G.time);
  if (q && q.maxHp) drawText(ctx, Math.ceil(q.hp) + "/" + q.maxHp, 298, yy, { color: low ? "#ff8a94" : PAL.textDim, align: "right", scale: 1, maxWidth: 74 });
  yy += 18;
  // XP como ANÉIS DA ÁRVORE
  drawText(ctx, "ANEL " + run.level, 20, yy, { color: "#ffd479", scale: 1, maxWidth: 53 });
  const xpFrac = run.xpNext > 0 ? clamp(run.xp / run.xpNext, 0, 1) : 0;
  drawTreeRings(ctx, 84, yy+6, xpFrac, biomeId);
  // comida por bioma
  drawFoodIcon(ctx, biomeId, 104, yy-1);
  drawText(ctx, bh.foodLabel + " " + fmt(run.food), 124, yy, { color: bh.foodColor, scale: 1, maxWidth: 190 });
  // essência cristal geométrico
  drawEssenceCrystal(ctx, 26, yy+24, 14, bh.essenceColor, G.time);
  drawText(ctx, bh.essenceLabel + " " + fmt(run.essencePool), 38, yy + 18, { color: bh.essenceColor, scale: 1, maxWidth: 272 });
  {
    const used = popUsed(), cap = popCapTotal();
    drawText(ctx, "IRMÃS " + used + "/" + cap, 298, 14, { color: used >= cap ? "#ff4d5a" : PAL.text, align: "right", scale: 1 });
  }

  // ---- fileira de mutações como SEIVA Dourada (Vampire Survivors) ----
  const mutY = 8 + ph + 6;
  let mutTip = null;
  const mutLog = run.mutationLog;
  if (mutLog.length > 0) {
    let ix = 12;
    for (const mm of mutLog.slice(0, 10)) {
      const icon = IMG["i_" + mm.icon];
      // fundo quitina
      drawBiomeTexture(ctx, ix, mutY, 20, 20, biomeId, G.time*0.5);
      ctx.fillStyle = "rgba(20,14,32,0.55)";
      ctx.fillRect(ix, mutY, 20, 20);
      ctx.strokeStyle = RARITY[mm.rar].color; ctx.lineWidth = 1;
      ctx.strokeRect(ix + 0.5, mutY + 0.5, 19, 19);
      if (icon) ctx.drawImage(icon, ix + 2, mutY + 2, 16, 16);
      // brilho seiva por baixo
      ctx.fillStyle = RARITY[mm.rar].color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(ix, mutY+14, 20, 6);
      ctx.globalAlpha = 1;
      if (pointInRect(mouse.x, mouse.y, ix, mutY, 20, 20)) mutTip = mm;
      ix += 25;
    }
    if (mutLog.length > 10) drawText(ctx, "+" + (mutLog.length - 10), ix + 2, mutY + 4, { color: PAL.textDim });
  }
  let leftStackBottom = mutLog.length > 0 ? mutY + 26 : 0;

  // ---- detalhes da colônia expandidos com lore bioma ----
  if (hudExpanded) {
    const ey = mutY + (mutLog.length > 0 ? 26 : 6);
    drawBiomeTexture(ctx, 10, ey, pw, 104, biomeId, G.time*0.3);
    panel(ctx, 10, ey, pw, 104, { border: bh.border, fill: "rgba(0,0,0,0)" });
    const n = colony.needs, hc = colony.headcount;
    drawText(ctx, "COLÔNIA PENSA EM FEROMÔNIO", 20, ey + 8, { color: bh.border, scale: 0.85, maxWidth: 300 });
    drawText(ctx, "ABATES " + run.kills + " • " + bh.waveLabel, 20, ey + 24, { color: PAL.textDim, scale: 0.8, maxWidth: 300 });
    const cy = ey + 40;
    let bx = 20;
    const needBar = (label, v, col) => {
      drawText(ctx, label, bx, cy, { color: col, scale: 0.8 });
      // Reservas de seiva: separadas dos rótulos mesmo com fonte grande.
      ctx.fillStyle = "#241c38"; ctx.fillRect(bx, cy + 18, 56, 4);
      ctx.fillStyle = col; ctx.fillRect(bx, cy + 18, 56 * clamp(v, 0, 1), 4);
      bx += 74;
    };
    needBar("FOME", n.food, "#ffd479");
    needBar("GUERRA", n.defense, "#ff4d5a");
    needBar("CURA", n.medical, "#7fd6a0");
    drawText(ctx, "COLETA " + hc.gather + " • EXPLORAÇÃO " + hc.explore, 20, cy + 28, { color: bh.border, scale: 0.8, maxWidth: 300 });
    drawText(ctx, "[H] SEGURE PARA VER FEROMÔNIOS", 20, cy + 42, { color: PAL.textDim, scale: 0.75, maxWidth: 300 });
    leftStackBottom = ey + 110;
  }

  // ------------------------------------ status da invasão como TRILHA FEROMÔNIO (topo-centro) ----
  const cw = 300, cx0 = 338;
  drawBiomeTexture(ctx, cx0, 8, cw, 62, biomeId, G.time*0.2);
  panel(ctx, cx0, 8, cw, 62, { border: bh.minimapBorder, fill: "rgba(0,0,0,0)" });
  if (run.status === "running") {
    if (director.phase === "calm") {
      const rest = calmFrac();
      const frac = 1 - rest;
      // Formigas em quatro quadros: trilha abaixo do texto, nunca sobre ele.
      const trailY = 58;
      for (let i = 0; i < 7; i++) {
        const prog = trailProgress(G.time, i);
        const tx = cx0 + 64 + prog * (cw - 90);
        const alpha = 0.3 + prog * 0.7;
        ctx.globalAlpha = alpha;
        drawTrailAnt(ctx, tx, trailY-6, G.time+i*0.1);
      }
      ctx.globalAlpha = 1;
      // anel contagem
      const rcx = cx0 + 27, rcy = 38, rr = 15;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(36,28,56,0.9)";
      ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, Math.PI*2); ctx.stroke();
      if (frac > 0.004) {
        ctx.strokeStyle = rest < 0.25 ? "#ff4d5a" : bh.foodColor;
        ctx.beginPath(); ctx.arc(rcx, rcy, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI*2 * frac); ctx.stroke();
      }
      if (!run.draft) drawText(ctx, Math.max(0, Math.ceil(director.timer)), rcx, rcy - 8, { color: rest < 0.25 ? "#ff8a94" : PAL.text, align: "center" });
      drawText(ctx, run.endless ? "SOBREVIVÊNCIA • " + bh.waveLabel : bh.waveLabel, cx0 + 52, 14, { font: "small", color: bh.border, scale: 1, maxWidth: cw-64 });
      const cycTag = run.endless ? (director.cycle ? " • CICLO " + (director.cycle + 1) : " • INF") : "";
      drawText(ctx, run.draft ? "ESCOLHA UMA MEMÓRIA" : ("ONDA " + (director.waveInMap + 1) + "/" + m.waves.length + cycTag), cx0 + 52, 34, { color: PAL.textDim, scale: 1, maxWidth: cw-64 });
    } else if (director.phase === "mapClear") {
      drawText(ctx, "MAPA LIMPO! " + bh.loreName, VIEW_W / 2, 18, { font: "small", color: bh.accent, align: "center" });
      drawText(ctx, m.name, VIEW_W / 2, 40, { color: PAL.textDim, align: "center" });
    } else {
      drawText(ctx, "INVASÃO " + director.waveInMap + "/" + m.waves.length + (run.endless ? (director.cycle ? " • CICLO " + (director.cycle + 1) : " • INF") : ""), cx0 + 16, 12, { font: "big", color: "#ff4d5a", scale: 0.9 });
      let aliveF = 0;
      for (const f of foes) if (!f.dead) aliveF++;
      drawText(ctx, "RESTAM " + aliveF + (director.budget > 0 ? "+" : ""), cx0 + cw - 16, 22, { color: "#ff8a94", align: "right", scale: 0.85 });
      // barra como trilha feromônio perigosa
      ctx.fillStyle = "rgba(20,10,16,0.9)";
      ctx.fillRect(cx0+16, 38, cw-32, 10);
      const grad = ctx.createLinearGradient(cx0+16, 38, cx0+cw-16, 38);
      grad.addColorStop(0, "#ff4d5a");
      grad.addColorStop(1, "#a32e46");
      ctx.fillStyle = grad;
      ctx.fillRect(cx0+16, 38, (cw-32)*waveProgress(), 10);
      const wDef2 = waveDef();
      drawText(ctx, wDef2 && wDef2.title ? wDef2.title : m.name, cx0 + 16, 50, { color: PAL.textDim, scale: 0.8 });
    }
  } else {
    drawText(ctx, run.status === "won" || (run.payout && run.payout.winBonus > 0) ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU • " + bh.loreName,
      VIEW_W / 2, 20, { font: "small", color: bh.accent, align: "center" });
  }

  const bossUp = !!(boss && !boss.dead && run.status === "running" && (boss.revealT > 0 || fogVisible(boss.x, boss.y)));
  if (live && director.phase === "calm") {
    const by = hudTopSlot() + (bossUp ? 48 : 0);
    if (button(ctx, { x: cx0, y: by, w: cw, h: 26, label: "▶ INVOCAR (G) +ESSÊNCIA", id: "skip", compact: true, accent: bh.essenceColor })) {
      skipPeace();
    }
  }

  // ----------------------------------------- barra de formigas orgânica (rodapé) ----
  shopTooltip = null;
  const footY = VIEW_H - (isMobileLayout() ? 84 : 64);
  // textura bioma no rodapé
  drawBiomeTexture(ctx, 10, footY, 92, 64, biomeId, G.time*0.15);
  const shopSprite = rotFrame("worker", Math.PI / 2);
  const rShop = iconButton(ctx, { x: 10, y: footY, w: 92, h: 64, id: "shopToggle", frame: shopOpen ? bh.accent : bh.border, selected: shopOpen, maxPadX: 12 });
  ctx.drawImage(shopSprite, 56 - shopSprite.width * 0.17, footY + 3, shopSprite.width * 0.34, shopSprite.height * 0.34);
  drawText(ctx, "IRMÃS", 56, footY + 26, { color: PAL.text, align: "center", maxWidth: 88 });
  drawText(ctx, shopOpen ? "FECHAR (Q)" : "ABRIR (Q)", 56, footY + 40, { color: shopOpen ? bh.accent : bh.border, align: "center", scale: 0.85, maxWidth: 88 });

  if (live && rShop.clicked) { shopOpen = !shopOpen; }

  if (shopOpen) {
    const x0 = 10 + 92 + 6;
    let gx = x0, lastGroup = null;
    for (let i = 0; i < SHOP.length; i++) {
      const sp = SHOP[i];
      if (lastGroup && sp.group !== lastGroup) gx += 12;
      lastGroup = sp.group;
      const x = gx;
      const cost = unitCost(sp.type);
      const canBuy = run.food >= cost && popUsed() < popCapTotal() && unitLimitLeft(sp.type);
      // fundo orgânico por card
      drawBiomeTexture(ctx, x, footY, SHOP_W, 64, biomeId, G.time*0.1 + i);
      const r = iconButton(ctx, { x, y: footY, w: SHOP_W, h: 64, id: "shop" + sp.type, disabled: !canBuy, frame: sp.accent, maxPadX: 2 });
      ctx.fillStyle = SHOP_GROUPS[sp.group] || "#4a3a6e";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x + 3, footY + 3, SHOP_W - 6, 3);
      ctx.globalAlpha = 1;
      const frame = rotFrame(UNITS[sp.type].sprite, Math.PI / 2);
      const sc2 = (sp.iconScale !== undefined ? sp.iconScale : sp.type === "worker" || sp.type === "scout" || sp.type === "gatherer" || sp.type === "weaver" ? 0.5 : 0.42) * 0.62;
      ctx.globalAlpha = canBuy ? 1 : 0.35;
      ctx.drawImage(frame, x + SHOP_W / 2 - frame.width * sc2 / 2, footY + 5, frame.width * sc2, frame.height * sc2);
      ctx.globalAlpha = 1;
      drawText(ctx, cost, x + SHOP_W / 2, footY + 40, { color: canBuy ? bh.accent : "#a32e46", align: "center" });
      const hot = i < 9 ? String(i + 1) : i === 9 ? "0" : "";
      if (hot) drawText(ctx, hot, x + SHOP_W - 3, footY + 4, { color: PAL.textDim, align: "right", scale: 0.8 });
      if (r.hot) shopTooltip = sp;
      if (live && r.clicked) {
        const res = buyUnit(sp.type);
        if (!res.ok) {
          const wp = screenToWorld(x + SHOP_W / 2, footY - 14);
          floatText(wp.x, wp.y, res.why, { color: "#ff4d5a", life: 1 });
        }
      }
      gx += SHOP_PITCH;
    }
  }

  if (shopTooltip) {
    const uDef = UNITS[shopTooltip.type];
    const tipLines = wrapText(uDef.tip, 248, {});
    const th = 58 + tipLines.length * 16;
    const tb = footY - 12 - th;
    drawBiomeTexture(ctx, 10, tb, 268, th, biomeId, G.time);
    panel(ctx, 10, tb, 268, th, { border: bh.border, fill: "rgba(0,0,0,0)" });
    drawText(ctx, "▶ " + (uDef.fn || ""), 20, tb + 6,
      { font: "big", scale: 0.8, color: SHOP_GROUPS[shopTooltip.group] || bh.accent });
    drawText(ctx, uDef.name, 20, tb + 32, { color: bh.accent, scale: 0.9 });
    tipLines.forEach((L, li) => drawText(ctx, L, 20, tb + 52 + li * 16, { color: PAL.text, scale: 0.85 }));
  }

  const nw = 142, nx2 = VIEW_W - 10 - nw;
  drawBiomeTexture(ctx, nx2, footY, nw, 64, biomeId, G.time*0.12);
  const rNest = iconButton(ctx, { x: nx2, y: footY, w: nw, h: 64, id: "nestBtn", frame: bh.accent });
  const nestImg = IMG.nest || IMG.i_essence;
  if (nestImg) ctx.drawImage(nestImg, nx2 + nw / 2 - 14, footY + 2, 28, 28);
  {
    const t = G.time * 2.2;
    for (let i = 0; i < 3; i++) {
      const tp = (t + i * 0.33) % 1;
      const ax = nx2 + nw / 2 - 26 + tp * 52;
      const ay = footY + 28 - Math.sin(tp * Math.PI) * 5;
      ctx.fillStyle = bh.accent;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ax, ay, 3, 2);
      ctx.globalAlpha = 1;
    }
  }
  // nomes lore formigueiro por bioma
  const nestNames = {
    planicie: "VENTRE ÂMBAR",
    floresta: "JARDIM ETERNO",
    pantano: "CÂMARA SILENCIOSA",
    deserto: "FORNALHA REAL",
    outono: "BERÇO DOURADO",
    gelo: "GASTER DE GELO"
  };
  drawText(ctx, nestNames[biomeId] || "FORMIGUEIRO", nx2 + nw / 2, footY + 24, { color: PAL.text, align: "center", scale: 0.9, maxWidth: nw-16 });
  drawText(ctx, "ENTRAR (B)", nx2 + nw / 2, footY + 40, { color: bh.accent, align: "center", scale: 0.85, maxWidth: nw - 8 });
  if (live && rNest.clicked) {
    openNest(run);
    return;
  }

  drawMinimap();

  let bossBottom = 0;
  if (bossUp) {
    const bw = 540, bx0 = VIEW_W / 2 - bw / 2, by = Math.max(hudTopSlot(), leftStackBottom);
    drawBiomeTexture(ctx, bx0 - 8, by, bw + 16, 44, biomeId, G.time*0.25);
    panel(ctx, bx0 - 8, by, bw + 16, 44, { border: "#ff4d5a", fill: "rgba(0,0,0,0)" });
    drawText(ctx, boss.def.name + " • FILHO DA NÉVOA", VIEW_W / 2, by + 6, { font: "small", color: "#ff4d5a", align: "center" });
    // gaster do boss pálido
    drawGasterBar(ctx, bx0, by + 24, bw, 12, boss.hp / boss.maxHp, biomeId, boss.hp/boss.maxHp < 0.5, G.time);
    // fase 2 indicador
    if (boss.hp / boss.maxHp < 0.5) {
      drawText(ctx, "FASE 2: NÉVOA DESPERTA", VIEW_W/2, by + 38, { color: "#ffd479", align: "center", scale: 0.7 });
    }
    bossBottom = by + 50;
  }
  hudFloorY = Math.max(leftStackBottom, bossBottom);

  if (mutTip && !shopTooltip) {
    const lines = wrapText(mutTip.name + " — " + mutTip.desc, 220, {});
    const th = 22 + lines.length * 15;
    drawBiomeTexture(ctx, 12, mutY + 24, 236, th, biomeId, G.time*0.4);
    panel(ctx, 12, mutY + 24, 236, th, { border: RARITY[mutTip.rar].color, fill: "rgba(0,0,0,0)" });
    lines.forEach((L, li) => drawText(ctx, L, 20, mutY + 30 + li * 15, { color: PAL.text }));
  }

  const sc = selectedCount();
  if (sc > 0 && !run.draft) {
    const lbl = sc + " IRMÃS NA TRILHA";
    const tw = textWidth(lbl, {});
    drawText(ctx, lbl, clamp(mouse.x + 16, 6, VIEW_W - tw - 6), clamp(mouse.y + 10, 6, VIEW_H - 22), { color: bh.foodColor });
  }

  if (sel.active && sel.moved) {
    const a = worldToScreen(sel.x0, sel.y0), b = worldToScreen(sel.x1, sel.y1);
    ctx.strokeStyle = bh.border;
    ctx.fillStyle = bh.foodColor;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    ctx.fillStyle = bh.border;
    ctx.globalAlpha = 0.9;
    const cs = 6;
    ctx.fillRect(a.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(a.x - cs/2, b.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, b.y - cs/2, cs, cs);
    ctx.globalAlpha = 1;
  }

  if (run.elapsed < 14 && run.status === "running" && !keys.KeyH) {
    ctx.fillStyle = "rgba(10,8,16,0.65)";
    ctx.fillRect(VIEW_W/2 - 300, VIEW_H - 124, 600, 16);
    drawText(ctx, "ESQ: CÂMERA/ORDEM • DIR: SELECIONAR • Q: IRMÃS • B: " + ({"planicie":"VENTRE","floresta":"JARDIM","pantano":"CÂMARA","deserto":"FORNALHA","outono":"BERÇO","gelo":"GASTER"}[biomeId]||"NINHO") + " • H: FEROMÔNIO • ESC: PAUSA",
      VIEW_W / 2, VIEW_H - 120, { color: PAL.textDim, align: "center", alpha: clamp(14 - run.elapsed, 0, 4) / 4, scale: 0.85 });
  }
  // Dica H no rodapé, sem encobrir os preços da fileira de formigas.
  if (!keys.KeyH && live && !shopOpen) {
    drawText(ctx, "[H] VISÃO FEROMÔNIO • A COLÔNIA VÊ COM CHEIRO", VIEW_W/2, VIEW_H - 20, { color: PAL.text, align: "center", scale: 0.85, maxWidth: 600 });
  }
  if (keys.KeyH && live) drawPheromoneLegend(ctx, VIEW_W, VIEW_H - 122);
}


let hudExpanded = false;
let hudFloorY = 0;


function drawMinimap() {
  const run = G.run;
  const m = mapDef();
  const biomeId = m ? m.id : "planicie";
  const bh = BIOME_HUD[biomeId] || BIOME_HUD.planicie;
  const mw = MINI.w, mh = MINI.h;
  const mx = VIEW_W - mw - 10, my = 10;
  uiButtons().push({ x: mx - 3, y: my - 3, w: mw + 6, h: mh + 6, id: "minimap" });
  drawBiomeTexture(ctx, mx - 5, my - 5, mw + 10, mh + 10, biomeId, G.time*0.2);
  panel(ctx, mx - 5, my - 5, mw + 10, mh + 10, { fill: "rgba(0,0,0,0)", border: bh.minimapBorder, r: 3 });
  if (world.mini) {
    ctx.save(); ctx.globalAlpha = 0.35; ctx.drawImage(world.mini, mx, my); ctx.restore();
  }
  drawScentMinimap(ctx, mx, my, mw, mh, world.mini, WORLD_W, WORLD_H, foodTrailAt, dangerAt, G.time);
  ctx.strokeStyle = bh.minimapBorder; ctx.lineWidth = 1.2;
  ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);
  // label bioma no minimapa

  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  for (const a of allies) {
    if (a.dead) continue;
    ctx.fillStyle = a.def.role === "worker" ? "#37e6c8" : "#8fd3ff";
    ctx.fillRect(mx + a.x * sx - 1, my + a.y * sy - 1, 2, 2);
  }
  for (const f of foes) {
    if (f.dead) continue;
    if (!f.revealT && !fogVisible(f.x, f.y) && !(f.isBoss && f.revealT > 0)) continue;
    ctx.fillStyle = f.isBoss ? "#ffd479" : "#ff4d5a";
    const s2 = f.isBoss ? 3 : 2;
    ctx.fillRect(mx + f.x * sx - s2 / 2, my + f.y * sy - s2 / 2, s2, s2);
  }
  const A = world.anthill;
  const pulse = 2 + Math.sin(G.time * 4) * 0.8;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ffd479";
  ctx.globalAlpha = 0.6 + Math.sin(G.time*4)*0.2;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 1.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 3, 0, TAU); ctx.stroke();
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.65)";
  ctx.strokeRect(mx + (cam.x - vx / 2) * sx, my + (cam.y - vy / 2) * sy, vx * sx, vy * sy);
  fogDrawMini(ctx, mx, my, mw, mh);
  drawText(ctx, bh.loreName, mx + mw/2, my + 4, { color: bh.border, align: "center", scale: 0.7, maxWidth: mw-12 });


  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;
  if (live && mouse.justDown && pointInRect(mouse.x, mouse.y, mx, my, mw, mh)) {
    cam.x = (mouse.x - mx) / sx;
    cam.y = (mouse.y - my) / sy;
    SFX.uiClick();
  }
}

// ----------------------------------------------------------------- banner ---
function drawBanner(b) {
  const a = clamp(b.t < 0.6 ? b.t / 0.6 : b.t > 3.2 - 0.5 ? (3.2 + 0.6 - b.t) / 0.5 + 0.2 : 1, 0, 1);
  ctx.globalAlpha = clamp(a, 0, 1);
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  let y = tut ? tut.y + tut.h + 60 : 120;
  y = Math.max(y, hudFloorY + 6);

  const bw = 600;
  // Fase 2: banner como tábua-seta de madeira do bioma (fallback: dialogBox)
  if (!drawWoodBanner(ctx, VIEW_W/2 - bw/2, y - 14, bw, 84, hudBiome())) {
    dialogBox(ctx, VIEW_W/2 - bw/2, y - 14, bw, 84, { border: "#ffd479", accent: "#ffd479" });
  }
  drawText(ctx, b.title, VIEW_W / 2, y, { font: "big", scale: 2, color: "#ffd479", align: "center", maxWidth: bw-40 });
  if (b.sub) {
    const lines = wrapText(b.sub, 560, {});
    lines.forEach((L, li) => drawText(ctx, L, VIEW_W / 2, y + 48 + li * 18, { color: PAL.text, align: "center" }));
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ draft ---
function drawDraft(draft) {
  ctx.fillStyle = "rgba(10,8,16,0.84)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.15;
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 48, { font: "big", scale: 2.1, color: "#c77dff", align: "center" });
  ctx.restore();
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 48, { font: "big", scale: 2, color: "#c77dff", align: "center" });
  drawKitIcon(ctx, 2, VIEW_W / 2 - 220, 42, 22); drawKitIcon(ctx, 2, VIEW_W / 2 + 198, 42, 22);
  drawText(ctx, "A colônia evolui. Escolha 1 de 3 — vale só nesta expedição.", VIEW_W / 2, 96, { color: PAL.textDim, align: "center" });

  const cw = 220, ch = 300, gap = 26;
  const x0 = VIEW_W / 2 - (cw * 3 + gap * 2) / 2;
  const y = 144;
  for (let i = 0; i < draft.options.length; i++) {
    const mm = draft.options[i];
    const x = x0 + i * (cw + gap);
    const hot = pointInRect(mouse.x, mouse.y, x, y, cw, ch);
    const lift = hot ? 10 : 0;
    const rare = RARITY[mm.rar];

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x + 4, y + 6 - lift, cw, ch);

    panel(ctx, x, y - lift, cw, ch, { border: rare.color, accentLine: rare.color, glow: hot ? rare.color : null });
    ctx.fillStyle = rare.color;
    ctx.fillRect(x, y - lift, cw, 5);
    if (hot) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, y - lift, cw, 24);
      ctx.restore();
    }

    const icon = IMG["i_" + mm.icon];
    if (icon) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(x + cw / 2 - 36, y + 26 - lift, 72, 72);
      ctx.strokeStyle = rare.color; ctx.lineWidth = 2;
      ctx.strokeRect(x + cw / 2 - 36, y + 26 - lift, 72, 72);
      if (hot) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = rare.color;
        ctx.fillRect(x + cw / 2 - 36, y + 26 - lift, 72, 72);
        ctx.restore();
      }
      ctx.drawImage(icon, x + cw / 2 - 30, y + 32 - lift, 60, 60);
    }
    drawText(ctx, rare.name, x + cw / 2, y + 112 - lift, { color: rare.color, align: "center" });
    drawText(ctx, mm.name, x + cw / 2, y + 132 - lift, { font: "big", scale: 1, color: "#efe9ff", align: "center" });
    const lines = wrapText(mm.desc, cw - 28, {});
    lines.slice(0, 4).forEach((L, li) => drawText(ctx, L, x + cw / 2, y + 166 + li * 19 - lift, { color: PAL.text, align: "center" }));
    ctx.fillStyle = hot ? rare.color : "#2a2340";
    ctx.fillRect(x + cw/2 - 18, y + ch - 36 - lift, 36, 20);
    ctx.strokeStyle = rare.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.strokeRect(x + cw/2 - 18 + 0.5, y + ch - 36 - lift + 0.5, 35, 19);
    ctx.globalAlpha = 1;
    drawText(ctx, String(i + 1), x + cw / 2, y + ch - 34 - lift, { color: hot ? "#000" : "#efe9ff", align: "center" });

    if (hot && mouse.justDown && !paused) { pickDraft(i); return; }
  }
}

// -------------------------------------------------------------- transição mapa --
function drawMapTransition(run) {
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const nextIdx = director.mapIdx + 1;
  const next = nextIdx < MAPS.length ? MAPS[nextIdx] : null;

  if (Math.random() < 0.3) {
    spawnPart({ x: rand(0,VIEW_W), y: VIEW_H + 10, vx: rand(-10,10), vy: rand(-60,-20), life: rand(1,2), size: rand(1,3), color: "#ffd479", glow: true, drag: 1 });
  }

  dialogBox(ctx, VIEW_W/2 - 260, 90, 520, 320, { border: "#ffd479", accent: "#37e6c8" });
  drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 110, { font: "big", scale: 2.2, color: "#ffd479", align: "center" });
  drawText(ctx, "O chefão caiu. A colônia respira — e a Rainha se recupera.", VIEW_W / 2, 170, { color: PAL.text, align: "center" });
  if (next) {
    drawText(ctx, "PRÓXIMO DESTINO:", VIEW_W / 2, 206, { color: PAL.textDim, align: "center" });
    drawText(ctx, "MAPA " + (nextIdx + 1) + "/" + MAPS.length + " — " + next.name, VIEW_W / 2, 232, { font: "big", scale: 1, color: "#37e6c8", align: "center" });
    drawText(ctx, next.sub, VIEW_W / 2, 258, { color: PAL.textDim, align: "center" });
  }

  if (button(ctx, { x: VIEW_W / 2 - 150, y: 300, w: 300, h: 48, label: "AVANÇAR A EXPEDIÇÃO", id: "goNext", accent: "#37e6c8" })) {
    advanceMap();
    return;
  }
  if (pressed.Enter || pressed.Space) advanceMap();
}

// ------------------------------------------------------------------ pausa ---
// FASE 5: Pausa com Mapa - 2 colunas esquerda 6 botões + direita mini-mapa + stats + btnH 104px mobile
function drawPause() {
  const mobile = isMobileLayout();
  ctx.fillStyle = "rgba(10,8,16,0.86)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // layout 2 colunas: esquerda botões, direita mapa+stats
  const leftW = mobile ? 400 : 360, rightW = mobile ? 380 : 340;
  const totalW = leftW + rightW + 24;
  const startX = VIEW_W/2 - totalW/2;
  const py = mobile ? 20 : 48;
  // o painel cabendo no canvas é o que impede "REINICIAR/SAIR" de sumir no celular
  const panelH = Math.min(mobile ? 500 : 440, VIEW_H - py - 16);

  // painel esquerda - botões
  dialogBox(ctx, startX, py, leftW, panelH, { border: "#8f6fd6", accent: "#37e6c8" });
  drawText(ctx, "PAUSA", startX + leftW/2, py + 18, { font: "big", scale: 2, color: "#ffd479", align: "center" });

  const run = G.run;
  const btnW = leftW - 32;
  const btnH = mobile ? 52 : 40;
  // o título "PAUSA" (fonte big, escala 2) tem tinta até py+68 — botões só abaixo
  let by = py + 78;
  const gap = mobile ? 22 : 10;

  const pauseBtns = [
    { label: "CONTINUAR", id: "resume", accent: "#37e6c8" },
    { label: "OPÇÕES", id: "pauseOptions", accent: "#ffb347" },
    { label: "ÁRVORE DA EVOLUÇÃO", id: "pauseTree", accent: "#c77dff" },
    { label: "COMO JOGAR", id: "pauseHelp", accent: "#6db7ff" },
    { label: "REINICIAR EXPEDIÇÃO", id: "restart", accent: "#ffb347" },
    { label: "SAIR PARA O MENU", id: "quit", accent: "#ff4d5a" },
  ];

  for (const b of pauseBtns) {
    if (button(ctx, { x: startX + 16, y: by, w: btnW, h: btnH, label: b.label, id: b.id, accent: b.accent })) {
      if (b.id === "resume") { paused = false; return; }
      if (b.id === "pauseOptions") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        optionsReturn = "RUN";
        optionsTab = 0; optionsScroll = 0; optGrab = null;
        startTransition("auto", "RUN", "OPTIONS", 0, () => { G.screen = "OPTIONS"; });
        return;
      }
      if (b.id === "pauseTree") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        enterTree();
        treeReturn = "RUN";
        startTransition("auto", "RUN", "TREE", 0, () => { G.screen = "TREE"; });
        return;
      }
      if (b.id === "pauseHelp") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        helpReturn = "RUN";
        startTransition("auto", "RUN", "HELP", 0, () => { G.screen = "HELP"; });
        return;
      }
      if (b.id === "restart") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        settleAbandon();
        newRun(G.run.modeDef);
        return;
      }
      if (b.id === "quit") {
        notePointer(mouse.x, mouse.y);
        paused = false;
        settleAbandon();
        startTransition("auto", "RUN", "TITLE", 0, () => { G.screen = "TITLE"; });
        return;
      }
    }
    by += btnH + gap;
  }

  // painel direita - mapa + stats
  const rx = startX + leftW + 24;
  dialogBox(ctx, rx, py, rightW, panelH, { border: "#4a3a6e", accent: "#ffd479" });
  drawText(ctx, "MAPA E STATUS", rx + rightW/2, py + 18, { font: "big", color: "#ffd479", align: "center" });

  // mini-mapa maior na pausa - FASE 5 FINAL: interativo clique move câmera + hover + stats expandidos
  const miniX = rx + 16, miniY = py + 44, miniW = rightW - 32, miniH = 160;
  panel(ctx, miniX - 2, miniY - 2, miniW + 4, miniH + 4, { fill: "rgba(10,8,16,0.9)", border: "#4a3a6e", r: 3 });
  if (world.mini) {
    ctx.drawImage(world.mini, miniX, miniY, miniW, miniH);
  }
  // desenha posição câmera e formigas no mini-mapa da pausa
  const sx = miniW / WORLD_W, sy = miniH / WORLD_H;
  for (const a of allies) {
    if (a.dead) continue;
    ctx.fillStyle = a.def.role === "worker" ? "#37e6c8" : a.type === "healer" ? "#7fd6a0" : "#8fd3ff";
    ctx.fillRect(miniX + a.x * sx - 1, miniY + a.y * sy - 1, 2, 2);
  }
  for (const f of foes) {
    if (f.dead) continue;
    if (!f.revealT && !fogVisible(f.x, f.y) && !(f.isBoss && f.revealT > 0)) continue;
    ctx.fillStyle = f.isBoss ? "#ffd479" : "#ff4d5a";
    const s2 = f.isBoss ? 3 : 2;
    ctx.fillRect(miniX + f.x * sx - s2/2, miniY + f.y * sy - s2/2, s2, s2);
  }
  const A = world.anthill;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath(); ctx.arc(miniX + A.x * sx, miniY + A.y * sy, 4, 0, TAU); ctx.fill();
  // viewport da câmera
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(miniX + (cam.x - vx/2)*sx, miniY + (cam.y - vy/2)*sy, vx*sx, vy*sy);
  // interatividade: clique no mini-mapa move câmera
  if (pointInRect(mouse.x, mouse.y, miniX, miniY, miniW, miniH)) {
    ctx.strokeStyle = "#37e6c8"; ctx.lineWidth = 2;
    ctx.strokeRect(miniX-1, miniY-1, miniW+2, miniH+2);
    drawText(ctx, "CLIQUE PARA MOVER CÂMERA", rx + rightW/2, miniY + miniH + 4, { color: "#37e6c8", align: "center", scale: 0.7 });
    if (mouse.justDown) {
      cam.x = (mouse.x - miniX) / sx;
      cam.y = (mouse.y - miniY) / sy;
      SFX.uiClick();
    }
  }
  // fog no mini pausa
  fogDrawMini(ctx, miniX, miniY, miniW, miniH);

  let sy2 = miniY + miniH + 24;
  if (run) {
    drawText(ctx, "MODO: " + (run.modeDef ? run.modeDef.name : "CAMPANHA"), rx + 16, sy2, { color: run.modeDef ? run.modeDef.color : "#37e6c8" }); sy2 += 18;
  if (run.ascension) { drawText(ctx, "ASCENSÃO DA NÉVOA: " + run.ascension, rx + 16, sy2, { color: "#ff8a96" }); sy2 += 18; }
    drawText(ctx, "MAPA: " + (run.mapIdx + 1) + "/" + MAPS.length + " - " + MAPS[run.mapIdx].name, rx + 16, sy2, { color: PAL.text }); sy2 += 18;
    drawText(ctx, "ONDA: " + run.wave + " • ABATES: " + run.kills, rx + 16, sy2, { color: PAL.textDim }); sy2 += 18;
    drawText(ctx, "NÍVEL: " + run.level + " • COMIDA: " + fmt(run.food), rx + 16, sy2, { color: PAL.textDim }); sy2 += 18;
    drawText(ctx, "ESSÊNCIA: " + fmt(run.essencePool) + " • MUTAÇÕES: " + run.mutationLog.length, rx + 16, sy2, { color: "#c77dff" }); sy2 += 18;
    drawText(ctx, "POP: " + popUsed() + "/" + popCapTotal() + " • TEMPO: " + Math.floor(run.elapsed) + "s", rx + 16, sy2, { color: PAL.textDim, scale: 0.85 }); sy2 += 18;

    // cérebro da colônia + headcount detalhado
    const n = colony.needs, hc = colony.headcount;
    drawText(ctx, "COLÔNIA: FOME " + Math.round(n.food*100) + "% • GUERRA " + Math.round(n.defense*100) + "% • CURA " + Math.round(n.medical*100) + "%", rx + 16, sy2, { color: "#8f7bb5", scale: 0.75, maxWidth: rightW - 32 }); sy2 += 16;
    drawText(ctx, "COLETANDO " + hc.gather + " • EXPLORANDO " + hc.explore + " • DEFENDENDO " + (hc.defend||0), rx + 16, sy2, { color: "#9a8fc0", scale: 0.75, maxWidth: rightW - 32 }); sy2 += 18;

    if (G.save.accessibility.invincible) {
      drawText(ctx, "INVENCÍVEL ATIVO", rx + 16, sy2, { color: "#7fd6a0" }); sy2 += 16;
    }
    if (G.save.accessibility.infiniteDash) {
      drawText(ctx, "∞ DASHES INFINITOS ATIVO", rx + 16, sy2, { color: "#37e6c8", scale: 0.85 }); sy2 += 16;
    }
    if (rallyCooldown > 0) {
      drawText(ctx, "RALI RECARGA: " + rallyCooldown.toFixed(1) + "s", rx + 16, sy2, { color: "#ff4d5a", scale: 0.8 }); sy2 += 16;
    }
  }

  drawText(ctx, "ESC: VOLTAR • M: SOM • CLIQUE NO MAPA", rx + rightW/2, py + panelH - 12, { color: PAL.textDim, align: "center", scale: 0.75 });
}

function settleAbandon() {
  const run = G.run;
  run.status = "lost";
  settleRun();
  run.status = "ended";
}

let helpReturn = "TITLE";
let treeReturn = "TITLE";

function backFromTree() {
  notePointer(mouse.x, mouse.y);
  const to = treeReturn;
  startTransition("auto", "TREE", to, 0, () => { G.screen = to; });
}

// ------------------------------------------- PÓS-FINAL: tela de PROFECIAS ----
function openProphecies() {
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  checkProphecies(null, false, null);   // concede as de estado acumulado
  persistSave();
  startTransition("auto", "TREE", "PROPHECY", 0, () => { G.screen = "PROPHECY"; });
}

function backFromProphecies() {
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  startTransition("auto", "PROPHECY", "TREE", 0, () => { G.screen = "TREE"; });
}

function updateProphecyScreen(dt) {
  if (pressed.Escape) backFromProphecies();
}

function renderProphecyScreen() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "#0e0a18");
  g.addColorStop(1, "#1a1430");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  panel(ctx, 12, 10, 440, 60, { border: "#6ee7ff", accentLine: "#6ee7ff" });
  drawText(ctx, "PROFECIAS DA COLÔNIA", 28, 20, { font: "big", scale: 1, color: "#6ee7ff" });
  drawText(ctx, "Vaticínios da Matriarca — cumpra-os pela essência", 28, 44, { color: PAL.textDim });
  const done = Object.keys(G.save.prophecies || {}).length;
  drawText(ctx, done + "/" + PROPHECIES.length, 436, 34, { color: "#efe9ff", align: "right" });

  panel(ctx, VIEW_W - 520, 10, 160, 60, { border: "#c77dff" });
  const ic = IMG.i_essence;
  if (ic) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, VIEW_W - 512, 24, 34, 34); }
  drawText(ctx, G.save.essence, VIEW_W - 468, 34, { font: "big", scale: 1, color: "#c77dff" });

  if (button(ctx, { x: VIEW_W - 180, y: 18, w: 156, h: 40, label: "VOLTAR", id: "prophecyBack", font: "small", accent: "#ff4d5a" })) {
    backFromProphecies();
  }

  const colW = 452, x0 = 24, y0 = 92, step = 54;
  PROPHECIES.forEach((p, i) => {
    const col = Math.floor(i / 8), row = i % 8;
    const x = x0 + col * (colW + 20), y = y0 + row * step;
    const ok = !!(G.save.prophecies || {})[p.id];
    panel(ctx, x, y, colW, 46, { border: ok ? "#7fd6a0" : "#3a3054", fill: ok ? "rgba(26,42,32,0.75)" : "rgba(16,12,26,0.75)" });
    const kitP = drawKitIcon(ctx, ok ? 0 : 1, x + 10, y + 6, 14);
    if (!kitP) drawText(ctx, ok ? "✓ " : "• ", x + 10, y + 7, { color: ok ? "#7fd6a0" : "#6ee7ff" });
    drawText(ctx, p.name, x + 10 + (kitP ? 18 : 0), y + 7, { color: ok ? "#7fd6a0" : "#6ee7ff" });
    drawText(ctx, p.desc, x + 10, y + 26, { color: ok ? PAL.textDim : PAL.text, scale: 0.9 });
    drawText(ctx, "+" + p.reward, x + colW - 12, y + 26, { color: "#c77dff", align: "right" });
  });

  drawText(ctx, "ESC: VOLTAR • A COLÔNIA CUMPRE, A ESSÊNCIA LEMBRA", VIEW_W / 2, VIEW_H - 16, { color: PAL.textDim, align: "center" });
}

// ------------------------------------------------------------------- fim ----
function drawEnd(run) {
  ctx.fillStyle = "rgba(10,8,16,0.88)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const p = run.payout;
  if (!p) return;
  const won = p.winBonus > 0;
  const PX = VIEW_W / 2 - 260, PY = 40, PW = 520, PH = 460;
  dialogBox(ctx, PX, PY, PW, PH, { border: won ? "#ffd479" : "#ff4d5a", accent: won ? "#ffd479" : "#ff4d5a" });

  drawText(ctx, won ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU", VIEW_W / 2, PY + 22, { font: "big", scale: 2, color: won ? "#ffd479" : "#ff4d5a", align: "center" });
  const subLock = won ? "O arauto do inverno caiu. A colônia atravessou os seis degraus — e no alto do mundo a Névoa ainda espera." : "A rainha tombou. Mas a essência alimenta a próxima geração.";
  const subLines = wrapText(subLock, PW - 60, {});
  subLines.forEach((L, li) => drawText(ctx, L, VIEW_W / 2, PY + 72 + li * 18, { color: PAL.text, align: "center" }));
  // PÓS-FINAL: a Era do Formigueiro Eterno avança a cada vitória de campanha
  let eraLine = "";
  if (won && run.mode === "campanha") {
    const e = Math.max(1, G.save.era || 1);
    eraLine = "ERA " + e + " — " + ERA_LINES[(e - 1) % ERA_LINES.length];
    drawText(ctx, eraLine, VIEW_W / 2, PY + 72 + subLines.length * 18, { color: "#ffd479", align: "center" });
  }

  const rows = [
    ["MODO", run.modeDef ? run.modeDef.name : "CAMPANHA", run.modeDef ? run.modeDef.color : PAL.text],
    ["ONDAS REPELIDAS", String(run.wave), PAL.text],
    ["MAPAS LIMPOS", run.mapsCleared + "/" + MAPS.length, PAL.text],
    ["INIMIGOS ABATIDOS", String(run.kills), PAL.text],
    ["NÍVEL DA COLÔNIA", String(run.level), PAL.text],
    ["MUTAÇÕES", String(run.mutationLog.length), PAL.text],
    ["RELÍQUIA (10%)", String(p.relic), "#c77dff"],
    ["BÔNUS DE ONDAS", "+" + p.waveBonus, "#c77dff"],
    ["BÔNUS DE MAPAS", "+" + p.mapBonus, "#c77dff"],
    ["BÔNUS DE ABATES", "+" + p.killBonus, "#c77dff"],
  ];
  if (p.winBonus) rows.push(["VITÓRIA ÉPICA", "+" + p.winBonus, "#c77dff"]);
  if (p.ascension) rows.push(["ASCENSÃO DA NÉVOA", "NV " + p.ascension + " (x" + p.ascMult.toFixed(2) + ")", "#ff8a96"]);
  if (p.prophecies) for (const pr of p.prophecies) rows.push(["PROFECIA: " + pr.name, "+" + pr.reward, "#6ee7ff"]);
  if (p.mult > 1) rows.push(["MULTIPLICADOR", "x" + p.mult.toFixed(2), "#ffd479"]);

  const btnTop = PY + PH - 100;
  const totalY = btnTop - 72;
  const iconsH = run.mutationLog.length ? 26 : 0;
  const rowsBottom = totalY - 8 - iconsH - 14;

  const y0 = PY + 72 + (subLines.length + (eraLine ? 1 : 0)) * 18 + 14;
  const half = Math.ceil(rows.length / 2);
  const maxRows = Math.max(half, rows.length - half);
  let step = 20;
  if (y0 + (maxRows - 1) * step > rowsBottom) {
    step = Math.max(14, Math.floor((rowsBottom - y0) / Math.max(1, maxRows - 1)));
  }
  const colX = [PX + 24, PX + 270], colW = 212;
  rows.forEach(([label, val, col], i) => {
    const cx = colX[i < half ? 0 : 1];
    const ry = y0 + (i % half) * step;
    drawText(ctx, label, cx, ry, { color: PAL.textDim });
    drawText(ctx, val, cx + colW, ry, { color: col, align: "right" });
  });
  let y = y0 + (maxRows - 1) * step + 20;

  if (run.mutationLog.length) {
    const maxIcons = 14;
    let ix = PX + 24;
    for (const mm of run.mutationLog.slice(0, maxIcons)) {
      const icon = IMG["i_" + mm.icon];
      if (icon) ctx.drawImage(icon, ix, y, 20, 20);
      ix += 26;
    }
    if (run.mutationLog.length > maxIcons) {
      drawText(ctx, "+" + (run.mutationLog.length - maxIcons), ix, y + 4, { color: PAL.textDim });
    }
    y += iconsH;
  }

  ctx.fillStyle = "#3a3054";
  ctx.fillRect(PX + 24, totalY, PW - 48, 2);
  drawText(ctx, "TOTAL DE GELÉIA REAL", PX + 24, totalY + 20, { font: "big", scale: 1, color: "#c77dff" });
  drawText(ctx, "+" + p.total, PX + PW - 24, totalY + 14, { font: "big", scale: 2, color: "#ffd479", align: "right" });

  const mobile = isMobileLayout();
  const by = btnTop;
  if (button(ctx, { x: VIEW_W / 2 - 230, y: by, w: 220, h: mobile ? 52 : 40, label: "NOVA EXPEDIÇÃO", id: "again", accent: "#37e6c8" })) {
    notePointer(mouse.x, mouse.y);
    paused = false;
    newRun(run.modeDef);
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 + 10, y: by, w: 220, h: mobile ? 52 : 40, label: "ÁRVORE DA EVOLUÇÃO", id: "goTree", accent: "#c77dff" })) {
    notePointer(mouse.x, mouse.y);
    enterTree();
    treeReturn = "TITLE";
    startTransition("auto", "RUN", "TREE", 0, () => { G.screen = "TREE"; });
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 110, y: by + (mobile ? 72 : 48), w: 220, h: mobile ? 44 : 32, label: "MENU PRINCIPAL", id: "menu" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "RUN", "TITLE", 0, () => { G.screen = "TITLE"; });
    return;
  }
}


// ------------------------------------------- MEGA LORE: Biblioteca Memórias da Colônia ----
let memoryHover = -1;
let memoryRects = [];

function openMemories() {
  notePointer(mouse.x, mouse.y);
  SFX.uiClick();
  memoryHover = -1;
  startTransition("auto", "TREE", "MEMORY", 0, () => { G.screen = "MEMORY"; });
}

function updateMemoryScreen(dt) {
  const defs = getCutsceneDefs();
  memoryHover = -1;
  for (let i=0;i<memoryRects.length;i++) {
    const r = memoryRects[i];
    if (pointInRect(mouse.x, mouse.y, r.x, r.y, r.w, r.h)) { memoryHover = i; break; }
  }
  if (mouse.justDown && memoryHover >= 0) {
    const id = memoryRects[memoryHover].id;
    SFX.uiClick();
    startTransition("auto", "MEMORY", "RUN", 0, () => {
      G.screen = "RUN";
      // abre cutscene da memória em modo biblioteca
      setTimeout(() => startCutscene(id, { fromLibrary: true, force: true }), 400);
    });
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    startTransition("auto", "MEMORY", "TREE", 0, () => { G.screen = "TREE"; });
  }
}

function renderMemoryScreen() {
  drawSolidMenuBg(ctx, "#0a0812");
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
  const PX=24, PY=16, PW=VIEW_W-48, PH=VIEW_H-32;
  dialogBox(ctx, PX, PY, PW, PH, { border: "#ffd479", accent: "#7fd6a0" });
  drawText(ctx, "MEMÓRIAS DA COLÔNIA", VIEW_W/2, PY+14, { font:"big", scale:2, color:"#ffd479", align:"center" });
  drawText(ctx, "Biblioteca de cutscenes HQ Dead Cells — 8 layers parallax 320x180 • Auto primeira vez + rever aqui", VIEW_W/2, PY+48, { color:"#9a8fc0", align:"center", scale:0.85 });

  const defs = getCutsceneDefs();
  const ids = Object.keys(defs);
  memoryRects = [];
  let y = PY+80;
  let x = PX+24;
  const cw = 300, ch = 64, gap=12;
  let col=0;
  for (const id of ids) {
    if (id.startsWith("loading_")) continue;
    const def = defs[id];
    const seen = G.save.cutscenes && G.save.cutscenes[id];
    const isHover = memoryHover === memoryRects.length;
    const border = seen ? (isHover ? "#ffd479" : "#4a3a6e") : "#2a2340";
    const fill = seen ? (isHover ? "rgba(255,212,121,0.12)" : "rgba(20,14,32,0.85)") : "rgba(10,8,16,0.5)";
    panel(ctx, x, y, cw, ch, { border, fill });
    const kitM = drawKitIcon(ctx, seen ? 0 : 1, x+10, y+7, 14);
    if (!kitM) drawText(ctx, seen ? "✓ " : "○ ", x+10, y+8, { color: seen ? "#ffd479" : "#5a4f78", scale:0.9 });
    drawText(ctx, def.title, x+10+(kitM ? 18 : 0), y+8, { color: seen ? "#ffd479" : "#5a4f78", scale:0.9 });
    drawText(ctx, def.subtitle, x+10, y+28, { color: seen ? PAL.textDim : "#3a3054", scale:0.75 });
    drawText(ctx, def.panels.length + " painéis • " + (def.biome||""), x+10, y+44, { color: "#6b5a8a", scale:0.7 });
    if (seen) {
      drawText(ctx, "VER", x+cw-30, y+22, { color: isHover ? "#000" : "#ffd479", align:"center" });
      if (isHover) {
        ctx.fillStyle = "#ffd479";
        ctx.fillRect(x+cw-40, y+10, 30, 24);
        drawText(ctx, "VER", x+cw-25, y+16, { color:"#000", align:"center", scale:0.8 });
      }
    }
    memoryRects.push({ x, y, w:cw, h:ch, id });
    col++;
    if (col%3===0) { col=0; x=PX+24; y+=ch+gap; }
    else { x+=cw+gap; }
    if (y > PY+PH-80) break;
  }

  const mobile = isMobileLayout();
  if (button(ctx, { x: VIEW_W/2-110, y: VIEW_H-44, w: mobile?240:220, h: mobile?104:36, label:"VOLTAR ÁRVORE", id:"memBack", accent:"#8f6fd6" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "MEMORY", "TREE", 0, () => { G.screen = "TREE"; });
  }
  drawText(ctx, "ESC: VOLTAR • CLIQUE PARA REVER CUTSCENE • 320x180 8 LAYERS", VIEW_W/2, VIEW_H-16, { color:"#5a4f78", align:"center", scale:0.8 });
}

// ---------------------------------------------------------------- exports ---
export function gameHelpReturn() { return helpReturn; }
export function setPaused(v) { paused = v; }
// MOBILE: a camada de toque usa para rotular o botão de pausa (⏸/▶)
export function isPaused() { return paused; }
// Cobertura de scanlines retrô (#scan, fora do canvas): ligada/desligada
// conforme o save. Segura nos testes headless (DOM simulado).
let scanApplied = null;
function applyScanlines() {
  const on = !!(G.save && G.save.settings && G.save.settings.scanline);
  if (on === scanApplied) return;
  scanApplied = on;
  try {
    if (typeof document === "undefined") return;
    const el = document.getElementById("scan");
    if (el) el.hidden = !on;
  } catch (e) { /* DOM simulado nos testes */ }
}

// Gancho de teste/captura: rola a aba atual até o fim.
export function __optScrollToEnd() {
  optionsScroll = Math.max(0, optionsContentH - optViewport().h);
}

export function boot() {
  initInput(canvas);
  applyScanlines();
}

// ---------------------------------------------------- gancho do MODO DEBUG ---
// Usado só por js/debug.js (carregado apenas com ?debug na URL): pula os menus
// e cai direto numa tela ou expedição, pelos MESMOS caminhos dos botões.
export const __debug = {
  modes: () => GAME_MODES.map((m) => m.id),
  startRun({ mode = "campanha", map = 0, seed = null } = {}) {
    const base = GAME_MODES.find((m) => m.id === mode) || GAME_MODES[0];
    const idx = Math.max(0, Math.min(MAPS.length - 1, map | 0));
    return newRun(Object.assign({}, base, { mapIdx: idx }), seed);
  },
  openScreen(name) {
    if (name === "TREE") { enterTree(); treeReturn = "TITLE"; }
    else if (name === "OPTIONS") { optionsReturn = "TITLE"; optionsTab = 0; optionsScroll = 0; optGrab = null; }
    else if (name === "HELP") helpReturn = "TITLE";
    else if (name === "MEMORY") memoryHover = -1;
    else if (name === "PROPHECY") checkProphecies(null, false, null);
    G.screen = name;
  },
  openNest() { if (G.run && G.screen === "RUN") openNest(G.run); },
};
