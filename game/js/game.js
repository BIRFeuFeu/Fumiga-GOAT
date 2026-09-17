// ============================================================================
// FUMIGA — orquestrador: telas, expedição multi-mapa, HUD, interações
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
} from "./particles.js";
import { initAudio, audioReady, SFX, setCombat } from "./audio.js";
import { world, genWorld, MINI } from "./world.js";
import {
  allies, spawnQueen, spawnAnt, updateAllies, buyUnit, unitCost, popUsed, popCapTotal,
  selectInRect, selectTypeOnScreen, clearSelection, selectedCount, orderSelected,
  orderAttackSelected, rallyDefenders, recomputeAllies,
} from "./units.js";
import { foes, boss, clearFoes, updateFoes, updateBoss } from "./enemies.js";
import { projectiles, orbs, updateProjectiles, updateOrbs, clearCombat } from "./combat.js";
import {
  director, resetDirector, updateDirector, skipPeace, mapDef, waveDef, isLastMap, nextMapCalm,
} from "./waves.js";
import { rollDraft, applyMutation, mutationList } from "./mutations.js";
import { drawRun, drawTitleBg } from "./render.js";
import { enterTree, updateTree, drawTree, treeClick } from "./meta.js";
import { uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect } from "./ui.js";
import { startTutorial, stopTutorial, updateTutorial, drawTutorial, tutEvent, TUT, tutorialCardRect } from "./tutorial.js";
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
];

// ------------------------------------------------------------------ run -----
function newRun() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  resetDirector();
  genWorld(seed, 0);
  fogReset();
  clearParticles();
  clearFoes();
  clearCombat();
  allies.length = 0;
  camReset();
  paused = false;

  const m = metaBonus();
  const run = {
    seed,
    status: "running",       // running | won | lost | ended
    endT: 0, payoutDone: false, payout: null,
    food: START.food, essencePool: 0,
    level: 0, xp: 0, xpNext: xpForLevel(1),
    fungusT: 9,
    kills: 0, wave: 0, bestWaveThisRun: 0, mapsCleared: 0,
    mutations: new Set(), mutationLog: [],
    queenJustHit: 0,
    banner: { title: "MAPA 1/" + MAPS.length + " — " + MAPS[0].name, sub: MAPS[0].sub, t: 4.4 },
    draft: null,
    elapsed: 0,
    heartbeatT: 0,
    rebirthUsed: false,
    selectT: 0,
    bossDefeated: false,
    mapIdx: 0,
    transition: false,       // mostrando tela de mapa limpo
    chambers: { nursery: 0, pantry: 0, barracks: 0, fungus: 0, refinery: 0 },
  };
  G.run = run;
  window.__run = run;

  const queen = spawnQueen();
  window.__alliesQueen = queen;

  // esquadrão inicial: 2 operárias, 2 coletoras, 1 exploradora
  const A = world.anthill;
  const nW = START.workers + m.startWorkers;
  for (let i = 0; i < nW; i++) {
    const a = rand(0, TAU);
    spawnAnt("worker", A.x + Math.cos(a) * (100 + rand(0, 30)), A.y + Math.sin(a) * (100 + rand(0, 30)));
  }
  for (let i = 0; i < START.gatherers; i++) {
    const a = rand(0, TAU);
    spawnAnt("gatherer", A.x + Math.cos(a) * (130 + rand(0, 30)), A.y + Math.sin(a) * (130 + rand(0, 30)));
  }
  for (let i = 0; i < START.scouts; i++) {
    const a = rand(0, TAU);
    spawnAnt("scout", A.x + Math.cos(a) * 210, A.y + Math.sin(a) * 210);
  }
  for (let i = 0; i < m.startSoldiers; i++) {
    const a = rand(0, TAU);
    spawnAnt("soldier", A.x + Math.cos(a) * 190, A.y + Math.sin(a) * 190);
  }
  G.screen = "RUN";
  setCombat(0);

  // tutorial dinâmico: só na primeira expedição (ou até o jogador pular)
  if (!G.save.tutorial) startTutorial(); else stopTutorial(false);

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
}

function settleRun() {
  const run = G.run;
  if (run.payoutDone) return;
  run.payoutDone = true;
  const em = metaBonus().essMult;
  const won = run.status === "won";
  // A GELÉIA REAL (essência salva) mede o PROGRESSO da expedição, não a
  // gordura do cofre: só 10% da essência coletada na run vira relíquia.
  const mapBonus = run.mapsCleared * 160;
  const waveBonus = run.wave * 8;
  const killBonus = run.kills;
  const relic = Math.round(run.essencePool * 0.1);
  const winBonus = won ? 200 : 0;
  const base = relic + waveBonus + killBonus + mapBonus + winBonus;
  const total = Math.round(base * em);
  run.payout = {
    relic, waveBonus, killBonus, mapBonus, winBonus, mult: em, total,
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
  director.mapIdx++;
  run.mapIdx = director.mapIdx;
  const m = mapDef();

  // novo mundo, novo bioma
  genWorld((Math.random() * 0xffffffff) >>> 0, director.mapIdx);
  fogReset();
  clearFoes();
  clearCombat();

  // a colônia inteira migra: reposiciona ao redor do novo formigueiro
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

  // a rainha recupera o fôlego após o chefão
  if (q && !q.dead) {
    q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.4);
    burst(A.x, A.y, { n: 30, color: ["#ffd479", "#7fd6a0", "#fff"], spMin: 30, spMax: 160, life: 0.8, glow: true });
  }

  run.banner = { title: "MAPA " + (director.mapIdx + 1) + "/" + MAPS.length + " — " + m.name, sub: m.sub, t: 4.6 };
  run.transition = false;
  SFX.chime();
  floatText(A.x, A.y - 120, "A COLÔNIA MIGRA PARA NOVAS TERRAS", { color: "#ffd479", life: 2.2, scale: 2 });
}

// -------------------------------------------------------------- seleção -----
// caixa de seleção com o botão DIREITO
const sel = { active: false, x0: 0, y0: 0, x1: 0, y1: 0, moved: false };
// pan de câmera com o botão ESQUERDO
const pan = { active: false, moved: false };
// nevoeiro: alcance de visão por papel da unidade (em px do mundo)
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
    // fog of war: não pode mirar no que a colônia não enxerga
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
  // algum botão da frame passada sob o mouse?
  for (const b of uiButtons()) {
    if (pointInRect(mouse.x, mouse.y, b.x, b.y, b.w, b.h)) return true;
  }
  return false;
}

// ----------------------------------------------------------------- update ---
export function update(dt) {
  G.time += dt;

  // alterna mudo sempre
  if (pressed.KeyM) {
    const m = toggleMute();
    floatText(60, 20, m ? "SOM: DESLIGADO" : "SOM: LIGADO", { color: "#efe9ff", life: 1.2 });
  }

  switch (G.screen) {
    case "TITLE": break;
    case "TREE": updateTreeScreen(dt); break;
    case "HELP": break; // estático; cliques tratados no draw
    case "RUN": updateRun(dt); break;
  }

  // partículas sempre vivas
  updateParticles(dt * (G.screen === "RUN" ? G.timeScale : 1));

  if (G.slowMo > 0) {
    G.slowMo -= dt;
    if (G.slowMo <= 0) G.timeScale = 1;
  }
}

function updateTreeScreen(dt) {
  updateTree(dt);
  if (mouse.justDown && mouse.y > 70 && !uiCapture()) treeClick();
  if (pressed.Escape) G.screen = "TITLE";
}

// --------------------------------------------------------------------- RUN --
function updateRun(dt) {
  const run = G.run;
  const simDt = dt * G.timeScale;
  run.elapsed += simDt;

  // ----------------------------------------- câmara interna (construção) ---
  if (run.baseOpen) {
    if (pressed.Escape || pressed.KeyB) { run.baseOpen = false; SFX.uiClick(); }
    hudInputless(dt);
    return; // mundo congelado enquanto a câmara está aberta
  }

  // -------------------------------------------------------- pausa (ESC) -----
  if (run.status === "running" && pressed.Escape) {
    paused = !paused;
    SFX.uiClick();
  }
  // sair da ajuda direto para a run em pausa
  if (G.screen !== "RUN") return;

  // fim cinematic
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

  // ------------------------------------------------ transição de mapa -------
  if (run.transition) {
    hudInputless(dt);
    // orbs de essência do chefão seguem voando para o formigueiro
    const g2 = updateOrbs(simDt, world.anthill, allies.queen && !allies.queen.dead);
    if (g2 > 0) run.essencePool += Math.round(g2 * metaBonus().essMult);
    return; // espera o jogador confirmar (botão na tela)
  }

  // ------------------------------------------------------------ câmera ------
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

  // --------------------------------------------------------------- draft ----
  if (!run.draft && director.pendingDrafts > 0 && director.phase === "calm" && !run.transition) {
    director.pendingDrafts--;
    run.draft = { options: rollDraft(), t: 0 };
    SFX.chime();
  }
  if (run.draft) {
    run.draft.t += dt;
    // escolha por teclado
    for (let i = 0; i < run.draft.options.length; i++) {
      if (pressed["Digit" + (i + 1)]) {
        pickDraft(i);
        return;
      }
    }
    hudInputless(dt);
    return; // mundo congela durante a escolha
  }

  // pular tutorial
  if (TUT.active && pressed.KeyT) stopTutorial(true);

  // tutorial: relógio
  if (TUT.active) updateTutorial(dt, run);

  // mapa limpo? abrir transição quando o diretor sinalizar
  if (director.phase === "mapClear" && !run.transition && run.status === "running") {
    run.transition = true;
    SFX.win();
    return;
  }

  // --------------------------------------------------------------- loja -----
  for (let i = 0; i < SHOP.length; i++) {
    if (pressed["Digit" + (i + 1)]) {
      const r = buyUnit(SHOP[i].type);
      if (!r.ok) floatText(mouse.x, mouse.y - 20, r.why, { color: "#ff4d5a", life: 1 });
    }
  }
  if (pressed.KeyG && director.phase === "calm") skipPeace();
  if (pressed.KeyB && run.status === "running") { run.baseOpen = true; SFX.uiClick(); }
  if (pressed.KeyF) {
    const n = rallyDefenders(world.anthill);
    tutEvent("rally", n);
    if (n > 0) floatText(world.anthill.x, world.anthill.y - 110, "GUARDA FORMADA! (" + n + ")", { color: "#37e6c8", life: 1.4 });
    ring(world.anthill.x, world.anthill.y, { r0: 40, r1: 200, life: 0.5, color: "#37e6c8", width: 3 });
  }

  // ------------------------------------------------------------- mundo ------
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

  // fungário: cultivo passivo de comida
  run.fungusT -= simDt;
  if (run.fungusT <= 0) {
    run.fungusT = 9;
    if (run.chambers.fungus > 0) {
      run.food += run.chambers.fungus;
    }
  }

  // XP -> sobe o nível da colônia
  while (run.xp >= run.xpNext) {
    run.xp -= run.xpNext;
    run.level++;
    run.xpNext = xpForLevel(run.level + 1);
    recomputeAllies();
    SFX.chime();
    const A2 = world.anthill;
    ring(A2.x, A2.y, { r0: 24, r1: 190, life: 0.7, color: "#6db7ff", width: 4 });
    floatText(A2.x, A2.y - 150, "NÍVEL " + run.level + "! A COLÔNIA FICOU MAIS FORTE", {
      color: "#6db7ff", life: 2.2, scale: 2,
    });
  }

  // nevoeiro de guerra (~8 Hz)
  fogT += simDt;
  if (fogT >= 0.12) {
    fogT = 0;
    const beings = [];
    const nester = allies.queen;
    if (nester && !nester.dead) beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 360 });
    else beings.push({ x: world.anthill.x, y: world.anthill.y, sight: 240 });
    for (const a of allies) {
      if (a.dead || a.dying || a.type === "queen") continue;
      beings.push({ x: a.x, y: a.y, sight: SIGHT[a.def.role] || 240 });
    }
    if (boss && !boss.dead && (boss.revealT || 0) > 0) beings.push({ x: boss.x, y: boss.y, sight: 320 });
    fogUpdate(beings);
  }

  // derrota / rebirth
  const q = allies.queen;
  if (q && q.hp <= 0 && !q.dead) {
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
  // vitória: chefe do ÚLTIMO mapa eliminado
  if (run.status === "running" && run.bossDefeated && isLastMap() && run.bossDefeated === mapDef().boss) {
    endRun(true);
    return;
  }

  // batimento da rainha em perigo
  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    run.heartbeatT -= dt;
    if (run.heartbeatT <= 0) { run.heartbeatT = 0.95; SFX.heart(); }
  }

  // ------------------------------------------------------------ interação ---
  if (!uiCapture()) runMouseWorld(dt);

  hudInputless(dt);
}

// partículas de ambiente por bioma (pólen, esporos, fuligem, neve...)
function spawnAmbient(simDt) {
  const def = world.def;
  if (!def) return;
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

  // ================================== BOTÃO ESQUERDO: câmera (arrastar) / ordem (clique)
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
      // ---- CLIQUE ESQUERDO: ordenar às selecionadas (ataque / coleta / mover)
      if (selectedCount() > 0) {
        const foe = enemyAt(w.x, w.y);
        if (foe) {
          if (orderAttackSelected(foe) > 0) {
            ring(foe.x, foe.y, { r0: 6, r1: 40, life: 0.4, color: "#ff4d5a", width: 3 });
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

  // ================================== BOTÃO DIREITO: SELEÇÃO
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
      // clique simples com direito: seleciona 1 aliada próxima (ou limpa no vazio)
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
  // duplo clique DIREITO: todas do tipo na tela
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
}

// ------------------------------------------------------------------ render --
let paused = false;

export function render(dt) {
  ctx.imageSmoothingEnabled = false;
  uiBegin();
  switch (G.screen) {
    case "BOOT": break;
    case "TITLE": renderTitle(); break;
    case "HELP": renderHelp(); break;
    case "TREE": {
      const r = drawTree(ctx, dt);
      if (r === "back") G.screen = "TITLE";
      break;
    }
    case "RUN": renderRun(); break;
  }
  cursorCustom();
}

function cursorCustom() {
  // cursor de mira
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

// ------------------------------------------------------------------ título ---
function renderTitle() {
  drawTitleBg(ctx);

  // =============================================================== Dead Cells
  // Título minimalista: logo escuro sobre o pôr-do-sol, 3 botões discretos,
  // sem painéis extras poluindo a tela.
  const tY = 52 + Math.sin(G.time * 0.8) * 3;
  drawText(ctx, "FUMIGA", 66, tY, { font: "big", scale: 4, color: "#170b22", shadowColor: "rgba(255,214,140,0.85)" });
  drawText(ctx, "COLÔNIA ETERNA", 72, tY + 128, { font: "small", scale: 2, color: "#2a0f2e" });
  drawText(ctx, "um roguelite de colônia de formigas", 72, tY + 164, { color: "#3a1530" });

  // menu: coluna esquerda, chips escuros (contraste na cena clara)
  const bx = 66, bw = 268;
  if (button(ctx, { x: bx, y: 272, w: bw, h: 44, label: "INICIAR EXPEDIÇÃO", font: "big", scale: 1, id: "start", accent: "#37e6c8" })) {
    initAudio();
    newRun();
    return;
  }
  if (button(ctx, { x: bx, y: 324, w: bw, h: 40, label: "ÁRVORE DA EVOLUÇÃO", font: "big", scale: 1, id: "tree", accent: "#c77dff" })) {
    enterTree();
    G.screen = "TREE";
    return;
  }
  if (button(ctx, { x: bx, y: 372, w: bw, h: 36, label: "COMO JOGAR", id: "help", accent: "#6db7ff" })) {
    helpReturn = "TITLE";
    G.screen = "HELP";
    return;
  }

  // rodapé mínimo: 1 linha com tudo
  drawText(ctx, "GELÉIA REAL: " + G.save.essence +
    "   •   VITÓRIAS " + G.save.best.wins + "/" + G.save.best.runs +
    "   •   MELHOR: MAPA " + (G.save.best.maps || 0) +
    "   •   M: SOM",
    24, VIEW_H - 20, { color: "#ffd9a0" });
  drawText(ctx, "v2.1", VIEW_W - 20, VIEW_H - 20, { color: "#ffd9a0", align: "right" });
}

// ------------------------------------------------------------------ ajuda ----
// Duas colunas: o texto é longo demais para uma só (a lista de controles
// terminava fora do painel e fora do canvas). Tudo é quebrado por wrapText.
function renderHelp() {
  drawTitleBg(ctx);
  ctx.fillStyle = "rgba(10,8,16,0.55)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const PX = 40, PY = 26, PW = VIEW_W - 80, PH = VIEW_H - 68; // 40..920 x 26..498
  panel(ctx, PX, PY, PW, PH);
  drawText(ctx, "COMO JOGAR", VIEW_W / 2, PY + 16,
    { font: "big", scale: 2, color: "#ffd479", align: "center" });

  const colW = (PW - 96) / 2;                 // ~392
  const colX = [PX + 30, PX + 66 + colW];
  const descX = 134;                          // deslocamento da descrição

  // ---- OBJETIVO: faixa de largura total ----
  let y = PY + 76;
  drawText(ctx, "OBJETIVO", colX[0], y, { font: "big", color: "#c77dff" });
  y += 28;
  for (const t of HELP_GOAL) {
    for (const L of wrapText(t, PW - 60, {})) {
      drawText(ctx, L, colX[0], y, { color: PAL.text });
      y += 18;
    }
  }
  y += 18;

  // ---- coluna esquerda: CONTROLES ----
  let yl = y;
  drawText(ctx, "CONTROLES", colX[0], yl, { font: "big", color: "#c77dff" });
  yl += 28;
  for (const [k, d] of HELP_CONTROLS) {
    drawText(ctx, k, colX[0], yl, { color: "#37e6c8" });
    const lines = wrapText(d, colW - descX, {});
    lines.forEach((L, li) => drawText(ctx, L, colX[0] + descX, yl + li * 16, { color: PAL.text }));
    yl += Math.max(20, lines.length * 16 + 4);
  }

  // ---- coluna direita: DICAS ----
  let yr = y;
  drawText(ctx, "DICAS", colX[1], yr, { font: "big", color: "#c77dff" });
  yr += 28;
  for (const t of HELP_TIPS) {
    for (const L of wrapText(t, colW, {})) {
      drawText(ctx, L, colX[1], yr, { color: PAL.text });
      yr += 17;
    }
    yr += 6;
  }

  if (button(ctx, { x: VIEW_W / 2 - 100, y: VIEW_H - 56, w: 200, h: 38, label: "VOLTAR", id: "helpBack" })) {
    G.screen = helpReturn;
    helpReturn = "TITLE";
  }
  if (pressed.Escape) { G.screen = helpReturn; helpReturn = "TITLE"; }
}

// -------------------------------------------------------------------- run ---
let shopTooltip = null;

function renderRun() {
  const run = G.run;
  if (!run) { G.screen = "TITLE"; return; }
  drawRun(ctx, dtClampForAnim());

  drawHUD();
  if (run.banner && run.banner.t > 0 && !paused) drawBanner(run.banner);
  if (TUT.active && !paused) drawTutorial(ctx, VIEW_W);
  if (run.draft && !paused) drawDraft(run.draft);
  if (run.transition && !paused) drawTransition(run);
  if (run.baseOpen) drawBaseScreen();
  if (paused) drawPause();
  if (run.status === "ended") drawEnd(run);
}

let lastDt = 1 / 60;
export function setLastDt(v) { lastDt = v; }
function dtClampForAnim() { return lastDt; }

function drawHUD() {
  const run = G.run;
  const m = mapDef();
  const q = allies.queen;

  // ============ PAINEL DO JOGADOR (topo-esquerdo) ============
  // Sempre visíveis: vida do formigueiro, nível+XP, recursos. "VER MAIS"
  // desdobra população/abates/mutações sem poluir a tela.
  const pw = 262;
  const baseH = 78;
  const extraH = hudExpanded ? 74 : 0;
  const ph = baseH + 22 + extraH;
  panel(ctx, 10, 8, pw, ph);

  let yy = 16;
  // 1) VIDA DO FORMIGUEIRO (a rainha lá dentro)
  // rótulo tem ~93px de largura: a barra começa depois dele para não cobrir o texto
  drawText(ctx, "FORMIGUEIRO", 22, yy, { color: "#ffd479" });
  const hpFrac = q && q.maxHp ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  bar(ctx, 120, yy + 4, 138, 10, hpFrac, { c1: hpFrac < 0.3 ? "#ff4d5a" : "#ffd479", c2: "#a32e3a", segments: 10 });
  yy += 21;
  // 2) NÍVEL + BARRA DE EXPERIÊNCIA
  drawText(ctx, "NÍVEL " + run.level, 22, yy, { color: "#6db7ff" });
  const xpFrac = run.xpNext > 0 ? clamp(run.xp / run.xpNext, 0, 1) : 0;
  bar(ctx, 94, yy + 4, 164, 10, xpFrac, { c1: "#8fd3ff", c2: "#4060a8", segments: 0 });
  yy += 21;
  // 3) RECURSOS ATUAIS
  if (IMG.i_food) ctx.drawImage(IMG.i_food, 22, yy - 2, 16, 16);
  drawText(ctx, fmt(run.food), 42, yy + 1, { color: "#ffd479" });
  if (IMG.i_essence) ctx.drawImage(IMG.i_essence, 104, yy - 2, 16, 16);
  drawText(ctx, fmt(run.essencePool), 124, yy + 1, { color: "#c77dff" });
  yy += 22;
  // botão "VER MAIS / VER MENOS"
  const moreHot = pointInRect(mouse.x, mouse.y, 22, yy - 2, 72, 17);
  ctx.fillStyle = moreHot ? "#3a3054" : "#241c38";
  ctx.fillRect(22, yy - 2, 72, 17);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.strokeRect(22.5, yy - 1.5, 71, 16);
  drawText(ctx, hudExpanded ? "VER MENOS" : "VER MAIS", 58, yy + 2, { color: moreHot ? "#efe9ff" : PAL.textDim, align: "center" });
  uiButtons().push({ x: 22, y: yy - 2, w: 72, h: 17, id: "hudMore" });
  if (moreHot && mouse.justDown) { hudExpanded = !hudExpanded; SFX.uiClick(); }

  if (hudExpanded) {
    yy += 22;
    const used = popUsed(), cap = popCapTotal();
    drawText(ctx, "POPULAÇÃO " + used + "/" + cap, 22, yy, { color: used >= cap ? "#ff4d5a" : PAL.textDim });
    drawText(ctx, "ABATES " + run.kills, 160, yy, { color: PAL.textDim });
    yy += 18;
    // mutações ativas dobradinhas aqui
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
          panel(ctx, ix, yy + 20, 236, th);
          lines.forEach((L, li) => drawText(ctx, L, ix + 8, yy + 26 + li * 15, { color: PAL.text }));
        }
        ix += 25;
      }
      if (run.mutationLog.length > 7) drawText(ctx, "+" + (run.mutationLog.length - 7), ix + 2, yy + 2, { color: PAL.textDim });
      yy += 24;
    }
  }

  // ============ CONTADOR DE ONDA (topo, centralizado) ============
  const cw = 272;
  panel(ctx, VIEW_W / 2 - cw / 2, 8, cw, 52);
  if (run.status === "running") {
    if (director.phase === "calm") {
      const t = Math.max(0, Math.ceil(director.timer));
      drawText(ctx, "CALMARIA", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#37e6c8", align: "center" });
      drawText(ctx, run.draft ? "ESCOLHA UMA MUTAÇÃO" : "INVASÃO EM " + t + "s", VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else if (director.phase === "mapClear") {
      drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
      drawText(ctx, m.name, VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    } else {
      drawText(ctx, "ONDA " + director.waveInMap + "/" + m.waves.length, VIEW_W / 2, 10, { font: "big", scale: 1, color: "#ff4d5a", align: "center" });
      const wDef2 = waveDef();
      drawText(ctx, wDef2 && wDef2.title ? wDef2.title : m.name, VIEW_W / 2, 36, { color: PAL.textDim, align: "center" });
    }
  } else {
    drawText(ctx, run.status === "won" || (run.payout && run.payout.winBonus > 0) ? "VITÓRIA!" : "A COLÔNIA CAIU",
      VIEW_W / 2, 14, { font: "small", scale: 1, color: "#ffd479", align: "center" });
  }

  // botão invocar onda — desliza sob o contador na calmaria; se o cartão do
  // tutorial estiver aberto, desce para logo abaixo dele (sem sobreposição)
  if (run.status === "running" && director.phase === "calm" && !run.draft && !paused && !run.transition) {
    const tut = TUT.active ? tutorialCardRect() : null;
    const by = tut ? tut.y + tut.h + 6 : 66;
    if (button(ctx, { x: VIEW_W / 2 - cw / 2, y: by, w: cw, h: 26, label: "▶ INVOCAR (G)  +ESS", id: "skip", accent: "#c77dff" })) {
      skipPeace();
    }
  }

  // ============ LOJA DE UNIDADES (rodapé-esquerdo) ============
  shopTooltip = null;
  const shopY = VIEW_H - 100;
  for (let i = 0; i < SHOP.length; i++) {
    const s = SHOP[i];
    const x = 10 + i * 78;
    const cost = unitCost(s.type);
    const canAfford = run.food >= cost && popUsed() < popCapTotal();
    const r = iconButton(ctx, { x, y: shopY, w: 72, h: 88, id: "shop" + s.type, disabled: !canAfford });
    const frame = rotFrame(UNITS[s.type].sprite, Math.PI / 2);
    const sc2 = s.type === "worker" || s.type === "scout" || s.type === "gatherer" ? 0.55 : 0.46;
    ctx.globalAlpha = canAfford ? 1 : 0.35;
    ctx.drawImage(frame, x + 36 - frame.width * sc2 / 2, shopY + 8, frame.width * sc2, frame.height * sc2);
    ctx.globalAlpha = 1;
    drawText(ctx, s.label, x + 36, shopY + 52, { scale: 1, color: canAfford ? PAL.text : "#5a4f78", align: "center" });
    if (IMG.i_food) { ctx.globalAlpha = canAfford ? 1 : 0.5; ctx.drawImage(IMG.i_food, x + 6, shopY + 66, 14, 14); ctx.globalAlpha = 1; }
    drawText(ctx, cost, x + 24, shopY + 68, { color: canAfford ? "#ffd479" : "#a32e46" });
    drawText(ctx, String(i + 1), x + 64, shopY + 66, { color: PAL.textDim, align: "center" });
    if (r.hot) shopTooltip = s;
    if (r.clicked && !paused && !run.draft && !run.transition) {
      const res = buyUnit(s.type);
      if (!res.ok) floatText(x + 36, shopY - 14, res.why, { color: "#ff4d5a", life: 1 });
    }
  }
  // botão da CÂMARA INTERNA (tecla B) logo após a loja
  const bx = 10 + SHOP.length * 78 + 6;
  const rCol = iconButton(ctx, { x: bx, y: shopY, w: 72, h: 88, id: "baseBtn", frame: "#c77dff" });
  if (IMG.nest) {
    const ni = IMG.nest;
    ctx.drawImage(ni, bx + 36 - 17, shopY + 8, 34, 34);
  } else if (IMG.i_essence) {
    ctx.drawImage(IMG.i_essence, bx + 36 - 17, shopY + 8, 34, 34);
  }
  drawText(ctx, "COLÔNIA", bx + 36, shopY + 52, { scale: 1, color: PAL.text, align: "center" });
  drawText(ctx, "BASE (B)", bx + 36, shopY + 68, { scale: 1, color: "#c77dff", align: "center" });
  if (rCol.clicked && !paused && !run.draft && !run.transition && run.status === "running") {
    run.baseOpen = true;
    SFX.uiClick();
  }

  if (shopTooltip) {
    const tipLines = wrapText(UNITS[shopTooltip.type].tip, 248, {});
    const th = 26 + tipLines.length * 16 + 8;
    panel(ctx, 10, shopY - 10 - th, 268, th);
    drawText(ctx, UNITS[shopTooltip.type].name, 20, shopY - 10 - th + 10, { color: "#ffd479" });
    tipLines.forEach((L, li) => drawText(ctx, L, 20, shopY - 10 - th + 28 + li * 16, { color: PAL.text }));
  }

  // minimapa (rodapé-direito)
  drawMinimap();

  // barra do chefão (sob o contador central)
  if (boss && !boss.dead && run.status === "running" && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) {
    const bw = 420;
    panel(ctx, VIEW_W / 2 - bw / 2 - 8, 66, bw + 16, 42);
    drawText(ctx, boss.def.name, VIEW_W / 2, 72, { font: "small", scale: 1, color: "#ff4d5a", align: "center" });
    bar(ctx, VIEW_W / 2 - bw / 2, 90, bw, 12, boss.hp / boss.maxHp, { c1: "#ff7a6a", c2: "#a32e46", segments: 8 });
  }

  // contagem de selecionadas
  const sc = selectedCount();
  if (sc > 0 && !run.draft) {
    drawText(ctx, sc + " SELECIONADAS", mouse.x + 16, mouse.y + 10, { color: "#37e6c8" });
  }

  // caixa de seleção (botão direito)
  if (sel.active && sel.moved) {
    const a = worldToScreen(sel.x0, sel.y0), b = worldToScreen(sel.x1, sel.y1);
    ctx.strokeStyle = "rgba(55,230,200,0.9)";
    ctx.fillStyle = "rgba(55,230,200,0.12)";
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
  }

  // dica de controles rodapé central
  if (run.elapsed < 14 && run.status === "running") {
    drawText(ctx, "ESQ: CÂMERA/ORDEM  •  DIR: SELECIONAR  •  B: BASE  •  ESC: PAUSA",
      VIEW_W / 2, VIEW_H - 110, { color: PAL.textDim, align: "center", alpha: clamp(14 - run.elapsed, 0, 4) / 4 });
  }
}

let hudExpanded = false;

function drawMinimap() {
  const run = G.run;
  const mw = MINI.w, mh = MINI.h;
  const mx = VIEW_W - mw - 10, my = VIEW_H - mh - 10;
  uiButtons().push({ x: mx - 3, y: my - 3, w: mw + 6, h: mh + 6, id: "minimap" });
  ctx.fillStyle = "rgba(10,8,16,0.75)";
  ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
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
  // formigueiro pulsante
  const A = world.anthill;
  const pulse = 2 + Math.sin(G.time * 4) * 0.8;
  ctx.fillStyle = "#ffd479";
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 1.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mx + A.x * sx, my + A.y * sy, pulse + 3, 0, TAU); ctx.stroke();
  // retângulo da câmera
  const vx = VIEW_W / cam.zoom, vy = VIEW_H / cam.zoom;
  ctx.strokeStyle = "rgba(239,233,255,0.65)";
  ctx.strokeRect(mx + (cam.x - vx / 2) * sx, my + (cam.y - vy / 2) * sy, vx * sx, vy * sy);
  // névoa de guerra por cima do minimapa
  fogDrawMini(ctx, mx, my, mw, mh);

  // clique no minimapa: pula a câmera
  if (mouse.justDown && pointInRect(mouse.x, mouse.y, mx, my, mw, mh)) {
    cam.x = (mouse.x - mx) / sx;
    cam.y = (mouse.y - my) / sy;
    SFX.uiClick();
  }
}

// ===================================================================== BASE ==
// TELA DA CÂMARA INTERNA: corte transversal do formigueiro com construção de
// câmaras que dão bônus à expedição em curso (estilo Ant Colony).
const CH_ORDER = ["nursery", "pantry", "barracks", "fungus", "refinery"];
const CH_POS = {
  nursery:  [150, 210],
  pantry:   [335, 210],
  barracks: [520, 210],
  fungus:   [242, 332],
  refinery: [428, 332],
};

function drawBaseScreen() {
  const run = G.run;
  const PW = 640, PH = 440;
  const px = VIEW_W / 2 - PW / 2, py = (VIEW_H - PH) / 2;

  ctx.fillStyle = "rgba(7,5,11,0.88)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, px, py, PW, PH, { border: "#8a5f7a" });
  // cabeçalho em faixas: cada texto com sua própria linha (antes o subtítulo
  // era mais largo que o painel e a caixa de dica subia por cima do título)
  drawText(ctx, "CÂMARA INTERNA DA COLÔNIA", VIEW_W / 2, py + 16, { font: "big", scale: 1, color: "#ffd479", align: "center" });
  const baseSub = wrapText("Escavações da base — bônus valem durante ESTA expedição. Clique numa câmara para construir ou melhorar.", PW - 40, {});
  baseSub.forEach((L, li) =>
    drawText(ctx, L, VIEW_W / 2, py + 46 + li * 16, { color: PAL.textDim, align: "center" }));
  const headH = 44 + baseSub.length * 16;

  // terra compactada de fundo (corte transversal)
  ctx.fillStyle = "#241609";
  ctx.fillRect(px + 14, py + headH + 14, PW - 28, PH - headH - 14 - 44);
  for (let i = 0; i < 40; i++) {
    const ex = px + 20 + ((i * 173) % (PW - 48));
    const ey = py + 70 + ((i * 97) % (PH - 120));
    ctx.fillStyle = i % 2 ? "#2c1c0d" : "#1c1107";
    ctx.fillRect(ex, ey, 6, 3);
  }

  // raízes escancaradas
  ctx.strokeStyle = "#171007";
  for (let i = 0; i < 8; i++) {
    const rx2 = px + 40 + i * 76;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx2, py + headH + 20);
    ctx.quadraticCurveTo(rx2 + 20, py + headH + 66, rx2 - 20, py + headH + 106);
    ctx.stroke();
  }

  // ---- CÂMARA REAL (a rainha) ----
  const qh = 64, qw = 240;
  const qx = VIEW_W / 2 - qw / 2, qy = py + headH + 8;
  drawChamberRoom(qx, qy, qw, qh, "#6a4a16", "#ffd479");
  drawText(ctx, "CÂMARA REAL", VIEW_W / 2, qy + 8, { color: "#ffd479", align: "center" });
  const queen = allies.queen;
  if (queen && !queen.dead) {
    const frac = clamp(queen.hp / queen.maxHp, 0, 1);
    bar(ctx, qx + 60, qy + 34, qw - 120, 10, frac, { c1: "#ffd479", c2: "#a35a2c", segments: 8 });
    drawText(ctx, Math.ceil(queen.hp) + "/" + queen.maxHp, VIEW_W / 2, qy + 48, { color: "#ffe6b0", align: "center" });
  }
  if (IMG.queen) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(IMG.queen, qx + 8, qy + 18, 40, 40);
    ctx.globalAlpha = 1;
  }

  // ---- câmaras construtíveis ----
  baseHover = null;
  for (const id of CH_ORDER) {
    const def = CHAMBERS[id];
    const lvl = run.chambers[id];
    const [lx, ly] = CH_POS[id];
    const rx = px + lx - 82, ry = py + ly - 46;
    const maxed = lvl >= def.max;
    const cost = maxed ? null : def.costs[lvl];
    const afford = !maxed && run.food >= cost.food && run.essencePool >= cost.ess;
    drawChamberRoom(rx, ry, 164, 92, afford ? "#3a2a12" : "#241a0c", afford ? "#c9a659" : "#5c4626");

    // nome + pips
    drawText(ctx, def.name, rx + 82, ry + 10, { color: lvl > 0 ? "#ffd479" : PAL.textDim, align: "center" });
    for (let i = 0; i < def.max; i++) {
      ctx.fillStyle = i < lvl ? "#ffd479" : "#2c2414";
      ctx.fillRect(rx + 82 - (def.max - 1) * 8 + i * 16 - 6, ry + 24, 12, 5);
    }
    // ícone
    const ic = IMG["i_" + def.icon];
    ctx.globalAlpha = lvl > 0 ? 1 : 0.55;
    if (ic) ctx.drawImage(ic, rx + 82 - 17, ry + 32, 34, 34);
    ctx.globalAlpha = 1;
    // preço ou MAX
    if (maxed) {
      drawText(ctx, "NÍVEL MÁXIMO", rx + 82, ry + 70, { color: "#7fd6a0", align: "center" });
    } else {
      const can = afford;
      if (IMG.i_food) ctx.drawImage(IMG.i_food, rx + 34, ry + 68, 13, 13);
      drawText(ctx, cost.food, rx + 52, ry + 70, { color: run.food >= cost.food ? "#ffd479" : "#ff8a96" });
      if (cost.ess > 0) {
        if (IMG.i_essence) ctx.drawImage(IMG.i_essence, rx + 92, ry + 68, 13, 13);
        drawText(ctx, cost.ess, rx + 110, ry + 70, { color: run.essencePool >= cost.ess ? "#c77dff" : "#ff8a96" });
      }
    }

    const hot = pointInRect(mouse.x, mouse.y, rx, ry, 164, 92);
    uiButtons().push({ x: rx, y: ry, w: 164, h: 92, id: "chamber_" + id });
    if (hot) baseHover = { id, def, lvl, maxed, cost, rx, ry };
    if (hot && mouse.justDown) tryBuildChamber(id);
  }

  // tooltip da câmara sob o mouse
  if (baseHover) {
    const def = baseHover.def;
    const wTip = 248, lines = wrapText(def.tip + " " + def.per, wTip - 20, {});
    const th = 30 + lines.length * 16 + 10;
    // mantém a dica dentro do painel e acima do botão VOLTAR
    const tipTop = py + 8, tipBottom = py + PH - 52 - th;
    let tx = clamp(mouse.x + 18, px + 8, px + PW - wTip - 8);
    let ty = clamp(mouse.y + 14, tipTop, tipBottom);
    panel(ctx, tx, ty, wTip, th);
    drawText(ctx, def.name + "  (NÍVEL " + baseHover.lvl + "/" + def.max + ")", tx + 10, ty + 10, { color: "#ffd479" });
    lines.forEach((L, li) => drawText(ctx, L, tx + 10, ty + 30 + li * 16, { color: PAL.text }));
  }

  // botão voltar
  if (button(ctx, { x: VIEW_W / 2 - 90, y: py + PH - 42, w: 180, h: 30, label: "VOLTAR (B)", id: "baseBack" })) {
    run.baseOpen = false;
    SFX.uiClick();
  }
}

let baseHover = null;

function drawChamberRoom(x, y, w, h, fill, rim) {
  // "buraco" arredondado na terra, estilo corte do Ant Colony
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 1, h / 2 - 1, 0, 0, TAU);
  ctx.stroke();
  // sombreamento superior do túnel
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h * 0.32, w / 2 - 4, h * 0.18, 0, 0, TAU);
  ctx.fill();
}

function tryBuildChamber(id) {
  const run = G.run;
  const def = CHAMBERS[id];
  const lvl = run.chambers[id];
  if (lvl >= def.max) { SFX.deny(); return; }
  const cost = def.costs[lvl];
  if (run.food < cost.food || run.essencePool < cost.ess) {
    SFX.deny();
    return;
  }
  run.food -= cost.food;
  run.essencePool -= cost.ess;
  run.chambers[id] = lvl + 1;
  SFX.buy();
  SFX.chime();
  recomputeAllies();
}

// ----------------------------------------------------------------- banner ---
function drawBanner(b) {
  const a = clamp(b.t < 0.6 ? b.t / 0.6 : b.t > 3.2 - 0.5 ? (3.2 + 0.6 - b.t) / 0.5 + 0.2 : 1, 0, 1);
  ctx.globalAlpha = clamp(a, 0, 1);
  const y = 96;
  ctx.fillStyle = "rgba(10,8,16,0.55)";
  ctx.fillRect(0, y - 10, VIEW_W, 96);
  drawText(ctx, b.title, VIEW_W / 2, y, { font: "big", scale: 2, color: "#ffd479", align: "center" });
  if (b.sub) {
    const lines = wrapText(b.sub, 560, {});
    lines.forEach((L, li) => drawText(ctx, L, VIEW_W / 2, y + 54 + li * 18, { color: PAL.text, align: "center" }));
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ draft ---
function drawDraft(draft) {
  ctx.fillStyle = "rgba(10,8,16,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawText(ctx, "MUTAÇÃO DISPONÍVEL", VIEW_W / 2, 66, { font: "big", scale: 2, color: "#c77dff", align: "center" });
  drawText(ctx, "A colônia evolui. Escolha 1 de 3 — vale só nesta expedição.", VIEW_W / 2, 112, { color: PAL.textDim, align: "center" });

  const cw = 210, ch = 282, gap = 26;
  const x0 = VIEW_W / 2 - (cw * 3 + gap * 2) / 2;
  const y = 156;
  for (let i = 0; i < draft.options.length; i++) {
    const mm = draft.options[i];
    const x = x0 + i * (cw + gap);
    const hot = pointInRect(mouse.x, mouse.y, x, y, cw, ch);
    const lift = hot ? 8 : 0;
    const rare = RARITY[mm.rar];
    panel(ctx, x, y - lift, cw, ch, { border: rare.color });
    ctx.fillStyle = rare.color;
    ctx.fillRect(x, y - lift, cw, 4);
    // ícone grande
    const icon = IMG["i_" + mm.icon];
    if (icon) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + cw / 2 - 32, y + 22 - lift, 64, 64);
      ctx.strokeStyle = rare.color; ctx.lineWidth = 2;
      ctx.strokeRect(x + cw / 2 - 32, y + 22 - lift, 64, 64);
      ctx.drawImage(icon, x + cw / 2 - 26, y + 28 - lift, 52, 52);
    }
    drawText(ctx, rare.name, x + cw / 2, y + 106 - lift, { color: rare.color, align: "center" });
    drawText(ctx, mm.name, x + cw / 2, y + 128 - lift, { font: "big", scale: 1, color: "#efe9ff", align: "center" });
    const lines = wrapText(mm.desc, cw - 28, {});
    lines.slice(0, 4).forEach((L, li) => drawText(ctx, L, x + cw / 2, y + 166 + li * 19 - lift, { color: PAL.text, align: "center" }));
    drawText(ctx, "[ " + (i + 1) + " ]", x + cw / 2, y + ch - 30 - lift, { color: PAL.textDim, align: "center" });

    if (hot && mouse.justDown && !paused) { pickDraft(i); return; }
  }
}

// -------------------------------------------------------------- transição ---
function drawTransition(run) {
  ctx.fillStyle = "rgba(10,8,16,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const nextIdx = director.mapIdx + 1;
  const next = nextIdx < MAPS.length ? MAPS[nextIdx] : null;

  drawText(ctx, "MAPA LIMPO!", VIEW_W / 2, 120, { font: "big", scale: 3, color: "#ffd479", align: "center" });
  drawText(ctx, "O chefão caiu. A colônia respira — e a Rainha se recupera.",
    VIEW_W / 2, 196, { color: PAL.text, align: "center" });
  if (next) {
    drawText(ctx, "PRÓXIMO DESTINO:", VIEW_W / 2, 250, { color: PAL.textDim, align: "center" });
    drawText(ctx, "MAPA " + (nextIdx + 1) + "/" + MAPS.length + " — " + next.name, VIEW_W / 2, 282, { font: "big", scale: 1, color: "#37e6c8", align: "center" });
    drawText(ctx, next.sub, VIEW_W / 2, 312, { color: PAL.textDim, align: "center" });
  }

  if (button(ctx, { x: VIEW_W / 2 - 150, y: 368, w: 300, h: 48, label: "AVANÇAR A EXPEDIÇÃO", id: "goNext", accent: "#37e6c8" })) {
    advanceMap();
    return;
  }
  if (pressed.Enter || pressed.Space) advanceMap();
}

// ------------------------------------------------------------------ pausa ---
function drawPause() {
  ctx.fillStyle = "rgba(10,8,16,0.75)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 170, 96, 340, 352);
  drawText(ctx, "PAUSA", VIEW_W / 2, 122, { font: "big", scale: 2, color: "#ffd479", align: "center" });

  if (button(ctx, { x: VIEW_W / 2 - 130, y: 188, w: 260, h: 42, label: "CONTINUAR", id: "resume", accent: "#37e6c8" })) {
    paused = false; return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 240, w: 260, h: 42, label: "COMO JOGAR", id: "pauseHelp", accent: "#6db7ff" })) {
    paused = false;
    helpReturn = "RUN";
    G.screen = "HELP";
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 292, w: 260, h: 42, label: "REINICIAR EXPEDIÇÃO", id: "restart", accent: "#ffb347" })) {
    paused = false;
    settleAbandon();
    newRun();
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 130, y: 344, w: 260, h: 42, label: "SAIR PARA O MENU", id: "quit", accent: "#ff4d5a" })) {
    paused = false;
    settleAbandon();
    G.screen = "TITLE";
    return;
  }
  drawText(ctx, "ESC: VOLTAR AO JOGO", VIEW_W / 2, 416, { color: PAL.textDim, align: "center" });
}

function settleAbandon() {
  const run = G.run;
  run.status = "lost";
  settleRun();
  run.status = "ended";
}

let helpReturn = "TITLE";

// ------------------------------------------------------------------- fim ----
function drawEnd(run) {
  ctx.fillStyle = "rgba(10,8,16,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const p = run.payout;
  if (!p) return;
  const won = p.winBonus > 0;
  panel(ctx, VIEW_W / 2 - 250, 54, 500, 436, { border: won ? "#ffd479" : "#ff4d5a" });

  drawText(ctx, won ? "VITÓRIA DA COLÔNIA!" : "A COLÔNIA CAIU",
    VIEW_W / 2, 80, { font: "big", scale: 2, color: won ? "#ffd479" : "#ff4d5a", align: "center" });
  const subLock = won
    ? "O DEVASTADOR caiu no Pico Congelado. O formigueiro é eterno."
    : "A rainha tombou. Mas a essência alimenta a próxima geração.";
  wrapText(subLock, 440, {}).forEach((L, li) =>
    drawText(ctx, L, VIEW_W / 2, 128 + li * 18, { color: PAL.text, align: "center" }));

  let y = 170;
  const line = (label, val, color) => {
    drawText(ctx, label, VIEW_W / 2 - 190, y, { color: PAL.textDim });
    drawText(ctx, val, VIEW_W / 2 + 190, y, { color: color || PAL.text, align: "right" });
    y += 24;
  };
  line("ONDAS REPELIDAS", run.wave);
  line("MAPAS LIMPOS", run.mapsCleared + "/" + MAPS.length);
  line("INIMIGOS ABATIDOS", run.kills);
  line("NÍVEL DA COLÔNIA", run.level);
  line("MUTAÇÕES ADOTADAS", run.mutationLog.length);
  // ícones das mutações
  if (run.mutationLog.length) {
    let ix = VIEW_W / 2 - 190;
    for (const mm of run.mutationLog) {
      const icon = IMG["i_" + mm.icon];
      if (icon) ctx.drawImage(icon, ix, y - 4, 20, 20);
      ix += 26;
      if (ix > VIEW_W / 2 + 150) { ix = VIEW_W / 2 - 190; y += 24; }
    }
    y += 26;
  }
  line("RELÍQUIA (10% DA ESSÊNCIA)", p.relic, "#c77dff");
  line("BÔNUS DE ONDAS", "+" + p.waveBonus, "#c77dff");
  line("BÔNUS DE MAPAS", "+" + p.mapBonus, "#c77dff");
  line("BÔNUS DE ABATES", "+" + p.killBonus, "#c77dff");
  if (p.winBonus) line("VITÓRIA ÉPICA", "+" + p.winBonus, "#c77dff");
  if (p.mult > 1) line("ALMA DA COLÔNIA", "x" + p.mult.toFixed(2), "#c77dff");
  y += 4;
  ctx.fillStyle = "#3a3054";
  ctx.fillRect(VIEW_W / 2 - 190, y - 10, 380, 2);
  drawText(ctx, "TOTAL DE GELÉIA REAL", VIEW_W / 2 - 190, y + 10, { font: "big", scale: 1, color: "#c77dff" });
  drawText(ctx, "+" + p.total, VIEW_W / 2 + 190, y + 6, { font: "big", scale: 2, color: "#ffd479", align: "right" });
  y += 58;

  if (button(ctx, { x: VIEW_W / 2 - 230, y: y, w: 220, h: 40, label: "NOVA EXPEDIÇÃO", id: "again", accent: "#37e6c8" })) {
    paused = false;
    newRun();
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 + 10, y: y, w: 220, h: 40, label: "ÁRVORE DA EVOLUÇÃO", id: "goTree", accent: "#c77dff" })) {
    enterTree();
    G.screen = "TREE";
    return;
  }
  if (button(ctx, { x: VIEW_W / 2 - 110, y: y + 50, w: 220, h: 34, label: "MENU PRINCIPAL", id: "menu" })) {
    G.screen = "TITLE";
    return;
  }
}

// ---------------------------------------------------------------- exports ---
export function gameHelpReturn() { return helpReturn; }
export function setPaused(v) { paused = v; }
export function boot() {
  initInput(canvas);
}
