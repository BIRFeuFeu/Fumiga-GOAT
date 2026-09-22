// ============================================================================
// FUMIGA — CAMADA DE TOQUE DA VERSÃO MOBILE (game/mobile/)
// ----------------------------------------------------------------------------
// Versão PARALELA à de PC, sem conexão entre elas (save próprio), mas que
// roda o MESMO motor: nada aqui duplica gameplay. Esta camada apenas
// TRADUZ gestos de toque para o estado de entrada que o jogo já entende
// (mouse/pressed de js/input.js) — a mesma autoridade de seleção, ordens,
// câmera e UI das duas versões.
//
// Gestos (inspirados em Rusted Warfare e Iron Marines):
//   • 1 dedo arrastar ......... move a câmera (botão esquerdo do PC)
//   • toque ................... dá ordem às selecionadas (clique esquerdo)
//   • toque numa formiga ...... seleciona (gesto inteligente; só no modo smart)
//   • toque duplo ............. seleciona o tipo na tela (duplo direito)
//   • 2 dedos arrastar ........ caixa de seleção (arrasto direito)
//   • pinça ................... zoom ancorado no ponto médio dos dedos
//   • modo explícito opcional . botão ORDENAR ↔ SELECIONAR (OPÇÕES→CONTROLES)
// ============================================================================
import { VIEW_W, VIEW_H } from "../js/config.js";
import { mouse, pressed, touchMode, enableTouchMode } from "../js/input.js";
import { G } from "../js/state.js";
import { cam, screenToWorld, panCam } from "../js/camera.js";
import { clamp } from "../js/utils.js";
import { isPaused } from "../js/game.js";

const canvas = document.getElementById("game");
const hudEl = document.getElementById("touch-hud");
const modeBtnEl = document.getElementById("touch-mode-btn");
const rotateEl = document.getElementById("rotate-hint");

// O save já foi carregado pelo main.js (loadSave roda antes do 1º await),
// então a preferência de modo explícito já está disponível aqui.
enableTouchMode(!G.save.settings.touchSelect);

// --------------------------------------------------------------- coords ----
function toVirtual(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * VIEW_W,
    y: ((clientY - r.top) / r.height) * VIEW_H,
  };
}

// ------------------------------------------------------------ gestos --------
const TAP_DIST = 14;        // até isso (coords virtuais 960x540) ainda é toque
const DOUBLE_TAP_MS = 340;  // mesma janela do duplo clique direito do PC
const DOUBLE_TAP_DIST = 26;
// Decisão 2 dedos: caixa de seleção x pinça. Eventos chegam 1 dedo por vez,
// então a decisão só acontece quando (a) os DOIS dedos andaram juntos na
// mesma direção (caixa), (b) os dois se afastaram em direções opostas, ou
// (c) a distância mudou ALÉM de um limiar com folga (pinça de 1 dedo fixo).
const PINCH_RATIO = 0.25;   // divergência forte de distância -> pinça
const TWO_MOVE = 10;        // cada dedo precisa andar isso p/ comparar direção
const DOT_BOX = 0.35;       // paralelo -> caixa
const DOT_PINCH = -0.1;     // opostos -> pinça

const ptrs = new Map();     // pointerId -> { x, y, sx, sy }
let gesture = null;         // { kind:"single"|"two", ... }
let lastTapT = -1e9, lastTapX = 0, lastTapY = 0, pendingDouble = false;

function explicitSelectMode() {
  return touchMode.on && !touchMode.smart && touchMode.mode === "selecionar";
}

function leftDown(p) {
  mouse.x = p.x; mouse.y = p.y;
  mouse.down = true; mouse.justDown = true;
  mouse.clickX = p.x; mouse.clickY = p.y;
  mouse.lastX = p.x; mouse.lastY = p.y;
}
function leftUp(p) {
  mouse.x = p.x; mouse.y = p.y;
  mouse.down = false; mouse.justUp = true;
}
function rightDown(p) {
  mouse.x = p.x; mouse.y = p.y;
  mouse.right = true; mouse.justRightDown = true;
  mouse.rclickX = p.x; mouse.rclickY = p.y;
  mouse.rlX = p.x; mouse.rlY = p.y;
}

function onPointerDown(e) {
  if (e.pointerType !== "touch") return;      // mouse real segue o caminho antigo
  e.preventDefault();                          // suprime os eventos de mouse sintéticos
  const p = toVirtual(e.clientX, e.clientY);
  ptrs.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y });
  tryOrientationLockOnce();

  if (ptrs.size === 1) {
    const now = performance.now();
    pendingDouble =
      now - lastTapT < DOUBLE_TAP_MS &&
      Math.hypot(p.x - lastTapX, p.y - lastTapY) < DOUBLE_TAP_DIST;
    if (explicitSelectMode()) {
      rightDown(p);
      gesture = { kind: "single", button: "right", moved: false };
    } else {
      leftDown(p);
      gesture = { kind: "single", button: "left", moved: false };
    }
    return;
  }

  if (ptrs.size === 2) {
    // O 2º dedo chegou: encerra o dedo solitário sem disparar ação.
    if (gesture && gesture.kind === "single") {
      if (gesture.button === "left") {
        if (gesture.moved) { mouse.down = false; mouse.justUp = true; }  // pan terminou
        else { mouse.down = false; mouse.justDown = false; }             // toque abortado
      } else {
        mouse.right = false; mouse.justRightDown = false;                // caixa abortada
      }
      gesture = null;
    }
    const ids = [...ptrs.keys()];
    const [a, b] = [...ptrs.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    gesture = {
      kind: "two", phase: "undecided",
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      prevDist: 0, prevMid: mid, mid0: mid,
      wheelAcc: 0,
      // posição inicial de CADA dedo neste gesto (decide caixa vs pinça)
      starts: { [ids[0]]: { x: a.x, y: a.y }, [ids[1]]: { x: b.x, y: b.y } },
    };
    gesture.prevDist = gesture.d0;
    return;
  }
  // 3+ dedos: ignora (mantém o gesto de 2 dedos ativo)
}

function onPointerMove(e) {
  if (e.pointerType !== "touch") return;
  const rec = ptrs.get(e.pointerId);
  if (!rec) return;
  e.preventDefault();
  const p = toVirtual(e.clientX, e.clientY);
  rec.x = p.x; rec.y = p.y;

  if (gesture && gesture.kind === "single") {
    mouse.x = p.x; mouse.y = p.y;
    if (!gesture.moved && Math.hypot(p.x - rec.sx, p.y - rec.sy) > TAP_DIST) gesture.moved = true;
    if (gesture.button === "right") { mouse.rlX = p.x; mouse.rlY = p.y; }
    // botão esquerdo: game.js lê mouse.x/y vs mouse.lastX a cada frame (pan)
    return;
  }

  if (gesture && gesture.kind === "two" && ptrs.size >= 2) {
    const ids = [...ptrs.keys()];
    const [a, b] = [ptrs.get(ids[0]), ptrs.get(ids[1])];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const g = gesture;

    if (g.phase === "undecided") {
      const sa = g.starts[ids[0]], sb = g.starts[ids[1]];
      const da = { x: a.x - sa.x, y: a.y - sa.y }, db = { x: b.x - sb.x, y: b.y - sb.y };
      const la = Math.hypot(da.x, da.y), lb = Math.hypot(db.x, db.y);
      if (la > TWO_MOVE && lb > TWO_MOVE) {
        // os dois dedos andaram: dá para comparar a direção dos vetores
        const dot = (da.x * db.x + da.y * db.y) / (la * lb);
        if (dot > DOT_BOX) {
          if (G.screen === "RUN") {
            g.phase = "box";
            rightDown(g.mid0);          // caixa nasce no ponto médio inicial
          } else {
            g.phase = "pinch";          // menus: 2 dedos sempre viram pinça
          }
        } else if (dot < DOT_PINCH) {
          g.phase = "pinch";
        }
      } else if (Math.abs(dist / g.d0 - 1) > PINCH_RATIO) {
        g.phase = "pinch";              // um dedo fixo, o outro abrindo a pinça
      }
    }

    if (g.phase === "box") {
      mouse.x = mid.x; mouse.y = mid.y;
      mouse.rlX = mid.x; mouse.rlY = mid.y;
    } else if (g.phase === "pinch") {
      if (G.screen === "TREE") {
        // A árvore tem zoom próprio (mouse.wheel): traduzimos a pinça em
        // passos. Sinal invertido: na árvore wheel>0 AFASTA (meta.js),
        // enquanto abrir a pinça deve APROXIMAR.
        g.wheelAcc += Math.log2(dist / g.prevDist);
        while (Math.abs(g.wheelAcc) > 0.35) {
          mouse.wheel += g.wheelAcc > 0 ? -1 : 1;
          g.wheelAcc += g.wheelAcc > 0 ? -0.35 : 0.35;
        }
        mouse.x = mid.x; mouse.y = mid.y;
      } else if (G.screen === "RUN") {
        // Zoom contínuo ancorado no ponto médio + pan pelo deslocamento dele.
        const before = screenToWorld(g.prevMid.x, g.prevMid.y);
        cam.zoom = clamp(cam.zoom * (dist / g.prevDist), cam.minZoom, cam.maxZoom);
        const after = screenToWorld(mid.x, mid.y);
        cam.x += before.x - after.x;
        cam.y += before.y - after.y;
        panCam(0, 0);                   // reaplica os limites do mapa
      }
    }

    g.prevDist = dist;
    g.prevMid = mid;
  }
}

function onPointerUp(e) {
  if (e.pointerType !== "touch") return;
  const rec = ptrs.get(e.pointerId);
  if (!rec) return;
  ptrs.delete(e.pointerId);
  const p = toVirtual(e.clientX, e.clientY);

  if (gesture && gesture.kind === "single") {
    const wasTap = !gesture.moved;
    if (gesture.button === "left") leftUp(p);
    else {
      mouse.x = p.x; mouse.y = p.y;
      mouse.right = false; mouse.justRightUp = true;
    }
    if (wasTap) {
      if (pendingDouble) { mouse.rdbl = true; pendingDouble = false; lastTapT = -1e9; }
      else { lastTapT = performance.now(); lastTapX = p.x; lastTapY = p.y; }
    }
    gesture = null;
    return;
  }

  if (gesture && gesture.kind === "two") {
    if (gesture.phase === "box") {
      mouse.right = false; mouse.justRightUp = true;   // confirma a seleção
    }
    if (ptrs.size === 0) { gesture = null; lastTapT = -1e9; }
    else gesture = null;              // dedo restante fica "frio": sem ação extra
    return;
  }

  // pointercancel ou dedo perdido: solta tudo sem disparar ordens
  mouse.down = false; mouse.right = false;
}

function onPointerCancel(e) {
  if (e.pointerType !== "touch") return;
  ptrs.delete(e.pointerId);
  mouse.down = false;
  mouse.right = false;
  mouse.justDown = false;
  mouse.justRightDown = false;
  gesture = null;
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerCancel);
// Rede de segurança: nada fora do canvas pode rolar/dar zoom na página.
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

// ---------------------------------------------------------- HUD virtual -----
function pressKey(code) { pressed[code] = true; }

function makeBtn(cls, ico, lbl, onPress) {
  const b = document.createElement("button");
  b.className = cls;
  b.type = "button";
  const i = document.createElement("span");
  i.className = "ico"; i.textContent = ico;
  b.appendChild(i);
  if (lbl) {
    const l = document.createElement("span");
    l.className = "lbl"; l.textContent = lbl;
    b.appendChild(l);
  }
  const fire = (e) => { e.preventDefault(); onPress(); };
  b.addEventListener("pointerdown", fire);   // resposta imediata (sem esperar o "click")
  return b;
}

const btnPause = makeBtn("btn", "⏸", "PAUSA", () => pressKey("Escape"));
const btnNest  = makeBtn("btn", "🏠", "NINHO", () => pressKey("KeyB"));
const btnRally = makeBtn("btn", "⚔", "RALI",  () => pressKey("KeyF"));
const btnWave  = makeBtn("btn", "⏭", "ONDA",  () => pressKey("KeyG"));
const btnCent  = makeBtn("btn", "🎯", "CENTRO", () => pressKey("Space"));
const btnZin   = makeBtn("btn zoom", "＋", "", () => { mouse.x = VIEW_W / 2; mouse.y = VIEW_H / 2; mouse.wheel -= 1; });
const btnZout  = makeBtn("btn zoom", "－", "", () => { mouse.x = VIEW_W / 2; mouse.y = VIEW_H / 2; mouse.wheel += 1; });

const rowTop = document.createElement("div");
rowTop.className = "hud-row";
rowTop.appendChild(btnZout); rowTop.appendChild(btnZin); rowTop.appendChild(btnCent);
const rowBot = document.createElement("div");
rowBot.className = "hud-row";
rowBot.appendChild(btnWave); rowBot.appendChild(btnRally); rowBot.appendChild(btnNest); rowBot.appendChild(btnPause);
hudEl.appendChild(rowTop);
hudEl.appendChild(rowBot);
hudEl.hidden = true;

// zoom: pinça faz zoom-IN quando os dedos afastam; a RODA do PC faz zoom-out
// quando deltaY>0 — logo wheel -1 aproxima e +1 afasta (ver zoomCam).
modeBtnEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  touchMode.mode = touchMode.mode === "ordenar" ? "selecionar" : "ordenar";
  updateModeBtn();
  if (navigator.vibrate) navigator.vibrate(15);
});
modeBtnEl.hidden = true;

function updateModeBtn() {
  const selecting = touchMode.mode === "selecionar";
  modeBtnEl.textContent = selecting ? "🎯 SELECIONAR" : "🖐 ORDENAR";
  modeBtnEl.className = selecting ? "select" : "";
}
updateModeBtn();

// Estado visível do HUD: só na expedição; rótulo da pausa segue o jogo.
let hudShown = false, pauseShown = null, modeShown = false, modeSmart = null;
function hudTick() {
  requestAnimationFrame(hudTick);
  const inRun = G.screen === "RUN" && !!G.run;
  if (inRun !== hudShown) {
    hudShown = inRun;
    hudEl.hidden = !inRun;
  }
  if (inRun) {
    const p = isPaused();
    if (p !== pauseShown) {
      pauseShown = p;
      btnPause.firstChild.textContent = p ? "▶" : "⏸";
      btnPause.lastChild.textContent = p ? "VOLTAR" : "PAUSA";
    }
  }
  // modo explícito (OPÇÕES → CONTROLES) pode ligar/desligar em plena run:
  // ele está LIGADO quando a preferência touchSelect é verdadeira
  const explicit = touchMode.on && !!G.save.settings.touchSelect;
  const showMode = inRun && explicit;
  if (showMode !== modeShown) {
    modeShown = showMode;
    modeBtnEl.hidden = !showMode;
  }
  if (explicit !== modeSmart) {
    modeSmart = explicit;
    touchMode.smart = !explicit;
    if (explicit) { touchMode.mode = "ordenar"; updateModeBtn(); }
  }
}
requestAnimationFrame(hudTick);

// ------------------------------------------------ rotação / enquadramento ---
let rotateDismissed = false;

function updateOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  if (rotateEl) {
    if (portrait && !rotateDismissed) rotateEl.hidden = false;
    else rotateEl.hidden = true;
    if (!portrait) rotateDismissed = false;   // girou de volta: rearma o aviso
  }
}
if (rotateEl) {
  const x = document.getElementById("rotate-hint-x");
  if (x) x.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    rotateDismissed = true;
    rotateEl.hidden = true;
  });
}
window.addEventListener("resize", updateOrientation);
if (window.screen && window.screen.orientation) {
  window.screen.orientation.addEventListener?.("change", updateOrientation);
}
updateOrientation();

// Tenta travar em paisagem quando o navegador permitir (exige gesto do
// usuário; em iOS não existe API — aí valem o letterbox e a faixa acima).
let lockTried = false;
function tryOrientationLockOnce() {
  if (lockTried) return;
  lockTried = true;
  try {
    const o = window.screen && window.screen.orientation;
    if (o && o.lock) o.lock("landscape").catch(() => {});
  } catch (err) { /* sem suporte: segue com letterbox */ }
}

// O iOS muda a área visível com a barra de endereço sem disparar "resize"
// do window; repassamos o evento para o fit() do main.js reenquadrar.
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    window.dispatchEvent(new Event("resize"));
  });
}

// Zoom de página no iOS (pinça fora do canvas) bloqueado na origem.
document.addEventListener("gesturestart", (e) => e.preventDefault());
