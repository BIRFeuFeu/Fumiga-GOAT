// ============================================================================
// FUMIGA — renderização do mundo + menus (V2 Dead Cells dungeon + partículas)
// ============================================================================
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL } from "./config.js";
import { G } from "./state.js";
import { IMG, rotFrame, whiteRotFrame, bakeRot, bakeSheet, rotDrawSize, fogFrame, FOG_FRAMES } from "./assets.js";
import { world } from "./world.js";
import { cam, worldToScreen, visibleWorldRect, screenToWorld } from "./camera.js";
import { allies, eggs, insideCount } from "./units.js";
import { foes, boss } from "./enemies.js";
import { orbs, projectiles, drawProjectiles, drawOrbs } from "./combat.js";
import { drawDecals, drawTrails, drawParts, drawGlows, drawRings, drawFloats } from "./particles.js";
import { drawText, textWidth, lineWidth, FONT } from "./font.js";
import { clamp, TAU, lerp } from "./utils.js";
import { fogDraw, fogVisible } from "./fog.js";
import { SFX } from "./audio.js";
import { mouse } from "./input.js";
import { drawAllyAura } from "./lore_vfx.js";

let vignette = null;

function bakeVignette() {
  vignette = document.createElement("canvas");
  vignette.width = VIEW_W; vignette.height = VIEW_H;
  const c = vignette.getContext("2d");
  const g = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.36, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.82);
  g.addColorStop(0, "rgba(8,6,14,0)");
  g.addColorStop(0.75, "rgba(8,6,14,0.38)");
  g.addColorStop(1, "rgba(5,4,10,0.72)");
  c.fillStyle = g;
  c.fillRect(0, 0, VIEW_W, VIEW_H);
}

// versões brancas do ninho (flash de dano)
const NEST_WHITE = {};
function nestWhite(key) {
  if (NEST_WHITE[key]) return NEST_WHITE[key];
  const img = IMG[key];
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = "#fff";
  c.fillRect(0, 0, cv.width, cv.height);
  NEST_WHITE[key] = cv;
  return cv;
}

function nestKeyForFrac(frac) {
  if (frac > 0.66) return "nest";
  if (frac > 0.33) return "nest_d1";
  return "nest_d2";
}

// ===================================================================== RUN ==
/**
 * Núcleo do mundo lá fora: chão, recursos, adereços, formigas, o ninho,
 * inimigos, projéteis, partículas, atmosfera e névoa. Desenha com a câmera que
 * receber (w2s/vis/zoom) — é o mesmo código que pinta a tela cheia da
 * expedição (drawRun) e a janela "OLHO LÁ FORA" do formigueiro, que é como as
 * duas telas mostram a MESMA simulação rodando ao mesmo tempo.
 * box = retângulo de tela para os preenchimentos "de tela" (tint/céu).
 */
// pipMode: a janela "OLHO LÁ FORA" esconde os rótulos de texto do mundo (eles
// ficariam ilegíveis em 1/3 de escala e poluiriam a janelinha) — formas, barras
// e sprites continuam, então a leitura do que está acontecendo não se perde.
let pipMode = false;

function drawWorldCore(ctx, w2s, vis, zoom, box, dt) {
  const inView = (x, y, m) => x > vis.x0 - m && x < vis.x1 + m && y > vis.y0 - m && y < vis.y1 + m;
  const origin = w2s(0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world.ground, origin.x, origin.y, WORLD_W * zoom, WORLD_H * zoom);

  drawDecals(ctx, w2s);
  drawTrails(ctx, w2s);

  // ------------------------------------------------------ pilhas e recursos -
  for (const p of world.piles) {
    if (p.amount <= 0 || !inView(p.x, p.y, 60)) continue;
    const s = w2s(p.x, p.y);
    const scale = 0.55 + 0.65 * (p.amount / p.max);
    const sz = 56 * scale * zoom / 1.15;
    ctx.globalAlpha = 1;
    ctx.drawImage(p.sprite, s.x - sz / 2, s.y - sz * 0.42, sz, sz * 0.72);
    amountBar(ctx, s.x, s.y + 12, p.amount / p.max, "#ffb347");
  }
  for (const n of world.nodes) {
    if (n.amount <= 0 || !inView(n.x, n.y, 80)) continue;
    const s = w2s(n.x, n.y);
    if (n.kind !== "essence") continue;
    const pulse = 0.5 + Math.sin(G.time * 2.4 + n.glowT) * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(s.x, s.y - 8, 2, s.x, s.y - 8, 46 * zoom);
    rg.addColorStop(0, `rgba(138,107,222,${0.5 * pulse})`);
    rg.addColorStop(1, "rgba(138,107,222,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y - 8, 46 * zoom, 0, TAU); ctx.fill();
    ctx.restore();
    amountBar(ctx, s.x, s.y + 18, n.amount / n.max, "#c77dff");
  }

  // --------------------------------------------------------- lista de desenho
  const drawList = [];
  for (const p of world.props) {
    if (!inView(p.x, p.y, 240)) continue;
    drawList.push({ kind: "prop", y: p.y, ref: p });
  }
  for (const a of allies) {
    if (a.inside) continue;      // desceu pela boca: vive na tela de dentro
    if (inView(a.x, a.y, 60)) drawList.push({ kind: "ant", y: a.y, ref: a });
  }
  for (const f of foes) {
    if (f.isBoss || !inView(f.x, f.y, 60)) continue;
    if (f.revealT <= 0 && !fogVisible(f.x, f.y)) continue;
    drawList.push({ kind: "ant", y: f.y, ref: f });
  }
  drawList.sort((a, b) => a.y - b.y);

  // sombras e anéis — a formiga tem que se destacar do chão em qualquer zoom:
  // sombra em duas camadas (contato + dispersa) e anel de time sempre legível
  for (const d of drawList) {
    if (d.kind !== "ant") continue;
    const u = d.ref;
    const s = w2s(u.x, u.y);
    const z = zoom;
    // sombra dispersa
    ctx.fillStyle = "rgba(10,7,16,0.3)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, u.bodyR * 1.25 * z, u.bodyR * 0.55 * z, 0, 0, TAU);
    ctx.fill();
    // contato com o chão
    ctx.fillStyle = "rgba(8,5,12,0.62)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, u.bodyR * 0.88 * z, u.bodyR * 0.38 * z, 0, 0, TAU);
    ctx.fill();
    if (u.dead) continue;
    const ally = u.faction === "ally";
    ctx.strokeStyle = ally ? "rgba(55,230,200,0.7)" : "rgba(255,77,90,0.62)";
    ctx.lineWidth = Math.max(1, 1.5 * z);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, (u.bodyR + 2.5) * z, (u.bodyR + 2.5) * 0.52 * z, 0, 0, TAU);
    ctx.stroke();
    if (u.selected) {
      // anel de seleção: tracejado girando + halo (impossível perder de vista)
      const R = (u.bodyR + 6) * z;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,212,121,0.28)";
      ctx.lineWidth = Math.max(2, 4 * z);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 3 * z, R, R * 0.52, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = "#ffe9a8";
      ctx.lineWidth = Math.max(1, 1.8 * z);
      if (ctx.setLineDash) {
        ctx.setLineDash([5 * z, 4 * z]);
        ctx.lineDashOffset = -G.time * 26 * z;
      }
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 3 * z, R, R * 0.52, 0, 0, TAU);
      ctx.stroke();
      if (ctx.setLineDash) { ctx.setLineDash([]); ctx.lineDashOffset = 0; }
    }
  }

  const A = world.anthill;
  if (inView(A.x, A.y, 320)) {
    drawNest(ctx, w2s, A, !pipMode);
  }

  for (const d of drawList) {
    if (d.kind === "prop") drawProp(ctx, d.ref, w2s);
    else drawAnt(ctx, d.ref, w2s);
  }

  if (boss && inView(boss.x, boss.y, 220) && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) drawBoss(ctx, boss, w2s);

  drawProjectiles(ctx, w2s);
  drawOrbs(ctx, w2s, G.time);
  drawParts(ctx, w2s);
  drawGlows(ctx, w2s);
  drawRings(ctx, w2s, zoom);

  // atmosfera
  const tint = world.def ? world.def.tint : "#2a2140";
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = tint;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 1;

  const sky = ctx.createLinearGradient(box.x, box.y, box.x, box.y + 200);
  sky.addColorStop(0, "rgba(120,96,190,0.14)");
  sky.addColorStop(1, "rgba(120,96,190,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(box.x, box.y, box.w, 200);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const hs = w2s(A.x, A.y);
  if (inView(A.x, A.y, 480)) {
    const q2 = allies.queen;
    const low = q2 && !q2.dead && q2.hp < q2.maxHp * 0.3;
    const pulse = 0.75 + Math.sin(G.time * (low ? 4.5 : 1.6)) * 0.18;
    const rg = ctx.createRadialGradient(hs.x, hs.y, 10, hs.x, hs.y, 320 * zoom);
    rg.addColorStop(0, low ? `rgba(255,77,90,${0.34 * pulse})` : `rgba(255,169,71,${0.32 * pulse})`);
    rg.addColorStop(0.5, low ? `rgba(255,77,90,${0.12 * pulse})` : `rgba(255,122,61,${0.12 * pulse})`);
    rg.addColorStop(1, "rgba(255,122,61,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(hs.x, hs.y, 320 * zoom, 0, TAU); ctx.fill();
  }
  ctx.restore();

  fogDraw(ctx, origin.x, origin.y, zoom, G.time);
  if (!pipMode) drawFloats(ctx, drawText, w2s);
}

// ========================================================== OLHO LÁ FORA ====
// A janela do formigueiro: a MESMA simulação do mundo lá fora, vista por uma
// segunda câmera centrada na boca do ninho. Enquanto o jogador está no lado de
// dentro, é aqui que ele vê as ondas chegando, as formigas trabalhando e a
// fila entrando e saindo pela boca.
export const PIP = { w: 300, h: 170, zoom: 0.62 };

export function drawOutsideEye(ctx, x, y, w = PIP.w, h = PIP.h) {
  if (!world.def) return;
  const A = world.anthill;
  const z = PIP.zoom;
  const prevZoom = cam.zoom;
  cam.zoom = z;
  const ox = x + w / 2, oy = y + h / 2;
  const w2s = (wx, wy) => ({ x: ox + (wx - A.x) * z, y: oy + (wy - A.y) * z });
  const hw = (w / 2) / z, hh = (h / 2) / z;
  const vis = { x0: A.x - hw, y0: A.y - hh, x1: A.x + hw, y1: A.y + hh };

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#0d0a14";
  ctx.fillRect(x, y, w, h);
  pipMode = true;
  try {
    drawWorldCore(ctx, w2s, vis, z, { x, y, w, h }, 0);
  } finally {
    pipMode = false;
  }
  ctx.restore();
  cam.zoom = prevZoom;

  // moldura viva: vermelha quando a rainha está por um fio
  const q = allies.queen;
  const alarm = q && !q.dead && q.hp < q.maxHp * 0.3;
  ctx.strokeStyle = alarm ? "#ff4d5a" : "rgba(255,212,121,0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  const run = G.run;
  let outside = 0;
  for (const a of allies) if (!a.dead && !a.dying && !a.inside && a.type !== "queen") outside++;
  // faixa de título (em cima) e faixa de status (embaixo) — como uma janela
  ctx.fillStyle = "rgba(10,8,16,0.86)";
  ctx.fillRect(x, y, w, 15);
  ctx.fillRect(x, y + h - 14, w, 14);
  drawText(ctx, "OLHO LÁ FORA", x + 5, y + 2,
    { color: alarm ? "#ff8a96" : "#ffd479", scale: 0.8 });
  if (run) {
    drawText(ctx, "ONDA " + (run.wave || 0), x + w - 5, y + 2,
      { color: PAL.textDim, scale: 0.8, align: "right" });
  }
  drawText(ctx, "FORA " + outside, x + 5, y + h - 12,
    { color: "#8fd3ff", scale: 0.75 });
  drawText(ctx, "DENTRO " + insideCount(), x + w - 5, y + h - 12,
    { color: "#7fd6a0", scale: 0.75, align: "right" });
}

// ===================================================================== RUN ==
export function drawRun(ctx, dt) {
  if (!vignette) bakeVignette();
  const w2s = (x, y) => worldToScreen(x, y);
  const vis = visibleWorldRect(80);
  const box = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };

  // fundo (aparece fora dos limites do mundo)
  ctx.fillStyle = "#0d0a14";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  drawWorldCore(ctx, w2s, vis, cam.zoom, box, dt);

  // borda do mundo por cima (esconde a emenda do chão assado)
  const L = w2s(0, 0), R2 = w2s(WORLD_W, WORLD_H);
  ctx.fillStyle = "#0d0a14";
  if (L.x > 0) ctx.fillRect(0, 0, L.x, VIEW_H);
  if (L.y > 0) ctx.fillRect(0, 0, VIEW_W, L.y);
  if (R2.x < VIEW_W) ctx.fillRect(R2.x, 0, VIEW_W - R2.x, VIEW_H);
  if (R2.y < VIEW_H) ctx.fillRect(0, R2.y, VIEW_W, VIEW_H - R2.y);

  ctx.drawImage(vignette, 0, 0);

  const q = allies.queen;
  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    const p = (Math.sin(G.time * 4) * 0.5 + 0.5) * 0.22;
    ctx.fillStyle = `rgba(255,60,70,${p})`;
    ctx.fillRect(0, 0, VIEW_W, 6);
    ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
    ctx.fillRect(0, 0, 6, VIEW_H);
    ctx.fillRect(VIEW_W - 6, 0, 6, VIEW_H);
  }
}

function inView(vis, x, y, m) {
  return x > vis.x0 - m && x < vis.x1 + m && y > vis.y0 - m && y < vis.y1 + m;
}

function amountBar(ctx, sx, sy, frac, color) {
  const z = Math.max(0.6, cam.zoom * 0.55);
  const w = 26 * z;
  if (frac >= 0.999) return;
  ctx.fillStyle = "rgba(10,8,16,0.7)";
  ctx.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 4);
  ctx.fillStyle = color;
  ctx.fillRect(sx - w / 2, sy, w * clamp(frac, 0, 1), 2);
}

// -------------------------------------------------------------- formigueiro -
function drawNest(ctx, w2s, A, labels = true) {
  const q = allies.queen;
  const z = cam.zoom;
  const s = w2s(A.x, A.y);
  const frac = q ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  const key = (!q || q.dead) ? "nest_d2" : nestKeyForFrac(frac);

  ctx.fillStyle = "rgba(8,6,12,0.55)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 46 * z, 62 * z, 20 * z, 0, 0, TAU); ctx.fill();

  const alive = q && !q.dead;
  const breath = alive ? 1 + Math.sin(q.bob * 1.7) * 0.008 : 1;
  const img = (alive && q.flash > 0) ? nestWhite(key) : IMG[key];
  const W2 = 158 * z * breath, H2 = 158 * z * breath;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, s.x - W2 / 2, s.y - H2 / 2 + 8 * z, W2, H2);

  if (alive) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.5 + Math.sin(G.time * 2.2) * 0.25;
    const rg = ctx.createRadialGradient(s.x, s.y + 15 * z, 2, s.x, s.y + 15 * z, 30 * z);
    rg.addColorStop(0, `rgba(255,200,110,${0.55 * pulse})`);
    rg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y + 15 * z, 30 * z, 0, TAU); ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < eggs.length; i++) {
    const ang = (i / Math.max(1, eggs.length)) * TAU + G.time * 0.3;
    const ex = s.x + Math.cos(ang) * 26 * z;
    const ey = s.y + 15 * z + Math.sin(ang) * 12 * z;
    const egg = eggs[i];
    const efrac = 1 - egg.tLeft / egg.tTotal;
    ctx.fillStyle = "#201733";
    ctx.beginPath(); ctx.ellipse(ex, ey, 4.5 * z, 5.5 * z, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#ffd479";
    ctx.beginPath();
    ctx.ellipse(ex, ey + 5.5 * z - 11 * z * efrac, 3.2 * z, Math.max(1.2, 4 * efrac) * z, 0, 0, TAU);
    ctx.fill();
  }

  if (q && !q.dead) {
    const bw = 120 * z, frac2 = clamp(q.hp / q.maxHp, 0, 1);
    const bx = s.x - bw / 2, by = s.y - 78 * z;
    ctx.fillStyle = "rgba(10,8,16,0.8)";
    ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
    const grad = ctx.createLinearGradient(bx, by, bx, by + 5);
    grad.addColorStop(0, "#ffd479"); grad.addColorStop(1, "#ff7a3d");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw * frac2, 5);
    ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
    ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, 10);
    if (labels) drawText(ctx, "RAINHA", s.x, by - 18 * z, { scale: 1, color: frac2 < 0.3 ? "#ff4d5a" : "#ffb347", align: "center" });
  } else if (q && q.dead && labels) {
    drawText(ctx, "A COLÔNIA CAIU", s.x, s.y - 70 * z, { font: "big", scale: 1, color: "#ff4d5a", align: "center" });
  }
  if (q) q.flash = Math.max(0, q.flash - 0.016);
}

// -------------------------------------------------------------------- ant ---
function drawAnt(ctx, u, w2s) {
  const s = w2s(u.x, u.y);
  const z = cam.zoom;
  const key = u.def.sprite;
  const flashing = (u.hitT > 0 || (u.flash || 0) > 0);
  const frame = flashing ? whiteRotFrame(key, u.angle) : rotFrame(key, u.angle);
  const size = rotDrawSize(key) || frame.width;
  let dx = s.x, dy = s.y;

  const moving = Math.abs(u.vx) + Math.abs(u.vy) > 4;
  let squashX = 1, squashY = 1, lean = 0;
  // MERGULHO NA BOCA (rework do formigueiro): a formiga encolhe e afunda no
  // buraco central — é a animação de atravessar a porta do ninho.
  let doorFade = 1;
  if (u.doorT > 0) {
    const t = clamp(1 - u.doorT / 0.42, 0, 1);
    squashX = 1 - t * 0.72;
    squashY = 1 - t * 0.72;
    dy += t * 7 * z;
    doorFade = 1 - t * 0.92;
  } else if (u.dying) {
    const t = clamp(u.dying / 0.45, 0, 1);
    squashX = 1 + (1 - t) * 0.7;
    squashY = Math.max(0.15, t * 0.9);
  } else if (u.spawnT > 0) {
    // NASCER/BROTAR é o mergulho ao contrário: sobe do buraco crescendo e
    // aparecendo (mesma leitura da entrada, invertida) — ver doorT acima.
    const t = 1 - u.spawnT / 0.34;
    const e = 1 - Math.pow(1 - t, 3);
    squashX = 0.4 + 0.6 * e;
    squashY = 0.4 + 0.6 * e;
    dy -= (1 - e) * 7 * z;
    doorFade = 0.08 + 0.92 * e;
  } else if (moving) {
    const wob = Math.sin(u.bob * 2.2);
    squashX = 1 - wob * 0.07;
    squashY = 1 + wob * 0.07;
    lean = Math.sin(u.bob * 1.1) * 0.05;
  } else {
    const br = Math.sin(u.bob * 0.9 + u.id);
    squashY = 1 + br * 0.035;
    squashX = 1 - br * 0.02;
  }
  if (u.lunge > 0) {
    const f = (u.lunge / 0.22) * 7 * z * Math.max(1, u.bodyR / 12);
    dx += Math.cos(u.angle) * f;
    dy += Math.sin(u.angle) * f;
    squashY *= 1 + (u.lunge / 0.22) * 0.18;
  }
  if (u.type === "healer" && u.healTarget && !u.healTarget.dead) {
    dy -= (Math.sin(u.bob * 2) * 1.5 + 2) * z;
  }

  let alpha = doorFade;
  if (u.dying) alpha = clamp(u.dying / 0.3, 0, 1);

  const sc = z * squashY;
  const w = size * z * squashX, h = size * sc;
  // FASE 2: aura da casta por baixo do sprite (1 elipse, sem gradiente)
  if (!u.dead && u.faction === "ally") drawAllyAura(ctx, dx, dy, z, u.type, u.bodyR, G.time);
  // MANTO DA NÉVOA (camada de baixo): fog branca densa sob o corpo do inimigo.
  // Tamanho adaptado ao bodyR; some junto na morte (alpha). Substitui aura/olhos.
  if (!u.dead && u.faction !== "ally" && !u.isBoss) {
    const fPh = (((u.id % 100) + 100) % 100) / 100;
    const fIdx = Math.floor(G.time * 6 + fPh * FOG_FRAMES) % FOG_FRAMES;
    const under = fogFrame("fog_mantle", fIdx);
    if (under) {
      const uw = size * 1.45 * z, uh = uw * 0.78;
      ctx.save();
      ctx.translate(dx + Math.sin(G.time * 0.7 + fPh * 6.28) * 4 * z, dy + 4 * z);
      ctx.rotate(Math.sin(G.time * 0.5 + fPh * 6.28) * 0.25);
      ctx.globalAlpha = 0.95 * alpha;
      ctx.drawImage(under, -uw / 2, -uh / 2, uw, uh);
      ctx.restore();
    }
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(dx, dy);
  if (lean) ctx.rotate(lean);
  ctx.drawImage(frame, -w / 2, -h / 2 - size * 0.06 * z, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (u.dead) return;

  // MANTO DA NÉVOA (véu de cima): camada fina sobre o corpo, contrafase da
  // de baixo — o inimigo respira dentro da fog. Sem olhos: a Névoa não tem rosto.
  if (u.faction !== "ally" && !u.isBoss) {
    const fPh2 = (((u.id % 100) + 100) % 100) / 100;
    const over = fogFrame("fog_mantle", Math.floor(G.time * 6 + fPh2 * FOG_FRAMES + 3) % FOG_FRAMES);
    if (over) {
      const ow = size * 1.08 * z, oh = ow * 0.9;
      ctx.save();
      ctx.translate(dx + Math.cos(G.time * 0.6 + fPh2 * 6.28) * 3 * z, dy - 2 * z);
      ctx.rotate(-Math.sin(G.time * 0.5 + fPh2 * 6.28) * 0.2);
      ctx.globalAlpha = 0.42 * alpha;
      ctx.drawImage(over, -ow / 2, -oh / 2, ow, oh);
      ctx.restore();
    }
  }

  if (u.carry > 0 && u.carryKind) {
    ctx.fillStyle = u.carryKind === "essence" ? "#c77dff" : u.carryKind === "amber" ? "#ffd479" : "#ffb347";
    ctx.beginPath();
    ctx.arc(dx, dy - (u.bodyR + 10) * z, 3 * z, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,8,16,0.8)"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (u.hp < u.maxHp && u.maxHp > 0) {
    const w2 = (u.faction === "ally" ? 22 : 20) * z;
    const frac = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = "rgba(10,8,16,0.75)";
    ctx.fillRect(dx - w2 / 2 - 1, dy - (u.bodyR + 16) * z - 1, w2 + 2, 4);
    ctx.fillStyle = frac > 0.5 ? (u.faction === "ally" ? "#37e6c8" : "#ff4d5a") : frac > 0.25 ? "#ffb347" : "#ff4d5a";
    ctx.fillRect(dx - w2 / 2, dy - (u.bodyR + 16) * z, w2 * frac, 2);
  }
  if (u.stunT > 0) {
    const t = G.time * 6 + u.id;
    ctx.fillStyle = "#ffd479";
    for (let i = 0; i < 2; i++) {
      const a = t + i * Math.PI;
      ctx.fillRect(dx + Math.cos(a) * 8 * z - 1.5, dy - (u.bodyR + 20) * z + Math.sin(a) * 3 * z, 3, 3);
    }
  }
  if (u.burnT > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,110,40,0.18)";
    ctx.beginPath(); ctx.arc(dx, dy - 4 * z, (u.bodyR + 4) * z, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ------------------------------------------------------------------- prop ---
function drawProp(ctx, p, w2s) {
  const img = IMG[p.img];
  if (!img) return;
  const s = w2s(p.x, p.y);
  const z = cam.zoom;
  const w = img.width * p.scale * z, h = img.height * p.scale * z;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (p.flip) {
    ctx.translate(s.x, s.y);
    ctx.scale(-1, 1);
    ctx.translate(-s.x, -s.y);
  }
  let alpha = 1;
  if (p.node && p.node.amount <= 0) alpha = 0.3;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, s.x - w / 2, s.y - h + 8 * z, w, h);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ------------------------------------------------------------------- chefe --
const BOSS_ANIMS = {
  boar:  { px: 128, scale: 1.35, idle: ["boar_idle", 4], walk: ["boar_walk", 6], run: ["boar_run", 5], hurt: ["boar_hurt", 4], death: ["boar_death", 6] },
  fox:   { px: 112, scale: 1.35, idle: ["fox_idle", 4], walk: ["fox_walk", 6], run: ["fox_run", 6], hurt: ["fox_hurt", 4], death: ["fox_death", 6] },
  hare:  { px: 104, scale: 1.3, idle: ["hare_idle", 4], walk: ["hare_walk", 5], run: ["hare_run", 6], hurt: ["hare_hurt", 4], death: ["hare_death", 6] },
  deer:  { px: 134, scale: 1.35, idle: ["deer_idle", 4], walk: ["deer_walk", 6], run: ["deer_run", 6], hurt: ["deer_hurt", 4], death: ["deer_death", 7] },
  grouse:{ px: 122, scale: 1.3, idle: ["grouse_idle", 4], walk: ["grouse_walk", 6], run: ["grouse_flight", 6], hurt: ["grouse_hurt", 4], death: ["grouse_death", 6] },
};
let sheetsBaked = false;

export function bossAnimSheets() {
  const out = new Set();
  for (const k of Object.keys(BOSS_ANIMS)) {
    const A2 = BOSS_ANIMS[k];
    for (const anim of ["idle", "walk", "run", "hurt", "death"]) out.add(A2[anim][0]);
  }
  return [...out];
}

export function bakeBossSheets() {
  if (sheetsBaked) return;
  for (const k of Object.keys(BOSS_ANIMS)) {
    const A2 = BOSS_ANIMS[k];
    for (const anim of ["idle", "walk", "run", "hurt", "death"]) {
      bakeSheet(A2[anim][0], A2[anim][1], A2.px);
    }
  }
  sheetsBaked = true;
}

function drawBoss(ctx, b, w2s) {
  if (!sheetsBaked) bakeBossSheets();
  const s = w2s(b.x, b.y);
  const z = cam.zoom;

  const shW = b.kind === "matriarch" ? 52 : 46;
  ctx.fillStyle = "rgba(10,7,16,0.6)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 34 * z, shW * z, 16 * z, 0, 0, TAU); ctx.fill();

  // MANTO DA NÉVOA (chefe, camada de baixo): maior e mais denso que o dos
  // inimigos comuns. Some junto na morte.
  {
    const bfPh = (b.kind.charCodeAt(0) % 100) / 100;
    const bUnder = fogFrame("fog_mantle", Math.floor(G.time * 4 + bfPh * FOG_FRAMES) % FOG_FRAMES);
    if (bUnder) {
      const buw = (b.bodyR * 2 * 2.2 + 40) * z, buh = buw * 0.75;
      const bAlpha = b.dying ? clamp(b.dying / 1.2, 0, 1) : 1;
      ctx.save();
      ctx.translate(s.x + Math.sin(G.time * 0.5 + bfPh * 6.28) * 6 * z, s.y + 10 * z);
      ctx.rotate(Math.sin(G.time * 0.4 + bfPh * 6.28) * 0.2);
      ctx.globalAlpha = Math.min(1, (b.phase2 ? 1 : 0.95) * bAlpha);
      ctx.drawImage(bUnder, -buw / 2, -buh / 2, buw, buh);
      ctx.restore();
    }
  }

  if (b.def.rotMode) {
    const key = b.def.sprite;
    const frame = b.hitT > 0 ? whiteRotFrame(key, b.angle) : rotFrame(key, b.angle);
    const breathe = 1 + Math.sin(b.animT * 2.2) * 0.03;
    const w = 112 * z * breathe, h = 112 * z * breathe;
    let alpha = 1;
    if (b.dying) {
      alpha = clamp(b.dying / 1.2, 0, 1);
      ctx.globalAlpha = alpha;
    }
    ctx.drawImage(frame, s.x - w / 2, s.y - h / 2 - 12 * z + Math.sin(b.animT * 3) * 2 * z, w, h);
    ctx.globalAlpha = 1;
    if (b.atkT < 0.4 && !b.dying) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(200,107,255,${0.35 - b.atkT * 0.6})`;
      const hx = s.x + Math.cos(b.angle) * 40 * z, hy = s.y + Math.sin(b.angle) * 40 * z - 12 * z;
      ctx.beginPath(); ctx.arc(hx, hy, 12 * z, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // MANTO DA NÉVOA (matriarca, véu de cima): contrafase da camada de baixo.
    {
      const bfPh = (b.kind.charCodeAt(0) % 100) / 100;
      const bOver = fogFrame("fog_mantle", Math.floor(G.time * 4 + bfPh * FOG_FRAMES + 3) % FOG_FRAMES);
      if (bOver) {
        const bow = (b.bodyR * 2 * 1.5 + 20) * z, boh = bow * 0.85;
        const bAlpha = b.dying ? clamp(b.dying / 1.2, 0, 1) : 1;
        ctx.save();
        ctx.translate(s.x + Math.cos(G.time * 0.6 + bfPh * 6.28) * 5 * z, s.y - 4 * z);
        ctx.globalAlpha = (b.phase2 ? 0.55 : 0.45) * bAlpha;
        ctx.drawImage(bOver, -bow / 2, -boh / 2, bow, boh);
        ctx.restore();
      }
    }
    return;
  }

  const A2 = BOSS_ANIMS[b.kind];
  if (!A2) return;
  let anim = "idle", fps = 9, holdLast = false;
  const moving = Math.abs(b.vx) + Math.abs(b.vy) > 20;
  if (b.dying) { anim = "death"; fps = 5; holdLast = true; }
  else if (b.sub === "dash" || b.sub === "charge") { anim = "run"; fps = 14; }
  else if (b.sub === "aim" || b.sub === "recover" || b.sub === "thumpAim" ||
           b.sub === "shriekAim" || b.sub === "sweepAim" || b.sub === "chargeAim") { anim = "hurt"; fps = 5; holdLast = true; }
  else if (moving) { anim = (b.kind === "grouse" && b.special < 2) || b.special < 2 ? "run" : "walk"; fps = 10; }
  else anim = "idle";

  const sheet = bakeSheet(A2[anim][0], A2[anim][1], A2.px);
  const rowFrames = sheet.rows[b.dir] || sheet.rows[0];
  let fidx = Math.floor(b.animT * fps) % rowFrames.length;
  if (holdLast && b.dying) {
    fidx = Math.min(rowFrames.length - 1, Math.floor((2.2 - b.dying) * fps));
  }
  const fr = rowFrames[fidx];
  const wfr = b.hitT > 0 ? sheet.white[b.dir][fidx] : fr;

  const fw = fr.width * z * A2.scale, fh = fr.height * z * A2.scale;
  let lift = 0;
  if (b.kind === "hare" && (b.sub === "dash" || b.sub === "aim")) {
    lift = Math.abs(Math.sin(b.animT * 9)) * 8 * z;
  } else if (b.kind === "grouse" && b.sub === "dash") {
    lift = (12 + Math.sin(b.animT * 30) * 4) * z;
  } else if (b.kind === "boar" && b.sub === "slamAim") {
    lift = Math.sin((0.62 - b.t) / 0.62 * Math.PI) * 40 * z;
  }
  ctx.drawImage(wfr, s.x - fw / 2, s.y - fh + 40 * z - lift, fw, fh);

  // MANTO DA NÉVOA (chefe, véu de cima): contrafase da camada de baixo.
  {
    const bfPh = (b.kind.charCodeAt(0) % 100) / 100;
    const bOver = fogFrame("fog_mantle", Math.floor(G.time * 4 + bfPh * FOG_FRAMES + 3) % FOG_FRAMES);
    if (bOver) {
      const bow = (b.bodyR * 2 * 1.5 + 20) * z, boh = bow * 0.85;
      const bAlpha = b.dying ? clamp(b.dying / 1.2, 0, 1) : 1;
      ctx.save();
      ctx.translate(s.x + Math.cos(G.time * 0.6 + bfPh * 6.28) * 5 * z, s.y - 4 * z);
      ctx.globalAlpha = (b.phase2 ? 0.55 : 0.45) * bAlpha;
      ctx.drawImage(bOver, -bow / 2, -boh / 2, bow, boh);
      ctx.restore();
    }
  }

  if ((b.kind === "fox" || b.kind === "grouse") && b.sub === "aim") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,77,90,${0.25 + Math.sin(G.time * 20) * 0.15})`;
    ctx.beginPath(); ctx.arc(s.x, s.y - 20 * z, 42 * z, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // FASE2: manto adensado (as 2 camadas já sobem de alfa) + névoa subindo +
  // coroa fungo/seda nos bosses. A elipse pálida antiga foi removida.
  if (b.phase2) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#e8f4ff";
    // névoa subindo
    ctx.globalAlpha = 0.35;
    for (let i=0;i<3;i++) {
      ctx.beginPath();
      ctx.arc(s.x + Math.sin(G.time*0.8+i)*12*z, s.y - (20+i*12)*z, (4+i*2)*z, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    // coroa fungo/seda no boss (não humanoide)
    ctx.fillStyle = "#ffd479";
    ctx.globalAlpha = 0.85;
    for (let i=-1;i<=1;i++) {
      const cx = s.x + i*10*z;
      const cy = s.y - (b.bodyR+18)*z + Math.abs(i)*2*z;
      ctx.fillRect(cx-1*z, cy, 2*z, 5*z);
      ctx.beginPath(); ctx.arc(cx, cy, 3.2*z, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // fox invisível
  if (b.kind === "fox" && b.invisibleT > 0) {
    ctx.fillStyle = "rgba(143,123,181,0.22)";
    ctx.fillRect(s.x - 60*z, s.y - 60*z, 120*z, 80*z);
  }
}

// ================================================================= TÍTULO ===
// Fundo híbrido: Dead Cells gótico + Planície do Amanhecer com ciclo dia/noite + parallax
// Escolha do usuário: manter gótico mas com planície viva mostrando formigueiro
let titleBg = null;
let preTitleBg = null;
let titleMotes = [];
let titlePollen = []; // Celeste style - caindo
let titleSnow = []; // FASE 3 - neve Celeste parallax lenta
let titleAnts = []; // formigas andando no menu
let titleFireflies = []; // FASE 1 FINAL - vaga-lumes azul+amarelo voando baixo
let titleEssence = []; // FASE 1 FINAL - partículas essência subindo do formigueiro
let torchFlicker = 0;
let dayPhase = 0;

// Os PNGs do TITLE têm +128 px pintados por lado e são desenhados em 1:1.
// Com o movimento 3x, a frente precisa de mais 72 px nas laterais e 24 px
// abaixo; o solo, de mais 12 px. As montanhas precisam continuar atrás do
// gramado, sem a linha reta onde termina o PNG. Estendemos essas bordas uma
// vez no primeiro desenho: arte central intacta, sem resize por frame.
const TITLE_SIDE_PAD = 128;
const TITLE_PARALLAX_GAIN = 3;
const TITLE_MTN_BOTTOM_GUARD = 208;
const TITLE_MAIN_BOTTOM_GUARD = 12;
const TITLE_FRONT_SIDE_GUARD = 72;
const TITLE_FRONT_BOTTOM_GUARD = 24;
const titleLayerGuards = { mountains: null, main: null, foreground: null };
let titleMainOffsetX = 0, titleMainOffsetY = 0;

function guardedTitleLayer(key, source, side, bottom) {
  const cached = titleLayerGuards[key];
  if (cached && cached.source === source) return cached.canvas;
  const cv = document.createElement("canvas");
  cv.width = source.width + side * 2;
  cv.height = source.height + bottom;
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(source, side, 0);
  if (side) {
    c.save();
    c.translate(side, 0); c.scale(-1, 1);
    c.drawImage(source, 0, 0, side, source.height, 0, 0, side, source.height);
    c.restore();
    c.save();
    c.translate(source.width + side, 0); c.scale(-1, 1);
    c.drawImage(source, source.width - side, 0, side, source.height, -side, 0, side, source.height);
    c.restore();
  }
  if (key === "mountains") {
    // A última linha do PNG é quase toda transparente. A anterior é solo
    // escuro e opaco: prolongá-la até atrás do gramado elimina o corte reto.
    c.drawImage(source, 0, source.height - 2, source.width, 1,
      side, source.height - 2, source.width, bottom + 2);
  } else if (bottom) {
    c.save();
    c.translate(0, source.height); c.scale(1, -1);
    c.drawImage(cv, 0, source.height - bottom, cv.width, bottom,
      0, -bottom, cv.width, bottom);
    c.restore();
  }
  titleLayerGuards[key] = { source, canvas: cv };
  return cv;
}

function ensureMotes() {
  if (titleMotes.length) return;
  // motes subindo (Dead Cells)
  for (let i = 0; i < 40; i++) {
    titleMotes.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 18 - 4,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
      col: Math.random() < 0.5 ? "#c77dff" : Math.random() < 0.7 ? "#37e6c8" : "#ffd479",
      phase: Math.random() * TAU,
    });
  }
  // FASE 3 - Celeste: pollen caindo lenta + snow/parallax (style pollen do bioma)
  for (let i = 0; i < 45; i++) {
    titlePollen.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 8 + 3, // lenta: 3-11px/s (antes 6-18)
      size: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.5 + 0.2,
      col: Math.random() < 0.4 ? "#fff6c8" : Math.random() < 0.7 ? "#ffd479" : "#bfffa8",
      phase: Math.random() * TAU,
      sway: Math.random() * 1.5 + 0.3,
    });
  }
  // FASE 3 FINAL - neve Celeste: flakes caindo com sway maior, parallax lenta, brilho
  for (let i = 0; i < 18; i++) {
    titleSnow.push({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 14 + 8, // 8-22 px/s mais lenta que pollen mas com sway
      size: Math.random() * 2.2 + 1.0,
      alpha: Math.random() * 0.4 + 0.15,
      col: Math.random() < 0.6 ? "#e8f4ff" : "#c8e6ff",
      phase: Math.random() * TAU,
      sway: 1.2 + Math.random() * 2.5, // sway maior que pollen
      rot: Math.random() * TAU,
      rotSpeed: (Math.random() - 0.5) * 0.8,
    });
  }
  // formigas andando no menu (Castle Crashers vivo)
  for (let i = 0; i < 6; i++) {
    titleAnts.push({
      x: Math.random() * VIEW_W,
      y: VIEW_H - 40 - Math.random() * 80,
      vx: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 22),
      bob: Math.random() * TAU,
      type: Math.random() < 0.5 ? "worker" : Math.random() < 0.7 ? "soldier" : "scout",
    });
  }
  // FASE 1 FINAL - vaga-lumes azul #37e6c8 + amarelo #ffd479 voando baixo sobre gramado (escolha azul_amarelo)
  for (let i = 0; i < 10; i++) {
    const isBlue = i % 2 === 0;
    titleFireflies.push({
      x: 120 + Math.random() * (VIEW_W - 240),
      y: 300 + Math.random() * 120, // baixo sobre gramado 300-420
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 10,
      size: 1.5 + Math.random() * 2.2,
      alpha: 0.5 + Math.random() * 0.5,
      col: isBlue ? "#37e6c8" : "#ffd479",
      phase: Math.random() * TAU,
      sway: 0.6 + Math.random() * 1.2,
      blinkSpeed: 1.2 + Math.random() * 2.0,
    });
  }
  // FASE 1 FINAL - partículas essência subindo do formigueiro central (escolha particulas)
  for (let i = 0; i < 12; i++) {
    titleEssence.push({
      x: VIEW_W * 0.71 + (Math.random() - 0.5) * 30,
      y: VIEW_H * 0.67 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 8,
      vy: - (12 + Math.random() * 18),
      size: 0.8 + Math.random() * 1.6,
      alpha: 0.3 + Math.random() * 0.5,
      col: Math.random() < 0.5 ? "#c77dff" : Math.random() < 0.75 ? "#ffd479" : "#37e6c8",
      phase: Math.random() * TAU,
      life: Math.random(),
    });
  }
}

/** Partículas híbridas: motes subindo (Dead Cells) + pollen caindo (Celeste) + formigas + FASE 1 FINAL: vaga-lumes + essência */
export function drawTitleMotes(ctx, time) {
  ensureMotes();
  torchFlicker = Math.sin(time * 7) * 0.15 + Math.sin(time * 3.2) * 0.1;
  dayPhase = (time * 0.016666) % 1; // FASE 1 FINAL: ciclo dia/noite 60s exatos (escolha tint_forte)
  // Criaturas sobre o chão e essência nascem na camada do formigueiro; clima
  // (motes, pólen, neve) continua em coordenadas de tela. Outros menus não
  // herdam o deslocamento do último frame do TITLE.
  const groundX = G.screen === "TITLE" ? titleMainOffsetX : 0;
  const groundY = G.screen === "TITLE" ? titleMainOffsetY : 0;

  // motes subindo
  for (const m of titleMotes) {
    m.x += m.vx * 0.016;
    m.y += m.vy * 0.016;
    if (m.y < -10) { m.y = VIEW_H + 10; m.x = Math.random() * VIEW_W; }
    if (m.x < -10) m.x = VIEW_W + 10;
    if (m.x > VIEW_W + 10) m.x = -10;
    const a = m.alpha * (0.5 + 0.5 * Math.sin(time * 1.7 + m.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = m.col;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.25;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.size * 2.5, 0, TAU); ctx.fill();
  }
  // pollen caindo estilo Celeste
  for (const p of titlePollen) {
    p.x += (p.vx + Math.sin(time * p.sway + p.phase) * 3) * 0.016;
    p.y += p.vy * 0.016;
    if (p.y > VIEW_H + 10) { p.y = -10; p.x = Math.random() * VIEW_W; }
    if (p.x < -20) p.x = VIEW_W + 20;
    if (p.x > VIEW_W + 20) p.x = -20;
    const a = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.8 + p.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  // FASE 3 FINAL - neve Celeste parallax: flakes com sway maior, rotação, brilho
  for (const s of titleSnow) {
    s.x += (s.vx + Math.sin(time * s.sway + s.phase) * 5) * 0.016;
    s.y += s.vy * 0.016;
    s.rot += s.rotSpeed * 0.016;
    if (s.y > VIEW_H + 12) { s.y = -12; s.x = Math.random() * VIEW_W; }
    if (s.x < -24) s.x = VIEW_W + 24;
    if (s.x > VIEW_W + 24) s.x = -24;
    const a = s.alpha * (0.5 + 0.5 * Math.sin(time * 0.6 + s.phase));
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fillStyle = s.col;
    // floco em cruz (Celeste style)
    ctx.fillRect(-s.size, -0.5, s.size*2, 1);
    ctx.fillRect(-0.5, -s.size, 1, s.size*2);
    ctx.globalAlpha = a * 0.4;
    ctx.beginPath(); ctx.arc(0,0,s.size*1.4,0,TAU); ctx.fill();
    ctx.restore();
  }
  // FASE 1 FINAL - vaga-lumes azul+amarelo voando baixo sobre gramado (escolha azul_amarelo)
  for (const f of titleFireflies) {
    f.x += (f.vx + Math.sin(time * f.sway + f.phase) * 6) * 0.016;
    f.y += (f.vy + Math.cos(time * f.sway * 0.7 + f.phase) * 4) * 0.016;
    if (f.y < 280) { f.y = 280; f.vy = Math.abs(f.vy); }
    if (f.y > 440) { f.y = 440; f.vy = -Math.abs(f.vy); }
    if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx); }
    if (f.x > VIEW_W - 60) { f.x = VIEW_W - 60; f.vx = -Math.abs(f.vx); }
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(time * f.blinkSpeed + f.phase));
    const a = f.alpha * blink;
    const fx = f.x + groundX, fy = f.y + groundY;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(fx, fy, f.size, 0, TAU); ctx.fill();
    // glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.35;
    ctx.beginPath(); ctx.arc(fx, fy, f.size * 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // FASE 1 FINAL - partículas essência subindo do formigueiro (escolha particulas) - luz pulsando
  for (const e of titleEssence) {
    e.x += e.vx * 0.016;
    e.y += e.vy * 0.016;
    e.life += 0.016 * 0.3;
    if (e.y < VIEW_H * 0.35 || e.life > 1) {
      e.x = VIEW_W * 0.71 + (Math.random() - 0.5) * 30;
      e.y = VIEW_H * 0.67 + Math.random() * 20;
      e.vx = (Math.random() - 0.5) * 8;
      e.vy = - (12 + Math.random() * 18);
      e.life = 0;
    }
    const a = e.alpha * (1 - e.life) * (0.6 + 0.4 * Math.sin(time * 2 + e.phase));
    const ex = e.x + groundX, ey = e.y + groundY;
    ctx.globalAlpha = a;
    ctx.fillStyle = e.col;
    ctx.beginPath(); ctx.arc(ex, ey, e.size, 0, TAU); ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.4;
    ctx.beginPath(); ctx.arc(ex, ey, e.size * 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // formigas andando no chão do menu
  for (const ant of titleAnts) {
    ant.x += ant.vx * 0.016;
    ant.bob += 0.016 * 5;
    if (ant.x < -20 && ant.vx < 0) { ant.x = VIEW_W + 20; ant.vx = Math.abs(ant.vx); }
    if (ant.x > VIEW_W + 20 && ant.vx > 0) { ant.x = -20; ant.vx = -Math.abs(ant.vx); }
    const ax = ant.x + groundX, ay = ant.y + groundY;
    const bobY = Math.sin(ant.bob) * 1.5;
    ctx.globalAlpha = 0.7;
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(ax, ay + 4, 6, 2.5, 0, 0, TAU); ctx.fill();
    // corpo simplificado
    const col = ant.type === "worker" ? "#37e6c8" : ant.type === "soldier" ? "#8fd3ff" : "#ffd479";
    ctx.fillStyle = col;
    ctx.fillRect(ax - 3, ay + bobY - 2, 6, 3);
    ctx.fillStyle = "#efe9ff";
    ctx.fillRect(ax + (ant.vx > 0 ? 2 : -3), ay + bobY - 1, 2, 2);
    // rastro de feromônio
    if (Math.floor(time * 10 + ant.x) % 20 === 0) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#37e6c8";
      ctx.fillRect(ax, ay + 2, 2, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// =========================================================================
// FUNDO TÍTULO - PARALLAX 4 CAMADAS EXCLUSIVO NO MENU INICIAL (TITLE)
// Céu 0.03x, montanhas 0.09x, cenário 0.24x, vinhas 0.45x (3x o
// deslocamento anterior). A oscilação ociosa também tem amplitude 3x;
// tempos, ciclo dia/noite, escala dos PNGs e UI permanecem inalterados.
export function drawTitleBg(ctx) {
  const time = G.time;
  dayPhase = (time * 0.016666) % 1; // FASE 1 FINAL: 60s exatos (escolha tint_forte + 4 camadas)
  ensureMotes();
  titleMainOffsetX = titleMainOffsetY = 0;

  const hasParallax = IMG.parallax_sky && IMG.parallax_main && IMG.parallax_mountains && IMG.parallax_foreground;
  
  if (hasParallax) {
    // Mouse limitado à tela; o ganho incide sobre a posição E sobre a oscilação.
    const mx = Math.max(0, Math.min(VIEW_W, mouse?.x ?? VIEW_W/2));
    const my = Math.max(0, Math.min(VIEW_H, mouse?.y ?? VIEW_H/2));
    const offsetX = mx - VIEW_W/2;
    const offsetY = my - VIEW_H/2;
    
    ctx.imageSmoothingEnabled = false;

    // ----- CAMADA 4: Céu laranja pôr-do-sol + lua minguante + nuvens -----
    const skyImg = IMG.parallax_sky;
    const skyOffX = TITLE_PARALLAX_GAIN * (offsetX * 0.01 + Math.sin(time * 0.008) * 6);
    const skyOffY = TITLE_PARALLAX_GAIN * (offsetY * 0.005 + Math.sin(time * 0.005) * 2);
    ctx.drawImage(skyImg, skyOffX - 40 - TITLE_SIDE_PAD, skyOffY - 20);

    // ----- CAMADA 3: Montanhas (crista nativa 335 px, base prolongada) -----
    const mtnImg = guardedTitleLayer("mountains", IMG.parallax_mountains, 0, TITLE_MTN_BOTTOM_GUARD);
    const mtnOffX = TITLE_PARALLAX_GAIN * (offsetX * 0.03 + Math.sin(time * 0.012) * 8);
    const mtnOffY = 20 + TITLE_PARALLAX_GAIN * (offsetY * 0.01 + Math.sin(time * 0.01) * 3);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(mtnImg, mtnOffX - 50 - TITLE_SIDE_PAD, mtnOffY);
    ctx.globalAlpha = 1;

    // ----- CAMADA 2: Gramado, ruínas e formigueiro -----
    const mainImg = guardedTitleLayer("main", IMG.parallax_main, 0, TITLE_MAIN_BOTTOM_GUARD);
    const mainOffX = TITLE_PARALLAX_GAIN * (offsetX * 0.08 + Math.sin(time * 0.015) * 6);
    const mainOffY = 10 + TITLE_PARALLAX_GAIN * (offsetY * 0.025 + Math.cos(time * 0.012) * 2);
    titleMainOffsetX = mainOffX;
    titleMainOffsetY = mainOffY - 10;
    ctx.drawImage(mainImg, mainOffX - 30 - TITLE_SIDE_PAD, mainOffY);

    // FASE 1 FINAL - luz formigueiro pulsante com partículas (escolha particulas) - sem tochas, só cristais
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // luz pulsante amarela quente na entrada do formigueiro
    const pulse = 0.75 + Math.sin(time * 1.6) * 0.22;
    // A luz fica presa à boca do formigueiro, sem atrasar 70% atrás da arte.
    const anthillFx = VIEW_W * 0.71 + titleMainOffsetX;
    const anthillFy = VIEW_H * 0.67 + titleMainOffsetY;
    const rg = ctx.createRadialGradient(anthillFx, anthillFy, 2, anthillFx, anthillFy, 52);
    rg.addColorStop(0, `rgba(255,212,121,${0.22 * pulse})`);
    rg.addColorStop(0.4, `rgba(255,160,60,${0.12 * pulse})`);
    rg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(anthillFx, anthillFy, 52, 0, TAU); ctx.fill();
    // segundo anel maior sutil
    const rg2 = ctx.createRadialGradient(anthillFx, anthillFy, 10, anthillFx, anthillFy, 90);
    rg2.addColorStop(0, `rgba(199,125,255,${0.08 * pulse})`);
    rg2.addColorStop(1, "rgba(199,125,255,0)");
    ctx.fillStyle = rg2;
    ctx.beginPath(); ctx.arc(anthillFx, anthillFy, 90, 0, TAU); ctx.fill();
    ctx.restore();

    // ----- CAMADA 1: Vinhas transparentes, na frente de todo o cenário -----
    const fgImg = guardedTitleLayer("foreground", IMG.parallax_foreground,
      TITLE_FRONT_SIDE_GUARD, TITLE_FRONT_BOTTOM_GUARD);
    const fgOffX = TITLE_PARALLAX_GAIN * (offsetX * 0.15 + Math.sin(time * 0.02) * 4);
    const fgOffY = TITLE_PARALLAX_GAIN * offsetY * 0.04;
    ctx.drawImage(fgImg, fgOffX - 40 - TITLE_SIDE_PAD - TITLE_FRONT_SIDE_GUARD, fgOffY);

    // FASE 1 FINAL - ciclo dia/noite 60s tint FORTE (escolha tint_forte): dia laranja quente / noite azul escuro 0.75 + estrelas
    const dp = (time * 0.016666) % 1; // 60s exatos
    const isDay = Math.sin(dp * TAU);
    const dayT = (isDay * 0.5 + 0.5);
    if (dayT < 0.45) {
      // noite FORTE - azul escuro 0.75 max + estrelas piscando
      const nightAlpha = (0.45 - dayT) * 1.65; // 0.45*1.65=0.7425 max ~0.75
      ctx.fillStyle = `rgba(8,10,28,${nightAlpha})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // estrelas mais visíveis na noite forte
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 24; i++) {
        const sx = (i * 137.5 + time * 2.5) % VIEW_W;
        const sy = (i * 73.3) % 110 + 4;
        const tw = 0.35 + Math.sin(time * 2.2 + i * 1.3) * 0.35;
        ctx.globalAlpha = tw * (0.45 - dayT) * 2.2;
        const sz = i % 3 === 0 ? 2.2 : 1.6;
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
    } else if (dayT > 0.72) {
      // dia FORTE - laranja quente fim de tarde
      const dayAlpha = (dayT - 0.72) * 0.38; // max 0.28*0.38=0.106
      ctx.fillStyle = `rgba(255,156,58,${dayAlpha})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // brilho extra no horizonte
      const hg = ctx.createLinearGradient(0, VIEW_H * 0.5, 0, VIEW_H * 0.75);
      hg.addColorStop(0, `rgba(255,180,80,0)`);
      hg.addColorStop(1, `rgba(255,140,40,${dayAlpha * 0.6})`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, VIEW_H * 0.5, VIEW_W, VIEW_H * 0.25);
    }

    // acessibilidade highContrast - borda mais forte sobre parallax high-res
    if (G.save.accessibility.highContrast) {
      ctx.strokeStyle = "rgba(239,233,255,0.32)";
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3);
      ctx.strokeStyle = "rgba(199,125,255,0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(4.5, 4.5, VIEW_W - 9, VIEW_H - 9);
    }

    // vinheta gótica Dead Cells por cima de tudo
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 0.28, VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 1.25);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.65, "rgba(0,0,0,0.14)");
    vg.addColorStop(1, "rgba(0,0,0,0.52)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    return;
  }

  // fallback procedural caso imagens não carregadas - planície viva gótica
  const isDay = Math.sin(dayPhase * TAU);
  const dayT = (isDay * 0.5 + 0.5);
  if (!titleBg) bakeTitleBg();
  
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 280);
  if (dayT > 0.5) {
    skyGrad.addColorStop(0, lerpColor("#6db7ff", "#151122", 1-dayT));
    skyGrad.addColorStop(0.3, lerpColor("#8fd3ff", "#1a1430", 1-dayT));
    skyGrad.addColorStop(0.6, lerpColor("#ffd479", "#2a2340", 1-dayT));
    skyGrad.addColorStop(1, lerpColor("#ffb347", "#0f0c1a", 1-dayT));
  } else {
    skyGrad.addColorStop(0, "#0a0812");
    skyGrad.addColorStop(0.4, "#151122");
    skyGrad.addColorStop(0.7, "#1e1a30");
    skyGrad.addColorStop(1, "#0f0c1a");
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.drawImage(titleBg, 0, 0);

  const vg2 = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 0.3, VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 1.2);
  vg2.addColorStop(0, "rgba(0,0,0,0)");
  vg2.addColorStop(0.7, "rgba(0,0,0,0.15)");
  vg2.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg2;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// FUNDO SÓLIDO GÓTICO PARA OUTROS MENUS (MODE, OPTIONS, HELP) - sem parallax
export function drawSolidMenuBg(ctx, tint = "#0a0812") {
  if (!titleBg) bakeTitleBg();
  // fundo escuro Dead Cells
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 0.35;
  ctx.drawImage(titleBg, 0, 0);
  ctx.globalAlpha = 1;
  // vinheta
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 0.3, VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 1.2);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.7, "rgba(0,0,0,0.25)");
  vg.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // highContrast
  if (G.save.accessibility.highContrast) {
    ctx.strokeStyle = "rgba(239,233,255,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, VIEW_W - 2, VIEW_H - 2);
  }
}

function lerpColor(a, b, t) {
  // a,b = #rrggbb, t 0..1
  const ar = parseInt(a.slice(1,3),16), ag=parseInt(a.slice(3,5),16), ab=parseInt(a.slice(5,7),16);
  const br = parseInt(b.slice(1,3),16), bg=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16);
  const r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg-ag)*t), bl = Math.round(ab + (bb-ab)*t);
  return `rgb(${r},${g},${bl})`;
}

// ------------------------------------------------------------------ logo ---
// FASE 2 FINAL - Pixel Gigante 5x Escala Respirando
// Spec: drawTitleLogo() escala 4.2 -> 5.0 + sin(time*0.6)*0.08 (pixel gigante que respira)
// Mantém metal dourado + varredura a cada 4.6s
// 1. sombra projetada, 2. contorno preto duro 2px, 3. gradiente faixas ouro/âmbar/bronze, 4. brilho varrendo letras + glow pulsante + sparkle
export function drawTitleLogo(ctx, time, x = 56, y = 54, scale = 5.0) {
  // FASE 2 FINAL: escala 5.0 + sin(time*0.6)*0.08 respirando (pixel gigante) + micro 0.02
  const breathing = Math.sin(time * 0.6) * 0.08;
  const secondary = Math.sin(time * 1.2) * 0.02;
  scale = scale + breathing + secondary;
  const str = "FUMIGA";
  const h = FONT.big.ch * scale;
  const w = lineWidth(str.length, { font: "big", scale });
  const base = { font: "big", scale, align: "left", shadow: false };

  // glow externo pulsante atrás do logo (respira junto)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glowPulse = 0.12 + Math.abs(breathing) * 0.8;
  ctx.globalAlpha = glowPulse;
  const glowGrad = ctx.createRadialGradient(x + w/2, y + h/2, 10, x + w/2, y + h/2, w*0.8);
  glowGrad.addColorStop(0, "rgba(255,196,77,0.18)");
  glowGrad.addColorStop(0.5, "rgba(199,125,255,0.08)");
  glowGrad.addColorStop(1, "rgba(199,125,255,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(x - 20, y - 10, w + 40, h + 20);
  ctx.restore();

  // 1) sombra projetada
  drawText(ctx, str, x + 5, y + 7, { ...base, color: "rgba(0,0,0,0.55)" });

  // 2) contorno preto duro 2px
  const ring = [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2],
                [-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of ring) drawText(ctx, str, x + dx, y + dy, { ...base, color: "#0a0713" });

  // 3) metal dourado em faixas horizontais
  const bands = [
    [0.00, 0.31, "#fff0bd"],
    [0.29, 0.55, "#ffc44d"],
    [0.53, 0.79, "#e08c22"],
    [0.77, 1.01, "#96591a"],
  ];
  for (const [a, b, col] of bands) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 4, y + h * a, w + 8, h * (b - a) + 1);
    ctx.clip();
    drawText(ctx, str, x, y, { ...base, color: col });
    ctx.restore();
  }

  // 4) brilho varrendo as letras a cada 4.6s
  const period = 4.6;
  const ph = (time % period) / period;
  if (ph < 0.42) {
    const t = ph / 0.42;
    const bx = x - 90 + (w + 180) * t;
    const fade = Math.sin(t * Math.PI);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx - 30, y - 6, 60, h + 12);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    drawText(ctx, str, x, y, { ...base, color: "rgba(255,247,220," + (0.5 * fade).toFixed(3) + ")" });
    ctx.restore();
    if (fade > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * 0.6;
      ctx.fillStyle = "#fff";
      ctx.fillRect(bx, y + h * 0.2, 2, h * 0.6);
      ctx.fillStyle = "#ffd479";
      ctx.beginPath();
      ctx.arc(bx, y + h * 0.5, 2 + fade * 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // filete de luz fixo no topo (metal polido)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 4, y + h * 0.04, w + 8, Math.max(2, h * 0.07));
  ctx.clip();
  drawText(ctx, str, x, y, { ...base, color: "rgba(255,255,255,0.5)" });
  ctx.restore();

  return { x, y, w, h };
}

export function drawPreTitleBg(ctx) {
  // PRETITLE - fundo escuro exclusivo, SEM parallax (parallax só no TITLE inicial)
  // Usa baked com runas + silhueta formigueiro, vinheta pesada
  if (!preTitleBg) bakePreTitleBg();
  ctx.drawImage(preTitleBg, 0, 0);
  // vinheta mais pesada no pre-title
  const vg = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 100, VIEW_W/2, VIEW_H/2, 600);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

function bakePreTitleBg() {
  preTitleBg = document.createElement("canvas");
  preTitleBg.width = VIEW_W; preTitleBg.height = VIEW_H;
  const c = preTitleBg.getContext("2d");
  // fundo escuro com ciclo dia/noite sutil + planície distante
  const g = c.createRadialGradient(VIEW_W/2, VIEW_H/2 - 40, 20, VIEW_W/2, VIEW_H/2 - 40, 700);
  g.addColorStop(0, "#1a1430");
  g.addColorStop(0.3, "#120e22");
  g.addColorStop(0.7, "#0a0812");
  g.addColorStop(1, "#05040a");
  c.fillStyle = g;
  c.fillRect(0,0,VIEW_W,VIEW_H);

  // runas / símbolos no fundo + silhueta de formigueiro gigante
  c.globalAlpha = 0.04;
  c.fillStyle = "#c77dff";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * VIEW_W;
    const y = Math.random() * VIEW_H;
    const s = 20 + Math.random() * 40;
    c.fillRect(x, y, s, 2);
    c.fillRect(x + s/2 -1, y - s/2, 2, s);
  }
  c.globalAlpha = 0.08;
  // silhueta do formigueiro ao fundo
  c.fillStyle = "#1d1730";
  c.beginPath();
  c.ellipse(VIEW_W/2, VIEW_H - 20, 180, 60, 0, 0, TAU);
  c.fill();
  c.globalAlpha = 1;

  // névoa baixa
  const fog = c.createLinearGradient(0, VIEW_H - 180, 0, VIEW_H);
  fog.addColorStop(0, "rgba(20,16,35,0)");
  fog.addColorStop(1, "rgba(20,16,35,0.6)");
  c.fillStyle = fog;
  c.fillRect(0, VIEW_H - 180, VIEW_W, 180);
}

function bakeTitleBg() {
  // ===== NOVO FUNDO: Planície do Amanhecer + Masmorra Gótica nas bordas + Formigueiro central ==
  // Mantém gótico nas laterais (pilares) mas centro é planície viva com ciclo dia/noite
  titleBg = document.createElement("canvas");
  titleBg.width = VIEW_W; titleBg.height = VIEW_H;
  const c = titleBg.getContext("2d");
  c.imageSmoothingEnabled = false;

  // base transparente - céu será desenhado dinamicamente em drawTitleBg
  // aqui só desenhamos chão e estruturas estáticas

  // ---- CHÃO DA PLANÍCIE com textura de solo ----
  const groundTop = 340;
  // gradiente do chão
  const groundGrad = c.createLinearGradient(0, groundTop, 0, VIEW_H);
  groundGrad.addColorStop(0, "#2c3d26");
  groundGrad.addColorStop(0.3, "#33452c");
  groundGrad.addColorStop(1, "#1e2d1a");
  c.fillStyle = groundGrad;
  c.fillRect(0, groundTop, VIEW_W, VIEW_H - groundTop);

  // textura de solo com manchas
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * VIEW_W;
    const y = groundTop + Math.random() * (VIEW_H - groundTop);
    const s = 2 + Math.random() * 8;
    const shade = 20 + Math.random() * 20;
    c.fillStyle = `rgba(${shade+30},${shade+60},${shade+30},0.15)`;
    c.fillRect(x, y, s, s*0.6);
  }
  // tufts de grama
  c.fillStyle = "rgba(92,156,76,0.25)";
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * VIEW_W;
    const y = groundTop + Math.random() * 60;
    c.fillRect(x, y, 1, 4 + Math.random()*6);
  }

  // ---- FORMIGUEIRO CENTRAL (silhueta + entrada) ----
  const moundX = VIEW_W/2, moundY = VIEW_H - 18;
  // sombra
  c.fillStyle = "rgba(8,6,12,0.5)";
  c.beginPath(); c.ellipse(moundX, moundY + 6, 110, 22, 0, 0, TAU); c.fill();
  // montículo
  c.fillStyle = "#3a2a16";
  c.beginPath(); c.ellipse(moundX, moundY, 95, 32, 0, 0, TAU); c.fill();
  c.fillStyle = "#5a3a22";
  c.beginPath(); c.ellipse(moundX, moundY - 4, 75, 24, 0, 0, TAU); c.fill();
  // entrada
  c.fillStyle = "#0a0812";
  c.beginPath(); c.ellipse(moundX, moundY + 2, 18, 12, 0, 0, TAU); c.fill();
  c.fillStyle = "rgba(0,0,0,0.6)";
  c.beginPath(); c.ellipse(moundX, moundY + 2, 12, 8, 0, 0, TAU); c.fill();
  // pedrinhas ao redor
  c.fillStyle = "#4a3a2e";
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU;
    const r = 70 + Math.random()*30;
    const x = moundX + Math.cos(ang)*r;
    const y = moundY + Math.sin(ang)*r*0.3 + Math.random()*8;
    c.beginPath(); c.arc(x, y, 2+Math.random()*2, 0, TAU); c.fill();
  }

  // ---- PILARES GÓTICOS NAS LATERAIS (mantém Dead Cells) ----
  // pilar esquerdo - ruína
  c.fillStyle = "#1a1628";
  c.fillRect(0, 0, 32, VIEW_H);
  c.fillStyle = "#241e36";
  c.fillRect(32, 0, 6, VIEW_H);
  // rachaduras
  c.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 40; y < VIEW_H; y += 80) {
    c.fillRect(8 + Math.random()*10, y, 2, 20 + Math.random()*20);
  }
  // pilar direito
  c.fillStyle = "#1a1628";
  c.fillRect(VIEW_W - 38, 0, 38, VIEW_H);
  c.fillStyle = "#241e36";
  c.fillRect(VIEW_W - 44, 0, 6, VIEW_H);
  c.fillStyle = "rgba(0,0,0,0.3)";
  for (let y = 60; y < VIEW_H; y += 90) {
    c.fillRect(VIEW_W - 30 + Math.random()*8, y, 2, 18 + Math.random()*18);
  }

  // arco superior quebrado - ruína gótica
  c.fillStyle = "#1e1a30";
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(VIEW_W, 0);
  c.lineTo(VIEW_W, 36);
  c.quadraticCurveTo(VIEW_W/2, 58, 0, 36);
  c.closePath();
  c.fill();
  c.fillStyle = "#2a2340";
  c.fillRect(0, 0, VIEW_W, 3);
  // pedras caídas do arco
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.fillRect(VIEW_W/2 - 40, 42, 12, 4);
  c.fillRect(VIEW_W/2 + 20, 44, 8, 3);

  // ---- ÁRVORES DISTANTES - parallax layer 0 (silhueta) ----
  const trees = [
    {x: 120, y: 300, w: 30, h: 70, col: "#1e2d1a"},
    {x: 180, y: 310, w: 24, h: 55, col: "#22301d"},
    {x: VIEW_W-140, y: 295, w: 32, h: 75, col: "#1e2d1a"},
    {x: VIEW_W-200, y: 305, w: 26, h: 60, col: "#22301d"},
    {x: 300, y: 315, w: 20, h: 45, col: "#263a20"},
    {x: VIEW_W-320, y: 320, w: 18, h: 40, col: "#263a20"},
  ];
  for (const t of trees) {
    c.fillStyle = t.col;
    c.fillRect(t.x - t.w/2, t.y - t.h, t.w, t.h);
    // copa
    c.beginPath();
    c.ellipse(t.x, t.y - t.h, t.w*0.8, t.w*0.6, 0, 0, TAU);
    c.fill();
  }

  // ---- ARBUSTOS no chão ----
  const bushes = [
    {x: 90, y: 380, col: "#3d5a45"},
    {x: 240, y: 400, col: "#4a7a42"},
    {x: VIEW_W-100, y: 390, col: "#3d5a45"},
    {x: VIEW_W-260, y: 410, col: "#41663a"},
  ];
  for (const b of bushes) {
    c.fillStyle = b.col;
    c.beginPath(); c.ellipse(b.x, b.y, 14, 10, 0, 0, TAU); c.fill();
  }

  // ---- CRISTAIS de essência na parede/ruínas ----
  for (let i = 0; i < 8; i++) {
    const x = 50 + Math.random() * (VIEW_W - 100);
    if (Math.abs(x - VIEW_W/2) < 120) continue; // não no centro
    const y = 80 + Math.random() * 200;
    const col = i % 3 === 0 ? "#c77dff" : i % 3 === 1 ? "#37e6c8" : "#6db7ff";
    c.fillStyle = col;
    c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(x, y - 6); c.lineTo(x + 4, y); c.lineTo(x, y + 8); c.lineTo(x - 4, y);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
  }

  // ---- TRILHAS de formigas no chão (feromônio) ----
  c.fillStyle = "rgba(55,230,200,0.08)";
  for (let i = 0; i < 3; i++) {
    const startX = VIEW_W/2 + (Math.random()-0.5)*40;
    const endX = 60 + Math.random() * (VIEW_W - 120);
    c.beginPath();
    c.moveTo(startX, moundY);
    c.quadraticCurveTo((startX+endX)/2 + (Math.random()-0.5)*100, groundTop + 20 + Math.random()*40, endX, VIEW_H - 20 - Math.random()*30);
    c.lineWidth = 1;
    c.strokeStyle = "rgba(55,230,200,0.06)";
    c.stroke();
  }

  // ---- CHÃO - detalhes finais ----
  c.fillStyle = "rgba(0,0,0,0.15)";
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * VIEW_W;
    const y = VIEW_H - Math.random() * 40;
    c.fillRect(x, y, 16 + Math.random()*24, 1);
  }
}

// ================================================= PRE-TITLE SCREEN ==
export function drawPreTitle(ctx, time) {
  drawPreTitleBg(ctx);
  drawTitleMotes(ctx, time);

  // título gigante estilizado
  const cx = VIEW_W / 2;
  const baseY = VIEW_H / 2 - 80;

  // sombra projetada atrás
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.translate(4, 6);
  drawBigTitle(ctx, cx, baseY, time, true);
  ctx.restore();

  drawBigTitle(ctx, cx, baseY, time, false);

  // subtítulo
  const subAlpha = 0.6 + Math.sin(time * 1.2) * 0.15;
  ctx.globalAlpha = subAlpha;
  drawText(ctx, "COLONIA ETERNA", cx, baseY + 110, { font: "small", scale: 2, color: "#8f6fd6", align: "center" });
  ctx.globalAlpha = 1;

  // linha decorativa
  const lineW = 200 + Math.sin(time * 0.8) * 20;
  ctx.fillStyle = "rgba(143,111,214,0.4)";
  ctx.fillRect(cx - lineW/2, baseY + 138, lineW, 1);
  ctx.fillStyle = "rgba(255,212,121,0.6)";
  ctx.fillRect(cx - 20, baseY + 138, 40, 2);

  // texto "clique para jogar" pulsante
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
  const clickAlpha = 0.4 + pulse * 0.6;
  ctx.globalAlpha = clickAlpha;

  // fundo do texto
  const txt = "CLIQUE PARA JOGAR";
  const tw = textWidth(txt, { font: "big", scale: 1 });
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(cx - tw/2 - 20, baseY + 180 - 4, tw + 40, 28);

  drawText(ctx, txt, cx, baseY + 180, { font: "big", scale: 1, color: "#ffd479", align: "center" });

  // seta animada
  const arrowY = baseY + 210 + Math.sin(time * 3) * 4;
  drawText(ctx, "▼", cx, arrowY, { font: "small", scale: 1, color: "#37e6c8", align: "center", alpha: clickAlpha });

  ctx.globalAlpha = 1;

  // partículas extras ao redor do título
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++) {
    const ang = time * 0.5 + i * (TAU/3);
    const rx = cx + Math.cos(ang) * (120 + Math.sin(time + i) * 10);
    const ry = baseY + Math.sin(ang) * 30;
    ctx.fillStyle = i === 0 ? "#c77dff" : i === 1 ? "#37e6c8" : "#ffd479";
    ctx.globalAlpha = 0.15 + Math.sin(time * 2 + i) * 0.1;
    ctx.beginPath(); ctx.arc(rx, ry, 3, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBigTitle(ctx, cx, y, time, isShadow) {
  const scale = 5.2 + Math.sin(time * 0.6) * 0.18; // pixel gigante 5x respirando
  const jitter = isShadow ? 0 : Math.sin(time * 8) * 0.3;

  // efeito de glitch / camadas
  if (!isShadow) {
    // camada cyan deslocada
    ctx.globalAlpha = 0.15;
    drawText(ctx, "FUMIGA", cx - 3 + jitter, y + 1, { font: "big", scale, color: "#37e6c8", align: "center" });
    // camada roxa deslocada
    drawText(ctx, "FUMIGA", cx + 3 - jitter, y - 1, { font: "big", scale, color: "#c77dff", align: "center" });
    ctx.globalAlpha = 1;
  }

  // contorno
  if (!isShadow) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        drawText(ctx, "FUMIGA", cx + dx, y + dy, { font: "big", scale, color: "#1a1028", align: "center" });
      }
    }
  }

  // texto principal com gradiente simulado por camadas
  const mainColor = isShadow ? "#000" : "#efe9ff";
  drawText(ctx, "FUMIGA", cx, y, { font: "big", scale, color: mainColor, align: "center" });

  if (!isShadow) {
    // brilho superior
    ctx.globalAlpha = 0.6;
    drawText(ctx, "FUMIGA", cx, y - 2, { font: "big", scale: scale * 0.98, color: "#fff", align: "center" });
    ctx.globalAlpha = 1;
  }
}

// ================================================ MODE SELECT SCREEN ==
// MODE - fundo sólido gótico, SEM parallax (parallax exclusivo TITLE inicial)
export function drawModeSelect(ctx, time) {
  drawSolidMenuBg(ctx, "#0c0a18");
  drawTitleMotes(ctx, time);

  // overlay escuro
  ctx.fillStyle = "rgba(10,8,18,0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // título da tela
  drawText(ctx, "SELECIONE O MODO", VIEW_W/2, 32, { font: "big", scale: 2, color: "#ffd479", align: "center" });
  drawText(ctx, "Cada modo é uma colônia diferente para comandar", VIEW_W/2, 78, { color: "#9a8fc0", align: "center" });

  // linha
  ctx.fillStyle = "rgba(143,111,214,0.3)";
  ctx.fillRect(VIEW_W/2 - 180, 98, 360, 1);
}

export function drawModeCards(ctx, modes, hoverIdx, time, scrollOffset = 0) {
  const cardW = 210, cardH = 340, gap = 18;
  const totalW = modes.length * cardW + (modes.length - 1) * gap;
  // FASE 6 FINAL: scroll visual offset para mobile swipe - cards deslizam horizontalmente
  const scrollVisual = scrollOffset * (cardW + gap);
  const startX = VIEW_W/2 - totalW/2 - scrollVisual;
  const y = 116;

  const rects = [];

  for (let i = 0; i < modes.length; i++) {
    const m = modes[i];
    const x = startX + i * (cardW + gap);
    const isHover = hoverIdx === i;
    const lift = isHover ? 6 : 0;

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x + 4, y + 6 + lift, cardW, cardH);

    // painel do card
    const border = isHover ? m.color : "#3a3054";
    ctx.fillStyle = isHover ? "#2c2144" : "#1d1730";
    ctx.fillRect(x, y - lift, cardW, cardH);
    ctx.strokeStyle = border;
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.strokeRect(x + 0.5, y - lift + 0.5, cardW - 1, cardH - 1);

    // barra superior colorida
    ctx.fillStyle = m.color;
    ctx.fillRect(x, y - lift, cardW, 4);
    if (isHover) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x, y - lift, cardW, 12);
      ctx.restore();
    }

    // ícone grande
    const iconY = y + 22 - lift;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x + cardW/2 - 32, iconY, 64, 64);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + cardW/2 - 32 + 0.5, iconY + 0.5, 63, 63);
    if (m.iconImg) {
      ctx.drawImage(m.iconImg, x + cardW/2 - 24, iconY + 6, 48, 48);
    } else {
      drawText(ctx, m.icon, x + cardW/2, iconY + 18, { font: "big", scale: 1.5, color: m.color, align: "center" });
    }

    // nome
    drawText(ctx, m.name, x + cardW/2, iconY + 76, { font: "big", scale: 0.9, color: "#efe9ff", align: "center" });

    // dificuldade
    drawText(ctx, m.diff, x + cardW/2, iconY + 96, { color: m.color, align: "center", scale: 0.85 });

    // descrição quebrada
    const descLines = m.desc.split("\n");
    let dy = iconY + 120;
    for (const line of descLines) {
      drawText(ctx, line, x + cardW/2, dy, { color: "#9a8fc0", align: "center", scale: 0.85 });
      dy += 14;
    }

    // stats
    dy += 6;
    ctx.fillStyle = "rgba(74,58,110,0.4)";
    ctx.fillRect(x + 10, dy, cardW - 20, 1);
    dy += 8;
    for (const s of m.stats) {
      drawText(ctx, s, x + 12, dy, { color: "#6b5a8a", scale: 0.8 });
      dy += 12;
    }

    // botão jogar - sempre abaixo dos stats com margem
    const btnY = y + cardH - 36 - lift;
    const btnHot = isHover;
    ctx.fillStyle = btnHot ? m.color : "#2a2340";
    ctx.fillRect(x + 10, btnY, cardW - 20, 26);
    ctx.strokeStyle = btnHot ? "#fff" : m.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = btnHot ? 0.9 : 0.4;
    ctx.strokeRect(x + 10 + 0.5, btnY + 0.5, cardW - 21, 25);
    ctx.globalAlpha = 1;
    drawText(ctx, "JOGAR", x + cardW/2, btnY + 6, { color: btnHot ? "#000" : "#efe9ff", align: "center", font: "small", scale: 1 });

    rects.push({ x, y: y - lift, w: cardW, h: cardH, idx: i });
  }

  // FASE 6 FINAL: indicador de scroll para mobile (bolinhas)
  if (scrollOffset !== undefined) {
    const dotsY = y + cardH + 14;
    const dotGap = 12;
    const dotsW = modes.length * 8 + (modes.length-1)*dotGap;
    const dotsX0 = VIEW_W/2 - dotsW/2;
    for (let i = 0; i < modes.length; i++) {
      const dx = dotsX0 + i * (8 + dotGap);
      ctx.fillStyle = i === Math.round(scrollOffset) ? "#ffd479" : "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.arc(dx+4, dotsY, i === Math.round(scrollOffset) ? 5 : 3, 0, TAU); ctx.fill();
    }
  }

  return rects;
}
// ================================================= TRANSIÇÕES DE TELA =======
// Referências que guiaram este sistema (pesquisa na web):
//   • "game feel" divulgado pelo ex-lead de Dead Cells (Gwénaël Masson):
//     transição CURTA e com peso — nada de fade linear; a tela que sai
//     acelera para fora e a que entra chega rápida e assenta devagar.
//   • Legibilidade de pixel art (2dwillneverdie / style guides): bordas e
//     valores definidos, sem borrão — por isso o dissolve é em blocos
//     alinhados à grade (dither de Bayer) e não um fade suave.
//   • Gramática por par de telas: cada mudança tem a sua assinatura
//     (menu→jogo = dissolve, menu→árvore = zoom para dentro, ajuda = íris),
//     então o jogador aprende onde está sem ler nada.
//
// Estrutura: duas metades (COBRIR / REVELAR) com easings diferentes, mais um
// deslocamento/escala aplicado à tela (ver transitionFx, usado no render()).

const ease = {
  outExpo:   (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t)),
  inQuart:   (t) => t * t * t * t,
  outQuint:  (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint:(t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outBack:   (t) => { const c = 1.35; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

// linguagem de cada par de telas. dir: +1 entra pela direita, -1 pela esquerda
const TRANS_LANG = {
  "PRETITLE>TITLE": { type: "bloom",    dur: 0.55, tint: "#ffd479" },
  "TITLE>MODE":     { type: "swipe",    dur: 0.40, dir:  1, tint: "#37e6c8" },
  "MODE>TITLE":     { type: "swipe",    dur: 0.34, dir: -1, tint: "#8f6fd6" },
  "TITLE>TREE":     { type: "zoom",     dur: 0.44, dir:  1, tint: "#c77dff" },
  "TREE>TITLE":     { type: "zoom",     dur: 0.40, dir: -1, tint: "#c77dff" },
  "RUN>TREE":       { type: "zoom",     dur: 0.44, dir:  1, tint: "#c77dff" },
  "TREE>RUN":       { type: "zoom",     dur: 0.40, dir: -1, tint: "#c77dff" },
  "TITLE>HELP":     { type: "iris",     dur: 0.34, dir:  1, tint: "#6db7ff" },
  "HELP>TITLE":     { type: "iris",     dur: 0.30, dir: -1, tint: "#6db7ff" },
  "RUN>HELP":       { type: "iris",     dur: 0.32, dir:  1, tint: "#6db7ff" },
  "HELP>RUN":       { type: "iris",     dur: 0.30, dir: -1, tint: "#6db7ff" },
  "TITLE>OPTIONS":  { type: "swipe",    dur: 0.36, dir:  1, tint: "#ffb347" },
  "OPTIONS>TITLE":  { type: "swipe",    dur: 0.32, dir: -1, tint: "#ffb347" },
  "RUN>OPTIONS":    { type: "zoom",     dur: 0.36, dir:  1, tint: "#ffb347" },
  "OPTIONS>RUN":    { type: "zoom",     dur: 0.32, dir: -1, tint: "#ffb347" },
  "MODE>RUN":       { type: "dissolve", dur: 0.50, tint: "#ffb347" },
  "TITLE>RUN":      { type: "dissolve", dur: 0.50, tint: "#ffb347" },
  "RUN>MODE":       { type: "dissolve", dur: 0.50, tint: "#ffb347" },
  "RUN>TITLE":      { type: "dissolve", dur: 0.55, tint: "#ff4d5a" },
};
const DEFAULT_LANG = { type: "fade", dur: 0.36, tint: "#8f6fd6" };

let transition = null;   // { type, t, dur, from, to, cb, dir, tint }
let maskCv = null;       // canvas auxiliar (dissolve / íris)

// matriz de Bayer 8x8: ordem "aleatória" mas determinística para o dissolve
const BAYER = (() => {
  const m = new Float32Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let v = 0;
      for (let b = 0; b < 3; b++) {
        const bx = (x >> b) & 1, by = (y >> b) & 1;
        v = v * 4 + (bx ^ by ? 2 : 0) + (by ? 1 : 0);
      }
      m[y * 8 + x] = (v % 64) / 64;
    }
  }
  return m;
})();

function ensureMask() {
  if (maskCv) return maskCv;
  maskCv = document.createElement("canvas");
  maskCv.width = VIEW_W / 4; maskCv.height = VIEW_H / 4;
  return maskCv;
}

export function startTransition(type, from, to, dur, cb) {
  const lang = TRANS_LANG[from + ">" + to] || DEFAULT_LANG;
  const kind = (type && type !== "auto") ? type : lang.type;
  transition = {
    type: kind,
    dur: dur || lang.dur,
    t: 0, from, to, cb, midFired: false,
    dir: lang.dir || 1,
    tint: lang.tint || "#8f6fd6",
    // o foco da íris/dissolve nasce onde o jogador clicou (feedback direto)
    fx: lastPointer.x, fy: lastPointer.y,
  };
  if (SFX && SFX.whoosh) SFX.whoosh();
}

// último clique conhecido — usado como centro da íris e origem do swipe
const lastPointer = { x: VIEW_W / 2, y: VIEW_H / 2 };
export function notePointer(x, y) { lastPointer.x = x; lastPointer.y = y; }

export function updateTransition(dt) {
  if (!transition) return null;
  transition.t += dt;
  const p = clamp(transition.t / transition.dur, 0, 1);
  if (p >= 0.5 && !transition.midFired) {
    transition.midFired = true;
    if (transition.cb) transition.cb();
  }
  if (p >= 1) {
    const tr = transition;
    transition = null;
    return tr.to;
  }
  return null;
}

/** Quanto da tela já está coberto (0 = limpa, 1 = totalmente coberta). */
function coverOf(p) {
  if (p < 0.5) return ease.inQuart(p * 2);        // fecha acelerando
  return 1 - ease.outQuint((p - 0.5) * 2);        // abre de estalo e assenta
}

/**
 * Transformação da tela que está sendo desenhada agora — é o que dá "peso":
 * a tela sai empurrada/encolhida e a nova entra deslizando/assentando.
 */
export function transitionFx() {
  const id = { scale: 1, ox: 0, oy: 0, alpha: 1 };
  if (!transition) return id;
  const p = clamp(transition.t / transition.dur, 0, 1);
  const out = p < 0.5;
  const c = out ? ease.inQuart(p * 2) : 1 - ease.outQuint((p - 0.5) * 2);
  switch (transition.type) {
    case "swipe": {
      const push = 38 * transition.dir;
      if (out) { id.ox = -push * c; id.scale = 1 - 0.012 * c; }
      else { id.ox = push * c; id.scale = 1 - 0.012 * c; }
      break;
    }
    case "zoom": {
      const into = transition.dir > 0;
      if (out) {
        id.scale = into ? 1 + 0.09 * c : 1 - 0.06 * c;
        id.alpha = 1 - 0.45 * c;
      } else {
        id.scale = into ? 1 - 0.05 * c : 1 + 0.07 * c;
        id.alpha = 1 - 0.35 * c;
      }
      break;
    }
    case "dissolve": {
      if (out) { id.scale = 1 + 0.03 * c; id.alpha = 1 - 0.2 * c; }
      else { id.scale = 1 - 0.03 * c; id.alpha = 1 - 0.2 * c; }
      break;
    }
    case "fade": case "iris": case "bloom": {
      id.alpha = 1 - (out ? 0.25 * c : 0.2 * c);
      break;
    }
  }
  return id;
}

export function drawTransition(ctx) {
  if (!transition) return;
  const p = clamp(transition.t / transition.dur, 0, 1);
  const c = coverOf(p);                       // 0 -> 1 -> 0
  const t = transition.type;

  ctx.save();
  if (t === "fade") {
    ctx.fillStyle = "rgba(5,4,10," + (0.97 * c).toFixed(3) + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // vinheta que respira: o escuro vem das bordas, não de um véu uniforme
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.9);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (0.5 * c).toFixed(3) + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (t === "bloom") {
    // clarão curto no meio + escuro nas pontas (usado no PRETITLE -> TITLE)
    const flash = Math.pow(1 - Math.abs(p * 2 - 1), 2.2);
    ctx.fillStyle = "rgba(5,4,10," + (0.9 * c).toFixed(3) + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2 - 30, 10, VIEW_W / 2, VIEW_H / 2 - 30, 520);
    g.addColorStop(0, "rgba(255,212,121," + (0.5 * flash).toFixed(3) + ")");
    g.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (t === "swipe") {
    const dir = transition.dir;
    // duas barras que varrem a tela (a principal + uma fina atrasada)
    for (let k = 0; k < 2; k++) {
      const lag = k * 0.12;
      const cc = clamp(c - lag, 0, 1);
      const w = VIEW_W * cc;
      const x = dir > 0 ? (k ? VIEW_W - w : 0) : (k ? 0 : VIEW_W - w);
      ctx.globalAlpha = k ? 0.35 : 1;
      ctx.fillStyle = "#08060f";
      ctx.fillRect(x, 0, w, VIEW_H);
    }
    ctx.globalAlpha = 1;
    const edge = dir > 0 ? VIEW_W * c : VIEW_W * (1 - c);
    // fio de luz na frente da barra + rastro
    const g = ctx.createLinearGradient(edge - 46 * dir, 0, edge + 6 * dir, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.7, hexA(transition.tint, 0.28));
    g.addColorStop(1, hexA(transition.tint, 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(edge - 48 * dir, 0, 54 * dir, VIEW_H);
    ctx.fillStyle = hexA(transition.tint, 0.95);
    ctx.fillRect(edge - 1, 0, 3, VIEW_H);
    // fagulhas na borda (determinísticas: mesma semente a cada frame)
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 10; i++) {
      const yy = ((i * 97 + 31) % VIEW_H) + Math.sin(G.time * 9 + i) * 6;
      const xx = edge - dir * (6 + ((i * 53) % 40));
      ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(G.time * 7 + i * 1.7));
      ctx.fillStyle = "#fff";
      ctx.fillRect(xx, yy, 2, 2);
    }
  } else if (t === "dissolve") {
    // blocos de 4px ligados pela ordem de Bayer: some/aparece em pixel art
    const m = ensureMask();
    const mc = m.getContext("2d");
    const mw = m.width, mh = m.height;
    mc.clearRect(0, 0, mw, mh);
    mc.fillStyle = "#08060f";
    const th = c * 1.05 - 0.02;
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        if (BAYER[((y * 4) & 7) * 8 + ((x * 4) & 7)] < th) mc.fillRect(x, y, 1, 1);
      }
    }
    const wasSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(m, 0, 0, VIEW_W, VIEW_H);
    ctx.imageSmoothingEnabled = wasSmooth;
    // borda dos blocos mais recente brilha (a "frente" do dissolve)
    if (c > 0.02 && c < 0.98) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = transition.tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  } else if (t === "iris") {
    const m = ensureMask();
    const mc = m.getContext("2d");
    // a máscara é 1/4 da tela: desenha nela e amplia (economiza fillrate)
    const sx = m.width / VIEW_W, sy = m.height / VIEW_H;
    mc.globalCompositeOperation = "source-over";
    mc.fillStyle = "#08060f";
    mc.fillRect(0, 0, m.width, m.height);
    const maxR = Math.hypot(VIEW_W, VIEW_H) * 0.62;
    const r = maxR * c * sx;
    if (r > 0.5) {
      mc.globalCompositeOperation = "destination-out";
      mc.beginPath();
      mc.arc(transition.fx * sx, transition.fy * sy, r, 0, TAU);
      mc.fill();
      mc.globalCompositeOperation = "source-over";
    }
    const wasSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(m, 0, 0, VIEW_W, VIEW_H);
    ctx.imageSmoothingEnabled = wasSmooth;
    // anel de luz na boca da íris
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = hexA(transition.tint, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(transition.fx, transition.fy, Math.max(1, maxR * c), 0, TAU);
    ctx.stroke();
  } else if (t === "wipe") {
    // compatibilidade com chamadas antigas
    const w = VIEW_W * c;
    ctx.fillStyle = "#08060f";
    ctx.fillRect(0, 0, w, VIEW_H);
    ctx.fillStyle = hexA(transition.tint, 0.9);
    ctx.fillRect(w - 2, 0, 3, VIEW_H);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/** "#rrggbb" + alfa -> "rgba(r,g,b,a)" */
function hexA(hex, a) {
  const h = String(hex).replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
}

export function hasTransition() { return !!transition; }
export function transitionProgress() { return transition ? clamp(transition.t / transition.dur, 0, 1) : 0; }
