// ============================================================================
// FUMIGA-GOAT — projéteis e orbes de essência
// ============================================================================
import { rand, dist2, TAU } from "./utils.js";
import { spawnPart, burst, ring, floatText } from "./particles.js";
import { SFX } from "./audio.js";
import { world } from "./world.js";

export const projectiles = [];
export const orbs = [];

export function clearCombat() { projectiles.length = 0; orbs.length = 0; }

export function spawnProj(o) {
  projectiles.push({
    x: o.x, y: o.y,
    vx: o.vx, vy: o.vy,
    dmg: o.dmg,
    faction: o.faction,         // 'ally' | 'enemy'
    color: o.color || "#8fe87f",
    slow: o.slow || 0,          // fração de lentidão aplicada (2s)
    weaken: o.weaken || 0,      // redução de dano aplicada (3s)
    bounces: o.bounces || 0,
    aoe: o.aoe || 0,
    burnDps: o.burnDps || 0,
    burnDur: o.burnDur || 0,
    arc: !!o.arc,
    t: 0,
    life: 2.2,
    size: o.size || 2.5,
  });
}

// alvo implícito: quem devolve dano com contato — resolvido em enemies/units
export function updateProjectiles(dt, allies, foes) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.t = (p.t || 0) + dt;
    p.x += p.vx * dt; p.y += p.vy * dt;

    // projéteis "lob" (bombeira) têm altura visual e rastro de brasa
    if (p.arc && Math.random() < 0.7) {
      spawnPart({ x: p.x, y: p.y, life: 0.45, size: 2, sizeEnd: 0.3,
        color: Math.random() < 0.5 ? "#ff9a3d" : "#ff5a2a", glow: true, drag: 1 });
    } else if (!p.arc && Math.random() < 0.5) {
      spawnPart({ x: p.x, y: p.y, life: 0.3, size: 1.5, sizeEnd: 0.4, color: p.color, glow: true, drag: 1 });
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
      // projéteis inimigos também acertam a rainha
      const q = allies.queen;
      if (q && !q.dead) {
        const A = world.anthill;
        if (dist2(p.x, p.y, A.x, A.y) < 90 * 90) hit = q;
      }
    }
    if (hit) {
      hit.takeDamage(p.dmg, p.faction === "ally" ? "ally" : "enemy", p);
      if (p.aoe > 0) {
        // EXPLOSÃO EM ÁREA: meio dano ao redor + queimadura
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
        ring(p.x, p.y, { r0: 6, r1: p.aoe, life: 0.4, color: "#ff9a3d", width: 3 });
        ring(p.x, p.y, { r0: 3, r1: p.aoe * 1.4, life: 0.5, color: "#ff5a2a", width: 2 });
        burst(p.x, p.y, { n: 22, color: ["#ff9a3d", "#ff5a2a", "#ffd479"], spMin: 40, spMax: 220, life: 0.5, sizeMin: 1.5, sizeMax: 3.5, glow: true, g: 60 });
        burst(p.x, p.y, { n: 10, color: ["#3a2418", "#241812"], spMin: 10, spMax: 80, life: 0.8, sizeMin: 2, sizeMax: 4, g: -40 });
        SFX.boom();
      } else {
        burst(p.x, p.y, { n: 5, color: p.color, spMin: 10, spMax: 60, life: 0.35, sizeMin: 1, sizeMax: 2.4, glow: true });
      }
      if (p.bounces > 0) {
        // ricochete: próximo alvo próximo
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
          continue;
        }
      }
      projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles(ctx, w2s) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of projectiles) {
    const s = w2s(p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(s.x - p.size, s.y - p.size, p.size * 2, p.size * 2);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(s.x - p.size * 1.9, s.y - p.size * 1.9, p.size * 3.8, p.size * 3.8);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------- essência -----
export function dropOrb(x, y, amt) {
  for (let i = 0; i < amt; i++) {
    if (orbs.length > 150) { orbs[0].amt += 1; break; }
    orbs.push({
      x: x + rand(-8, 8), y: y + rand(-8, 8),
      vx: rand(-46, 46), vy: rand(-66, -20),
      amt: 1, t: 0, delay: rand(0.35, 0.8),
    });
  }
}

/** updateOrbs: orbes voam ao formigueiro após um instante. Retorna essência coletada. */
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
    const sp = Math.min(520, 120 + o.t * o.t * 900);
    o.x += (dx / d) * sp * dt;
    o.y += (dy / d) * sp * dt;
    if (d < 40) {
      gained += o.amt;
      spawnPart({ x: o.x, y: o.y, life: 0.4, size: 2.4, sizeEnd: 0.4, color: "#c77dff", glow: true, drag: 1 });
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
    const wob = Math.sin(time * 6 + o.x) * 1.5;
    ctx.fillStyle = "#c77dff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(s.x - 1.5, s.y - 3 + wob, 3, 6);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(s.x - 3, s.y - 5 + wob, 6, 10);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
