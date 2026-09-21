// ============================================================================
// FUMIGA-GOAT — bootstrap: carregamento, loop principal, redimensionamento V2
// Agora começa em PRETITLE com título animado
// ============================================================================
import { VIEW_W, VIEW_H, PAL, GIANT_SCALE, ANT_SIZES, GATHERER_SIZE } from "./config.js";
import { G, loadSave } from "./state.js";
import { loadAll, bakeRot, dupSprite, setRotDrawScale } from "./assets.js";
import { loadFonts, drawText } from "./font.js";
import { initAudio } from "./audio.js";
import { endTick } from "./input.js";
import { boot, update, render, setLastDt } from "./game.js";
import { bakeBossSheets } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// ------------------------------------------------------------ resize -------
function fit() {
  const w = window.innerWidth, h = window.innerHeight;
  let s = Math.min(w / VIEW_W, h / VIEW_H);
  if (s >= 2.1) s = Math.floor(s);
  canvas.style.width = Math.floor(VIEW_W * s) + "px";
  canvas.style.height = Math.floor(VIEW_H * s) + "px";
}
window.addEventListener("resize", fit);
fit();

// ------------------------------------------------------------- loading -----
// Tamanhos de assado vêm de config.js (fonte única compartilhada com os testes).

let progress = 0, phase = "CARREGANDO ESPOROS", ready = false, loadError = null;

function drawLoading() {
  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // fundo com gradiente
  const g = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2 - 40, 20, VIEW_W/2, VIEW_H/2 - 40, 500);
  g.addColorStop(0, "#1a1430");
  g.addColorStop(1, "#0a0812");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);

  // logo pequeno
  ctx.fillStyle = "#efe9ff";
  ctx.font = "bold 32px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("FUMIGA", VIEW_W/2, VIEW_H/2 - 90);

  // anéis animados
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 2.5;
  const cx = VIEW_W / 2, cy = VIEW_H / 2 - 20;
  const time = performance.now() / 1000;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.5 + Math.sin(time * 2 + i) * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, 18 + i * 14 + Math.sin(time * 1.5 + i) * 4, 0, 6.29);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // barra de progresso refinada
  const bw = 360, bh = 24;
  const bx = cx - bw/2, by = cy + 70;
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(bx + 3, by + 4, bw, bh);
  // fundo
  ctx.fillStyle = "#1d1730";
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  // preenchimento com gradiente
  const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
  grad.addColorStop(0, "#37e6c8");
  grad.addColorStop(0.5, "#8f6fd6");
  grad.addColorStop(1, "#c77dff");
  ctx.fillStyle = grad;
  const fillW = (bw - 4) * progress;
  ctx.fillRect(bx + 2, by + 2, fillW, bh - 4);
  // brilho
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(bx + 2, by + 2, fillW, 2);

  ctx.fillStyle = loadError ? "#ff4d5a" : "#9a8fc0";
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(loadError ? ("ERRO: " + loadError.message) : (phase + "... " + Math.floor(progress * 100) + "%"), cx, by + bh + 22);

  // dica
  if (!loadError) {
    ctx.fillStyle = "rgba(154,143,192,0.5)";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillText("Inspirado em Dead Cells • Colônia Eterna", cx, VIEW_H - 20);
  }
}

// --------------------------------------------------------------- loop -------
let prev = performance.now();

function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - prev) / 1000;
  prev = t;
  if (dt <= 0) return;
  if (dt > 0.1) dt = 0.1;

  if (!ready) { drawLoading(); return; }
  setLastDt(dt);
  update(dt);
  render(dt);
  endTick();
}

async function bootAll() {
  loadSave();
  await loadFonts().catch(e => { loadError = e; });
  await loadAll((p) => { progress = p * 0.9; });
  phase = "ASSANDO PIXELS";
  await new Promise(r => requestAnimationFrame(r));
  // DINOPONERA: a colosso é a FORMIGA-BALA tingida de violeta profundo,
  // DINOPONERA: a arte da soldado com as MESMAS cores originais (sem tinteamento),
  // assada no tamanho 5x e ampliada na hora (ver setRotDrawScale)
  dupSprite("soldier", "giant");
  for (const [k, s] of Object.entries(ANT_SIZES)) bakeRot(k, s);
  setRotDrawScale("giant", "soldier", GIANT_SCALE);
  // MEL: a POTE-DE-MEL tem sprite próprio (gaster dourado inchado)
  bakeRot("gatherer", GATHERER_SIZE);
  bakeBossSheets();
  progress = 1;
  boot();
  ready = true;
  G.screen = "PRETITLE";
}

// primeira interação: destrava áudio
window.addEventListener("pointerdown", () => initAudio(), { once: true });
window.addEventListener("keydown", () => initAudio(), { once: true });

bootAll();
requestAnimationFrame(loop);
