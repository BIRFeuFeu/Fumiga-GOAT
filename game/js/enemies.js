// ============================================================================
// FUMIGA — inimigos (colônia rival + predadores) e chefes de mapa
// Chefes: hare (mapa 1) · fox (2) · grouse (3) · matriarch (4) · deer (5) · boar (6)
// ============================================================================
import { ENEMIES, ENEMY_SCALE, BOSSES, WORLD_W, WORLD_H, XP_KILL_FRAC, XP_BOSS, ascMods } from "./config.js";
import { mods, G } from "./state.js";
import { world, collide, smashProps } from "./world.js";
import { rand, dist, dist2, clamp, angLerp, nextId, TAU, easeOutCubic } from "./utils.js";
import { burst, ring, scent, floatText, spawnPart, impact, bloodSplatter, explosion, dustPoof, levelUpBurst } from "./particles.js";
import { SFX } from "./audio.js";
import { spawnProj, dropOrb } from "./combat.js";
import { shake } from "./camera.js";

export const foes = [];
export let boss = null;

export function clearFoes() { foes.length = 0; boss = null; }

// ------------------------------------------------------------------ spawn ---
const UNLOCK = { runner: 1, swarm: 1, reaper: 3, espitter: 5, warrior: 7, sentinel: 12, matron: 15 };
export function unlockedTypes(wave) {
  return Object.keys(UNLOCK).filter(k => UNLOCK[k] <= wave);
}

export function spawnEnemy(typeId, x, y, wave) {
  const b = ENEMIES[typeId];
  const hpMul = 1 + ENEMY_SCALE.hp * (wave - 1);
  const dmMul = 1 + ENEMY_SCALE.dmg * (wave - 1);
  // ASCENSÃO DA NÉVOA: a horda lembra das vitórias anteriores
  const asc = G.run && G.run.ascension ? ascMods(G.run.ascension) : null;
  const e = {
    id: nextId(), type: typeId, def: b, faction: "enemy",
    x, y, vx: 0, vy: 0, angle: rand(0, TAU),
    hp: Math.round(b.hp * hpMul * (asc ? asc.hp : 1)), maxHp: Math.round(b.hp * hpMul * (asc ? asc.hp : 1)),
    dmg: b.dmg * dmMul * (asc ? asc.dmg : 1), speed: b.speed * rand(0.92, 1.08) * (asc ? asc.speed : 1),
    range: b.range, atkCd: b.atkCd,
    bodyR: typeId === "matron" ? 22 : typeId === "sentinel" ? 16 : typeId === "warrior" ? 13 : 9,
    state: "hunt", target: null, atkT: rand(0, 0.5), thinkT: rand(0, 0.2),
    bob: rand(0, TAU), hitT: 0, stunT: 0, slowT: 0, weakT: 0, revealT: 0,
    burnT: 0, burnDps: 0,
    kbX: 0, kbY: 0,
    spawnMarks: typeId === "matron" ? 0 : null,
    dead: false, dying: 0,
    takeDamage(dmg, from, proj) {
      if (this.dead || this.dying) return;
      const mm = mods();
      this.hp -= dmg;
      this.hitT = 0.12;
      this.revealT = 5; // golpeado: fica marcado no fog of war por 5s
      floatText(this.x + rand(-6, 6), this.y - this.bodyR - 8,
        Math.round(dmg), { color: dmg >= 25 ? "#ffd479" : "#efe9ff", life: 0.6 });
      if (proj && proj.slow) { this.slowT = 2; }
      if (proj && proj.weaken) { this.weakT = 3; }
      if (mm.muts.weakenOnHit && from === "ally") this.weakT = 3;
      if (this.hp <= 0) killEnemy(this);
      else if (this.type === "matron" && this.spawnMarks !== null) {
        // matrona bota rastejantes em 66% e 33% de vida
        const frac = this.hp / this.maxHp;
        if (this.spawnMarks === 0 && frac <= 0.66) { this.spawnMarks = 1; spawnAdds(this, 2); }
        else if (this.spawnMarks === 1 && frac <= 0.33) { this.spawnMarks = 2; spawnAdds(this, 3); }
      }
    },
    applyThorns(d) { this.takeDamage(d, "ally"); },
    weakMult() { return this.weakT > 0 ? 0.85 : 1; },
  };
  foes.push(e);
  return e;
}

function spawnAdds(mother, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    spawnEnemy(ENEMIES[mother.def.spawns] ? mother.def.spawns : "runner",
      mother.x + Math.cos(a) * 24, mother.y + Math.sin(a) * 24, G.run ? G.run.wave : 1);
  }
  burst(mother.x, mother.y, { n: 16, color: ["#a32e46", "#ff4d5a"], spMin: 30, spMax: 120, life: 0.5, sizeMin: 1, sizeMax: 3 });
  SFX.stinger();
}

function killEnemy(e) {
  if (e.dying) return;
  e.dead = true;
  e.dying = 0.4;
  bloodSplatter(e.x, e.y, e.bodyR > 15 ? "#a32e46" : "#ff4d5a");
  burst(e.x, e.y, {
    n: e.bodyR > 15 ? 24 : 14,
    color: ["#ff4d5a", "#a32e46", "#6e2537", "#3a2c4c"],
    spMin: 25, spMax: 140, life: 0.6, sizeMin: 1.2, sizeMax: 3.2, g: 60,
  });
  impact(e.x, e.y, { color: "#ff4d5a", power: e.bodyR > 15 ? 1.6 : 1 });
  if (e.bodyR > 15) dustPoof(e.x, e.y, 8);
  SFX.splat();
  dropOrb(e.x, e.y, e.def.ess);
  const run = G.run;
  if (run) {
    run.kills++;
    run.xp += Math.round(Math.max(2, Math.round((e.def.ess || 2) * XP_KILL_FRAC)) * mods().xpGain);
  }
}

function tickBurn(u, dt, onDeath) {
  if (u.burnT > 0) {
    u.burnT -= dt;
    u.hp -= (u.burnDps || 0) * dt;
    if (Math.random() < dt * 14) {
      spawnPart({ x: u.x + rand(-6, 6), y: u.y - 6, vx: rand(-8, 8), vy: rand(-38, -18),
        life: rand(0.3, 0.6), size: rand(1.4, 2.6), sizeEnd: 0.4,
        color: Math.random() < 0.6 ? "#ff9a3d" : "#ff5a2a", glow: true, drag: 1 });
    }
    if (u.hp <= 0) { onDeath(u); return true; }
  }
  return false;
}

// ------------------------------------------------------------------ alvos ---
function pickTarget(e, allies) {
  // prefere a aliada mais próxima; GUARDA puxa aggro (taunt)
  let best = null, bs = Infinity;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    let d = dist2(e.x, e.y, a.x, a.y);
    if (a.st && a.st.taunt) d *= 0.45; // tanques parecem mais próximos
    if (d < bs) { bs = d; best = a; }
  }
  if (best && Math.sqrt(bs) < 175) return best;
  return null;
}

// ----------------------------------------------------------------- update ---
export function updateFoes(dt, allies) {
  for (let i = foes.length - 1; i >= 0; i--) {
    const e = foes[i];
    if (e.isBoss) continue; // chefes têm IA própria (updateBoss)
    if (e.dying) {
      e.dying -= dt;
      if (e.dying <= 0) foes.splice(i, 1);
      continue;
    }
    updateEnemy(e, dt, allies);
  }
  // separação barata inimigo-inimigo (amostragem)
  for (let i = 0; i < foes.length; i += 3) {
    const e = foes[i];
    if (!e || e.dead || e.isBoss) continue;
    for (let j = i + 1; j < Math.min(i + 10, foes.length); j++) {
      const o = foes[j];
      if (o.dead || o.isBoss) continue;
      const dx = e.x - o.x, dy = e.y - o.y;
      const d2 = dx * dx + dy * dy, rr = e.bodyR + o.bodyR + 4;
      if (d2 > 0.01 && d2 < rr * rr) {
        const d = Math.sqrt(d2), f = (rr - d) / rr * 30 * dt;
        e.x += (dx / d) * f; e.y += (dy / d) * f;
        o.x -= (dx / d) * f; o.y -= (dy / d) * f;
      }
    }
  }
}

function updateEnemy(e, dt, allies) {
  e.atkT = Math.max(0, e.atkT - dt);
  e.hitT = Math.max(0, e.hitT - dt);
  e.revealT = Math.max(0, (e.revealT || 0) - dt);
  e.stunT = Math.max(0, e.stunT - dt);
  e.slowT = Math.max(0, e.slowT - dt);
  e.weakT = Math.max(0, e.weakT - dt);
  // queimadura (bombeiras / mutações)
  if (tickBurn(e, dt, killEnemy)) return;
  // knockback
  if (Math.abs(e.kbX) > 1 || Math.abs(e.kbY) > 1) {
    e.x += e.kbX * dt; e.y += e.kbY * dt;
    e.kbX *= 0.86; e.kbY *= 0.86;
  }
  if (e.stunT > 0) return;

  // (rastro pálido removido — o Manto da Névoa em spritesheet o substitui)
  e.thinkT -= dt;
  if (e.thinkT <= 0) {
    e.thinkT = 0.18;
    e.target = pickTarget(e, allies);
  }

  const q = allies.queen;

  if (e.target) {
    const t = e.target;
    const rr = e.range + (t.bodyR || 12);
    const d = dist(e.x, e.y, t.x, t.y);
    const sp = e.slowT > 0 ? 0.7 : 1;
    e.angle = angLerp(e.angle, Math.atan2(t.y - e.y, t.x - e.x), 1 - Math.pow(0.0001, dt));
    if (e.def.projSpeed) {
      if (d > e.range * 0.9) walkTo(e, t.x, t.y, dt, sp);
      else if (d < e.range * 0.5) walkTo(e, e.x + (e.x - t.x), e.y + (e.y - t.y), dt, sp * 0.6);
      if (d <= e.range && e.atkT <= 0) {
        e.atkT = e.atkCd;
        const dd = Math.max(1, d);
        spawnProj({
          x: e.x + Math.cos(e.angle) * 10, y: e.y + Math.sin(e.angle) * 10,
          vx: ((t.x - e.x) / dd) * e.def.projSpeed, vy: ((t.y - e.y) / dd) * e.def.projSpeed,
          dmg: e.dmg * e.weakMult(), faction: "enemy", color: "#ff8fb0",
        });
        SFX.spit();
      }
    } else {
      if (d > rr) walkTo(e, t.x, t.y, dt, sp);
      else if (e.atkT <= 0) {
        e.atkT = e.atkCd;
        t.takeDamage(e.dmg * e.weakMult(), "enemy", e);
        e.lunge = 0.2;
        if (Math.random() < 0.6) SFX.bite();
        burst(e.x + Math.cos(e.angle) * 10, e.y + Math.sin(e.angle) * 10,
          { n: 3, color: "#ff4d5a", spMin: 10, spMax: 50, life: 0.3, sizeMin: 1, sizeMax: 2 });
      }
    }
  } else if (q && !q.dead) {
    // marcha até a rainha
    const A = world.anthill;
    const d = dist(e.x, e.y, A.x, A.y);
    const sp = e.slowT > 0 ? 0.7 : 1;
    e.angle = angLerp(e.angle, Math.atan2(A.y - e.y, A.x - e.x), 1 - Math.pow(0.001, dt));
    if (d > world.anthill.r - 6 + (e.def.projSpeed ? 30 : 0)) {
      walkTo(e, A.x + rand(-14, 14), A.y + rand(-14, 14), dt, sp);
      if (Math.random() < dt * 6) scent(e.x, e.y, "#ff4d5a");
    } else if (e.atkT <= 0 && d < 130) {
      e.atkT = e.atkCd;
      q.takeDamage(e.dmg * e.weakMult());
      e.lunge = 0.2;
      shake(0.22);
      burst(A.x + rand(-30, 30), A.y + rand(-30, 30), { n: 8, color: ["#ff4d5a", "#a32e46"], spMin: 20, spMax: 90, life: 0.4 });
      G.run.queenJustHit = 0.3;
    }
  } else {
    // sem alvos: vagar
    walkTo(e, e.x + rand(-50, 50), e.y + rand(-50, 50), dt, 0.4);
  }

  const c = collide(e.x, e.y, e.bodyR);
  e.x = c.x; e.y = c.y;
}

function walkTo(e, tx, ty, dt, spMult = 1) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return;
  const sp = e.speed * spMult;
  e.vx = (dx / d) * sp; e.vy = (dy / d) * sp;
  e.x += e.vx * dt; e.y += e.vy * dt;
  e.bob += dt * sp * 0.11;
}

// =============================================================== CHEFES =====
export function spawnBoss(kind, wave) {
  const b = BOSSES[kind];
  // ASCENSÃO DA NÉVOA: chefes mais fortes (todos os campos de golpe escalam)
  const asc = G.run && G.run.ascension ? ascMods(G.run.ascension) : null;
  let bd = b;
  if (asc) {
    bd = { ...b };
    for (const k of Object.keys(bd)) if (k === "dmg" || k.endsWith("Dmg")) bd[k] = Math.round(bd[k] * asc.bossDmg);
  }
  const A = world.anthill;
  const B = {
    id: nextId(), kind, def: bd, faction: "enemy", isBoss: true,
    // nasce na borda oposta ao formigueiro
    x: clamp(A.x < WORLD_W / 2 ? WORLD_W - 320 : 320, 260, WORLD_W - 260),
    y: clamp(A.y > WORLD_H / 2 ? 260 : WORLD_H - 260, 220, WORLD_H - 220),
    vx: 0, vy: 0, angle: Math.PI / 2,
    hp: Math.round(b.hp * (asc ? asc.bossHp : 1)), maxHp: Math.round(b.hp * (asc ? asc.bossHp : 1)),
    bodyR: kind === "boar" || kind === "deer" ? 52 : kind === "matriarch" ? 60 : 40,
    state: "stalk", t: 0, atkT: 3, special: 2.2, sub: "walk",
    animT: 0, dir: 0, frame: 0,
    chain: 0,                  // golpes em sequência (lebre)
    trailX: null, trailY: null,
    burnT: 0, burnDps: 0,
    dead: false, dying: 0, summonMarks: 0,
    hitT: 0, stunT: 0, slowT: 0, weakT: 0,
    takeDamage(dmg) {
      if (this.dead || this.dying) return;
      this.hp -= dmg;
      this.hitT = 0.12;
      this.revealT = 5; // golpeado: a colônia marca sua posição (fog of war)
      floatText(this.x + rand(-14, 14), this.y - 52, Math.round(dmg), {
        color: dmg >= 40 ? "#ffd479" : "#efe9ff", life: 0.7, scale: dmg >= 40 ? 2 : 1,
      });
      if (this.hp <= 0) killBoss(this);
    },
    applyThorns(d) { this.takeDamage(d); },
    weakMult() { return 1; },
  };
  foes.push(B);
  boss = B;
  SFX.roar();
  shake(0.7);
  return B;
}

function killBoss(b) {
  b.dead = true; b.dying = 2.2;
  const run = G.run;
  if (run) { run.kills++; run.xp += Math.round(XP_BOSS * mods().xpGain); run.mapsCleared++; }
  dropOrb(b.x, b.y, b.def.ess);
  shake(1.2);
  explosion(b.x, b.y, 140, "#ffd479");
  ring(b.x, b.y, { r0: 10, r1: 190, life: 0.7, color: "#ffd479", width: 5 });
  burst(b.x, b.y, { n: 70, color: ["#ffd479", "#ff7a3d", "#ff4d5a", "#c77dff", "#fff"], spMin: 40, spMax: 280, life: 1, sizeMin: 1.8, sizeMax: 4.5, glow: true });
  levelUpBurst(b.x, b.y);
  SFX.roar();
  SFX.slam();
}

export function updateBoss(dt, allies) {
  const b = boss;
  if (!b) return;
  if (b.dying) {
    b.dying -= dt * 0.55; // morte lenta cinematográfica
    b.animT += dt;
    if (Math.random() < dt * 8)
      burst(b.x + rand(-40, 40), b.y + rand(-30, 30),
        { n: 4, color: ["#ff7a3d", "#3a2c4c"], spMin: 10, spMax: 60, life: 0.6 });
    if (b.dying <= 0) {
      const idx = foes.indexOf(b);
      if (idx >= 0) foes.splice(idx, 1);
      const run = G.run;
      if (run) run.bossDefeated = b.kind;
      boss = null;
    }
    return;
  }
  b.animT += dt;
  b.special -= dt;
  b.atkT -= dt;
  b.hitT = Math.max(0, b.hitT - dt);
  b.revealT = Math.max(0, (b.revealT || 0) - dt);
  b.phase2T = Math.max(0, (b.phase2T || 0) - dt);
  b.invisibleT = Math.max(0, (b.invisibleT || 0) - dt);
  if (tickBurn(b, dt, killBoss)) return;

  // --- FASE 2: <50% vida ---
  if (!b.phase2 && b.hp / b.maxHp < 0.5) {
    b.phase2 = true;
    b.phase2T = 2.5;
    const p2 = b.def.phase2;
    // VFX névoa branca despertando
    burst(b.x, b.y, { n: 40, color: ["#e8f4ff", "#c77dff", "#ffd479", "#fff"], spMin: 30, spMax: 180, life: 1.2, glow: true });
    ring(b.x, b.y, { r0: 20, r1: 260, life: 1.0, color: "#e8f4ff", width: 6 });
    ring(b.x, b.y, { r0: 10, r1: 180, life: 0.8, color: "#c77dff", width: 4 });
    floatText(b.x, b.y - 80, p2 ? p2.phrase : "A NÉVOA DESPERTA!", { color: "#ffd479", life: 2.4, scale: 2 });
    SFX.roar();
    // Era-specific buffs applied in per-boss updaters via b.phase2 check
    if (b.kind === "hare") {
      b.def = { ...b.def, dashChain: p2.dashChain, thumpRange: p2.thumpRange, thumpDmg: p2.thumpDmg, speed: p2.speed };
    } else if (b.kind === "fox") {
      b.invisibleT = p2.invisibleDur;
    } else if (b.kind === "grouse" && G.run) {
      G.run.invertT = p2.invertDur;
      floatText(world.anthill.x, world.anthill.y - 100, "CONTROLES INVERTIDOS!", { color: "#a8c8e8", life: 1.2, scale: 1.5 });
    } else if (b.kind === "matriarch") {
      // frenesi imediato
      matriarchFrenzy(b, p2.summonCount);
    } else if (b.kind === "deer") {
      // folhas douradas curam tristeza
      for (let i=0;i<12;i++) {
        spawnPart({ x: b.x + rand(-60,60), y: b.y - 40, vx: rand(-20,20), vy: rand(10,30), life: rand(2,4), size: rand(2,4), color: "#ff9a5c", glow: false, drag: 1 });
      }
    } else if (b.kind === "boar") {
      // névoa atrás
      for (let i=0;i<20;i++) {
        spawnPart({ x: b.x + rand(-120,120), y: b.y + rand(60,120), vx: rand(-10,10), vy: rand(-20,-5), life: rand(2,4), size: rand(3,6), color: "#e8f4ff", glow: true, drag: 1 });
      }
    }
  }
  // fase 2 active VFX pulse
  if (b.phase2 && Math.random() < 0.08) {
    spawnPart({ x: b.x + rand(-30,30), y: b.y + rand(-20,20), vx: rand(-10,10), vy: rand(-20,-5), life: rand(0.8,1.5), size: rand(1.5,3), color: "#e8f4ff", glow: true });
  }
  // fox invisível
  if (b.kind === "fox" && b.invisibleT > 0) {
    // pisca
    if (Math.floor(G.time*12) % 2 === 0) {
      // não desenha? mas deixa rastro
      if (Math.random() < 0.15) spawnPart({ x: b.x, y: b.y, life: 0.3, size: 2, color: "#8f7bb5", glow: true });
    }
  }


  const q = allies.queen;
  const A = world.anthill;

  switch (b.kind) {
    case "hare":      updateHare(b, dt, allies, q, A); break;
    case "fox":       updateFox(b, dt, allies, q, A); break;
    case "grouse":    updateGrouse(b, dt, allies, q, A); break;
    case "matriarch": updateMatriarch(b, dt, allies, q, A); break;
    case "deer":      updateDeer(b, dt, allies, q, A); break;
    default:          updateBoar(b, dt, allies, q, A); break;
  }

  const c = collide(b.x, b.y, b.bodyR * 0.55);
  b.x = c.x; b.y = c.y;

  // ciclos sem deslocamento: o chefe ESMAGA obstáculos e cria caminho próprio
  const moved = Math.hypot(b.x - (b._px ?? b.x), b.y - (b._py ?? b.y));
  const want = (Math.abs(b.vx) + Math.abs(b.vy)) * dt;
  if (b.sub === "walk" && want > 0.1) {
    b._stuckT = moved < want * 0.35 ? (b._stuckT || 0) + dt : 0;
  } else b._stuckT = 0;
  b._px = b.x; b._py = b.y;
  if ((b._stuckT || 0) > 0.7) {
    b._stuckT = 0;
    const smashed = smashProps(b.x, b.y, b.bodyR + 42);
    if (smashed.length) {
      SFX.slam(); shake(0.5);
      floatText(b.x, b.y - 60, "ELE ABRE CAMINHO!", { color: "#ffd479", life: 1 });
      for (const p of smashed) {
        burst(p.x, p.y, {
          n: 16, color: [/tree|cactus|fern|bush/.test(p.img) ? "#5d8a4c" : "#8a8497", "#7d5a3a", "#d8cba8"],
          spMin: 50, spMax: 230, life: 0.6, sizeMin: 1.5, sizeMax: 3.5, g: 420,
        });
      }
    }
  }
}

function nearestPackTarget(b, allies, maxD = 9999) {
  let best = null, bd = Infinity;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const d = dist2(b.x, b.y, a.x, a.y);
    if (d < bd && d < maxD * maxD) { bd = d; best = a; }
  }
  return best;
}

function countNear(b, allies, r) {
  let n = 0;
  for (const a of allies) if (!a.dead && !a.dying && dist2(b.x, b.y, a.x, a.y) < r * r) n++;
  return n;
}

function bossWalk(b, tx, ty, dt, speed) {
  const dx = tx - b.x, dy = ty - b.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  b.vx = (dx / d) * speed; b.vy = (dy / d) * speed;
  b.x += b.vx * dt; b.y += b.vy * dt;
  // direção 0=baixo 1=esq 2=dir 3=cima
  if (Math.abs(dx) > Math.abs(dy)) b.dir = dx > 0 ? 2 : 1;
  else b.dir = dy > 0 ? 0 : 3;
  return d < 20;
}

function queenContact(b, q, A, atkCd, dmg, shakeAmt) {
  if (!q || q.dead) return false;
  if (dist2(b.x, b.y, A.x, A.y) < (b.bodyR + 84) * (b.bodyR + 84) && b.atkT <= 0) {
    b.atkT = atkCd;
    q.takeDamage(dmg);
    shake(shakeAmt);
    burst(A.x + rand(-30, 30), A.y + rand(-30, 30), { n: 10, color: "#ff4d5a", spMin: 30, spMax: 110, life: 0.4 });
    return true;
  }
  return false;
}

// dashes genéricos (lebre / raposa / tetraz / veado) ---------------------------
function dashAim(b, dt, aimT, nextT, speed) {
  b.t -= dt;
  if (b.t <= 0) {
    b.sub = "dash"; b.t = nextT;
    const ang = Math.atan2(b.ty - b.y, b.tx - b.x);
    b.trailX = Math.cos(ang); b.trailY = Math.sin(ang);
    b._dashSpeed = speed;
    b._dashHit = 0;
    SFX.whoosh();
  }
}

function dashStep(b, dt, allies, dmg, onEnd) {
  b.t -= dt;
  const sp = b._dashSpeed || 640;
  b.x += b.trailX * sp * dt; b.y += b.trailY * sp * dt;
  b.dir = Math.abs(b.trailX) > Math.abs(b.trailY) ? (b.trailX > 0 ? 2 : 1) : (b.trailY > 0 ? 0 : 3);
  b._dashHit = Math.max(0, (b._dashHit || 0));
  if (Math.random() < dt * 44) spawnPart({ x: b.x, y: b.y, life: 0.3, size: 3, sizeEnd: 1, color: "#ffd479", glow: true });
  for (const a of allies) {
    if (a.dead || a.dying || a._dashMark === b.id) continue;
    if (dist2(b.x, b.y, a.x, a.y) < (b.bodyR * 1.1) * (b.bodyR * 1.1)) {
      a._dashMark = b.id;
      a.takeDamage(dmg, "enemy", b);
      a.stunT = Math.max(a.stunT, 0.35);
    }
  }
  const A = world.anthill;
  const q = (allies && allies.queen) || null;
  if (q && !q.dead && dist2(b.x, b.y, A.x, A.y) < (b.bodyR + 80) * (b.bodyR + 80)) {
    if (b._qHit !== true) { b._qHit = true; q.takeDamage(dmg * 1.4); shake(0.6); }
  }
  if (b.t <= 0) {
    for (const a of allies) if (a._dashMark === b.id) a._dashMark = 0;
    b._qHit = false;
    onEnd();
  }
}

// ---------------------------------------------------- MAPA 1: O TAMBORILADOR
function updateHare(b, dt, allies, q, A) {
  const D = b.def;
  // pulos em cadeia (dash triplo)
  if (b.sub === "aim") { dashAim(b, dt, 0.55, 0.26, 700); return; }
  if (b.sub === "dash") {
    dashStep(b, dt, allies, D.dashDmg, () => {
      b.chain = (b.chain || 0) + 1;
      if (b.chain < D.dashChain) {
        // mira o próximo pulo no alvo mais próximo
        const t2 = nearestPackTarget(b, allies, 720) || (q && !q.dead ? { x: A.x, y: A.y } : null);
        b.tx = t2 ? t2.x : b.x; b.ty = t2 ? t2.y : b.y;
        b.sub = "aim"; b.t = 0.22;
      } else {
        b.chain = 0; b.sub = "recover"; b.t = 0.7;
      }
    });
    return;
  }
  if (b.sub === "recover") { b.t -= dt; if (b.t <= 0) b.sub = "walk"; return; }
  if (b.sub === "thumpAim") {
    b.t -= dt;
    if (b.t <= 0) {
      b.sub = "walk";
      shake(0.5); SFX.slam();
      ring(b.x, b.y, { r0: 10, r1: D.thumpRange + 30, life: 0.5, color: "#ffd479", width: 4 });
      burst(b.x, b.y, { n: 26, color: ["#ffd479", "#8a6a4a", "#3a2c4c"], spMin: 50, spMax: 240, life: 0.6, sizeMin: 1.5, sizeMax: 3.5, g: 120 });
      for (const a of allies) {
        if (a.dead || a.dying) continue;
        if (dist2(b.x, b.y, a.x, a.y) < D.thumpRange * D.thumpRange) {
          a.takeDamage(D.thumpDmg, "enemy", b);
          a.stunT = Math.max(a.stunT, 0.75);
        }
      }
    }
    return;
  }

  const frac = b.hp / b.maxHp;
  if (b.summonMarks === 0 && frac < 0.66) { b.summonMarks = 1; hareSummon(b); }
  else if (b.summonMarks === 1 && frac < 0.33) { b.summonMarks = 2; hareSummon(b); }

  const tgt = nearestPackTarget(b, allies, 520);
  if (b.atkT <= 0 && countNear(b, allies, 145) >= 3) {
    b.atkT = D.thumpCd;
    b.sub = "thumpAim"; b.t = 0.45;
    ring(b.x, b.y, { r0: 8, r1: D.thumpRange, life: 0.45, color: "#ff4d5a", width: 2 });
    SFX.whoosh();
    return;
  }
  if (b.special <= 0 && (tgt || (q && !q.dead))) {
    b.special = D.dashCd * rand(0.9, 1.15);
    b.sub = "aim"; b.t = 0.45; b.chain = 0;
    const aim = tgt || { x: A.x, y: A.y };
    b.tx = aim.x; b.ty = aim.y;
    ring(b.x, b.y, { r0: 8, r1: 56, life: 0.5, color: "#ff4d5a", width: 2 });
    SFX.stinger();
    return;
  }
  const goal = tgt && b.atkT <= 0.2 ? { x: tgt.x, y: tgt.y } : (q && !q.dead ? { x: A.x, y: A.y } : { x: b.x, y: b.y });
  bossWalk(b, goal.x, goal.y, dt, D.speed);
  if (b.atkT <= 0 && tgt && dist2(b.x, b.y, tgt.x, tgt.y) < (b.bodyR + 14) * (b.bodyR + 14)) {
    b.atkT = 0.9;
    tgt.takeDamage(D.contactDmg, "enemy", b);
    burst(tgt.x, tgt.y, { n: 5, color: "#ff4d5a", spMin: 20, spMax: 70, life: 0.35 });
  }
  queenContact(b, q, A, 1.1, D.contactDmg * 1.4, 0.4);
}

function hareSummon(b) {
  const run = G.run;
  SFX.roar(); shake(0.4);
  floatText(b.x, b.y - 66, "O TAMBORILADOR CHAMA A NINHADA!", { color: "#ff4d5a", life: 1.5 });
  for (let i = 0; i < 3; i++) {
    const g = world.gates[(Math.random() * world.gates.length) | 0];
    spawnEnemy("runner", g.x + rand(-30, 30), g.y + rand(-30, 30), run ? run.wave : 4);
  }
  ring(b.x, b.y, { r0: 8, r1: 110, life: 0.5, color: "#a32e46", width: 3 });
}

// ----------------------------------------------------- MAPA 2: A CAÇADORA ---
function updateFox(b, dt, allies, q, A) {
  const D = b.def;
  if (b.sub === "aim") { dashAim(b, dt, 0.75, 0.32, 640); return; }
  if (b.sub === "dash") { dashStep(b, dt, allies, D.pounceDmg, () => { b.sub = "recover"; b.t = 0.9; }); return; }
  if (b.sub === "recover") { b.t -= dt; if (b.t <= 0) b.sub = "walk"; return; }

  // andar em órbita ao redor do formigueiro esperando o bote
  const tgt = nearestPackTarget(b, allies, b.phase2 ? 620 : 460);
  // fase2: re-trigger invisível a cada 8s
  if (b.phase2 && b.special <= 0 && b.invisibleT <= 0) {
    b.invisibleT = b.def.phase2 ? b.def.phase2.invisibleDur : 1.2;
    floatText(b.x, b.y - 50, "NÉVOA!", { color: "#8f7bb5", life: 0.8 });
  }
  if (b.special <= 0 && (tgt || (q && !q.dead))) {
    b.special = (b.phase2 ? (D.pounceCd*0.7) : D.pounceCd) * rand(0.9, 1.15);
    b.sub = "aim";
    b.t = 0.75;
    const aim = tgt || { x: A.x, y: A.y };
    b.tx = aim.x; b.ty = aim.y;
    b.dir = 0;
    ring(b.x, b.y, { r0: 8, r1: b.phase2 ? 90 : 60, life: 0.7, color: "#ff4d5a", width: 2 });
    SFX.stinger();
    return;
  }
  // orbitar a rainha / caçar formigas próximas
  const orbitA = b.animT * 0.5;
  const ox = A.x + Math.cos(orbitA) * 330, oy = A.y + Math.sin(orbitA) * 330;
  const chaseTarget = tgt && b.atkT <= 0 ? { x: tgt.x, y: tgt.y } : (b.special < 1.4 ? { x: A.x, y: A.y } : { x: ox, y: oy });
  bossWalk(b, chaseTarget.x, chaseTarget.y, dt, D.speed);
  if (b.atkT <= 0 && tgt && dist2(b.x, b.y, tgt.x, tgt.y) < (b.bodyR + 16) * (b.bodyR + 16)) {
    b.atkT = 1.1;
    tgt.takeDamage(D.dmg, "enemy", b);
    burst(tgt.x, tgt.y, { n: 6, color: "#ff4d5a", spMin: 20, spMax: 80, life: 0.4 });
  }
  queenContact(b, q, A, 1.2, D.contactDmg * 1.5, 0.45);
}

// ---------------------------------------------------- MAPA 3: A SOMBRA ALADA
function updateGrouse(b, dt, allies, q, A) {
  const D = b.def;
  if (b.sub === "aim") { b.t -= dt; if (b.t <= 0) { b.sub = "dash"; b.t = 0.5; const ang = Math.atan2(b.ty - b.y, b.tx - b.x); b.trailX = Math.cos(ang); b.trailY = Math.sin(ang); b._dashSpeed = 760; SFX.whoosh(); } return; }
  if (b.sub === "dash") { dashStep(b, dt, allies, D.diveDmg, () => { b.sub = "recover"; b.t = 0.8; }); return; }
  if (b.sub === "recover") { b.t -= dt; if (b.t <= 0) b.sub = "walk"; return; }
  if (b.sub === "shriekAim") {
    b.t -= dt;
    if (Math.random() < dt * 30) spawnPart({ x: b.x + rand(-26, 26), y: b.y + rand(-20, 10), vy: -30, life: 0.4, size: 2.4, sizeEnd: 0.4, color: "#a8c8e8", glow: true, drag: 1 });
    if (b.t <= 0) {
      b.sub = "walk";
      shake(0.45); SFX.roar();
      ring(b.x, b.y, { r0: 12, r1: D.shriekRange, life: 0.6, color: "#a8c8e8", width: 4 });
      // o grito fere os ouvidos: aliadas ficam lentas e fracas
      for (const a of allies) {
        if (a.dead || a.dying) continue;
        if (dist2(b.x, b.y, a.x, a.y) < D.shriekRange * D.shriekRange) {
          a.slowT = Math.max(a.slowT || 0, 3);
          a.stunT = Math.max(a.stunT, 0.4);
        }
      }
      // penas-dardo em leque
      for (let i = 0; i < 6; i++) {
        const ang = b.angle + (i - 2.5) * 0.35;
        spawnProj({ x: b.x + Math.cos(ang) * 30, y: b.y + Math.sin(ang) * 30,
          vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, dmg: 9, faction: "enemy", color: "#a8c8e8" });
      }
    }
    return;
  }

  const tgt = nearestPackTarget(b, allies, 480);
  if (b.atkT <= 0 && countNear(b, allies, D.shriekRange) >= 2) {
    b.atkT = D.shriekCd;
    b.sub = "shriekAim"; b.t = 0.7;
    const tt = tgt || { x: A.x, y: A.y };
    b.angle = Math.atan2(tt.y - b.y, tt.x - b.x);
    ring(b.x, b.y, { r0: 8, r1: D.shriekRange * 0.6, life: 0.6, color: "#ff4d5a", width: 2 });
    return;
  }
  if (b.special <= 0 && (tgt || (q && !q.dead))) {
    b.special = D.diveCd * rand(0.9, 1.15);
    b.sub = "aim"; b.t = 0.6;
    const aim = tgt || { x: A.x, y: A.y };
    b.tx = aim.x; b.ty = aim.y;
    ring(b.x, b.y, { r0: 8, r1: 66, life: 0.6, color: "#ff4d5a", width: 2 });
    SFX.stinger();
    return;
  }
  const orbitA = b.animT * 0.4;
  const ox = A.x + Math.cos(orbitA) * 360, oy = A.y + Math.sin(orbitA) * 360;
  const goal = tgt && b.atkT <= 0 ? { x: tgt.x, y: tgt.y } : (b.special < 1.2 && q && !q.dead ? { x: A.x, y: A.y } : { x: ox, y: oy });
  bossWalk(b, goal.x, goal.y, dt, D.speed);
  if (b.atkT <= 0 && tgt && dist2(b.x, b.y, tgt.x, tgt.y) < (b.bodyR + 15) * (b.bodyR + 15)) {
    b.atkT = 1.1;
    tgt.takeDamage(D.dmg, "enemy", b);
    burst(tgt.x, tgt.y, { n: 6, color: "#ff4d5a", spMin: 20, spMax: 80, life: 0.4 });
  }
  queenContact(b, q, A, 1.3, D.contactDmg * 1.4, 0.5);
}

// ------------------------------------------------- MAPA 4: A MATRIARCA RIVAL
function updateMatriarch(b, dt, allies, q, A) {
  const D = b.def;
  const frac = b.hp / b.maxHp;
  if (b.summonMarks === 0 && frac < 0.66) { b.summonMarks = 1; matriarchFrenzy(b, 4); }
  else if (b.summonMarks === 1 && frac < 0.33) { b.summonMarks = 2; matriarchFrenzy(b, 6); }

  // invoca a prole rival periodicamente
  if (b.special <= 0) {
    b.special = D.summonCd * rand(0.85, 1.1);
    matriarchFrenzy(b, 3);
  }

  // cospe rajada em leque na aliada mais próxima - FASE2 5 direções
  const tgt = nearestPackTarget(b, allies, 360);
  if (b.atkT <= 0 && tgt) {
    const isP2 = !!b.phase2;
    b.atkT = (isP2 ? (b.def.phase2 ? b.def.phase2.spitCd : 1.6) : D.spitCd) * (frac < 0.4 ? 0.65 : 1);
    const ang0 = Math.atan2(tgt.y - b.y, tgt.x - b.x);
    b.angle = angLerp(b.angle, ang0, 0.5);
    const count = isP2 ? (b.def.phase2 ? b.def.phase2.spitCount : 5) : 3;
    const spread = isP2 ? 0.32 : 0.22;
    const start = -(count-1)/2;
    for (let i = 0; i < count; i++) {
      const ang = ang0 + (start + i) * spread;
      spawnProj({ x: b.x + Math.cos(ang) * 42, y: b.y + Math.sin(ang) * 42,
        vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250,
        dmg: D.spitDmg, faction: "enemy", color: isP2 ? "#e8f4ff" : "#c86bff", size: 3 });
    }
    SFX.spit();
    burst(b.x + Math.cos(ang0) * 40, b.y + Math.sin(ang0) * 40, { n: 6, color: "#c86bff", spMin: 20, spMax: 70, life: 0.4, glow: true });
  }

  // marcha rumo à rainha
  const goal = q && !q.dead ? { x: A.x, y: A.y } : (tgt || { x: b.x, y: b.y });
  if (dist2(b.x, b.y, goal.x, goal.y) > 150 * 150) {
    bossWalk(b, goal.x, goal.y, dt, D.speed * (b.slowT > 0 ? 0.7 : 1));
  } else b.bob += dt * 3;
  b.angle = Math.atan2(goal.y - b.y, goal.x - b.x);

  if (b.atkT <= 0 && tgt && dist2(b.x, b.y, tgt.x, tgt.y) < (b.bodyR + 18) * (b.bodyR + 18)) {
    b.atkT = 1.6;
    tgt.takeDamage(D.contactDmg, "enemy", b);
    burst(tgt.x, tgt.y, { n: 8, color: "#ff4d5a", spMin: 30, spMax: 100, life: 0.4 });
  }
  queenContact(b, q, A, 1.7, D.contactDmg, 0.6);
}

function matriarchFrenzy(b, n) {
  const run = G.run;
  shake(0.4); SFX.stinger();
  floatText(b.x, b.y - 76, "A MATRIARCA BOTA MAIS SOLDADOS!", { color: "#c86bff", life: 1.5 });
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU);
    const type = Math.random() < 0.55 ? "runner" : Math.random() < 0.75 ? "reaper" : "espitter";
    spawnEnemy(type, b.x + Math.cos(a) * 70, b.y + Math.sin(a) * 70, run ? run.wave : 12);
  }
  ring(b.x, b.y, { r0: 10, r1: 120, life: 0.5, color: "#c86bff", width: 3 });
  burst(b.x, b.y, { n: 18, color: ["#c86bff", "#8a3dd6"], spMin: 30, spMax: 120, life: 0.5, glow: true });
}

// ----------------------------------------------------- MAPA 5: O GALHADA ---
function updateDeer(b, dt, allies, q, A) {
  const D = b.def;
  if (b.sub === "chargeAim") {
    b.t -= dt;
    if (Math.random() < dt * 26) spawnPart({ x: b.x + rand(-30, 30), y: b.y + 20, life: 0.4, size: 2.6, sizeEnd: 0.5, color: "#8a6a4a", drag: 1 });
    if (b.t <= 0) { b.sub = "charge"; b.t = 1.1; SFX.roar(); shake(0.35); }
    return;
  }
  if (b.sub === "charge") {
    b.t -= dt;
    b.x += b.cx * 640 * dt; b.y += b.cy * 640 * dt;
    b.dir = Math.abs(b.cx) > Math.abs(b.cy) ? (b.cx > 0 ? 2 : 1) : (b.cy > 0 ? 0 : 3);
    if (Math.random() < dt * 55) spawnPart({ x: b.x - b.cx * 26, y: b.y - b.cy * 26, life: 0.4, size: 3, sizeEnd: 1, color: "#ffd479", glow: true });
    for (const a of allies) {
      if (a.dead || a.dying || a._deerHit === b.id) continue;
      if (dist2(b.x, b.y, a.x, a.y) < (b.bodyR - 6) * (b.bodyR - 6)) {
        a._deerHit = b.id;
        a.takeDamage(D.chargeDmg, "enemy", b);
        a.stunT = Math.max(a.stunT, 0.7);
      }
    }
    if (q && !q.dead && dist2(b.x, b.y, A.x, A.y) < (b.bodyR + 74) * (b.bodyR + 74)) {
      if (!b._qHit) { b._qHit = true; q.takeDamage(D.chargeDmg * 1.2); shake(0.85); }
      b.t = 0;
    }
    if (b.t <= 0) {
      b.sub = "walk"; b._qHit = false;
      for (const a of allies) if (a._deerHit === b.id) a._deerHit = 0;
      b.special = D.chargeCd * rand(0.85, 1.2);
    }
    return;
  }
  if (b.sub === "sweepAim") {
    b.t -= dt;
    if (b.t <= 0) {
      b.sub = "walk";
      shake(0.55); SFX.slam(); SFX.whoosh();
      ring(b.x, b.y, { r0: 10, r1: D.sweepRange + 26, life: 0.45, color: "#ffd479", width: 4 });
      burst(b.x, b.y, { n: 30, color: ["#ffd479", "#c07a33", "#3a2c4c"], spMin: 60, spMax: 260, life: 0.55, sizeMin: 1.5, sizeMax: 3.5, g: 120 });
      for (const a of allies) {
        if (a.dead || a.dying) continue;
        if (dist2(b.x, b.y, a.x, a.y) < D.sweepRange * D.sweepRange) {
          a.takeDamage(D.sweepDmg, "enemy", b);
          a.stunT = Math.max(a.stunT, 0.8);
        }
      }
    }
    return;
  }

  const dQ = q && !q.dead ? dist(b.x, b.y, A.x, A.y) : Infinity;
  const pack = nearestPackTarget(b, allies, 430);

  if (b.atkT <= 0 && countNear(b, allies, D.sweepRange * 0.85) >= 2) {
    b.atkT = D.sweepCd;
    b.sub = "sweepAim"; b.t = 0.55;
    ring(b.x, b.y, { r0: 8, r1: D.sweepRange, life: 0.55, color: "#ff4d5a", width: 2 });
    SFX.whoosh();
    return;
  }
  if (b.special <= 0 && dQ < 620 && dQ > 220 && Math.random() < dt * 0.9) {
    b.sub = "chargeAim"; b.t = 0.85;
    const ang = Math.atan2(A.y - b.y, A.x - b.x);
    b.cx = Math.cos(ang); b.cy = Math.sin(ang);
    ring(b.x, b.y, { r0: 10, r1: 70, life: 0.85, color: "#ff4d5a", width: 2 });
    SFX.roar();
    return;
  }

  const goal = pack && dQ > 220 ? pack : { x: A.x, y: A.y };
  bossWalk(b, goal.x, goal.y, dt, D.speed);
  if (b.atkT <= 0 && pack && dist2(b.x, b.y, pack.x, pack.y) < (b.bodyR + 14) * (b.bodyR + 14)) {
    b.atkT = 1.2;
    pack.takeDamage(D.contactDmg, "enemy", b);
    pack.stunT = Math.max(pack.stunT, 0.35);
    burst(pack.x, pack.y, { n: 8, color: "#ff4d5a", spMin: 30, spMax: 100, life: 0.4 });
  }
  if (q && !q.dead && dQ < (b.bodyR + 86) && b.atkT <= 0) {
    b.atkT = 1.3;
    q.takeDamage(D.contactDmg);
    shake(0.6);
    burst(A.x + rand(-30, 30), A.y + rand(-30, 30), { n: 12, color: "#ff4d5a", spMin: 30, spMax: 120, life: 0.4 });
  }
}

// ----------------------------------------------------- MAPA 6: O DEVASTADOR
function updateBoar(b, dt, allies, q, A) {
  const D = b.def;
  // invocar rastejantes em 66%/33%
  const frac = b.hp / b.maxHp;
  if (b.summonMarks === 0 && frac < 0.66) { b.summonMarks = 1; boarSummon(b); }
  else if (b.summonMarks === 1 && frac < 0.33) { b.summonMarks = 2; boarSummon(b); }

  if (b.sub === "chargeAim") {
    b.t -= dt;
    if (Math.random() < dt * 30) spawnPart({ x: b.x + rand(-30, 30), y: b.y + 20, life: 0.4, size: 2.6, sizeEnd: 0.5, color: "#8a6a4a", drag: 1 });
    if (b.t <= 0) { b.sub = "charge"; b.t = 1.9; SFX.roar(); shake(0.4); }
    return;
  }
  if (b.sub === "charge") {
    b.t -= dt;
    b.x += b.cx * 560 * dt; b.y += b.cy * 560 * dt;
    b.dir = Math.abs(b.cx) > Math.abs(b.cy) ? (b.cx > 0 ? 2 : 1) : (b.cy > 0 ? 0 : 3);
    if (Math.random() < dt * 60) spawnPart({ x: b.x - b.cx * 30, y: b.y - b.cy * 30, life: 0.4, size: 3, sizeEnd: 1, color: "#ffb347", glow: true });
    for (const a of allies) {
      if (a.dead || a.dying || a._boarHit === b.id) continue;
      if (dist2(b.x, b.y, a.x, a.y) < b.bodyR * b.bodyR) {
        a._boarHit = b.id;
        a.takeDamage(D.chargeDmg, "enemy", b);
        a.stunT = Math.max(a.stunT, 0.8);
      }
    }
    if (q && !q.dead && dist2(b.x, b.y, A.x, A.y) < (b.bodyR + 74) * (b.bodyR + 74)) {
      if (!b._qHit) { b._qHit = true; q.takeDamage(D.chargeDmg * 1.3); shake(0.9); }
      b.t = 0; // para no formigueiro
    }
    if (b.t <= 0) {
      b.sub = "walk"; b._qHit = false;
      for (const a of allies) if (a._boarHit === b.id) a._boarHit = 0;
      b.special = D.chargeCd * rand(0.85, 1.2);
    }
    return;
  }
  if (b.sub === "slamAim") {
    b.t -= dt;
    // pulo (arco visual via scaleY no render)
    if (b.t <= 0) {
      b.sub = "walk";
      // IMPACTO
      shake(0.9);
      SFX.slam();
      ring(b.x, b.y, { r0: 12, r1: D.slamRange + 40, life: 0.55, color: "#ffb347", width: 5 });
      ring(b.x, b.y, { r0: 6, r1: D.slamRange + 90, life: 0.75, color: "#ff7a3d", width: 3 });
      burst(b.x, b.y, { n: 40, color: ["#ffb347", "#8a6a4a", "#3a2c4c"], spMin: 60, spMax: 300, life: 0.7, sizeMin: 1.5, sizeMax: 4, g: 140 });
      for (const a of allies) {
        if (a.dead || a.dying) continue;
        if (dist2(b.x, b.y, a.x, a.y) < D.slamRange * D.slamRange) {
          a.takeDamage(D.slamDmg, "enemy", b);
          a.stunT = Math.max(a.stunT, 1.15);
        }
      }
      b.special = D.chargeCd * rand(0.85, 1.15);
    }
    return;
  }

  // caminhar até a rainha
  const dQ = q && !q.dead ? dist(b.x, b.y, A.x, A.y) : Infinity;
  const pack = nearestPackTarget(b, allies, 400);

  // pancada no chão se houver aglomeração perto
  if (b.atkT <= 0) {
    if (countNear(b, allies, 150) >= 3) {
      b.atkT = D.slamCd;
      b.sub = "slamAim"; b.t = 0.62;
      SFX.whoosh();
      ring(b.x, b.y, { r0: 8, r1: D.slamRange, life: 0.62, color: "#ff4d5a", width: 2 });
      return;
    }
  }

  // disparo de carga quando alinhado à rainha e longe
  if (b.special <= 0 && dQ < 600 && dQ > 200 && Math.random() < dt * 0.8) {
    b.sub = "chargeAim"; b.t = 1.0;
    const ang = Math.atan2(A.y - b.y, A.x - b.x);
    b.cx = Math.cos(ang); b.cy = Math.sin(ang);
    ring(b.x, b.y, { r0: 10, r1: 70, life: 0.9, color: "#ff4d5a", width: 2 });
    SFX.roar();
    return;
  }

  const goal = pack && dQ > 220 ? pack : { x: A.x, y: A.y };
  bossWalk(b, goal.x, goal.y, dt, D.speed);

  if (b.atkT <= 0 && pack && dist2(b.x, b.y, pack.x, pack.y) < (b.bodyR + 14) * (b.bodyR + 14)) {
    b.atkT = 1.3;
    pack.takeDamage(D.contactDmg, "enemy", b);
    pack.stunT = Math.max(pack.stunT, 0.4);
    burst(pack.x, pack.y, { n: 8, color: "#ff4d5a", spMin: 30, spMax: 100, life: 0.4 });
  }
  if (q && !q.dead && dQ < (b.bodyR + 86) && b.atkT <= 0) {
    b.atkT = 1.4;
    q.takeDamage(D.contactDmg);
    shake(0.6);
    burst(A.x + rand(-30, 30), A.y + rand(-30, 30), { n: 12, color: "#ff4d5a", spMin: 30, spMax: 120, life: 0.4 });
  }
}

function boarSummon(b) {
  const run = G.run;
  SFX.roar();
  shake(0.5);
  floatText(b.x, b.y - 70, "O DEVASTADOR CHAMA AS IRRITADAS!", { color: "#ff4d5a", life: 1.6, scale: 1 });
  for (let i = 0; i < 4; i++) {
    const g = world.gates[(Math.random() * world.gates.length) | 0];
    spawnEnemy("runner", g.x + rand(-30, 30), g.y + rand(-30, 30), run ? run.wave : 10);
  }
  ring(b.x, b.y, { r0: 10, r1: 130, life: 0.6, color: "#a32e46", width: 4 });
}
