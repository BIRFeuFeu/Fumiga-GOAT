// ============================================================================
// FUMIGA — renderização do mundo (juice visual inspirado em Dead Cells/Celeste)
// ============================================================================
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL } from "./config.js";
import { G } from "./state.js";
import { IMG, rotFrame, whiteRotFrame, bakeRot, bakeSheet } from "./assets.js";
import { world } from "./world.js";
import { cam, worldToScreen, visibleWorldRect, screenToWorld } from "./camera.js";
import { allies, eggs } from "./units.js";
import { foes, boss } from "./enemies.js";
import { orbs, projectiles, drawProjectiles, drawOrbs } from "./combat.js";
import { drawTrails, drawParts, drawGlows, drawRings, drawFloats } from "./particles.js";
import { drawText } from "./font.js";
import { clamp, TAU, lerp } from "./utils.js";
import { fogDraw, fogVisible } from "./fog.js";

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
export function drawRun(ctx, dt) {
  if (!vignette) bakeVignette();
  const w2s = (x, y) => worldToScreen(x, y);
  const vis = visibleWorldRect(80);

  // ------------------------------------------------------------------ chão --
  // world.ground está em meia resolução; desenhe o mundo inteiro com o zoom da câmera
  const origin = worldToScreen(0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world.ground, origin.x, origin.y, WORLD_W * cam.zoom, WORLD_H * cam.zoom);
  // borda do mundo (escuridão além)
  ctx.fillStyle = "#0d0a14";
  const L = worldToScreen(0, 0), R2 = worldToScreen(WORLD_W, WORLD_H);
  if (L.x > 0) ctx.fillRect(0, 0, L.x, VIEW_H);
  if (L.y > 0) ctx.fillRect(0, 0, VIEW_W, L.y);
  if (R2.x < VIEW_W) ctx.fillRect(R2.x, 0, VIEW_W - R2.x, VIEW_H);
  if (R2.y < VIEW_H) ctx.fillRect(0, R2.y, VIEW_W, VIEW_H - R2.y);

  drawTrails(ctx, w2s);

  // ------------------------------------------------------ pilhas e recursos -
  for (const p of world.piles) {
    if (p.amount <= 0 || !inView(vis, p.x, p.y, 60)) continue;
    const s = w2s(p.x, p.y);
    const scale = 0.55 + 0.65 * (p.amount / p.max);
    const sz = 56 * scale * cam.zoom / 1.15;
    ctx.globalAlpha = 1;
    ctx.drawImage(p.sprite, s.x - sz / 2, s.y - sz * 0.42, sz, sz * 0.72);
    amountBar(ctx, s.x, s.y + 12, p.amount / p.max, "#ffb347");
  }
  // brilho de essência nos cristais mineráveis
  for (const n of world.nodes) {
    if (n.amount <= 0 || !inView(vis, n.x, n.y, 80)) continue;
    const s = w2s(n.x, n.y);
    if (n.kind !== "essence") continue;
    const pulse = 0.5 + Math.sin(G.time * 2.4 + n.glowT) * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(s.x, s.y - 8, 2, s.x, s.y - 8, 46 * cam.zoom);
    rg.addColorStop(0, `rgba(138,107,222,${0.5 * pulse})`);
    rg.addColorStop(1, "rgba(138,107,222,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y - 8, 46 * cam.zoom, 0, TAU); ctx.fill();
    ctx.restore();
    amountBar(ctx, s.x, s.y + 18, n.amount / n.max, "#c77dff");
  }

  // --------------------------------------------------------- lista de desenho
  const drawList = [];
  for (const p of world.props) {
    if (!inView(vis, p.x, p.y, 240)) continue;
    drawList.push({ kind: "prop", y: p.y, ref: p });
  }
  for (const a of allies) if (inView(vis, a.x, a.y, 60)) drawList.push({ kind: "ant", y: a.y, ref: a });
  for (const f of foes) {
    if (f.isBoss || !inView(vis, f.x, f.y, 60)) continue;
    if (f.revealT <= 0 && !fogVisible(f.x, f.y)) continue;
    drawList.push({ kind: "ant", y: f.y, ref: f });
  }
  drawList.sort((a, b) => a.y - b.y);

  // anéis de equipe + sombras (embaixo de tudo)
  for (const d of drawList) {
    if (d.kind !== "ant") continue;
    const u = d.ref;
    const s = w2s(u.x, u.y);
    const z = cam.zoom;
    // sombra
    ctx.fillStyle = "rgba(10,7,16,0.5)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, u.bodyR * 0.95 * z, u.bodyR * 0.42 * z, 0, 0, TAU);
    ctx.fill();
    if (u.dead) continue;
    // anel de facção
    ctx.strokeStyle = u.faction === "ally" ? "rgba(55,230,200,0.55)" : "rgba(255,77,90,0.5)";
    ctx.lineWidth = Math.max(1, 1.4 * z);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, (u.bodyR + 2.5) * z, (u.bodyR + 2.5) * 0.52 * z, 0, 0, TAU);
    ctx.stroke();
    if (u.selected) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(1, 1.6 * z);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 3 * z, (u.bodyR + 5) * z, (u.bodyR + 5) * 0.52 * z, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // formigueiro (novo sprite — a RAINHA fica dentro dele)
  const A = world.anthill;
  if (inView(vis, A.x, A.y, 320)) {
    drawNest(ctx, w2s, A);
  }

  // unidades e props ordenados
  for (const d of drawList) {
    if (d.kind === "prop") drawProp(ctx, d.ref, w2s);
    else drawAnt(ctx, d.ref, w2s);
  }

  // chefe acima de tudo (visível ou revelado por dano)
  if (boss && inView(vis, boss.x, boss.y, 220) && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) drawBoss(ctx, boss, w2s);

  drawProjectiles(ctx, w2s);
  drawOrbs(ctx, w2s, G.time);
  drawParts(ctx, w2s);
  drawGlows(ctx, w2s);
  drawRings(ctx, w2s, cam.zoom);

  // ------------------------------------------------------------- atmosfera -
  const tint = world.def ? world.def.tint : "#2a2140";
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;

  // luz do céu vinda de cima (glória do Dead Cells)
  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, "rgba(120,96,190,0.14)");
  sky.addColorStop(1, "rgba(120,96,190,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 200);

  // halo do formigueiro (faro de casa no escuro)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const hs = w2s(A.x, A.y);
  if (inView(vis, A.x, A.y, 480)) {
    const q2 = allies.queen;
    const low = q2 && !q2.dead && q2.hp < q2.maxHp * 0.3;
    const pulse = 0.75 + Math.sin(G.time * (low ? 4.5 : 1.6)) * 0.18;
    const rg = ctx.createRadialGradient(hs.x, hs.y, 10, hs.x, hs.y, 320 * cam.zoom);
    rg.addColorStop(0, low ? `rgba(255,77,90,${0.34 * pulse})` : `rgba(255,169,71,${0.32 * pulse})`);
    rg.addColorStop(0.5, low ? `rgba(255,77,90,${0.12 * pulse})` : `rgba(255,122,61,${0.12 * pulse})`);
    rg.addColorStop(1, "rgba(255,122,61,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(hs.x, hs.y, 320 * cam.zoom, 0, TAU); ctx.fill();
  }
  ctx.restore();

  ctx.drawImage(vignette, 0, 0);

  // pulso vermelho quando a rainha está em perigo
  const q = allies.queen;
  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    const p = (Math.sin(G.time * 4) * 0.5 + 0.5) * 0.22;
    ctx.fillStyle = `rgba(255,60,70,${p})`;
    ctx.fillRect(0, 0, VIEW_W, 6);
    ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
    ctx.fillRect(0, 0, 6, VIEW_H);
    ctx.fillRect(VIEW_W - 6, 0, 6, VIEW_H);
  }

  // fog of war sobre o mundo inteiro
  fogDraw(ctx, origin.x, origin.y, cam.zoom, G.time);

  drawFloats(ctx, drawText);
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
function drawNest(ctx, w2s, A) {
  const q = allies.queen;
  const z = cam.zoom;
  const s = w2s(A.x, A.y);
  const frac = q ? clamp(q.hp / q.maxHp, 0, 1) : 0;
  const key = (!q || q.dead) ? "nest_d2" : nestKeyForFrac(frac);

  // sombra maciça
  ctx.fillStyle = "rgba(8,6,12,0.55)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 46 * z, 62 * z, 20 * z, 0, 0, TAU); ctx.fill();

  // corpo do formigueiro (breu vivo: o ninho "respira")
  const alive = q && !q.dead;
  const breath = alive ? 1 + Math.sin(q.bob * 1.7) * 0.008 : 1;
  const img = (alive && q.flash > 0) ? nestWhite(key) : IMG[key];
  const W2 = 158 * z * breath, H2 = 158 * z * breath;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, s.x - W2 / 2, s.y - H2 / 2 + 8 * z, W2, H2);

  // fulgor quente subindo do buraco (a rainha lá dentro)
  if (alive) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.5 + Math.sin(G.time * 2.2) * 0.25;
    const rg = ctx.createRadialGradient(s.x, s.y + 4 * z, 2, s.x, s.y + 4 * z, 30 * z);
    rg.addColorStop(0, `rgba(255,200,110,${0.55 * pulse})`);
    rg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y + 4 * z, 30 * z, 0, TAU); ctx.fill();
    ctx.restore();
    // fumacinha do buraco
    if (Math.random() < 0.06) {
      ctx.fillStyle = "rgba(200,180,160,0.15)";
      const sx2 = s.x + Math.sin(G.time * 1.3) * 8 * z;
      ctx.fillRect(sx2 - 2 * z, s.y - 26 * z - (G.time % 2) * 10, 4 * z, 4 * z);
    }
  }

  // ovos em fila apenas à borda do buraco
  for (let i = 0; i < eggs.length; i++) {
    const ang = (i / Math.max(1, eggs.length)) * TAU + G.time * 0.3;
    const ex = s.x + Math.cos(ang) * 26 * z;
    const ey = s.y + 6 * z + Math.sin(ang) * 12 * z;
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

  // placa + barra de vida da rainha
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
    drawText(ctx, "RAINHA", s.x, by - 18 * z, { scale: 1, color: frac2 < 0.3 ? "#ff4d5a" : "#ffb347", align: "center" });
  } else if (q && q.dead) {
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
  const size = frame.width; // tamanho original assado
  let dx = s.x, dy = s.y;

  // ------------------------------------------------ animação por transformada
  const moving = Math.abs(u.vx) + Math.abs(u.vy) > 4;
  // caminhada: squash & stretch rítmico (Celeste-like); idle: respiração calma
  let squashX = 1, squashY = 1, lean = 0;
  if (u.dying) {
    // morte: espatifado
    const t = clamp(u.dying / 0.45, 0, 1);
    squashX = 1 + (1 - t) * 0.7;
    squashY = Math.max(0.15, t * 0.9);
  } else if (u.spawnT > 0) {
    // nascimento: estica saindo do casulo
    const t = 1 - u.spawnT / 0.34;
    const e = 1 - Math.pow(1 - t, 3);
    squashX = 0.4 + 0.6 * e;
    squashY = 0.4 + 0.6 * e;
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
  // lunge: impulso elástico de ataque
  if (u.lunge > 0) {
    const f = (u.lunge / 0.22) * 7 * z;
    dx += Math.cos(u.angle) * f;
    dy += Math.sin(u.angle) * f;
    squashY *= 1 + (u.lunge / 0.22) * 0.18;
  }
  // healer flutua levemente ao canalizar
  if (u.type === "healer" && u.healTarget && !u.healTarget.dead) {
    dy -= (Math.sin(u.bob * 2) * 1.5 + 2) * z;
  }

  let alpha = 1;
  if (u.dying) alpha = clamp(u.dying / 0.3, 0, 1);

  const sc = z * squashY;
  const w = size * z * squashX, h = size * sc;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(dx, dy);
  if (lean) ctx.rotate(lean);
  ctx.drawImage(frame, -w / 2, -h / 2 - size * 0.06 * z, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (u.dead) return;

  // carga (trabalhadora)
  if (u.carry > 0 && u.carryKind) {
    ctx.fillStyle = u.carryKind === "essence" ? "#c77dff" : u.carryKind === "amber" ? "#ffd479" : "#ffb347";
    ctx.beginPath();
    ctx.arc(dx, dy - (u.bodyR + 10) * z, 3 * z, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,8,16,0.8)"; ctx.lineWidth = 1; ctx.stroke();
  }
  // vida
  if (u.hp < u.maxHp && u.maxHp > 0) {
    const w2 = (u.faction === "ally" ? 22 : 20) * z;
    const frac = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = "rgba(10,8,16,0.75)";
    ctx.fillRect(dx - w2 / 2 - 1, dy - (u.bodyR + 16) * z - 1, w2 + 2, 4);
    ctx.fillStyle = frac > 0.5 ? (u.faction === "ally" ? "#37e6c8" : "#ff4d5a") : frac > 0.25 ? "#ffb347" : "#ff4d5a";
    ctx.fillRect(dx - w2 / 2, dy - (u.bodyR + 16) * z, w2 * frac, 2);
  }
  // atordoada
  if (u.stunT > 0) {
    const t = G.time * 6 + u.id;
    ctx.fillStyle = "#ffd479";
    for (let i = 0; i < 2; i++) {
      const a = t + i * Math.PI;
      ctx.fillRect(dx + Math.cos(a) * 8 * z - 1.5, dy - (u.bodyR + 20) * z + Math.sin(a) * 3 * z, 3, 3);
    }
  }
  // queimando
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
// sheets direcionais de animais; matriarca usa sprite de formiga giratório
const BOSS_ANIMS = {
  boar:  { px: 128, scale: 1.35, idle: ["boar_idle", 4], walk: ["boar_walk", 6], run: ["boar_run", 5], hurt: ["boar_hurt", 4], death: ["boar_death", 6] },
  fox:   { px: 112, scale: 1.35, idle: ["fox_idle", 4], walk: ["fox_walk", 6], run: ["fox_run", 6], hurt: ["fox_hurt", 4], death: ["fox_death", 6] },
  hare:  { px: 104, scale: 1.3, idle: ["hare_idle", 4], walk: ["hare_walk", 5], run: ["hare_run", 6], hurt: ["hare_hurt", 4], death: ["hare_death", 6] },
  deer:  { px: 134, scale: 1.35, idle: ["deer_idle", 4], walk: ["deer_walk", 6], run: ["deer_run", 6], hurt: ["deer_hurt", 4], death: ["deer_death", 7] },
  grouse:{ px: 122, scale: 1.3, idle: ["grouse_idle", 4], walk: ["grouse_walk", 6], run: ["grouse_flight", 6], hurt: ["grouse_hurt", 4], death: ["grouse_death", 6] },
};
let sheetsBaked = false;

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

  // sombra grande
  const shW = b.kind === "matriarch" ? 52 : 46;
  ctx.fillStyle = "rgba(10,7,16,0.6)";
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 34 * z, shW * z, 16 * z, 0, 0, TAU); ctx.fill();

  if (b.def.rotMode) {
    // MATRIARCA: formiga gigante, gira suavemente para o rumo
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
    // mandíbulas brilhando quando prestes a cuspir
    if (b.atkT < 0.4 && !b.dying) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(200,107,255,${0.35 - b.atkT * 0.6})`;
      const hx = s.x + Math.cos(b.angle) * 40 * z, hy = s.y + Math.sin(b.angle) * 40 * z - 12 * z;
      ctx.beginPath(); ctx.arc(hx, hy, 12 * z, 0, TAU); ctx.fill();
      ctx.restore();
    }
    return;
  }

  const A2 = BOSS_ANIMS[b.kind];
  if (!A2) return;
  // escolhe anim
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
  // lebre: pulos com arco vertical; tetraz: flutua; outros: no chão
  let lift = 0;
  if (b.kind === "hare" && (b.sub === "dash" || b.sub === "aim")) {
    lift = Math.abs(Math.sin(b.animT * 9)) * 8 * z;
  } else if (b.kind === "grouse" && b.sub === "dash") {
    lift = (12 + Math.sin(b.animT * 30) * 4) * z;
  } else if (b.kind === "boar" && b.sub === "slamAim") {
    lift = Math.sin((0.62 - b.t) / 0.62 * Math.PI) * 40 * z;
  }
  ctx.drawImage(wfr, s.x - fw / 2, s.y - fh + 40 * z - lift, fw, fh);

  // brilho do bote (raposa/tetraz)
  if ((b.kind === "fox" || b.kind === "grouse") && b.sub === "aim") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,77,90,${0.25 + Math.sin(G.time * 20) * 0.15})`;
    ctx.beginPath(); ctx.arc(s.x, s.y - 20 * z, 42 * z, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ================================================================= TÍTULO ===
let titleBg = null;

export function drawTitleBg(ctx) {
  if (!titleBg) bakeTitleBg();
  ctx.drawImage(titleBg, 0, 0);
}

function bakeTitleBg() {
  // ===== estilo DEAD CELLS: pôr-do-sol laranja, silhuetas, mar com reflexo ==
  titleBg = document.createElement("canvas");
  titleBg.width = VIEW_W; titleBg.height = VIEW_H;
  const c = titleBg.getContext("2d");
  c.imageSmoothingEnabled = false;
  const HORIZON = 400;

  // céu quente
  const sky = c.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, "#ff5a1f");
  sky.addColorStop(0.35, "#ff7a26");
  sky.addColorStop(0.72, "#ffa53d");
  sky.addColorStop(1, "#ffcf6a");
  c.fillStyle = sky;
  c.fillRect(0, 0, VIEW_W, HORIZON);

  // nuvens com bordas incendiadas
  for (let i = 0; i < 26; i++) {
    const cx = Math.random() * VIEW_W, cy = 28 + Math.random() * 250;
    const r = 34 + Math.random() * 90;
    const gr = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    const hot = Math.random() < 0.5;
    gr.addColorStop(0, hot ? "rgba(255,240,180,0.75)" : "rgba(255,190,120,0.55)");
    gr.addColorStop(1, "rgba(255,140,70,0)");
    c.fillStyle = gr;
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  }
  // núcleos de nuvem pastel
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * VIEW_W, cy = 30 + Math.random() * 220;
    c.fillStyle = "rgba(255,230,170,0.5)";
    const r = 10 + Math.random() * 26;
    c.beginPath(); c.ellipse(cx, cy, r, r * 0.6, 0, 0, TAU); c.fill();
  }

  // SOL gigante atrás da colina (glória quente)
  const sun = c.createRadialGradient(690, 250, 20, 690, 250, 420);
  sun.addColorStop(0, "rgba(255,250,220,0.75)");
  sun.addColorStop(0.18, "rgba(255,230,150,0.5)");
  sun.addColorStop(1, "rgba(255,180,80,0)");
  c.fillStyle = sun;
  c.fillRect(0, 0, VIEW_W, HORIZON);
  c.fillStyle = "rgba(255,245,205,0.9)";
  c.beginPath(); c.arc(690, 250, 52, 0, TAU); c.fill();

  // ---------- colina-castelo: o FORMIGUEIRO torrando na silhueta -----------
  // massa da colina
  c.fillStyle = "#8a2857";
  c.beginPath();
  c.moveTo(180, HORIZON);
  c.quadraticCurveTo(420, 210, 700, 300);
  c.quadraticCurveTo(860, 348, 1080, HORIZON);
  c.closePath();
  c.fill();
  // segunda massa (frente, mais escura)
  c.fillStyle = "#6e2048";
  c.beginPath();
  c.moveTo(420, HORIZON);
  c.quadraticCurveTo(640, 292, 900, 356);
  c.quadraticCurveTo(1010, 380, 1120, HORIZON);
  c.closePath();
  c.fill();

  // monte do formigueiro de perfil (naipe de "castelo" da colônia)
  c.fillStyle = "#5c1b3d";
  c.beginPath();
  c.moveTo(560, 340);
  c.quadraticCurveTo(600, 238, 660, 236);
  c.quadraticCurveTo(716, 236, 742, 340);
  c.closePath();
  c.fill();
  // buraco da entrada com luz interna
  c.fillStyle = "#2c0e22";
  c.beginPath(); c.ellipse(652, 332, 16, 20, 0, 0, TAU); c.fill();
  c.fillStyle = "#ff9a3d";
  c.globalAlpha = 0.85;
  c.beginPath(); c.ellipse(652, 334, 7, 9, 0, 0, TAU); c.fill();
  c.globalAlpha = 1;

  // bandeira/rainha no topo + antenas de folha
  c.strokeStyle = "#40102c";
  c.lineWidth = 4;
  c.beginPath(); c.moveTo(656, 240); c.lineTo(656, 196); c.stroke();
  c.fillStyle = "#ffd479";
  c.beginPath(); c.moveTo(656, 196); c.lineTo(690, 204); c.lineTo(656, 214); c.closePath(); c.fill();
  // árvores-irmãs na colina
  c.fillStyle = "#5c1b3d";
  const tree = (tx, ty, s2) => {
    c.fillRect(tx - 2 * s2, ty - 34 * s2, 4 * s2, 34 * s2);
    c.beginPath(); c.ellipse(tx, ty - 40 * s2, 12 * s2, 10 * s2, 0, 0, TAU); c.fill();
  };
  tree(520, 316, 1.1); tree(796, 330, 0.9); tree(486, 334, 0.7); tree(838, 344, 1.2);

  // coluna de formigas subindo a trilha (silhueta pitada)
  c.fillStyle = "#40102c";
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const ax = 430 + t * 200, ay = 372 - t * 88 + Math.sin(i * 1.7) * 4;
    c.fillRect(ax, ay, 4, 3);
  }

  // brilho quente na borda da colina (rim light do sol)
  c.fillStyle = "rgba(255,180,80,0.35)";
  c.beginPath();
  c.moveTo(560, 340);
  c.quadraticCurveTo(600, 236, 660, 234);
  c.quadraticCurveTo(604, 246, 576, 340);
  c.closePath(); c.fill();

  // ------------------------------ mar espelhado ----------------------------
  const sea = c.createLinearGradient(0, HORIZON, 0, VIEW_H);
  sea.addColorStop(0, "#ff9440");
  sea.addColorStop(0.4, "#e35a3b");
  sea.addColorStop(1, "#7a2547");
  c.fillStyle = sea;
  c.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON);
  // linha do horizonte ardente
  c.fillStyle = "rgba(255,250,215,0.95)";
  c.fillRect(0, HORIZON, VIEW_W, 2);
  // reflexos: filetes horizontais que alongam do sol
  for (let i = 0; i < 60; i++) {
    const t = Math.random();
    const y = HORIZON + 4 + t * (VIEW_H - HORIZON - 12);
    const len = (40 + Math.random() * 260) * (1 - t * 0.4);
    const x = 690 - len / 2 + (Math.random() - 0.5) * 120;
    c.globalAlpha = 0.35 + Math.random() * 0.4;
    c.fillStyle = i % 3 ? "#ffb864" : "#ffe2a0";
    const h = 1 + Math.random() * 2;
    c.fillRect(x, y, len, h);
  }
  c.globalAlpha = 1;
  // barquinho (referência Dead Cells) com reflexo
  c.fillStyle = "#4a1230";
  c.beginPath();
  c.moveTo(688, 436); c.lineTo(724, 436); c.lineTo(716, 446); c.lineTo(694, 446);
  c.closePath(); c.fill();
  c.fillRect(703, 404, 2, 32);
  c.beginPath(); c.moveTo(705, 406); c.lineTo(724, 430); c.lineTo(705, 430); c.closePath();
  c.fillStyle = "#6e2048"; c.fill();
  c.globalAlpha = 0.4;
  c.fillStyle = "#ffb864";
  c.fillRect(690, 450, 34, 2);
  c.globalAlpha = 1;

  // primeiro plano: gramado preto (contraste de leitura do menu)
  c.fillStyle = "#180a1e";
  c.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  for (let x = 0; x < VIEW_W; x += 7) {
    const h = 4 + ((x * 7919) % 11);
    c.fillRect(x, VIEW_H - 26 - h, 2, h);
  }

  // vinheta suave nas bordas
  const v = c.createRadialGradient(VIEW_W / 2, VIEW_H * 0.4, VIEW_H * 0.4, VIEW_W / 2, VIEW_H * 0.4, VIEW_H * 1.05);
  v.addColorStop(0, "rgba(30,8,20,0)");
  v.addColorStop(1, "rgba(24,6,18,0.5)");
  c.fillStyle = v;
  c.fillRect(0, 0, VIEW_W, VIEW_H);
}
