// ============================================================================
// FUMIGA — entrada (teclado + mouse) em coordenadas virtuais 960x540
// ESQUERDO: arrastar = mover câmera · clique = ordem às selecionadas
// DIREITO:  arrastar = caixa de seleção · clique = selecionar · dbl = tipo
// ============================================================================
import { VIEW_W, VIEW_H } from "./config.js";

export const keys = Object.create(null);     // estado atual por código
export const pressed = Object.create(null);  // true por 1 tick (keydown)
export const released = Object.create(null); // true por 1 tick (keyup)

// ============================================================================
// VERSÃO MOBILE — estado do modo toque (shell game/mobile/).
// A versão mobile é PARALELA à de PC: compartilha este motor, mas só ativa
// estes flags quem carrega a camada de toque. No PC tudo segue false e o
// comportamento é exatamente o mesmo de antes.
//   on     = true quando a camada de toque está ativa (versão mobile)
//   smart  = gestos inteligentes: toque na formiga seleciona, toque no
//            chão/inimigo/comida dá ordem (padrão da versão mobile)
//   mode   = "ordenar" | "selecionar" — modo explícito opcional
//            (ligável nas OPÇÕES → CONTROLES); só usado quando smart=false
// ============================================================================
export const touchMode = { on: false, smart: false, mode: "ordenar" };
export function enableTouchMode(smart) {
  touchMode.on = true;
  touchMode.smart = !!smart;
  touchMode.mode = "ordenar";
}

export const mouse = {
  x: 0, y: 0,           // posição em coords virtuais
  down: false,          // botão esquerdo pressionado
  right: false,
  justDown: false,      // borda de descida (1 tick)
  justUp: false,
  justRightDown: false,
  justRightUp: false,
  clickX: 0, clickY: 0, // onde começou o arraste esquerdo
  lastX: 0, lastY: 0,   // posição do tick anterior (delta para pan)
  rclickX: 0, rclickY: 0, // onde começou o arraste direito
  rlX: 0, rlY: 0,       // posição atual do arraste direito
  rdbl: false,          // duplo clique DIREITO neste tick
  wheel: 0,             // -1 / +1 acumulado
};

let canvas = null;
let lastRClickT = -999, lastRClickX = 0, lastRClickY = 0;

function toVirtual(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * VIEW_W,
    y: ((e.clientY - r.top) / r.height) * VIEW_H,
  };
}

export function initInput(cv) {
  canvas = cv;

  window.addEventListener("keydown", (e) => {
    if (e.repeat) { e.preventDefault(); return; }
    keys[e.code] = true;
    pressed[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; released[e.code] = true; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  canvas.addEventListener("mousemove", (e) => {
    const p = toVirtual(e);
    mouse.x = p.x; mouse.y = p.y;
    if (mouse.right) { mouse.rlX = p.x; mouse.rlY = p.y; }
  });

  canvas.addEventListener("mousedown", (e) => {
    const p = toVirtual(e); mouse.x = p.x; mouse.y = p.y;
    if (e.button === 0) {
      mouse.down = true; mouse.justDown = true;
      mouse.clickX = p.x; mouse.clickY = p.y;
      mouse.lastX = p.x; mouse.lastY = p.y;
    }
    if (e.button === 2) {
      mouse.right = true; mouse.justRightDown = true;
      mouse.rclickX = p.x; mouse.rclickY = p.y;
      mouse.rlX = p.x; mouse.rlY = p.y;
      // duplo clique direito (manual)
      const t = performance.now();
      if (t - lastRClickT < 340 && Math.hypot(p.x - lastRClickX, p.y - lastRClickY) < 12) {
        mouse.rdbl = true;
        lastRClickT = -999;
      } else {
        lastRClickT = t; lastRClickX = p.x; lastRClickY = p.y;
      }
    }
  });
  window.addEventListener("mouseup", (e) => {
    const p = toVirtual(e);
    if (e.button === 0) { mouse.down = false; mouse.justUp = true; }
    if (e.button === 2) { mouse.right = false; mouse.justRightUp = true; }
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); mouse.wheel += Math.sign(e.deltaY); }, { passive: false });
}

// Chamado no fim de cada frame: zera bordas; guarda posição para o delta de pan
export function endTick() {
  for (const k in pressed) pressed[k] = false;
  for (const k in released) released[k] = false;
  mouse.justDown = mouse.justUp = false;
  mouse.justRightDown = mouse.justRightUp = false;
  mouse.rdbl = false;
  mouse.wheel = 0;
  mouse.lastX = mouse.x; mouse.lastY = mouse.y;
}
