// ============================================================================
// FUMIGA-GOAT — bootstrap: carregamento, loop principal, redimensionamento V2
// Agora começa em PRETITLE com título animado
// ============================================================================
import { VIEW_W, VIEW_H, PAL, GIANT_SCALE, ANT_SIZES, GATHERER_SIZE } from "./config.js";
import { G, loadSave } from "./state.js";
import { loadAll, bakeRot, dupSprite, setRotDrawScale, LOAD } from "./assets.js";
import { loadFonts, drawText } from "./font.js";
import { initAudio } from "./audio.js";
import { endTick } from "./input.js";
import { boot, update, render, setLastDt } from "./game.js";
import { loadLoreHUD } from "./lore_hud.js";
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
  // a cobertura de scanlines acompanha o canvas pixel a pixel
  const scan = document.getElementById("scan");
  if (scan) {
    scan.style.width = canvas.style.width;
    scan.style.height = canvas.style.height;
  }
}
window.addEventListener("resize", fit);
fit();

// ------------------------------------------------------------- loading -----
// Tamanhos de assado vêm de config.js (fonte única compartilhada com os testes).

let progress = 0, phase = "CARREGANDO ESPOROS", ready = false, loadError = null;
let lastProgressAt = (typeof performance !== "undefined" ? performance.now() : Date.now());

// Quanto tempo sem NENHUMA imagem chegar antes de admitir que a conexão
// travou. Acima disso a tela passa a oferecer o toque de "tentar de novo".
const STALL_MS = 9000;
const stalled = () => !ready && !loadError &&
  (typeof performance !== "undefined" ? performance.now() : Date.now()) - lastProgressAt > STALL_MS;

/**
 * Espera UM frame de pintura, mas NUNCA depende só dele. Em celular a aba é
 * congelada (notificação, troca de app, tela bloqueada) e o requestAnimationFrame
 * para de disparar — com o await cru, o boot ficava preso para sempre em
 * "ASSANDO PIXELS... 90%". O timeout é a saída pela porta de serviço.
 */
function nextFrame(maxMs = 120) {
  return new Promise((res) => {
    let done = false;
    const go = () => { if (done) return; done = true; clearTimeout(t); res(); };
    const t = setTimeout(go, maxMs);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(go);
  });
}

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

  ctx.fillStyle = loadError || stalled() ? "#ff4d5a" : "#9a8fc0";
  ctx.font = "11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(loadError ? ("ERRO: " + loadError.message) : (phase + "... " + Math.floor(progress * 100) + "%"), cx, by + bh + 22);

  // fila de assets visível: em celular "62%" sozinho não diz se está lento ou
  // travado — aqui aparece quantas imagens faltam e qual está pendurada
  if (!ready && LOAD.total) {
    const pend = Math.max(0, LOAD.total - LOAD.done);
    const extra = LOAD.retries ? "  (" + LOAD.retries + " repetidas)" : "";
    ctx.fillStyle = "rgba(154,143,192,0.75)";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillText("IMAGENS " + LOAD.done + "/" + LOAD.total +
      (pend ? "  •  " + pend + " na fila" + extra : ""), cx, by + bh + 40);
  }

  // A tela de erro usa fonte nativa: funciona mesmo se o atlas não carregar.
  ctx.fillStyle = loadError || stalled() ? "#efe9ff" : "rgba(154,143,192,0.5)";
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(loadError
    ? "Verifique a conexão e recarregue a página para tentar novamente."
    : (stalled()
      ? "A CONEXÃO TRAVOU • TOQUE NA TELA PARA RECARREGAR"
      : "Inspirado em Dead Cells • Colônia Eterna"), cx, VIEW_H - 20);

  // botão de recomeço (toque ou clique) — só quando realmente não dá mais
  if (loadError || stalled()) {
    const bw2 = 260, bh2 = 40, bx2 = cx - bw2 / 2, by2 = VIEW_H - 96;
    ctx.fillStyle = "rgba(255,77,90,0.16)";
    ctx.fillRect(bx2, by2, bw2, bh2);
    ctx.strokeStyle = "#ff4d5a"; ctx.lineWidth = 2;
    ctx.strokeRect(bx2 + 0.5, by2 + 0.5, bw2 - 1, bh2 - 1);
    ctx.fillStyle = "#ffd7db";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText("▶ TENTAR DE NOVO", cx, by2 + 25);
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
  const t0 = dbg ? performance.now() : 0;
  setLastDt(dt);
  update(dt);
  render(dt);
  endTick();
  if (dbg) dbg(ctx, dt, performance.now() - t0);
}

// MODO DEBUG: só com ?debug na URL. Import dinâmico — o jogo normal nunca
// baixa js/debug.js. Ver o cabeçalho de debug.js para os parâmetros.
let dbg = null;
const DEBUG_URL = typeof location !== "undefined" && /[?&]debug(?:[=&]|$)/.test(location.search || "");
async function installDebugMode() {
  try {
    const m = await import("./debug.js");
    m.installDebug();
    dbg = m.debugFrame;
  } catch (e) { console.error("modo debug falhou:", e); }
}

async function bootAll() {
  loadSave();
  await loadFonts();
  await loadAll((p) => { progress = p * 0.9; lastProgressAt = performance.now(); });
  await loadLoreHUD();
  phase = "ASSANDO PIXELS";
  await nextFrame();
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
  if (DEBUG_URL) await installDebugMode();
}

// primeira interação: destrava áudio
window.addEventListener("pointerdown", () => initAudio(), { once: true });
window.addEventListener("keydown", () => initAudio(), { once: true });

// Rede de segurança do MOBILE: se o carregamento morreu (falha ou conexão
// travada), o PRÓXIMO toque recarrega — sem teclado, "F5" não existe no celular.
// Um toque só por recarga, para nunca entrar em loop de reload.
let reloadArmed = false;
function armReload() {
  if (ready || reloadArmed) return;
  if (!loadError && !stalled()) return;
  reloadArmed = true;
  try { location.reload(); } catch (e) { /* sem location: testes headless */ }
}
window.addEventListener("pointerdown", armReload, { passive: true });
window.addEventListener("keydown", armReload, { passive: true });

bootAll().catch((error) => {
  // Não continuar com sprites/fontes ausentes nem deixar uma rejeição solta
  // e a barra de carregamento parada para sempre.
  ready = false;
  loadError = error instanceof Error ? error : new Error(String(error));
  console.error("Falha ao iniciar FUMIGA:", loadError);
  // a barra para de andar: avisa na tela que o toque serve para tentar de novo
  lastProgressAt = 0;
});
requestAnimationFrame(loop);
