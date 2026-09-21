// ============================================================================
// FUMIGA — orquestrador V3: PRETITLE -> TITLE -> MODE -> OPTIONS -> RUN + Planície Viva
// ============================================================================
import {
  VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL, UNITS, START, MAPS, CHAMBERS,
  MUTATIONS, RARITY, HELP_GOAL, HELP_CONTROLS, HELP_TIPS, CALM_START, MAX_MUTS, xpForLevel,
} from "./config.js";
import { fogReset, fogUpdate, fogDraw, fogVisible, fogExplored, fogDrawMini } from "./fog.js";
import {
  G, mods, metaBonus, mutBonus, toggleMute, persistSave, loadSave,
} from "./state.js";
import { IMG, rotFrame } from "./assets.js";
import { drawText, textWidth, wrapText, FONT } from "./font.js";
import { keys, pressed, mouse, initInput } from "./input.js";
import { cam, camReset, updateCam, panCam, zoomCam, shake, screenToWorld, worldToScreen, visibleWorldRect } from "./camera.js";
import {
  spawnPart, burst, ring, floatText, clearParticles, updateParticles,
  impact, critBurst, healPulse, levelUpBurst, explosion, dustPoof, bloodSplatter, magicOrb,
} from "./particles.js";
import { initAudio, audioReady, SFX, setCombat } from "./audio.js";
import { world, genWorld, MINI } from "./world.js";
import {
  allies, spawnQueen, spawnAnt, updateAllies, buyUnit, unitCost, popUsed, popCapTotal,
  unitLimitLeft, selectInRect, selectTypeOnScreen, clearSelection, selectedCount,
  orderSelected, orderAttackSelected, rallyDefenders, recomputeAllies,
} from "./units.js";
import { foes, boss, clearFoes, updateFoes, updateBoss } from "./enemies.js";
import { projectiles, orbs, updateProjectiles, updateOrbs, clearCombat } from "./combat.js";
import {
  director, resetDirector, updateDirector, skipPeace, mapDef, waveDef, isLastMap, nextMapCalm,
} from "./waves.js";
import { rollDraft, applyMutation, mutationList } from "./mutations.js";
import {
  drawRun, drawTitleBg, drawSolidMenuBg, drawTitleMotes, drawPreTitle, drawPreTitleBg,
  drawModeSelect, drawModeCards, startTransition, updateTransition, drawTransition, hasTransition,
  transitionFx, notePointer, drawTitleLogo
} from "./render.js";
import { enterTree, updateTree, drawTree, treeClick } from "./meta.js";
import { colony } from "./brain.js";
import { uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect, dialogBox } from "./ui.js";
import { startTutorial, stopTutorial, updateTutorial, drawTutorial, tutEvent, TUT, tutorialCardRect } from "./tutorial.js";
import { nest, nestEnter, nestExit, nestUpdate, nestDraw, nestClick, nestHover } from "./nest.js";
import { rand, clamp, lerp, TAU, fmt } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ------------------------------------------------------------------ loja ----
const SHOP = [
  { type: "worker",   label: "OPERÁRIA" },
  { type: "gatherer", label: "COLET." },
  { type: "soldier",  label: "SOLDADO" },
  { type: "spitter",  label: "CUSPID." },
  { type: "tank",     label: "G. ÉBANO" },
  { type: "scout",    label: "BATED." },
  { type: "healer",   label: "CURAND." },
  { type: "bomber",   label: "BOMB." },
  { type: "giant",    label: "GIGANTE", iconScale: 0.13, accent: "#ffd479" },
];
const SHOP_W = 70, SHOP_PITCH = 76;
let shopOpen = false;

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
let selectedMode = GAME_MODES[0];

// ------------------------------------------------------------- options -- FASE 4: 5 abas spec (Áudio/Vídeo/Controles/Acessibilidade/Idioma)
let optionsReturn = "TITLE";
let optionsTab = 0; // 0=audio,1=video,2=controles,3=acess,4=idioma
let optionsSwipeX = null;
let modeSwipeX = null;
let modeScrollOffset = 0;
const OPTIONS_TABS = [
  { id: "audio", label: "ÁUDIO", color: "#37e6c8", icon: "♪" },
  { id: "video", label: "VÍDEO", color: "#6db7ff", icon: "◫" },
  { id: "controles", label: "CONTROLES", color: "#ffb347", icon: "⌨" },
  { id: "acess", label: "ACESSIBILIDADE", color: "#7fd6a0", icon: "♿" },
  { id: "idioma", label: "IDIOMA", color: "#ffd479", icon: "A" },
];

function isMobileLayout() {
  return (typeof window !== 'undefined' && ('ontouchstart' in window || window.innerWidth < 900));
}

// ------------------------------------------------------------------ run -----
function newRun(mode = null) {
  const mSel = mode || selectedMode;
  const seed = (Math.random() * 0xffffffff) >>> 0;
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
    chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  };
  G.run = run;
  window.__run = run;

  const queen = spawnQueen();
  window.__alliesQueen = queen;

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

function settleRun() {
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
  const total = Math.round(base * em * modeMult);
  run.payout = {
    relic, waveBonus, killBonus, mapBonus, winBonus, mult: em * modeMult, total, modeMult,
  };

  G.save.essence += total;
  const b = G.save.best;
  b.runs++;
  if (won) b.wins++;
  b.wave = Math.max(b.wave, run.wave);
  b.maps = Math.max(b.maps || 0, run.mapsCleared);
  b.kills += run.kills;
  persistSave();
}

// --------------------------------------------------------- avanço de mapa ---
function advanceMap() {
  const run = G.run;
  if (run.endless) {
    run.mapsCleared++;
    run.banner = { title: "ONDA " + (run.wave + 1) + " — SOBREVIVÊNCIA", sub: "A horda não para...", t: 3.5 };
    run.transition = false;
    SFX.chime();
    return;
  }
  director.mapIdx++;
  run.mapIdx = director.mapIdx;
  const m = mapDef();

  genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
  fogReset();
  clearFoes();
  clearCombat();

  const A = world.anthill;
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

  run.banner = { title: "MAPA " + (director.mapIdx + 1) + "/" + MAPS.length + " — " + m.name, sub: m.sub, t: 4.6 };
  run.transition = false;
  SFX.chime();
  floatText(A.x, A.y - 120, "A COLÔNIA MIGRA PARA NOVAS TERRAS", { color: "#ffd479", life: 2.2, scale: 2 });
}

// -------------------------------------------------------------- seleção -----
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, moved: false };
const pan = { active: false, moved: false };
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
    if (a.dead || a.dying) continue;
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
  // swipe mobile para cards - FASE 2
  const mobile = isMobileLayout();
  if (mobile) {
    if (mouse.justDown) modeSwipeX = mouse.x;
    if (mouse.justUp && modeSwipeX !== null) {
      const dx = mouse.x - modeSwipeX;
      if (Math.abs(dx) > 50) {
        // navega entre modos com swipe
        if (dx < 0) modeScrollOffset = Math.min(modeScrollOffset + 1, GAME_MODES.length - 1);
        if (dx > 0) modeScrollOffset = Math.max(modeScrollOffset - 1, 0);
        modeHover = modeScrollOffset;
      }
      modeSwipeX = null;
    }
  }
  if (mouse.justDown && modeHover >= 0) {
    notePointer(mouse.x, mouse.y);
    selectedMode = GAME_MODES[modeHover];
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
}

function updateTreeScreen(dt) {
  updateTree(dt);
  if (mouse.justDown && mouse.y > 90 && !uiCapture()) treeClick();
  if (pressed.Escape) {
    SFX.uiClick();
    backFromTree();
  }
}

// --------------------------------------------------------------------- RUN --
function updateRun(dt) {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  // FASE 2: gameSpeed + acessibilidade slowMo combinados
  const baseSpeed = G.save.settings.gameSpeed || 1;
  const slowMult = G.save.accessibility.slowMo ? 0.5 : 1;
  const totalSpeed = baseSpeed * slowMult;
  const simDt = dt * G.timeScale * totalSpeed;
  run.elapsed += simDt;

  if (run.baseOpen) {
    if (pressed.Escape || pressed.KeyB) { closeNest(run, true); hudInputless(dt); return; }
    nestUpdate(dt);
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

  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
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
    if (run.endless) {
      run.transition = true;
      setTimeout(() => { run.transition = false; }, 1200);
    } else {
      run.transition = true;
    }
    SFX.win();
    return;
  }

  for (let i = 0; i < SHOP.length; i++) {
    if (pressed["Digit" + (i + 1)]) {
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
  if (pressed.KeyF) {
    const n = rallyDefenders(world.anthill);
    tutEvent("rally", n);
    if (n > 0) floatText(world.anthill.x, world.anthill.y - 110, "GUARDA FORMADA! (" + n + ")", { color: "#37e6c8", life: 1.4 });
    ring(world.anthill.x, world.anthill.y, { r0: 40, r1: 200, life: 0.5, color: "#37e6c8", width: 3 });
  }

  updateDirector(simDt);
  updateAllies(simDt, foes);
  updateFoes(simDt, allies);
  if (boss) updateBoss(simDt, allies);
  updateProjectiles(simDt, allies, foes);
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
      if (a.dead || a.dying || a.type === "queen") continue;
      beings.push({ x: a.x, y: a.y, sight: a.def.sight || SIGHT[a.def.role] || 240 });
    }
    if (boss && !boss.dead && (boss.revealT || 0) > 0) beings.push({ x: boss.x, y: boss.y, sight: 320 });
    fogUpdate(beings);
  }

  const q = allies.queen;
  if (q && q.hp <= 0 && !q.dead) {
    // acessibilidade invencível
    if (G.save.accessibility.invincible) {
      q.hp = q.maxHp * 0.3;
      floatText(world.anthill.x, world.anthill.y - 80, "♿ MODO ACESSÍVEL: RAINHA PROTEGIDA", { color: "#7fd6a0", life: 1.5 });
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
      if (selectedCount() > 0) {
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
      if (drawTree(ctx, dt) === "back") backFromTree();
      break;
    }
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
  drawText(ctx, "planície viva • ciclo dia/noite • parallax • 5x escala", 60, tY + 158, { color: "#8f7bb5" });

  const bx = 56, bw = mobile ? 320 : 300;
  const btnH = mobile ? 104 : 46;
  const btns = [
    { label: "JOGAR", id: "start", accent: "#37e6c8", h: btnH, font: "big" },
    { label: "ÁRVORE DA EVOLUÇÃO", id: "tree", accent: "#c77dff", h: mobile ? 104 : 42, font: "big" },
    { label: "OPÇÕES ♿", id: "options", accent: "#ffb347", h: mobile ? 104 : 40, font: "big" },
    { label: "COMO JOGAR", id: "help", accent: "#6db7ff", h: mobile ? 104 : 38 },
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
        optionsTab = 0;
        startTransition("auto", "TITLE", "OPTIONS", 0, () => { G.screen = "OPTIONS"; });
        return;
      } else if (b.id === "help") {
        notePointer(mouse.x, mouse.y);
        helpReturn = "TITLE";
        startTransition("auto", "TITLE", "HELP", 0, () => { G.screen = "HELP"; });
        return;
      }
    }
    by += b.h + (mobile ? 14 : 10);
  }

  panel(ctx, 12, VIEW_H - 38, VIEW_W - 24, 28, { fill: "rgba(10,8,16,0.65)", border: "rgba(74,58,110,0.35)", r: 3 });
  drawText(ctx, "v2.4 • PLANÍCIE VIVA • CICLO DIA/NOITE • PARALLAX • 5X ESCALA", 20, VIEW_H - 28, { color: "#6b5a8a" });
  drawText(ctx, "GELÉIA REAL: " + G.save.essence + " • VITÓRIAS " + G.save.best.wins + "/" + G.save.best.runs + " • MAPA " + (G.save.best.maps||0) + " • M: SOM • " + (mobile ? "TOQUE 104PX" : "MOUSE"),
    VIEW_W/2, VIEW_H - 28, { color: "#9a8fc0", align: "center" });
  
  if (G.save.accessibility && (G.save.accessibility.invincible || G.save.accessibility.slowMo)) {
    drawText(ctx, "♿ MODO ACESSÍVEL ATIVO", VIEW_W - 20, VIEW_H - 28, { color: "#7fd6a0", align: "right" });
  }
}

// -------------------------------------------------------------- MODO SELEÇÃO -- FASE 3 + 6: lift 6px + 104px mobile + notePointer
function renderModeScreen() {
  drawModeSelect(ctx, G.time);
  modeRects = drawModeCards(ctx, GAME_MODES, modeHover, G.time);

  const mobile = isMobileLayout();
  if (button(ctx, { x: 20, y: VIEW_H - 46, w: mobile ? 220 : 140, h: mobile ? 104 : 32, label: "VOLTAR", id: "modeBack", accent: "#ff4d5a" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "MODE", "TITLE", 0, () => { G.screen = "TITLE"; });
  }
  drawText(ctx, mobile ? "TOQUE NO CARD PARA JOGAR • ARRASTE PARA NAVEGAR" : "ESC: VOLTAR • CLIQUE NO CARD PARA JOGAR", VIEW_W/2, VIEW_H - 20, { color: "#5a4f78", align: "center" });
}

// -------------------------------------------------------------- OPÇÕES -- FASE 4: 5 abas spec - FUNDO SÓLIDO (parallax só no TITLE)
function renderOptions() {
  drawSolidMenuBg(ctx, "#0e0c1e");
  drawTitleMotes(ctx, G.time);
  ctx.fillStyle = "rgba(10,8,18,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PX = 24, PY = 16, PW = VIEW_W - 48, PH = VIEW_H - 32;
  dialogBox(ctx, PX, PY, PW, PH, { border: "#ffb347", accent: "#37e6c8" });
  drawText(ctx, "OPÇÕES", VIEW_W / 2, PY + 14, { font: "big", scale: 2, color: "#ffd479", align: "center" });
  drawText(ctx, "5 abas: Áudio/Vídeo/Controles/Acessibilidade/Idioma • swipe no mobile", VIEW_W / 2, PY + 48, { color: "#9a8fc0", align: "center" });

  // abas - 5 abas, layout responsivo
  const isMobile = isMobileLayout();
  const tabW = isMobile ? 128 : 156, tabH = isMobile ? 36 : 36, tabGap = isMobile ? 8 : 10;
  const totalTabsW = OPTIONS_TABS.length * tabW + (OPTIONS_TABS.length - 1) * tabGap;
  const tabX0 = VIEW_W/2 - totalTabsW/2;
  for (let i = 0; i < OPTIONS_TABS.length; i++) {
    const tab = OPTIONS_TABS[i];
    const x = tabX0 + i * (tabW + tabGap);
    const y = PY + 72;
    const sel = optionsTab === i;
    if (button(ctx, { x, y, w: tabW, h: tabH, label: tab.icon + " " + tab.label, id: "tab"+i, accent: tab.color, color: sel ? "#000" : undefined, scale: isMobile ? 0.75 : 0.85 })) {
      optionsTab = i;
      SFX.uiClick();
    }
    if (sel) {
      ctx.fillStyle = tab.color;
      ctx.fillRect(x, y + tabH + 2, tabW, 3);
    }
  }

  // conteúdo da aba
  const contentY = PY + 124;
  const colX = PX + 32;
  let cy = contentY;

  if (optionsTab === 0) { // ÁUDIO - sliders spec
    drawText(ctx, "ÁUDIO", colX, cy, { font: "big", color: "#37e6c8" }); cy += 28;
    const s = G.save.settings;
    drawText(ctx, "MÚSICA: " + (G.muted ? "MUTADO (M)" : Math.round(s.musicVol*100) + "%"), colX, cy, { color: PAL.text }); cy += 22;
    if (button(ctx, { x: colX, y: cy, w: 160, h: isMobile ? 40 : 32, label: G.muted ? "LIGAR SOM" : "MUTAR (M)", id: "muteBtn", accent: "#ff4d5a" })) {
      toggleMute(); persistSave(); SFX.uiClick();
    }
    cy += isMobile ? 50 : 44;
    drawText(ctx, "SFX VOLUME: " + Math.round(s.sfxVol*100) + "%", colX, cy, { color: PAL.text }); cy += 22;
    if (button(ctx, { x: colX, y: cy, w: 100, h: isMobile ? 36 : 28, label: "SFX -", id: "sfxDown" })) {
      s.sfxVol = Math.max(0, s.sfxVol - 0.1); persistSave(); SFX.uiClick();
    }
    if (button(ctx, { x: colX + 110, y: cy, w: 100, h: isMobile ? 36 : 28, label: "SFX +", id: "sfxUp", accent: "#37e6c8" })) {
      s.sfxVol = Math.min(1, s.sfxVol + 0.1); persistSave(); SFX.uiClick();
    }
    cy += isMobile ? 44 : 36;
    if (button(ctx, { x: colX, y: cy, w: 100, h: isMobile ? 36 : 28, label: "MÚSICA -", id: "musicDown" })) {
      s.musicVol = Math.max(0, s.musicVol - 0.1); persistSave();
    }
    if (button(ctx, { x: colX + 110, y: cy, w: 100, h: isMobile ? 36 : 28, label: "MÚSICA +", id: "musicUp", accent: "#c77dff" })) {
      s.musicVol = Math.min(1, s.musicVol + 0.1); persistSave();
    }
    cy += 32;
    drawText(ctx, "DICA: Sliders estilo Celeste • M muta tudo", colX, cy, { color: "#6b5a8a", scale: 0.8 });
  } else if (optionsTab === 1) { // VÍDEO - partículas/scanline/tremor/fullscreen spec
    drawText(ctx, "VÍDEO - Planície Viva + Fullscreen", colX, cy, { font: "big", color: "#6db7ff" }); cy += 28;
    const s = G.save.settings;
    const opts = [
      { key: "particles", label: "PARTÍCULAS (motes + pollen)", desc: "Desliga motes subindo e pollen caindo - ganha performance" },
      { key: "screenshake", label: "TREMOR DE TELA", desc: "Shake quando rainha toma dano ou crítico" },
      { key: "scanline", label: "SCANLINE RETRÔ", desc: "Linhas horizontais estilo Shovel Knight" },
    ];
    for (const o of opts) {
      const on = s[o.key];
      drawText(ctx, o.label + ": " + (on ? "LIGADO" : "DESLIGADO"), colX, cy, { color: on ? "#7fd6a0" : "#5a4f78" });
      if (button(ctx, { x: colX + 360, y: cy - 4, w: 110, h: isMobile ? 32 : 24, label: on ? "DESLIGAR" : "LIGAR", id: "vid_"+o.key, accent: on ? "#ff4d5a" : "#7fd6a0" })) {
        s[o.key] = !s[o.key]; persistSave(); SFX.uiClick();
      }
      cy += 18;
      drawText(ctx, o.desc, colX, cy, { color: "#6b5a8a", scale: 0.8 }); cy += 26;
    }
    cy += 4;
    // fullscreen toggle - FASE 4
    const isFull = !!document.fullscreenElement;
    drawText(ctx, "TELA CHEIA: " + (isFull ? "LIGADO" : "JANELA"), colX, cy, { color: isFull ? "#7fd6a0" : "#5a4f78" });
    if (button(ctx, { x: colX + 360, y: cy - 4, w: 130, h: isMobile ? 32 : 24, label: isFull ? "SAIR FULLSCREEN" : "ENTRAR FULLSCREEN", id: "fullscreen", accent: "#6db7ff" })) {
      if (!isFull) document.documentElement.requestFullscreen().catch(()=>{});
      else document.exitFullscreen().catch(()=>{});
      SFX.uiClick();
    }
    cy += 18;
    drawText(ctx, "Fullscreen nativo • F11 também funciona", colX, cy, { color: "#6b5a8a", scale: 0.8 }); cy += 26;
    cy += 8;
    drawText(ctx, "PARALLAX 4 CAMADAS ALTA RESOLUÇÃO:", colX, cy, { color: "#ffd479", scale: 0.9 }); cy += 18;
    drawText(ctx, "5 Céu lua minguante laranja • 4 Montanhas silhueta • 3 Gramado ruínas+formigueiro • 1 Vinhas inferior", colX, cy, { color: "#9a8fc0", scale: 0.75 }); cy += 20;
    drawText(ctx, "CICLO DIA/NOITE: 80s • day/night tint sobre parallax + highContrast border", colX, cy, { color: "#9a8fc0", scale: 0.75 });
  } else if (optionsTab === 2) { // CONTROLES - WASD+toque spec
    drawText(ctx, "CONTROLES - PC WASD + Mobile Toque 104px", colX, cy, { font: "big", color: "#ffb347" }); cy += 28;
    for (const [k, d] of HELP_CONTROLS) {
      drawText(ctx, k, colX, cy, { color: "#37e6c8", scale: 0.9 });
      drawText(ctx, d, colX + 160, cy, { color: PAL.text, scale: 0.85 }); cy += 20;
    }
    cy += 12;
    panel(ctx, colX, cy, PW - 64, 56, { fill: "rgba(255,179,71,0.08)", border: "#ffb347", r: 4 });
    drawText(ctx, "MOBILE: Toque = clique, Arrastar = mover câmera, 2 dedos = zoom • botões 104px", colX + 8, cy + 8, { color: "#ffd479", scale: 0.85 });
    drawText(ctx, "SWIPE nos cards de modo: arraste horizontal para navegar • swipe nas abas", colX + 8, cy + 28, { color: "#ffb347", scale: 0.8 });
    cy += 64;
    drawText(ctx, "WASD move câmera • Q abre loja • B formigueiro • ESC pausa • M som", colX, cy, { color: "#6b5a8a", scale: 0.8 });
  } else if (optionsTab === 3) { // ACESSIBILIDADE - Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande + Velocidade
    drawText(ctx, "♿ ACESSIBILIDADE - Modo Assist (Celeste)", colX, cy, { font: "big", color: "#7fd6a0" }); cy += 28;
    drawText(ctx, "Spec: Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande + Velocidade", colX, cy, { color: "#9a8fc0", scale: 0.85 }); cy += 24;
    const a = G.save.accessibility;
    const accOpts = [
      { key: "invincible", label: "INVENCÍVEL - RAINHA PROTEGIDA", desc: "Rainha não morre, volta com 30% de vida - para explorar", color: "#7fd6a0" },
      { key: "infiniteDash", label: "DASHES INFINITOS", desc: "Sem cooldown de rally (F) e habilidades - spec pedida", color: "#37e6c8" },
      { key: "slowMo", label: "CÂMERA LENTA 0.5x", desc: "Jogo roda em 50% da velocidade - mais tempo para reagir", color: "#6db7ff" },
      { key: "bigFont", label: "FONTE GRANDE", desc: "Textos 30% maiores - melhor legibilidade", color: "#ffd479" },
      { key: "reducedParticles", label: "POUCAS PARTÍCULAS", desc: "Reduz motes, pollen e efeitos - menos distração", color: "#c77dff" },
      { key: "highContrast", label: "ALTO CONTRASTE", desc: "Bordas grossas, cores vivas - sobre parallax high-res", color: "#ff4d5a" },
    ];
    for (const o of accOpts) {
      const on = a[o.key];
      drawText(ctx, (on ? "✓ " : "○ ") + o.label, colX, cy, { color: on ? o.color : "#5a4f78", scale: 0.9 });
      if (button(ctx, { x: colX + 400, y: cy - 4, w: 100, h: isMobile ? 30 : 24, label: on ? "DESLIGAR" : "LIGAR", id: "acc_"+o.key, accent: o.color })) {
        a[o.key] = !a[o.key]; persistSave(); SFX.uiClick();
      }
      cy += 18;
      drawText(ctx, o.desc, colX, cy, { color: "#6b5a8a", scale: 0.8 }); cy += 24;
    }
    cy += 6;
    // Velocidade consolidada aqui - FASE 4
    drawText(ctx, "VELOCIDADE DO JOGO:", colX, cy, { color: "#ff7a6a", font: "big" }); cy += 22;
    const s = G.save.settings;
    const speeds = [
      { v: 0.5, label: "0.5x LENTO", color: "#7fd6a0" },
      { v: 1, label: "1x NORMAL", color: "#37e6c8" },
      { v: 1.5, label: "1.5x RÁPIDO", color: "#ffb347" },
      { v: 2, label: "2x MUITO RÁPIDO", color: "#ff4d5a" },
    ];
    let sx = colX;
    for (const sp of speeds) {
      const sel = s.gameSpeed === sp.v;
      if (button(ctx, { x: sx, y: cy, w: 110, h: isMobile ? 34 : 28, label: sp.label, id: "speed_"+sp.v, accent: sp.color, color: sel ? "#000" : undefined, scale: 0.8 })) {
        s.gameSpeed = sp.v; persistSave(); SFX.uiClick();
      }
      sx += 118;
    }
    cy += 36;
    if (a.invincible || a.slowMo || s.gameSpeed !== 1) {
      panel(ctx, colX, cy, PW - 64, 32, { fill: "rgba(127,214,160,0.15)", border: "#7fd6a0", r: 4 });
      drawText(ctx, "♿ ACESSÍVEL ATIVO • " + s.gameSpeed + "x • conquistas continuam valendo!", colX + 8, cy + 8, { color: "#7fd6a0", scale: 0.8 });
    }
  } else if (optionsTab === 4) { // IDIOMA
    drawText(ctx, "IDIOMA / LANGUAGE", colX, cy, { font: "big", color: "#ffd479" }); cy += 28;
    drawText(ctx, "Selecione o idioma - menus e tutoriais", colX, cy, { color: "#9a8fc0", scale: 0.85 }); cy += 28;
    const s = G.save.settings;
    const langs = [
      { id: "pt-BR", label: "PORTUGUÊS (BR)", flag: "🇧🇷", desc: "Idioma original, completo", color: "#7fd6a0" },
      { id: "en-US", label: "ENGLISH (US)", flag: "🇺🇸", desc: "English translation, full support", color: "#6db7ff" },
      { id: "es", label: "ESPAÑOL", flag: "🇪🇸", desc: "Traducción al español, en progreso", color: "#ffb347" },
    ];
    for (const lg of langs) {
      const sel = s.language === lg.id;
      drawText(ctx, lg.flag + " " + lg.label, colX, cy, { color: sel ? lg.color : "#5a4f78", font: sel ? "big" : "small" });
      drawText(ctx, lg.desc, colX + 200, cy, { color: sel ? PAL.text : "#6b5a8a", scale: 0.8 });
      if (button(ctx, { x: colX + 420, y: cy - 4, w: 80, h: isMobile ? 34 : 24, label: sel ? "ATIVO" : "USAR", id: "lang_"+lg.id, accent: lg.color, color: sel ? "#000" : undefined })) {
        s.language = lg.id; persistSave(); SFX.uiClick();
      }
      cy += 30;
    }
    cy += 12;
    panel(ctx, colX, cy, PW - 64, 40, { fill: "rgba(255,212,121,0.08)", border: "#ffd479", r: 4 });
    drawText(ctx, "Idioma afeta: menus, tutoriais, descrições de mutações e unidades", colX + 8, cy + 8, { color: "#ffd479", scale: 0.8 });
    drawText(ctx, "Atual: " + s.language + " • Mais idiomas em breve!", colX + 8, cy + 24, { color: "#9a8fc0", scale: 0.75 });
  }

  const mobile = isMobileLayout();
  if (button(ctx, { x: VIEW_W / 2 - 110, y: VIEW_H - 44, w: mobile ? 240 : 220, h: mobile ? 104 : 36, label: "VOLTAR", id: "optionsBack", accent: "#8f6fd6" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  if (pressed.Escape) {
    notePointer(VIEW_W/2, VIEW_H/2);
    startTransition("auto", "OPTIONS", optionsReturn, 0, () => { G.screen = optionsReturn; });
  }
  // swipe entre abas no mobile - FASE 2
  if (isMobile && mouse.justDown) {
    optionsSwipeX = mouse.x;
  }
  if (isMobile && mouse.justUp && optionsSwipeX !== null) {
    const dx = mouse.x - optionsSwipeX;
    if (Math.abs(dx) > 60) {
      if (dx < 0 && optionsTab < OPTIONS_TABS.length - 1) { optionsTab++; SFX.uiClick(); }
      if (dx > 0 && optionsTab > 0) { optionsTab--; SFX.uiClick(); }
    }
    optionsSwipeX = null;
  }
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
      drawText(ctx, L, colX[0], y, { color: PAL.text });
      y += 18;
    }
  }
  y += 14;

  let yl = y;
  drawText(ctx, "CONTROLES", colX[0], yl, { font: "big", color: "#c77dff" });
  yl += 26;
  for (const [k, d] of HELP_CONTROLS) {
    drawText(ctx, k, colX[0], yl, { color: "#37e6c8" });
    const lines = wrapText(d, colW - descX, {});
    lines.forEach((L, li) => drawText(ctx, L, colX[0] + descX, yl + li * 16, { color: PAL.text }));
    yl += Math.max(20, lines.length * 16 + 4);
  }

  let yr = y;
  drawText(ctx, "DICAS", colX[1], yr, { font: "big", color: "#c77dff" });
  yr += 26;
  for (const t of HELP_TIPS) {
    for (const L of wrapText(t, colW, {})) {
      drawText(ctx, L, colX[1], yr, { color: PAL.text });
      yr += 17;
    }
    yr += 6;
  }

  const helpMobile = isMobileLayout();
  if (button(ctx, { x: VIEW_W / 2 - 100, y: VIEW_H - 44, w: 200, h: helpMobile ? 104 : 36, label: "VOLTAR", id: "helpBack", accent: "#8f6fd6" })) {
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
  drawRun(ctx, dtClampForAnim());

  const modal = paused || !!run.draft || !!run.transition || !!run.baseOpen || run.status !== "running";

  if (!modal) {
    drawHUD();
    if (run.banner && run.banner.t > 0) drawBanner(run.banner);
    if (TUT.active) drawTutorial(ctx, VIEW_W);
  }
  if (run.draft && !paused) drawDraft(run.draft);
  if (run.transition && !paused && !run.endless) drawMapTransition(run);
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
  if (mouse.justDown && action !== "back") nestClick(mouse.x, mouse.y);
  if (action === "back") closeNest(run, true);
}

function hudTopSlot() {
  const tut = TUT.active ? tutorialCardRect(VIEW_W) : null;
  return tut ? tut.y + tut.h + 6 : 66;
}

function drawHUD() {
  const run = G.run;
  const m = mapDef();
  const q = allies.queen;
  const live = run.status === "running" && !paused && !run.baseOpen && !run.draft && !run.transition;

  const pw = 272;
  const baseH = 82;
  const extraH = hudExpanded ? 134 : 0;
  const ph = baseH + 22 + extraH;
  panel(ctx, 10, 8, pw, ph, { border: "#4a3a6e", accentLine: run.modeDef ? run.modeDef.color : "#37e6c8" });

  let yy = 16;
  if (run.modeDef) {
    drawText(ctx, run.modeDef.name, 22, yy, { color: run.modeDef.color, font: "small" });
    yy += 16;
  }
  drawText(ctx, "FORMIGUEIRO", 22, yy, { color: "#ffd479" });
  const hpFrac = q && q.maxHp ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  bar(ctx, 120, yy + 4, 148, 10, hpFrac, { c1: hpFrac < 0.3 ? "#ff4d5a" : "#ffd479", c2: "#a32e3a", segments: 10 });
  yy += 21;
  drawText(ctx, "NÍVEL " + run.level, 22, yy, { color: "#6db7ff" });
  const xpFrac = run.xpNext > 0 ? clamp(run.xp / run.xpNext, 0, 1) : 0;
  bar(ctx, 94, yy + 4, 168, 10, xpFrac, { c1: "#8fd3ff", c2: "#4060a8", segments: 0 });
  yy += 21;
  if (IMG.i_food) ctx.drawImage(IMG.i_food, 22, yy - 2, 16, 16);
  drawText(ctx, fmt(run.food), 42, yy + 1, { color: "#ffd479" });
  if (IMG.i_essence) ctx.drawImage(IMG.i_essence, 108, yy - 2, 16, 16);
  drawText(ctx, fmt(run.essencePool), 128, yy + 1, { color: "#c77dff" });
  yy += 22;
  const moreHot = pointInRect(mouse.x, mouse.y, 22, yy - 2, 72, 17);
  ctx.fillStyle = moreHot ? "#3a3054" : "#241c38";
  ctx.fillRect(22, yy - 2, 72, 17);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(22.5, yy - 1.5, 71, 16);
  drawText(ctx, hudExpanded ? "VER MENOS" : "VER MAIS", 58, yy + 2, { color: moreHot ? "#efe9ff" : PAL.textDim, align: "center" });
  uiButtons().push({ x: 22, y: yy - 2, w: 72, h: 17, id: "hudMore" });
  if (live && moreHot && mouse.justDown) { hudExpanded = !hudExpanded; SFX.uiClick(); }

  if (hudExpanded) {
    yy += 22;
    const used = popUsed(), cap = popCapTotal();
    drawText(ctx, "POPULAÇÃO " + used + "/" + cap, 22, yy, { color: used >= cap ? "#ff4d5a" : PAL.textDim });
    drawText(ctx, "ABATES " + run.kills, 164, yy, { color: PAL.textDim });
    yy += 18;
    const cy = yy + 2;
    drawText(ctx, "COLÔNIA PENSANDO", 22, cy, { color: "#8f7bb5" });
    const n = colony.needs, hc = colony.headcount;
    let bx = 22;
    const needBar = (label, v, col) => {
      drawText(ctx, label, bx, cy + 16, { color: col });
      bar(ctx, bx, cy + 30, 60, 6, v, { c1: col, c2: col, segments: 0 });
      bx += 74;
    };
    needBar("FOME", n.food, "#ffd479");
    needBar("GUERRA", n.defense, "#ff4d5a");
    needBar("CURA", n.medical, "#7fd6a0");
    drawText(ctx, "COLETANDO " + hc.gather + "  •  EXPLORANDO " + hc.explore, 22, cy + 44, { color: PAL.textDim });
    yy += 56;
    if (run.mutationLog.length > 0) {
      let ix = 22;
      for (const mm of run.mutationLog.slice(0, 7)) {
        const icon = IMG["i_" + mm.icon];
        ctx.fillStyle = PAL.panel;
        ctx.fillRect(ix, yy - 2, 20, 20);
        ctx.strokeStyle = RARITY[mm.rar].color; ctx.lineWidth = 1;
        ctx.strokeRect(ix + 0.5, yy - 1.5, 19, 19);
        if (icon) ctx.drawImage(icon, ix + 2, yy, 16, 16);
        if (pointInRect(mouse.x, mouse.y, ix, yy - 2, 20, 20) && !shopTooltip) {
          const lines = wrapText(mm.name + " — " + mm.desc, 220, {});
          const th = 22 + lines.length * 15;
          panel(ctx, ix, yy + 20, 236, th, { border: RARITY[mm.rar].color });
          lines.forEach((L, li) => drawText(ctx, L, ix + 8, yy + 26 + li * 15, { color: PAL.text }));
        }
        ix += 25;
      }
      if (run.mutationLog.length > 7) drawText(ctx, "+" + (run.mutationLog.length - 7), ix + 2, yy + 2, { color: PAL.textDim });
      yy += 24;
    }
  }

  const cw = 280;
  panel(ctx, VIEW_W / 2 - cw / 2, 8, cw, 56, { border: "#4a3a6e" });
  if (run.status === "running") {
    if (director.phase === "calm") {
      const t = Math.max(0, Math.ceil(director.timer));
      drawText(ctx, run.endless ? "SOBREVIVÊNCIA" : "CALMARIA", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#37e6c8", align: "center" });
      drawText(ctx, run.draft ? "ESCOLHA UMA MUTAÇÃO" : "INVASÃO EM " + t + "s", VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else if (director.phase === "mapClear") {
      drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
      drawText(ctx, m.name, VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else {
      drawText(ctx, "ONDA " + director.waveInMap + "/" + m.waves.length + (run.endless ? " • INF" : ""), VIEW_W / 2, 10, { font: "big", scale: 1, color: "#ff4d5a", align: "center" });
      const wDef2 = waveDef();
      drawText(ctx, wDef2 && wDef2.title ? wDef2.title : m.name, VIEW_W / 2, 38, { color: PAL.textDim, align: "center" });
    }
  } else {
    drawText(ctx, run.status === "won" || (run.payout && run.payout.winBonus > 0) ? "VITÓRIA!" : "A COLÔNIA CAIU",
      VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
  }

  if (live && director.phase === "calm") {
    const by = hudTopSlot();
    if (button(ctx, { x: VIEW_W / 2 - cw / 2, y: by, w: cw, h: 26, label: "▶ INVOCAR (G)  +ESS", id: "skip", accent: "#c77dff" })) {
      skipPeace();
    }
  }

  shopTooltip = null;
  const footY = VIEW_H - 100;
  const shopSprite = rotFrame("worker", Math.PI / 2);
  const rShop = iconButton(ctx, { x: 10, y: footY, w: 104, h: 88, id: "shopToggle", frame: shopOpen ? "#ffd479" : "#37e6c8", selected: shopOpen });
  ctx.drawImage(shopSprite, 10 + 52 - shopSprite.width * 0.5 / 2, footY + 4, shopSprite.width * 0.5, shopSprite.height * 0.5);
  drawText(ctx, "FORMIGAS", 10 + 52, footY + 50, { color: PAL.text, align: "center" });
  drawText(ctx, shopOpen ? "FECHAR (Q)" : "ABRIR (Q)", 10 + 52, footY + 66, { color: shopOpen ? "#ffd479" : "#37e6c8", align: "center" });
  if (live && rShop.clicked) { shopOpen = !shopOpen; }

  if (shopOpen) {
    const x0 = 10 + 104 + 6;
    for (let i = 0; i < SHOP.length; i++) {
      const sp = SHOP[i];
      const x = x0 + i * SHOP_PITCH;
      const cost = unitCost(sp.type);
      const canBuy = run.food >= cost && popUsed() < popCapTotal() && unitLimitLeft(sp.type);
      const r = iconButton(ctx, { x, y: footY, w: SHOP_W, h: 88, id: "shop" + sp.type, disabled: !canBuy, frame: sp.accent });
      const frame = rotFrame(UNITS[sp.type].sprite, Math.PI / 2);
      const sc2 = sp.iconScale !== undefined ? sp.iconScale : sp.type === "worker" || sp.type === "scout" || sp.type === "gatherer" ? 0.5 : 0.42;
      ctx.globalAlpha = canBuy ? 1 : 0.35;
      ctx.drawImage(frame, x + SHOP_W / 2 - frame.width * sc2 / 2, footY + 6, frame.width * sc2, frame.height * sc2);
      ctx.globalAlpha = 1;
      drawText(ctx, sp.label, x + SHOP_W / 2, footY + 50, { color: canBuy ? PAL.text : "#5a4f78", align: "center" });
      if (IMG.i_food) { ctx.globalAlpha = canBuy ? 1 : 0.5; ctx.drawImage(IMG.i_food, x + 4, footY + 66, 13, 13); ctx.globalAlpha = 1; }
      drawText(ctx, cost, x + 20, footY + 68, { color: canBuy ? "#ffd479" : "#a32e46" });
      drawText(ctx, String(i + 1), x + SHOP_W - 7, footY + 66, { color: PAL.textDim, align: "center" });
      if (r.hot) shopTooltip = sp;
      if (live && r.clicked) {
        const res = buyUnit(sp.type);
        if (!res.ok) {
          const wp = screenToWorld(x + SHOP_W / 2, footY - 14);
          floatText(wp.x, wp.y, res.why, { color: "#ff4d5a", life: 1 });
        }
      }
    }
  }

  if (shopTooltip) {
    const tipLines = wrapText(UNITS[shopTooltip.type].tip, 248, {});
    const th = 26 + tipLines.length * 16 + 8;
    panel(ctx, 10, footY - 12 - th, 268, th, { border: "#8f6fd6" });
    drawText(ctx, UNITS[shopTooltip.type].name, 20, footY - 12 - th + 10, { color: "#ffd479" });
    tipLines.forEach((L, li) => drawText(ctx, L, 20, footY - 12 - th + 28 + li * 16, { color: PAL.text }));
  }

  const nw = 132, nx2 = VIEW_W - 10 - nw;
  const rNest = iconButton(ctx, { x: nx2, y: footY, w: nw, h: 88, id: "nestBtn", frame: "#ffd479" });
  const nestImg = IMG.nest || IMG.i_essence;
  if (nestImg) ctx.drawImage(nestImg, nx2 + nw / 2 - 20, footY + 6, 40, 40);
  {
    const t = G.time * 2.2;
    for (let i = 0; i < 3; i++) {
      const ph = (t + i * 0.33) % 1;
      const ax = nx2 + nw / 2 - 26 + ph * 52;
      const ay = footY + 44 - Math.sin(ph * Math.PI) * 7;
      ctx.fillStyle = "#ffd479";
      ctx.fillRect(ax, ay, 3, 2);
    }
  }
  drawText(ctx, "FORMIGUEIRO", nx2 + nw / 2, footY + 50, { color: PAL.text, align: "center" });
  drawText(ctx, "ENTRAR (B)", nx2 + nw / 2, footY + 66, { color: "#ffd479", align: "center" });
  if (live && rNest.clicked) {
    openNest(run);
    return;
  }

  drawMinimap();

  if (boss && !boss.dead && run.status === "running" && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) {
    const bw = 420, by = hudTopSlot();
    panel(ctx, VIEW_W / 2 - bw / 2 - 8, by, bw + 16, 42, { border: "#ff4d5a" });
    drawText(ctx, boss.def.name, VIEW_W / 2, by + 6, { font: "small", scale: 1, color: "#ff4d5a", align: "center" });
    bar(ctx, VIEW_W / 2 - bw / 2, by + 24, bw, 12, boss.hp / boss.maxHp, { c1: "#ff7a6a", c2: "#a32e46", segments: 8 });
  }

  const sc = selectedCount();
  if (sc > 0 && !run.draft) {
    const lbl = sc + " SELECIONADAS";
    const tw = textWidth(lbl, {});
    drawText(ctx, lbl, clamp(mouse.x + 16, 6, VIEW_W - tw - 6), clamp(mouse.y + 10, 6, VIEW_H - 22), { color: "#37e6c8" });
  }

  if (sel.active && sel.moved) {
    const a = worldToScreen(sel.x0, sel.y0), b = worldToScreen(sel.x1, sel.y1);
    ctx.strokeStyle = "rgba(55,230,200,0.9)";
    ctx.fillStyle = "rgba(55,230,200,0.12)";
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
    ctx.fillStyle = "rgba(55,230,200,0.9)";
    const cs = 6;
    ctx.fillRect(a.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, a.y - cs/2, cs, cs);
    ctx.fillRect(a.x - cs/2, b.y - cs/2, cs, cs);
    ctx.fillRect(b.x - cs/2, b.y - cs/2, cs, cs);
  }

  if (run.elapsed < 14 && run.status === "running") {
    ctx.fillStyle = "rgba(10,8,16,0.6)";
    ctx.fillRect(VIEW_W/2 - 260, VIEW_H - 124, 520, 16);
    drawText(ctx, "ESQ: CÂMERA/ORDEM  •  DIR: SELECIONAR  •  Q: FORMIGAS  •  B: FORMIGUEIRO  •  ESC: PAUSA",
      VIEW_W / 2, VIEW_H - 120, { color: PAL.textDim, align: "center", alpha: clamp(14 - run.elapsed, 0, 4) / 4 });
  }
}

let hudExpanded = false;

function drawMinimap() {
  const run = G.run;
  const mw = MINI.w, mh = MINI.h;
  const mx = VIEW_W - mw - 10, my = 10;
  uiButtons().push({ x: mx - 3, y: my - 3, w: mw + 6, h: mh + 6, id: "minimap" });
  panel(ctx, mx - 5, my - 5, mw + 10, mh + 10, { fill: "rgba(10,8,16,0.8)", border: "#4a3a6e", r: 3 });
  if (world.mini) ctx.drawImage(world.mini, mx, my);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);

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
  if (hudExpanded) y = Math.max(y, 200);

  const bw = 600;
  dialogBox(ctx, VIEW_W/2 - bw/2, y - 14, bw, 84, { border: "#ffd479", accent: "#ffd479" });
  drawText(ctx, b.title, VIEW_W / 2, y, { font: "big", scale: 2, color: "#ffd479", align: "center" });
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
  const panelH = mobile ? 560 : 440;

  // painel esquerda - botões
  dialogBox(ctx, startX, py, leftW, panelH, { border: "#8f6fd6", accent: "#37e6c8" });
  drawText(ctx, "PAUSA", startX + leftW/2, py + 18, { font: "big", scale: 2, color: "#ffd479", align: "center" });

  const run = G.run;
  const btnW = leftW - 32;
  const btnH = mobile ? 104 : 40;
  let by = py + 52;
  const gap = mobile ? 12 : 10;

  const pauseBtns = [
    { label: "CONTINUAR", id: "resume", accent: "#37e6c8" },
    { label: "OPÇÕES ♿", id: "pauseOptions", accent: "#ffb347" },
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
        optionsTab = 0;
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

  // mini-mapa maior na pausa
  const miniX = rx + 16, miniY = py + 44, miniW = rightW - 32, miniH = 160;
  panel(ctx, miniX - 2, miniY - 2, miniW + 4, miniH + 4, { fill: "rgba(10,8,16,0.9)", border: "#4a3a6e", r: 3 });
  if (world.mini) {
    ctx.drawImage(world.mini, miniX, miniY, miniW, miniH);
  }
  // desenha posição câmera e formigas no mini-mapa da pausa
  const sx = miniW / WORLD_W, sy = miniH / WORLD_H;
  for (const a of allies) {
    if (a.dead) continue;
    ctx.fillStyle = a.def.role === "worker" ? "#37e6c8" : "#8fd3ff";
    ctx.fillRect(miniX + a.x * sx - 1, miniY + a.y * sy - 1, 2, 2);
  }
  const A = world.anthill;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath(); ctx.arc(miniX + A.x * sx, miniY + A.y * sy, 4, 0, TAU); ctx.fill();

  let sy2 = miniY + miniH + 16;
  if (run) {
    drawText(ctx, "MODO: " + (run.modeDef ? run.modeDef.name : "CAMPANHA"), rx + 16, sy2, { color: run.modeDef ? run.modeDef.color : "#37e6c8" }); sy2 += 18;
    drawText(ctx, "MAPA: " + (run.mapIdx + 1) + "/" + MAPS.length + " - " + MAPS[run.mapIdx].name, rx + 16, sy2, { color: PAL.text }); sy2 += 18;
    drawText(ctx, "ONDA: " + run.wave + " • ABATES: " + run.kills, rx + 16, sy2, { color: PAL.textDim }); sy2 += 18;
    drawText(ctx, "NÍVEL: " + run.level + " • COMIDA: " + fmt(run.food), rx + 16, sy2, { color: PAL.textDim }); sy2 += 18;
    drawText(ctx, "ESSÊNCIA: " + fmt(run.essencePool) + " • MUTAÇÕES: " + run.mutationLog.length, rx + 16, sy2, { color: "#c77dff" }); sy2 += 22;

    // cérebro da colônia mini
    const n = colony.needs;
    drawText(ctx, "COLÔNIA: FOME " + Math.round(n.food*100) + "% • GUERRA " + Math.round(n.defense*100) + "%", rx + 16, sy2, { color: "#8f7bb5", scale: 0.8 }); sy2 += 18;

    if (G.save.accessibility.invincible) {
      drawText(ctx, "♿ INVENCÍVEL ATIVO", rx + 16, sy2, { color: "#7fd6a0" }); sy2 += 16;
    }
  }

  drawText(ctx, "ESC: VOLTAR • M: SOM", rx + rightW/2, py + panelH - 12, { color: PAL.textDim, align: "center", scale: 0.8 });
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
  const subLock = won ? "O DEVASTADOR caiu no Pico Congelado. O formigueiro é eterno." : "A rainha tombou. Mas a essência alimenta a próxima geração.";
  const subLines = wrapText(subLock, PW - 60, {});
  subLines.forEach((L, li) => drawText(ctx, L, VIEW_W / 2, PY + 72 + li * 18, { color: PAL.text, align: "center" }));

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
  if (p.mult > 1) rows.push(["MULTIPLICADOR", "x" + p.mult.toFixed(2), "#ffd479"]);

  const btnTop = PY + PH - 100;
  const totalY = btnTop - 72;
  const iconsH = run.mutationLog.length ? 26 : 0;
  const rowsBottom = totalY - 8 - iconsH - 14;

  const y0 = PY + 72 + subLines.length * 18 + 14;
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
  if (button(ctx, { x: VIEW_W / 2 - 230, y: by, w: 220, h: mobile ? 104 : 40, label: "NOVA EXPEDIÇÃO", id: "again", accent: "#37e6c8" })) {
    notePointer(mouse.x, mouse.y);
    paused = false;
    newRun(run.modeDef);
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 + 10, y: by, w: 220, h: mobile ? 104 : 40, label: "ÁRVORE DA EVOLUÇÃO", id: "goTree", accent: "#c77dff" })) {
    notePointer(mouse.x, mouse.y);
    enterTree();
    treeReturn = "TITLE";
    startTransition("auto", "RUN", "TREE", 0, () => { G.screen = "TREE"; });
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 110, y: by + 48, w: 220, h: mobile ? 104 : 32, label: "MENU PRINCIPAL", id: "menu" })) {
    notePointer(mouse.x, mouse.y);
    startTransition("auto", "RUN", "TITLE", 0, () => { G.screen = "TITLE"; });
    return;
  }
}

// ---------------------------------------------------------------- exports ---
export function gameHelpReturn() { return helpReturn; }
export function setPaused(v) { paused = v; }
export function boot() {
  initInput(canvas);
}
