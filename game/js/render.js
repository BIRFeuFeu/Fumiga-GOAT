// ============================================================================
// FUMIGA — renderização do mundo + menus (V2 Dead Cells dungeon + partículas)
// ============================================================================
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PAL } from "./config.js";
import { G } from "./state.js";
import { IMG, rotFrame, whiteRotFrame, bakeRot, bakeSheet, rotDrawSize } from "./assets.js";
import { world } from "./world.js";
import { cam, worldToScreen, visibleWorldRect, screenToWorld } from "./camera.js";
import { allies, eggs } from "./units.js";
import { foes, boss } from "./enemies.js";
import { orbs, projectiles, drawProjectiles, drawOrbs } from "./combat.js";
import { drawDecals, drawTrails, drawParts, drawGlows, drawRings, drawFloats } from "./particles.js";
import { drawText, textWidth } from "./font.js";
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
  const origin = worldToScreen(0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(world.ground, origin.x, origin.y, WORLD_W * cam.zoom, WORLD_H * cam.zoom);
  // borda do mundo
  ctx.fillStyle = "#0d0a14";
  const L = worldToScreen(0, 0), R2 = worldToScreen(WORLD_W, WORLD_H);
  if (L.x > 0) ctx.fillRect(0, 0, L.x, VIEW_H);
  if (L.y > 0) ctx.fillRect(0, 0, VIEW_W, L.y);
  if (R2.x < VIEW_W) ctx.fillRect(R2.x, 0, VIEW_W - R2.x, VIEW_H);
  if (R2.y < VIEW_H) ctx.fillRect(0, R2.y, VIEW_W, VIEW_H - R2.y);

  drawDecals(ctx, w2s);
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

  // sombras e anéis
  for (const d of drawList) {
    if (d.kind !== "ant") continue;
    const u = d.ref;
    const s = w2s(u.x, u.y);
    const z = cam.zoom;
    ctx.fillStyle = "rgba(10,7,16,0.5)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 3 * z, u.bodyR * 0.95 * z, u.bodyR * 0.42 * z, 0, 0, TAU);
    ctx.fill();
    if (u.dead) continue;
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

  const A = world.anthill;
  if (inView(vis, A.x, A.y, 320)) {
    drawNest(ctx, w2s, A);
  }

  for (const d of drawList) {
    if (d.kind === "prop") drawProp(ctx, d.ref, w2s);
    else drawAnt(ctx, d.ref, w2s);
  }

  if (boss && inView(vis, boss.x, boss.y, 220) && (boss.revealT > 0 || fogVisible(boss.x, boss.y))) drawBoss(ctx, boss, w2s);

  drawProjectiles(ctx, w2s);
  drawOrbs(ctx, w2s, G.time);
  drawParts(ctx, w2s);
  drawGlows(ctx, w2s);
  drawRings(ctx, w2s, cam.zoom);

  // atmosfera
  const tint = world.def ? world.def.tint : "#2a2140";
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;

  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, "rgba(120,96,190,0.14)");
  sky.addColorStop(1, "rgba(120,96,190,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, 200);

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

  const q = allies.queen;
  if (q && !q.dead && q.hp < q.maxHp * 0.3) {
    const p = (Math.sin(G.time * 4) * 0.5 + 0.5) * 0.22;
    ctx.fillStyle = `rgba(255,60,70,${p})`;
    ctx.fillRect(0, 0, VIEW_W, 6);
    ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
    ctx.fillRect(0, 0, 6, VIEW_H);
    ctx.fillRect(VIEW_W - 6, 0, 6, VIEW_H);
  }

  fogDraw(ctx, origin.x, origin.y, cam.zoom, G.time);
  drawFloats(ctx, drawText, w2s);
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
    const rg = ctx.createRadialGradient(s.x, s.y + 4 * z, 2, s.x, s.y + 4 * z, 30 * z);
    rg.addColorStop(0, `rgba(255,200,110,${0.55 * pulse})`);
    rg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y + 4 * z, 30 * z, 0, TAU); ctx.fill();
    ctx.restore();
  }

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
  const size = rotDrawSize(key) || frame.width;
  let dx = s.x, dy = s.y;

  const moving = Math.abs(u.vx) + Math.abs(u.vy) > 4;
  let squashX = 1, squashY = 1, lean = 0;
  if (u.dying) {
    const t = clamp(u.dying / 0.45, 0, 1);
    squashX = 1 + (1 - t) * 0.7;
    squashY = Math.max(0.15, t * 0.9);
  } else if (u.spawnT > 0) {
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
  if (u.lunge > 0) {
    const f = (u.lunge / 0.22) * 7 * z * Math.max(1, u.bodyR / 12);
    dx += Math.cos(u.angle) * f;
    dy += Math.sin(u.angle) * f;
    squashY *= 1 + (u.lunge / 0.22) * 0.18;
  }
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

  if ((b.kind === "fox" || b.kind === "grouse") && b.sub === "aim") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,77,90,${0.25 + Math.sin(G.time * 20) * 0.15})`;
    ctx.beginPath(); ctx.arc(s.x, s.y - 20 * z, 42 * z, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// ================================================================= TÍTULO ===
// Novo fundo inspirado em Dead Cells — masmorra gótica escura
let titleBg = null;
let preTitleBg = null;
let titleMotes = [];
let torchFlicker = 0;

function ensureMotes() {
  if (titleMotes.length) return;
  for (let i = 0; i < 50; i++) {
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
}

/** Partículas de brasa / esporos subindo (animadas por cima do fundo do título). */
export function drawTitleMotes(ctx, time) {
  ensureMotes();
  torchFlicker = Math.sin(time * 7) * 0.15 + Math.sin(time * 3.2) * 0.1;
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
    // glow
    ctx.globalAlpha = a * 0.25;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.size * 2.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTitleBg(ctx) {
  if (!titleBg) bakeTitleBg();
  ctx.drawImage(titleBg, 0, 0);
  // flicker das tochas
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const flick = 0.85 + torchFlicker;
  // tocha esquerda
  let rg = ctx.createRadialGradient(120, 220, 5, 120, 220, 90);
  rg.addColorStop(0, `rgba(255,160,60,${0.35 * flick})`);
  rg.addColorStop(0.5, `rgba(255,120,40,${0.12 * flick})`);
  rg.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(120, 220, 90, 0, TAU); ctx.fill();
  // tocha direita
  rg = ctx.createRadialGradient(VIEW_W - 140, 200, 5, VIEW_W - 140, 200, 80);
  rg.addColorStop(0, `rgba(120,200,255,${0.28 * flick})`);
  rg.addColorStop(0.5, `rgba(80,140,200,${0.1 * flick})`);
  rg.addColorStop(1, "rgba(40,80,120,0)");
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(VIEW_W - 140, 200, 80, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawPreTitleBg(ctx) {
  if (!preTitleBg) bakePreTitleBg();
  ctx.drawImage(preTitleBg, 0, 0);
  // vinheta mais pesada no pre-title
  const vg = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, 100, VIEW_W/2, VIEW_H/2, 600);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,VIEW_W,VIEW_H);
}

function bakePreTitleBg() {
  preTitleBg = document.createElement("canvas");
  preTitleBg.width = VIEW_W; preTitleBg.height = VIEW_H;
  const c = preTitleBg.getContext("2d");
  // fundo muito escuro com gradiente radial
  const g = c.createRadialGradient(VIEW_W/2, VIEW_H/2 - 40, 20, VIEW_W/2, VIEW_H/2 - 40, 700);
  g.addColorStop(0, "#1a1430");
  g.addColorStop(0.3, "#120e22");
  g.addColorStop(0.7, "#0a0812");
  g.addColorStop(1, "#05040a");
  c.fillStyle = g;
  c.fillRect(0,0,VIEW_W,VIEW_H);

  // runas / símbolos no fundo
  c.globalAlpha = 0.04;
  c.fillStyle = "#c77dff";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * VIEW_W;
    const y = Math.random() * VIEW_H;
    const s = 20 + Math.random() * 40;
    c.fillRect(x, y, s, 2);
    c.fillRect(x + s/2 -1, y - s/2, 2, s);
  }
  c.globalAlpha = 1;

  // névoa baixa
  const fog = c.createLinearGradient(0, VIEW_H - 180, 0, VIEW_H);
  fog.addColorStop(0, "rgba(20,16,35,0)");
  fog.addColorStop(1, "rgba(20,16,35,0.6)");
  c.fillStyle = fog;
  c.fillRect(0, VIEW_H - 180, VIEW_W, 180);
}

function bakeTitleBg() {
  // ===== NOVO FUNDO DEAD CELLS: masmorra gótica escura com tochas e cristais ==
  titleBg = document.createElement("canvas");
  titleBg.width = VIEW_W; titleBg.height = VIEW_H;
  const c = titleBg.getContext("2d");
  c.imageSmoothingEnabled = false;

  // base escura
  c.fillStyle = "#0a0812";
  c.fillRect(0,0,VIEW_W,VIEW_H);

  // gradiente de fundo — parede de pedra distante
  const bgGrad = c.createLinearGradient(0,0,0,VIEW_H);
  bgGrad.addColorStop(0, "#151122");
  bgGrad.addColorStop(0.4, "#0f0c1a");
  bgGrad.addColorStop(1, "#0a0812");
  c.fillStyle = bgGrad;
  c.fillRect(0,0,VIEW_W,VIEW_H);

  // ---- PAREDE DE PEDRA com tijolos ----
  const brickW = 48, brickH = 20;
  for (let y = 0; y < VIEW_H; y += brickH) {
    const offset = (Math.floor(y / brickH) % 2) * (brickW/2);
    for (let x = -brickW; x < VIEW_W + brickW; x += brickW) {
      const bx = x + offset;
      // variação de cor
      const v = (bx * 0.013 + y * 0.02) % 1;
      const shade = 12 + Math.sin(v*6.28)*4 + (Math.random()*4);
      const isDark = Math.random() < 0.15;
      c.fillStyle = isDark ? `rgb(${shade},${shade-1},${shade+2})` : `rgb(${shade+8},${shade+6},${shade+12})`;
      c.fillRect(bx + 1, y + 1, brickW - 2, brickH - 2);
      // sombra do tijolo
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.fillRect(bx + 1, y + brickH - 3, brickW - 2, 2);
      c.fillRect(bx + brickW - 3, y + 1, 2, brickH - 2);
    }
  }

  // ---- PILARES / ARCOS ----
  // pilar esquerdo
  c.fillStyle = "#1a1628";
  c.fillRect(0, 0, 42, VIEW_H);
  c.fillStyle = "#241e36";
  c.fillRect(42, 0, 8, VIEW_H);
  // pilar direito
  c.fillStyle = "#1a1628";
  c.fillRect(VIEW_W - 50, 0, 50, VIEW_H);
  c.fillStyle = "#241e36";
  c.fillRect(VIEW_W - 58, 0, 8, VIEW_H);

  // arco superior
  c.fillStyle = "#1e1a30";
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(VIEW_W, 0);
  c.lineTo(VIEW_W, 48);
  c.quadraticCurveTo(VIEW_W/2, 78, 0, 48);
  c.closePath();
  c.fill();
  c.fillStyle = "#2a2340";
  c.fillRect(0, 0, VIEW_W, 4);

  // ---- TOCHAS ----
  const torch = (x, y, color) => {
    // suporte
    c.fillStyle = "#3a2a16";
    c.fillRect(x - 4, y - 30, 8, 36);
    c.fillStyle = "#5a3a22";
    c.fillRect(x - 6, y - 32, 12, 6);
    // chama (será animada por overlay, mas base)
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y - 44);
    c.quadraticCurveTo(x + 8, y - 34, x + 2, y - 28);
    c.quadraticCurveTo(x - 2, y - 32, x, y - 44);
    c.fill();
    // brasa
    c.fillStyle = "#ffd479";
    c.fillRect(x - 2, y - 34, 4, 4);
  };
  torch(120, 220, "#ff7a3d");
  torch(VIEW_W - 140, 200, "#6db7ff");
  torch(200, 380, "#c77dff");
  torch(VIEW_W - 220, 360, "#37e6c8");

  // ---- CORRENTES penduradas ----
  c.strokeStyle = "#2a2338";
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const cx = 80 + i * 160 + Math.random() * 20;
    c.beginPath();
    c.moveTo(cx, 48);
    let py = 48;
    for (let j = 0; j < 8; j++) {
      py += 12 + Math.random()*6;
      c.lineTo(cx + Math.sin(j)*3, py);
    }
    c.stroke();
    // elos
    for (let j = 0; j < 8; j++) {
      const ey = 60 + j * 14;
      c.strokeStyle = j % 2 ? "#3a3450" : "#2a2438";
      c.beginPath();
      c.ellipse(cx, ey, 5, 8, 0, 0, TAU);
      c.stroke();
    }
  }

  // ---- CRISTAIS brilhando na parede (essência) ----
  for (let i = 0; i < 12; i++) {
    const x = 100 + Math.random() * (VIEW_W - 200);
    const y = 80 + Math.random() * 300;
    const col = i % 3 === 0 ? "#c77dff" : i % 3 === 1 ? "#37e6c8" : "#6db7ff";
    c.fillStyle = col;
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(x, y - 8); c.lineTo(x + 5, y); c.lineTo(x, y + 10); c.lineTo(x - 5, y);
    c.closePath(); c.fill();
    c.globalAlpha = 0.15;
    c.beginPath(); c.arc(x, y, 18, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }

  // ---- PORTA / ARCO CENTRAL ao fundo (silhueta) ----
  c.fillStyle = "rgba(0,0,0,0.5)";
  c.beginPath();
  c.moveTo(VIEW_W/2 - 80, VIEW_H);
  c.lineTo(VIEW_W/2 - 80, 220);
  c.quadraticCurveTo(VIEW_W/2, 160, VIEW_W/2 + 80, 220);
  c.lineTo(VIEW_W/2 + 80, VIEW_H);
  c.closePath();
  c.fill();
  // borda do arco
  c.strokeStyle = "#2c2440";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(VIEW_W/2 - 80, VIEW_H);
  c.lineTo(VIEW_W/2 - 80, 220);
  c.quadraticCurveTo(VIEW_W/2, 160, VIEW_W/2 + 80, 220);
  c.lineTo(VIEW_W/2 + 80, VIEW_H);
  c.stroke();

  // névoa / chão
  const fogGrad = c.createLinearGradient(0, VIEW_H - 140, 0, VIEW_H);
  fogGrad.addColorStop(0, "rgba(20,16,35,0)");
  fogGrad.addColorStop(0.5, "rgba(20,16,35,0.4)");
  fogGrad.addColorStop(1, "rgba(10,8,18,0.85)");
  c.fillStyle = fogGrad;
  c.fillRect(0, VIEW_H - 140, VIEW_W, 140);

  // detalhes no chão — pedras, rachaduras
  c.fillStyle = "rgba(0,0,0,0.3)";
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * VIEW_W;
    const y = VIEW_H - Math.random() * 60;
    c.fillRect(x, y, 20 + Math.random()*30, 2);
  }

  // vinheta
  const v = c.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 0.3, VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 1.1);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(0.7, "rgba(0,0,0,0.15)");
  v.addColorStop(1, "rgba(0,0,0,0.65)");
  c.fillStyle = v;
  c.fillRect(0, 0, VIEW_W, VIEW_H);

  // brilho sutil no centro (onde fica o título)
  const centerGlow = c.createRadialGradient(VIEW_W/2 - 100, VIEW_H/2 - 80, 10, VIEW_W/2 - 100, VIEW_H/2 - 80, 320);
  centerGlow.addColorStop(0, "rgba(143,111,214,0.08)");
  centerGlow.addColorStop(1, "rgba(143,111,214,0)");
  c.fillStyle = centerGlow;
  c.fillRect(0,0,VIEW_W,VIEW_H);
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
  const scale = 5 + Math.sin(time * 0.6) * 0.08;
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
export function drawModeSelect(ctx, time) {
  drawTitleBg(ctx);
  drawTitleMotes(ctx, time);

  // overlay escuro
  ctx.fillStyle = "rgba(10,8,18,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // título da tela
  drawText(ctx, "SELECIONE O MODO", VIEW_W/2, 32, { font: "big", scale: 2, color: "#ffd479", align: "center" });
  drawText(ctx, "Cada modo é uma colônia diferente para comandar", VIEW_W/2, 78, { color: "#9a8fc0", align: "center" });

  // linha
  ctx.fillStyle = "rgba(143,111,214,0.3)";
  ctx.fillRect(VIEW_W/2 - 180, 98, 360, 1);
}

export function drawModeCards(ctx, modes, hoverIdx, time) {
  const cardW = 210, cardH = 340, gap = 18;
  const totalW = modes.length * cardW + (modes.length - 1) * gap;
  const startX = VIEW_W/2 - totalW/2;
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

  return rects;
}

// ================================================= TRANSIÇÕES DE TELA ==
let transition = null; // { type, t, dur, from, to, cb }

export function startTransition(type, from, to, dur, cb) {
  transition = { type, t: 0, dur, from, to, cb, midFired: false };
}

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

export function drawTransition(ctx) {
  if (!transition) return;
  const p = clamp(transition.t / transition.dur, 0, 1);
  let alpha = 0;
  if (transition.type === "fade") {
    // fade in/out
    if (p < 0.5) alpha = p * 2;
    else alpha = (1 - p) * 2;
    // actually we want fade to black at middle
    const fadeAlpha = p < 0.5 ? p * 2 : (1 - p) * 2;
    const blackAlpha = 1 - fadeAlpha;
    ctx.fillStyle = `rgba(0,0,0,${blackAlpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (transition.type === "slide") {
    const slideP = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    const x = p < 0.5 ? -slideP * VIEW_W : (1 - slideP) * VIEW_W;
    ctx.fillStyle = `rgba(10,8,18,${0.85 * (1 - Math.abs(p - 0.5)*2)})`;
    ctx.fillRect(x, 0, VIEW_W, VIEW_H);
  } else if (transition.type === "wipe") {
    const wipeW = VIEW_W * (p < 0.5 ? p * 2 : 2 - p * 2);
    ctx.fillStyle = "#0a0812";
    if (p < 0.5) {
      ctx.fillRect(0, 0, wipeW, VIEW_H);
    } else {
      ctx.fillRect(VIEW_W - wipeW, 0, wipeW, VIEW_H);
    }
    // linha brilhante na borda do wipe
    ctx.fillStyle = "#8f6fd6";
    const lineX = p < 0.5 ? wipeW : VIEW_W - wipeW;
    ctx.fillRect(lineX, 0, 3, VIEW_H);
  }
}

export function hasTransition() { return !!transition; }
export function transitionProgress() { return transition ? clamp(transition.t / transition.dur, 0, 1) : 0; }
