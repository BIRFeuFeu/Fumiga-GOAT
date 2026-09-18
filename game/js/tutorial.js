// ============================================================================
// FUMIGA — TUTORIAL DINÂMICO V2: cartões refinados estilo Dead Cells
// ============================================================================
import { G, persistSave } from "./state.js";
import { PAL } from "./config.js";
import { drawText, wrapText } from "./font.js";
import { clamp, TAU } from "./utils.js";
import { panel, pointInRect } from "./ui.js";
import { uiButtons } from "./ui.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";

let events = Object.create(null);

export function tutEvent(name, data) {
  events[name] = (events[name] || 0) + 1;
  if (TUT.active && TUT.steps[TUT.idx] && TUT.steps[TUT.idx].on) {
    TUT.steps[TUT.idx].on(name, data);
  }
}

export const TUT = {
  active: false,
  idx: 0,
  t: 0,
  done: false,
  camAccum: 0,
  steps: [],
};

const STEP_DEFS = [
  {
    id: "cam", title: "EXPLORE O MAPA", icon: "i_bolt",
    desc: "Arraste com o BOTÃO ESQUERDO para mover a câmera. WASD também funciona.",
    on() {},
  },
  {
    id: "select", title: "SELECIONE FORMIGAS", icon: "i_spider",
    desc: "Arraste com o BOTÃO DIREITO ao redor das operárias para selecioná-las.",
    on(name) { if (name === "selected") TUT._done = true; },
  },
  {
    id: "gather", title: "ORDENE A COLETA", icon: "i_food",
    desc: "Com unidades selecionadas, clique com o BOTÃO ESQUERDO na comida.",
    on(name) { if (name === "gatherOrder" || name === "deposit") TUT._done = true; },
  },
  {
    id: "hatch", title: "CHOQUE NOVAS FORMIGAS", icon: "i_egg",
    desc: "Aperte 1 para chocar uma OPERÁRIA. Ela nasce no formigueiro.",
    on(name) { if (name === "buy") TUT._done = true; },
  },
  {
    id: "army", title: "FORME A GUARDA", icon: "i_shield",
    desc: "Choque uma SOLDADO (tecla 2) e aperte F para convocar a guarda.",
    on(name, data) {
      if (name === "rally") { TUT._done = true; return; }
      if (name === "buy" && data && data !== "worker") TUT._done = true;
    },
  },
  {
    id: "wave", title: "DEFENDA A RAINHA!", icon: "i_fire_sword",
    desc: "A primeira invasão chegou. Sobreviva com sua colônia.",
    on(name) { if (name === "waveStart") TUT._done = true; },
  },
  {
    id: "essence", title: "A MOEDA DA EVOLUÇÃO", icon: "i_essence",
    desc: "Cristais roxos dão ESSÊNCIA. Ela compra melhorias eternas na árvore.",
    on(name) { if (name === "essence" || name === "waveEnd") TUT._done = true; },
  },
];

export function startTutorial() {
  events = Object.create(null);
  TUT.active = true;
  TUT.done = false;
  TUT.idx = 0;
  TUT.t = 0;
  TUT.camAccum = 0;
  TUT._done = false;
  TUT.steps = STEP_DEFS;
}

export function stopTutorial(markDone) {
  TUT.active = false;
  if (markDone !== false) {
    G.save.tutorial = 1;
    persistSave();
  }
}

export function tutorialFinished() { return TUT.done; }

function advance() {
  TUT.idx++;
  TUT.t = 0;
  TUT._done = false;
  if (TUT.idx >= TUT.steps.length) {
    TUT.done = true;
    stopTutorial(true);
  }
}

export function updateTutorial(dt, run) {
  if (!TUT.active || !run || run.mapIdx !== 0) return;
  TUT.t += dt;

  const st = TUT.steps[TUT.idx];
  if (!st) return;

  if (st.id === "cam" && (TUT.camAccum > 420 || TUT.t > 16)) TUT._done = true;
  if (st.id === "select" && TUT.t > 60) TUT._done = true;
  if (st.id === "wave" && run.wave >= 1) TUT._done = true;
  if (st.id === "essence" && run.wave >= 2) TUT._done = true;

  if (TUT._done) {
    if (TUT.t > 0.5) advance();
    else TUT.t = 0.51;
  }
}

const CARD_W = 420;
const CARD_Y = 72;
function cardMetrics(st) {
  return { w: CARD_W, h: 44 + wrapText(st.desc, CARD_W - 40, {}).length * 17 + 22 };
}

export function tutorialCardRect(VIEW_W) {
  if (!TUT.active) return null;
  const st = TUT.steps[TUT.idx];
  if (!st) return null;
  const m = cardMetrics(st);
  return { x: (VIEW_W - m.w) / 2, y: CARD_Y, w: m.w, h: m.h };
}

export function drawTutorial(ctx, VIEW_W) {
  const st = TUT.steps[TUT.idx];
  if (!TUT.active || !st) return;
  const { x, w, h, y: yRest } = tutorialCardRect(VIEW_W);
  const descLines = wrapText(st.desc, w - 40, {});
  const yIn = clamp((TUT.t) / 0.5, 0, 1);
  const yStart = -h - 12;
  const y = yStart + (yRest - yStart) * (1 - Math.pow(1 - yIn, 3));

  ctx.globalAlpha = clamp(TUT.t / 0.25, 0, 1);

  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x + 3, y + 4, w, h);

  // painel refinado
  panel(ctx, x, y, w, h, {
    fill: TUT._done ? "#1e2a1e" : "#1a1628",
    border: TUT._done ? "#7fd6a0" : "#37e6c8",
    accentLine: TUT._done ? "#7fd6a0" : "#37e6c8",
    glow: TUT._done ? "#7fd6a0" : "#37e6c8",
    r: 6,
  });

  // barra lateral animada
  const pulse = 0.5 + Math.sin(G.time * 3) * 0.3;
  ctx.fillStyle = TUT._done ? "#7fd6a0" : "#37e6c8";
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.fillRect(x, y + 2, 4, h - 4);
  ctx.globalAlpha = clamp(TUT.t / 0.25, 0, 1);

  // ícone de check se concluído
  if (TUT._done) {
    ctx.fillStyle = "#7fd6a0";
    ctx.beginPath();
    ctx.arc(x + w - 18, y + 16, 10, 0, TAU);
    ctx.fill();
    drawText(ctx, "✓", x + w - 18, y + 10, { color: "#000", align: "center", font: "big" });
  }

  drawText(ctx, st.title, x + 20, y + 12, { font: "big", scale: 1, color: TUT._done ? "#7fd6a0" : "#ffd479" });
  descLines.forEach((L, li) => drawText(ctx, L, x + 20, y + 36 + li * 17, { color: PAL.text }));
  drawText(ctx, "PASSO " + (TUT.idx + 1) + "/" + TUT.steps.length, x + 20, y + h - 18, { color: PAL.textDim });

  // botão pular refinado
  const bw = 96, bh = 22;
  const bx = x + w - bw - 12, by = y + h - bh - 10;
  const hot = pointInRect(mouse.x, mouse.y, bx, by, bw, bh);
  ctx.fillStyle = hot ? "#3a3054" : "#2c2444";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = hot ? "#8f7bd6" : "#4a3a6e";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  drawText(ctx, "PULAR (T)", bx + bw / 2, by + 6, { color: hot ? "#efe9ff" : PAL.textDim, align: "center" });
  uiButtons().push({ x: bx, y: by, w: bw, h: bh, id: "tutSkip" });
  if (hot && mouse.justDown) {
    SFX.uiClick();
    stopTutorial(true);
  }

  if (TUT._done) {
    ctx.fillStyle = "rgba(127,214,160,0.15)";
    ctx.fillRect(x, y + h, w, 18);
    drawText(ctx, "CONCLUÍDO!", x + w / 2, y + h + 4, { color: "#7fd6a0", align: "center" });
  }
  ctx.globalAlpha = 1;
}
