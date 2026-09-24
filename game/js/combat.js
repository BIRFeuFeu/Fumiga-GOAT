import { fruitProjectile, fruitOrbSpeed, fruitOrbExtra } from "./fruit_effects.js";
// ============================================================================
// FUMIGA-GOAT — projéteis e orbes de essência V2 com efeitos visuais
// ============================================================================
import { rand, dist2, TAU } from "./utils.js";
import {
  spawnPart, burst, ring, floatText,
  impact, explosion, essenceCollect, slashTrail, dashTrail
} from "./particles.js";
import { SFX } from "./audio.js";
import { world } from "./world.js";
import { shake } from "./camera.js";
import { mods } from "./state.js";

export const projectiles = [];
export const orbs = [];

export function clearCombat() { projectiles.length = 0; orbs.length = 0; }

export function spawnProj(o) {
  projectiles.push(fruitProjectile({
    isProjectile:true, originX:o.x, originY:o.y, owner:o.owner,
    x: o.x, y: o.y,
    vx: o.vx, vy: o.vy,
    dmg: o.dmg,
    faction: o.faction,
    color: o.color || "#8fe87f",
    slow: o.slow || 0,
    venom: o.venom || false,
    weaken: o.weaken || 0,
    bounces: o.bounces || 0,
    aoe: o.aoe || 0,
    burnDps: o.burnDps || 0,
    burnDur: o.burnDur || 0,
    arc: !!o.arc,
    t: 0,
    life: 2.2,
    size: o.size || 2.5,
    trail: [],
  }));
}

export function updateProjectiles(dt, allies, foes) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.t = (p.t || 0) + dt;
    p.x += p.vx * dt; p.y += p.vy * dt;

    // trilha
    p.trail.push({ x: p.x, y: p.y, life: 0.25 });
    if (p.trail.length > 6) p.trail.shift();
    for (const tr of p.trail) tr.life -= dt;
    p.trail = p.trail.filter(t => t.life > 0);

    if (p.arc && Math.random() < 0.75) {
      spawnPart({ x: p.x, y: p.y, life: 0.5, size: 2.2, sizeEnd: 0.3,
        color: Math.random() < 0.5 ? "#ff9a3d" : "#ff5a2a", glow: true, drag: 1, shape: "circle" });
      if (Math.random() < 0.15) {
        spawnPart({ x: p.x, y: p.y, vx: rand(-20,20), vy: rand(-30,-5), life: 0.6, size: 1.2, sizeEnd: 0.2, color: "#ff7a3d", glow: false, drag: 0.92, g: 30 });
      }
    } else if (!p.arc && Math.random() < 0.6) {
      spawnPart({ x: p.x, y: p.y, life: 0.35, size: 1.8, sizeEnd: 0.4, color: p.color, glow: true, drag: 1, shape: "spark" });
    }

    if (p.life <= 0) { projectiles.splice(i, 1); continue; }

    const targets = p.faction === "ally" ? foes : allies;
    let hit = null;
    for (const t of targets) {
      if (t.dead || t.dying) continue;
      const rr = (t.bodyR || 12) + p.size + 2;
      if (dist2(p.x, p.y, t.x, t.y) < rr * rr) { hit = t; break; }
    }
    if (!hit && p.faction === "enemy") {
      const q = allies.queen;
      if (q && !q.dead) {
        const A = world.anthill;
        if (dist2(p.x, p.y, A.x, A.y) < 90 * 90) hit = q;
      }
    }
    if (hit) {
      hit.takeDamage(p.dmg, p.faction === "ally" ? "ally" : "enemy", p);
      if (p.aoe > 0) {
        for (const t of targets) {
          if (t === hit || t.dead || t.dying) continue;
          const rr = p.aoe + (t.bodyR || 12);
          if (dist2(p.x, p.y, t.x, t.y) < rr * rr) t.takeDamage(p.dmg * 0.6, p.faction === "ally" ? "ally" : "enemy", p);
        }
        if (p.burnDur > 0) {
          for (const t of targets) {
            if (t.dead || t.dying) continue;
            const rr = p.aoe + (t.bodyR || 12);
            if (dist2(p.x, p.y, t.x, t.y) < rr * rr) {
              t.burnT = Math.max(t.burnT || 0, p.burnDur);
              t.burnDps = Math.max(t.burnDps || 0, p.burnDps);
            }
          }
        }
        explosion(p.x, p.y, p.aoe, "#ff7a3d");
        shake(0.35);
        SFX.boom();
      } else {
        impact(p.x, p.y, { color: p.color, power: 1.1 });
        if (p.faction === "ally") {
          slashTrail(p.x, p.y, Math.atan2(p.vy, p.vx), p.color);
          // FORMIGA-ACROBATA (Crematogaster): o veneno espumante corrói o
          // inimigo com o tempo (queimadura leve, reaproveita o sistema)
          if (p.venom) {
            hit.burnT = Math.max(hit.burnT || 0, 2.4 * mods().venomTime);
            hit.burnDps = Math.max(hit.burnDps || 0, 4 * mods().venomDps);
          }
        }
      }
      if (p.bounces > 0) {
        let next = null, bd = Infinity;
        for (const t of targets) {
          if (t === hit || t.dead || t.dying) continue;
          const d = dist2(p.x, p.y, t.x, t.y);
          if (d < bd && d < 160 * 160) { bd = d; next = t; }
        }
        if (next) {
          p.bounces--;
          p.dmg *= 0.6;
          const d = Math.sqrt(bd) || 1;
          const sp = Math.hypot(p.vx, p.vy);
          p.vx = ((next.x - p.x) / d) * sp;
          p.vy = ((next.y - p.y) / d) * sp;
          // ricochete visual
          ring(p.x, p.y, { r0: 2, r1: 18, life: 0.2, color: p.color, width: 2 });
          continue;
        }
      }
      projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles(ctx, w2s) {
  // trilha primeiro
  for (const p of projectiles) {
    if (!p.trail) continue;
    for (const tr of p.trail) {
      const s = w2s(tr.x, tr.y);
      const a = tr.life / 0.25;
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = p.color;
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of projectiles) {
    const s = w2s(p.x, p.y);
    // glow externo
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size * 3.5, 0, TAU);
    ctx.fill();
    // núcleo
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size, 0, TAU);
    ctx.fill();
    // brilho central branco
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------- essência -----
export function dropOrb(x, y, amt) {
  for (let i = 0; i < amt; i++) {
    if (orbs.length > 180) { orbs[0].amt += 1; break; }
    orbs.push({
      x: x + rand(-8, 8), y: y + rand(-8, 8),
      vx: rand(-46, 46), vy: rand(-66, -20),
      amt: 1, t: 0, delay: rand(0.35, 0.8),
      phase: rand(0, TAU),
    });
  }
}

export function updateOrbs(dt, anthill, queenAlive) {
  let gained = 0;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.t += dt;
    if (o.t < o.delay) {
      o.vx *= 0.92; o.vy = o.vy * 0.92 + 30 * dt;
      o.x += o.vx * dt; o.y += o.vy * dt;
      continue;
    }
    if (!queenAlive) continue;
    const dx = anthill.x - o.x, dy = anthill.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(620, 120 + o.t * o.t * 1100) * fruitOrbSpeed();
    o.x += (dx / d) * sp * dt;
    o.y += (dy / d) * sp * dt;
    if (d < 40) {
      gained += o.amt * (1 + mods().fruitEssOrb + fruitOrbExtra());
      essenceCollect(o.x, o.y);
      spawnPart({ x: o.x, y: o.y, life: 0.5, size: 3, sizeEnd: 0.4, color: "#c77dff", glow: true, drag: 1, shape: "circle" });
      orbs.splice(i, 1);
    }
  }
  if (gained > 0) SFX.coin();
  return gained;
}

export function drawOrbs(ctx, w2s, time) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const o of orbs) {
    const s = w2s(o.x, o.y);
    const wob = Math.sin(time * 6 + o.phase) * 1.8;
    const pulse = 0.8 + Math.sin(time * 4 + o.x * 0.01) * 0.2;
    // glow
    ctx.fillStyle = "#c77dff";
    ctx.globalAlpha = 0.25 * pulse;
    ctx.beginPath(); ctx.arc(s.x, s.y + wob, 8, 0, TAU); ctx.fill();
    // FASE 2 (P11): núcleo hexagonal — cristal de memória, não orbe genérico
    ctx.globalAlpha = 0.9 * pulse;
    ctx.fillStyle = "#d8b4ff";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU - Math.PI / 2;
      const px = s.x + Math.cos(a) * 3.2, py = s.y + wob + Math.sin(a) * 3.2;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // luz interna
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(s.x - 0.5, s.y - 1 + wob, 1, 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
