// ============================================================================
// FUMIGA-GOAT — bootstrap: carregamento, loop principal, redimensionamento
// ============================================================================
import { VIEW_W, VIEW_H, PAL } from "./config.js";
import { G, loadSave } from "./state.js";
import { loadAll, bakeRot, bakeRotTinted } from "./assets.js";
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
  if (s >= 2.1) s = Math.floor(s); // preferir escala inteira quando possível
  canvas.style.width = Math.floor(VIEW_W * s) + "px";
  canvas.style.height = Math.floor(VIEW_H * s) + "px";
}
window.addEventListener("resize", fit);
fit();

// ------------------------------------------------------------- loading -----
const ANT_SIZES = {
  worker: 34, soldier: 48, spitter: 44, tank: 54, queen: 142,
  scout: 36, healer: 40, bomber: 46,
  e_runner: 30, e_swarm: 34, e_warrior: 48, e_spitter: 46, e_reaper: 44,
  e_matron: 80, e_sentinel: 62,
};

let progress = 0, phase = "CARREGANDO ESPOROS", ready = false, loadError = null;

function drawLoading() {
  ctx.fillStyle = "#14101d";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // formigueiro mecânico de loading
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 3;
  const cx = VIEW_W / 2, cy = VIEW_H / 2 - 60;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + i * 10 + Math.sin(performance.now() / 300 + i) * 3, 0, 6.29);
    ctx.stroke();
  }
  const bw = 360;
  ctx.fillStyle = "#1d1730";
  ctx.fillRect(cx - bw / 2, cy + 60, bw, 22);
  ctx.strokeRect(cx - bw / 2 + 0.5, cy + 60.5, bw, 22);
  const grad = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  grad.addColorStop(0, "#37e6c8");
  grad.addColorStop(1, "#c77dff");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - bw / 2 + 2, cy + 62, (bw - 4) * progress, 18);
  // texto vetorial (a fonte bitmap ainda não foi carregada nesta fase)
  ctx.fillStyle = loadError ? "#ff4d5a" : "#efe9ff";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(loadError ? ("ERRO: " + loadError.message) : (phase + "... " + Math.floor(progress * 100) + "%"), cx, cy + 108);
}

// --------------------------------------------------------------- loop -------
let prev = performance.now();

function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - prev) / 1000;
  prev = t;
  if (dt <= 0) return;
  if (dt > 0.1) dt = 0.1; // evita salto após alt-tab

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
  for (const [k, s] of Object.entries(ANT_SIZES)) bakeRot(k, s);
  bakeRotTinted("worker", "gatherer", 34, "#7fd6c0", 0.5); // coletora: variante jade da operária
  bakeBossSheets();
  progress = 1;
  boot();
  ready = true;
  G.screen = "TITLE";
}

// primeira interação: destrava áudio
window.addEventListener("pointerdown", () => initAudio(), { once: true });
window.addEventListener("keydown", () => initAudio(), { once: true });

bootAll();
requestAnimationFrame(loop);
