// ============================================================================
// FUMIGA — TUTORIAL DINÂMICO: acontece junto com a gameplay, não em telas.
// Passos aparecem como cartões vivos no topo; cada um se completa quando o
// jogador realiza a ação pedida. Tecla T pula. Persiste em save.tutorial.
// ============================================================================
import { G, persistSave } from "./state.js";
import { PAL } from "./config.js";
import { drawText, wrapText } from "./font.js";
import { clamp } from "./utils.js";
import { uiButtons, pointInRect } from "./ui.js";
import { mouse } from "./input.js";
import { SFX } from "./audio.js";

// cadeia de eventos do tutorial ----------------------------------------------
// game.js / units.js chamam tutEvent(<nome>) nos momentos certos.
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
  t: 0,            // tempo no passo atual (para fades)
  done: false,
  camAccum: 0,
  steps: [],
};

const STEP_DEFS = [
  {
    id: "cam", title: "EXPLORE O MAPA", icon: "i_bolt",
    desc: "Arraste com o BOTÃO ESQUERDO para mover a câmera. WASD também funciona.",
    on() { /* completo via checagem em updateTutorial */ },
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

  // passo de câmera: completa por arraste acumulado ou WASD
  if (st.id === "cam" && (TUT.camAccum > 420 || TUT.t > 16)) TUT._done = true;
  // passos contextuais com tolerância temporal (o jogador já sabe jogar)
  if (st.id === "select" && TUT.t > 60) TUT._done = true;
  if (st.id === "wave" && run.wave >= 1) TUT._done = true;
  if (st.id === "essence" && run.wave >= 2) TUT._done = true;

  if (TUT._done) {
    // breve pausa para o jogador ver o "check"
    if (TUT.t > 0.5) advance();
    else TUT.t = 0.51;
  }
}

// desenha o cartão do passo atual (chamado pelo HUD da run) -------------------
// O cartão tem largura fixa e repousa logo abaixo do contador de onda (y 8..60).
// O retângulo é CALCULADO do estado, não lido do último desenho: o HUD é
// desenhado ANTES do cartão no mesmo frame, então a posição "desenhada" atrasa
// um frame — o botão de invocar onda nascia debaixo do cartão e o anúncio do
// mapa aparecia meio escondido atrás dele.
const CARD_W = 410;
const CARD_Y = 68;
function cardMetrics(st) {
  // A descrição é quebrada dentro do cartão: antes, textos de até 71 caracteres
  // vazavam da caixa e ficavam escondidos atrás do botão de invocar onda.
  // A largura também não pode invadir o painel do jogador (x 10..272).
  return { w: CARD_W, h: 40 + wrapText(st.desc, CARD_W - 32, {}).length * 17 + 18 };
}

/** Retângulo de repouso do cartão (ou null se o tutorial não está ativo). */
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
  const descLines = wrapText(st.desc, w - 32, {});
  const yIn = clamp((TUT.t) / 0.5, 0, 1);
  const yStart = -h - 12;                            // entra deslizando por cima da borda
  const y = yStart + (yRest - yStart) * (1 - Math.pow(1 - yIn, 3));

  ctx.globalAlpha = clamp(TUT.t / 0.25, 0, 1);
  // corpo
  ctx.fillStyle = "rgba(16,12,26,0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = TUT._done ? "#7fd6a0" : "#37e6c8";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#37e6c8";
  ctx.fillRect(x, y, 4, h);

  drawText(ctx, st.title, x + 16, y + 10, { font: "big", scale: 1, color: TUT._done ? "#7fd6a0" : "#ffd479" });
  descLines.forEach((L, li) => drawText(ctx, L, x + 16, y + 34 + li * 17, { color: PAL.text }));
  drawText(ctx, "PASSO " + (TUT.idx + 1) + "/" + TUT.steps.length, x + 16, y + h - 16, { color: PAL.textDim });

  // botão "PULAR" sempre clicável (rótulo curto: o antigo vazava do cartão)
  const bw = 92, bh = 20;
  const bx = x + w - bw - 10, by = y + h - bh - 8;
  const hot = pointInRect(mouse.x, mouse.y, bx, by, bw, bh);
  ctx.fillStyle = hot ? "#4a3a6e" : "#2c2444";
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
    drawText(ctx, "CONCLUÍDO!", x + w / 2, y + h + 6, { color: "#7fd6a0", align: "center" });
  }
  ctx.globalAlpha = 1;
}
