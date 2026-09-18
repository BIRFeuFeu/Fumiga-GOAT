// ============================================================================
// FUMIGA — formigas da colônia (IA estilo Ant Colony), rainha e ovos
// Papéis: worker | fighter | ranged | healer | bomber (via def.role)
// ============================================================================
import { UNITS, QUEEN, START, LEVEL_HP, LEVEL_DMG } from "./config.js";
import { mods } from "./state.js";
import { world, nearestPile, nearestNode, collide, smashProps } from "./world.js";
import { SpatialGrid, rand, irand, dist, dist2, clamp, lerp, angLerp, nextId, chance } from "./utils.js";
import { spawnPart, burst, scent, floatText, ring, impact, critBurst, healPulse, bloodSplatter, dustPoof } from "./particles.js";
import { shake } from "./camera.js";
import { SFX } from "./audio.js";
import { spawnProj, dropOrb } from "./combat.js";
import { tutEvent } from "./tutorial.js";

export const allies = [];          // formigas aliadas
allies.queen = null;               // atalho para a rainha
export const eggs = [];            // fila de chocagem
let grid = new SpatialGrid(56);

// ------------------------------------------------------------------ rainha --
export function spawnQueen() {
  const m = mods();
  const A = world.anthill;
  const q = {
    id: nextId(), type: "queen", faction: "ally",
    x: A.x, y: A.y - 10, angle: Math.PI / 2,
    maxHp: Math.round(QUEEN.hp * m.queenHp), hp: 0,
    bodyR: 46, dead: false,
    flash: 0, eatT: 0, bob: rand(0, 6.28), rebirthUsed: false,
    takeDamage(dmg) {
      if (this.dead) return;
      const mm = mods();
      dmg *= mm.muts.dmgTaken * (1 - mm.queenArmor);
      this.hp -= dmg;
      this.flash = 0.14;
      SFX.queenHit();
    },
  };
  q.hp = q.maxHp;
  allies.queen = q;
  return q;
}

// ------------------------------------------------------------------ stats ---
function computeAntStats(typeId) {
  const b = UNITS[typeId], m = mods();
  // bônus por nível da colônia (XP) + câmaras internas
  const run = window.__run;
  const lv = run ? (run.level || 0) : 0;
  const lvHp = 1 + LEVEL_HP * lv, lvDmg = 1 + LEVEL_DMG * lv;
  const ch = run ? run.chambers : null;
  const fightMult = ch && (b.role === "fighter" || b.role === "ranged")
    ? 1 + 0.12 * ch.barracks : 1;
  const isWorker = b.role === "worker";
  return {
    hp: Math.round(b.hp * m.hpAll * lvHp),
    dmg: b.dmg * m.dmgAll * lvDmg * fightMult,
    speed: b.speed * m.muts.speed * (isWorker ? m.workerSpeed : m.allSpeed),
    range: b.range + m.rangeBonus, atkCd: b.atkCd / m.fireRate,
    carry: (b.carry || 0) + (isWorker ? m.workerCarry : 0),
    gatherRate: (b.gatherRate || 0) * m.gatherRate,
    projSpeed: b.projSpeed || 0,
    taunt: b.taunt || 0,
    aggro: b.aggro || 0,
    healRate: (b.healRate || 0) * m.muts.healRateMult,
    healRange: (b.healRange || 0) * m.muts.healRangeMult,
    aoe: (b.aoe || 0) * m.aoeMult,
    burnDps: (b.burnDps || 0) * m.dmgAll * lvDmg * fightMult * m.burnMult,
    burnDur: b.burnDur || 0,
  };
}

/** Recalcula atributos das formigas vivas mantendo a fração de vida. */
export function recomputeAllies() {
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const ratio = a.maxHp > 0 ? a.hp / a.maxHp : 1;
    const st = computeAntStats(a.type);
    a.st = st;
    a.maxHp = st.hp;
    a.hp = Math.max(1, Math.round(a.maxHp * ratio));
  }
}

export function recomputeQueen() {
  const m = mods();
  const q = allies.queen;
  if (!q || q.dead) return;
  const ratio = q.maxHp > 0 ? q.hp / q.maxHp : 1;
  q.maxHp = Math.round(QUEEN.hp * m.queenHp);
  q.hp = Math.max(1, Math.round(q.maxHp * ratio));
}

// ------------------------------------------------------------------ spawn ---
export function spawnAnt(typeId, x, y, opts = {}) {
  const m = mods();
  const st = computeAntStats(typeId);
  const a = {
    id: nextId(), type: typeId, def: UNITS[typeId], faction: "ally",
    x, y, vx: 0, vy: 0, angle: rand(0, 6.28),
    hp: st.hp, maxHp: st.hp, st: st,
    bodyR: UNITS[typeId].bodyR ||
      (typeId === "tank" ? 15 : typeId === "worker" || typeId === "scout" ? 9 : typeId === "healer" ? 10 : 12),
    state: "idle",
    tx: null, ty: null,          // destino de movimento
    target: null,                // inimigo
    pile: null, node: null,      // alvo de coleta
    carryKind: null, carry: 0,
    atkT: 0, gatherT: 0, thinkT: rand(0, 0.18), fleeT: 0,
    guardPos: opts.guardPos || null,
    forcedTarget: null,
    healTarget: null, healFxT: 0,
    bob: rand(0, 6.28), hitT: 0, stunT: 0, slowT: 0, weakT: 0,
    lunge: 0, spawnT: opts.spawnT || 0,
    selected: false, pack: 0,
    dead: false, dying: 0,
    takeDamage(dmg, from, attacker) {
      if (this.dead || this.dying) return;
      const mm = mods();
      // ESQUIVA: golpe perdido por completo
      if (mm.dodge > 0 && Math.random() < mm.dodge) {
        floatText(this.x, this.y - this.bodyR - 10, "ESQUIVA!", { color: "#8fd3ff", life: 0.8 });
        return;
      }
      // ESPINHOS DE QUITINA: quem morde leva de volta
      if (mm.reflect > 0 && attacker && typeof attacker.takeDamage === "function") {
        attacker.takeDamage(mm.reflect, "ally");
      }
      dmg *= mm.muts.dmgTaken * (1 - mm.armor);
      this.hp -= dmg;
      this.hitT = 0.12;
      if (chance(0.3)) SFX.hurt();
      // trabalhadoras e curandeiras fogem ao serem atacadas
      if ((this.def.role === "worker" || this.type === "healer") && this.state !== "flee") {
        this.state = "flee"; this.fleeT = 1.4;
      }
      // mutação SANGUE ÁCIDO: quem morde pega fogo
      if (attacker && mm.muts.venenoBurn) {
        attacker.burnT = Math.max(attacker.burnT || 0, mm.muts.venenoBurn);
        attacker.burnDps = Math.max(attacker.burnDps || 0, 5);
      }
      if (this.hp <= 0) {
        // ZELO DA COLÔNIA: operária resiste a um golpe fatal com 1 de vida
        const save = mm.workerSave > 0 && this.def.role === "worker" && !this.savedOnce;
        if (save && Math.random() < mm.workerSave) {
          this.savedOnce = true;
          this.hp = 1;
          floatText(this.x, this.y - this.bodyR - 12, "AGUENTOU!", { color: "#7fd6a0", life: 1.2 });
        } else {
          killAnt(this);
        }
      }
    },
  };
  allies.push(a);
  return a;
}

export function killAnt(a) {
  if (a.dying) return;
  a.dying = 0.45;
  a.dead = true;
  a.selected = false;
  bloodSplatter(a.x, a.y, "#c94f2e");
  burst(a.x, a.y, { n: 12, color: ["#ff7a3d", "#c94f2e", "#5a3a4a"], spMin: 20, spMax: 110, life: 0.55, sizeMin: 1.2, sizeMax: 3.2, g: 80 });
  dustPoof(a.x, a.y, 6);
  SFX.splat();
  if (a.carry > 0 && a.carryKind === "food") {
    burst(a.x, a.y, { n: Math.min(8, a.carry * 2), color: "#ffb347", spMin: 15, spMax: 60, life: 0.6, sizeMin: 1, sizeMax: 2.2 });
  }
  if (a.type === "giant") {
    shake(0.5);
    ring(a.x, a.y, { r0: 10, r1: 80, life: 0.5, color: "#ffd479", width: 3 });
  }
}

// ------------------------------------------------------------------ compra --
export function unitCost(typeId) {
  const b = UNITS[typeId], m = mods();
  const alive = allies.filter(a => a.type === typeId && !a.dead).length +
                eggs.filter(e => e.type === typeId).length;
  return Math.max(1, Math.round(b.cost * Math.pow(1 + b.costGrow, alive) * m.muts.costMult));
}

export function popCapTotal() {
  return START.popCap + mods().popCap;
}

export function popUsed() {
  let n = eggs.length;
  for (const a of allies) if (!a.dead) n++;
  return n;
}

/** Ainda cabe mais uma unidade deste tipo? (def.maxAlive, ex.: 1 gigante) */
export function unitLimitLeft(typeId) {
  const def = UNITS[typeId];
  if (!def || !def.maxAlive) return true;
  const n = allies.filter(a => a.type === typeId && !a.dead && !a.dying).length +
            eggs.filter(e => e.type === typeId).length;
  return n < def.maxAlive;
}

export function buyUnit(typeId) {
  const run = window.__run; // setado por game.js
  const cost = unitCost(typeId);
  if (run.food < cost) { SFX.deny(); return { ok: false, why: "SEM COMIDA" }; }
  if (popUsed() >= popCapTotal()) { SFX.deny(); return { ok: false, why: "POPULAÇÃO CHEIA" }; }
  if (!unitLimitLeft(typeId)) { SFX.deny(); return { ok: false, why: "SÓ CABE UMA POR EXPEDIÇÃO" }; }
  run.food -= cost;
  const m = mods();
  const t = UNITS[typeId].hatchTime * m.hatchSpeed * m.muts.hatchMult;
  eggs.push({ type: typeId, tLeft: t, tTotal: t });
  SFX.buy();
  tutEvent("buy", typeId);
  return { ok: true };
}

function hatchTick(dt) {
  const G2 = window.__run;
  if (eggs.length === 0) return;
  const e = eggs[0];
  const nursery = G2 && G2.chambers ? G2.chambers.nursery : 0;
  e.tLeft -= dt * (1 + 0.18 * nursery);
  if (Math.random() < 0.1) {
    const A = world.anthill;
    spawnPart({ x: A.x + rand(-22, 22), y: A.y + rand(-18, 18), life: 0.6, size: 1.8, sizeEnd: 0.4, color: "#ffe9a8", drag: 1 });
  }
  if (e.tLeft <= 0) {
    eggs.shift();
    const A = world.anthill;
    const ang = rand(0, 6.28);
    const x = A.x + Math.cos(ang) * 46, y = A.y + Math.sin(ang) * 46;
    const gp = { x: A.x + Math.cos(ang) * 200, y: A.y + Math.sin(ang) * 200 };
    spawnAnt(e.type, x, y, { guardPos: gp, spawnT: 0.34 });
    burst(x, y, { n: 12, color: ["#ffe9a8", "#ffd479", "#fff"], spMin: 20, spMax: 80, life: 0.45, sizeMin: 1, sizeMax: 2.6 });
    SFX.hatch();
    if (e.type === "giant") {
      // um colosso não nasce em silêncio
      shake(0.7);
      ring(x, y, { r0: 20, r1: 460, life: 1.0, color: "#ffd479", width: 6 });
    }
    floatText(x, y - (e.type === "giant" ? 300 : 14), "NOVA " + UNITS[e.type].name, { color: "#ffd479", life: 1.4 });
  }
}

// ----------------------------------------------------------------- update ---
export function updateAllies(dt, foes) {
  const m = mods();
  const G2 = window.__run;

  // rainha
  const q = allies.queen;
  if (q && !q.dead) {
    q.bob += dt;
    q.flash = Math.max(0, q.flash - dt);
    if (m.queenRegen > 0) q.hp = Math.min(q.maxHp, q.hp + m.queenRegen * dt);
    // alimentação da rainha (cura com comida)
    q.eatT -= dt;
    if (q.eatT <= 0 && q.hp < q.maxHp && G2.food >= QUEEN.eatFood) {
      G2.food -= QUEEN.eatFood;
      q.hp = Math.min(q.maxHp, q.hp + QUEEN.eatHp);
      q.eatT = QUEEN.eatCd * m.queenEatRate;
      const A = world.anthill;
      burst(A.x, A.y - 20, { n: 6, color: ["#ffd479", "#7fd6a0"], spMin: 8, spMax: 42, life: 0.5, sizeMin: 1, sizeMax: 2 });
      floatText(A.x, A.y - 66, "+" + QUEEN.eatHp, { color: "#7fd6a0", life: 0.9 });
    }
  }

  hatchTick(dt);

  // grade espacial
  grid.clear();
  for (const a of allies) if (!a.dead) grid.insert(a);

  for (let i = allies.length - 1; i >= 0; i--) {
    const a = allies[i];
    if (a.dying) {
      a.dying -= dt;
      if (a.dying <= 0) allies.splice(i, 1);
      continue;
    }
    // colossos não são empurrados pelo mato: arrancam a vegetação ao passar
    if (a.def.smash) {
      a.smashT = (a.smashT || 0) - dt;
      if (a.smashT <= 0) {
        a.smashT = 0.45;
        smashProps(a.x, a.y, a.def.smash);
      }
    }
    updateAnt(a, dt, foes, m);
  }
}

function moveToward(a, tx, ty, dt, speedMult = 1) {
  const m = mods();
  let sp = a.st.speed * speedMult;
  if (a.slowT > 0) sp *= 0.75;
  const dx = tx - a.x, dy = ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const arrive = clamp(d / 26, 0.25, 1);
  a.vx = (dx / d) * sp * arrive;
  a.vy = (dy / d) * sp * arrive;
  a.x += a.vx * dt; a.y += a.vy * dt;
  a.angle = angLerp(a.angle, Math.atan2(dy, dx), 1 - Math.pow(0.0001, dt));
  a.bob += dt * sp * 0.11;
  if (a.type === "worker" && Math.random() < dt * 7) scent(a.x, a.y, "#37e6c8");
  return d < 14;
}

function separation(a, dt) {
  let fx = 0, fy = 0;
  const r = (a.bodyR + 9);
  grid.around(a.x, a.y, (o) => {
    if (o === a) return;
    const dx = a.x - o.x, dy = a.y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 0.01 && d2 < r * r) {
      const d = Math.sqrt(d2);
      const f = (r - d) / r * 55;
      fx += (dx / d) * f; fy += (dy / d) * f;
    }
  });
  a.x += fx * dt; a.y += fy * dt;
}

function nearestFoe(a, foes, maxD) {
  let best = null, bs = Infinity;
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    const d = dist2(a.x, a.y, f.x, f.y);
    if (d < maxD * maxD && d < bs) { bs = d; best = f; }
  }
  return best;
}

function packBonus(a) {
  // fome coletiva: conta aliadas próximas (amostragem barata)
  if (!a.mm.muts.packDmg) return 1;
  let n = 0;
  grid.around(a.x, a.y, (o) => { if (o !== a && dist2(a.x, a.y, o.x, o.y) < 150 * 150) n++; });
  return 1 + 0.04 * Math.min(5, n);
}

function attackMelee(a, target, dt) {
  if (a.atkT > 0) return;
  a.atkT = a.st.atkCd;
  const mm = a.mm;
  let dmg = a.st.dmg * packBonus(a);
  const crit = mm.critChance > 0 && Math.random() < mm.critChance;
  if (crit) dmg *= 2;
  target.takeDamage(dmg, "ally", a);
  if (mm.muts.weakenOnHit) target.weakT = Math.max(target.weakT || 0, 3);
  if (mm.muts.thorns && target.applyThorns) target.applyThorns(mm.muts.thorns);
  a.lunge = 0.22;
  SFX.bite();
  const reach = Math.max(10, a.bodyR * 0.8);
  const hx = a.x + Math.cos(a.angle) * reach;
  const hy = a.y + Math.sin(a.angle) * reach;
  if (crit) {
    critBurst(hx, hy);
    floatText(a.x + rand(-6, 6), a.y - (a.bodyR + 4), "CRITICO!", { color: "#ff4d5a", life: 0.9, scale: 1.2, pop: 0.6 });
    shake(0.18);
  } else {
    impact(hx, hy, { color: a.bodyR > 40 ? "#ffd479" : "#ffb347", power: a.bodyR > 40 ? 2 : 1 });
    const biteN = a.bodyR > 40 ? 14 : 4;
    burst(hx, hy, { n: biteN, color: ["#ffb347", "#ff7a3d"], spMin: 15, spMax: 70 + a.bodyR, life: 0.3, sizeMin: 1, sizeMax: 2 + a.bodyR / 60 });
  }
}

function updateAnt(a, dt, foes, m) {
  a.mm = m;
  a.atkT = Math.max(0, a.atkT - dt);
  a.hitT = Math.max(0, a.hitT - dt);
  a.stunT = Math.max(0, a.stunT - dt);
  a.slowT = Math.max(0, a.slowT - dt);
  a.lunge = Math.max(0, (a.lunge || 0) - dt);
  a.spawnT = Math.max(0, (a.spawnT || 0) - dt);
  if (a.stunT > 0) return;
  separation(a, dt);
  const c = collide(a.x, a.y, a.bodyR);
  a.x = c.x; a.y = c.y;

  const role = a.def.role || (a.type === "worker" ? "worker" : "fighter");
  if (role === "worker") updateWorker(a, dt, foes, true, m, window.__run);
  else if (role === "healer") updateHealer(a, dt, foes, m);
  else updateFighter(a, dt, foes, true, m);
}

// ------------------------------------------------------------- trabalhadora -
function updateWorker(a, dt, foes, think, m, G2) {
  // detecção de perigo
  if (think && a.state !== "flee") {
    const danger = nearestFoe(a, foes, 105);
    if (danger) {
      if (dist2(a.x, a.y, danger.x, danger.y) < 90 * 90 || a.state === "return") {
        a.state = "flee"; a.fleeT = 1.5;
      }
    }
  }

  switch (a.state) {
    case "flee": {
      a.fleeT -= dt;
      const A = world.anthill;
      moveToward(a, A.x, A.y, dt, 1.12);
      if (a.fleeT <= 0 && !nearestFoe(a, foes, 150)) {
        a.state = "idle"; a.pile = a.pile && a.pile.amount > 0 ? a.pile : null;
        if (!a.pile) a.node = a.node && a.node.amount > 0 ? a.node : null;
      }
      break;
    }
    case "idle": {
      // escolhe pilha/nó
      if (a.carry >= a.st.carry) { a.state = "return"; break; }
      if (a.cmdPos) { a.tx = a.cmdPos.x; a.ty = a.cmdPos.y; a.state = "move"; break; }
      acquireResource(a);
      break;
    }
    case "move": {
      if (moveToward(a, a.tx, a.ty, dt)) {
        if (a.cmdPos) { a.cmdPos = null; }
        a.state = "idle";
      }
      break;
    }
    case "goto": {
      const tgt = a.pile || a.node;
      if (!tgt || tgt.amount <= 0 || tgt.blocked) {
        a.state = "idle"; a.pile = a.node = null; a.gotoT = 0; a.gotoBest = undefined;
        break;
      }
      const arrived = moveToward(a, tgt.x, tgt.y, dt);
      const d = Math.sqrt(dist2(a.x, a.y, tgt.x, tgt.y));
      if (arrived || d < tgt.r + 7) {
        a.state = "gather"; a.gatherT = a.st.gatherRate;
        a.gotoT = 0; a.gotoBest = undefined;
        break;
      }
      // TRAVA ANTITRAVAMENTO: se o alvo é inalcançável (nasceu dentro do
      // formigueiro, atrás de pedra, etc.) a formiga empurra a colisão para
      // sempre. Sem progresso por alguns segundos, desiste — e marca o recurso
      // para as irmãs não caírem na mesma armadilha.
      if (a.gotoBest === undefined || d < a.gotoBest - 6) {
        a.gotoBest = d;
        a.gotoT = 0;
      } else {
        a.gotoT = (a.gotoT || 0) + dt;
        if (a.gotoT > 3.5) {
          tgt.blocked = true;
          a.pile = a.node = null;
          a.gotoT = 0; a.gotoBest = undefined;
          a.state = "idle";
          floatText(a.x, a.y - 18, "SEM CAMINHO!", { color: "#ff8a96", life: 1 });
        }
      }
      break;
    }
    case "gather": {
      const tgt = a.pile || a.node;
      if (!tgt || tgt.amount <= 0) {
        finishGather(a, m);
        break;
      }
      moveToward(a, tgt.x, tgt.y, dt, 0.3);
      a.gatherT -= dt;
      if (a.gatherT <= 0) {
        a.gatherT = a.st.gatherRate;
        const isEssence = tgt.kind === "essence";
        const take = isEssence ? Math.min(1, tgt.amount) : Math.min(3, tgt.amount);
        tgt.amount -= take;
        a.carry += take;
        a.carryKind = isEssence ? "essence" : (tgt.kind === "amber" ? "amber" : "food");
        SFX.chomp();
        burst(a.x, a.y - 4, { n: 3, color: isEssence ? "#c77dff" : "#ffb347", spMin: 8, spMax: 40, life: 0.4, sizeMin: 1, sizeMax: 2, glow: isEssence });
        if (a.carry >= a.st.carry || tgt.amount <= 0) finishGather(a, m);
      }
      break;
    }
    case "return": {
      const A = world.anthill;
      const arrived = dist2(a.x, a.y, A.x, A.y) < 118 * 118;
      if (!arrived) {
        moveToward(a, A.x, A.y, dt);
      } else {
        deposit(a, m, G2);
      }
      break;
    }
  }

  // defesa fraca mas existente se um inimigo encostar
  if (a.atkT <= 0 && a.state !== "flee" && a.st.dmg > 0) {
    const close = nearestFoe(a, foes, a.st.range + 14);
    if (close && dist2(a.x, a.y, close.x, close.y) < (a.st.range + 10) * (a.st.range + 10)) {
      a.angle = Math.atan2(close.y - a.y, close.x - a.x);
      attackMelee(a, close, dt);
    }
  }
}

function acquireResource(a) {
  // prioriza comida; se sobrar nada, vai para essência
  const start = (target) => {
    a.pile = target.kind === "food" ? target : null;
    a.node = target.kind === "food" ? null : target;
    a.gotoT = 0; a.gotoBest = undefined;
    a.state = "goto";
  };
  const pile = nearestPile(a.x, a.y);
  if (pile) { start(pile); return; }
  const ess = nearestNode(a.x, a.y, "essence");
  if (ess) { start(ess); return; }
  const amber = nearestNode(a.x, a.y, "amber");
  if (amber) { start(amber); return; }
  // nada para coletar: vagar perto
  if (Math.random() < 0.02) {
    const A = world.anthill;
    const ang = Math.random() * 6.28, d = 120 + Math.random() * 150;
    a.tx = A.x + Math.cos(ang) * d; a.ty = A.y + Math.sin(ang) * d;
    a.state = "move";
  }
}

function finishGather(a, m) {
  a.pile = a.node = null;
  if (a.carry >= a.st.carry) { a.state = "return"; }
  else acquireResource(a);
}

function deposit(a, m, G2) {
  const K = a.carryKind;
  if (K === "food" || K === "amber") {
    let v = a.carry * (K === "amber" ? 3 : 1);
    v = Math.round(v * m.foodBonus * (K === "food" ? m.muts.foodGather : 1)) + (K === "food" ? m.muts.depositBonus : 0);
    const pantry = G2.chambers ? G2.chambers.pantry : 0;
    if (pantry > 0) v = Math.round(v * (1 + 0.15 * pantry));
    G2.food += v;
    if (v >= 6) floatText(a.x, a.y - 12, "+" + v, { color: "#ffd479", life: 0.9 });
    if (m.muts.seedDrop && Math.random() < m.muts.seedDrop) {
      dropOrb(a.x, a.y, 1);
    }
    tutEvent("deposit");
  } else if (K === "essence") {
    const v = a.carry + m.crystalYield;
    dropOrb(a.x, a.y, v);
    floatText(a.x, a.y - 12, "+" + v + " ESS", { color: "#c77dff", life: 1 });
    tutEvent("essence");
  }
  SFX.pickup();
  a.carry = 0; a.carryKind = null;
  // volta a coletar
  a.state = "idle";
  acquireResource(a);
}

// ------------------------------------------------------------- curandeira ---
function updateHealer(a, dt, foes, m) {
  // fuga como as trabalhadoras
  if (a.state === "flee") {
    a.fleeT -= dt;
    const A = world.anthill;
    moveToward(a, A.x, A.y, dt, 1.1);
    if (a.fleeT <= 0 && !nearestFoe(a, foes, 150)) a.state = "idle";
    return;
  }
  if (nearestFoe(a, foes, 84)) { a.state = "flee"; a.fleeT = 1.3; return; }

  // alvo ordenado manualmente
  if (a.state === "move" && a.tx != null) {
    if (moveToward(a, a.tx, a.ty, dt)) a.state = "idle";
    return;
  }

  const t = a.healTarget && !a.healTarget.dead && a.healTarget.hp < a.healTarget.maxHp - 1
    ? a.healTarget : null;
  if (!t) {
    // busca a aliada mais ferida no alcance
    let best = null, score = 0.999;
    for (const o of allies) {
      if (o === a || o.dead || o.dying || o.type === "queen") continue;
      const d = dist2(a.x, a.y, o.x, o.y);
      if (d > a.st.healRange * a.st.healRange) continue;
      const frac = o.hp / o.maxHp;
      if (frac < score) { score = frac; best = o; }
    }
    a.healTarget = best;
  }

  const tgt = a.healTarget && !a.healTarget.dead && a.healTarget.hp < a.healTarget.maxHp - 1 ? a.healTarget : null;
  if (tgt) {
    const rr = a.st.range + 14;
    const d = dist(a.x, a.y, tgt.x, tgt.y);
    if (d > rr) {
      moveToward(a, tgt.x, tgt.y, dt);
    } else {
      // canaliza cura
      a.angle = angLerp(a.angle, Math.atan2(tgt.y - a.y, tgt.x - a.x), 1 - Math.pow(0.0001, dt));
      a.bob += dt * 3;
      tgt.hp = Math.min(tgt.maxHp, tgt.hp + a.st.healRate * dt);
      a.healFxT -= dt;
      if (a.healFxT <= 0) {
        a.healFxT = 0.22;
        spawnPart({
          x: tgt.x + rand(-6, 6), y: tgt.y - 8 + rand(-4, 4),
          vx: rand(-4, 4), vy: rand(-26, -14), life: 0.55, size: rand(1.6, 2.6),
          sizeEnd: 0.4, color: "#7fd6a0", glow: true, drag: 1,
        });
        if (Math.random() < 0.1) SFX.healCast();
      }
    }
    return;
  }

  // sem feridos: segue a combatente mais próxima do combate
  let leader = null, bd = Infinity;
  for (const o of allies) {
    if (o === a || o.dead || o.dying) continue;
    const r = o.def && o.def.role;
    if (r === "fighter" || r === "ranged") {
      const d = dist2(a.x, a.y, o.x, o.y);
      if (d < bd) { bd = d; leader = o; }
    }
  }
  if (leader && bd > 90 * 90) {
    moveToward(a, leader.x, leader.y, dt, 0.95);
  } else {
    const gp = a.guardPos;
    if (gp && dist2(a.x, a.y, gp.x, gp.y) > 60 * 60) moveToward(a, gp.x, gp.y, dt, 0.8);
    else a.bob += dt * 2;
  }
}

// -------------------------------------------------------------- combatentes -
function updateFighter(a, dt, foes, think, m) {
  // alvo forçado (ordem de ataque)
  if (a.forcedTarget && (a.forcedTarget.dead || a.forcedTarget.dying)) a.forcedTarget = null;

  if (think) {
    if (!a.forcedTarget && a.state !== "move") {
      const base = a.st.aggro > 0 ? a.st.aggro : 260;
      const aggro = a.state === "chase" || a.state === "attack" ? base * 1.2 : base;
      a.target = nearestFoe(a, foes, aggro) || (a.pursue && !a.pursue.dead ? a.pursue : null);
      if (a.target) a.state = "chase";
      else if (a.state === "chase" || a.state === "attack") a.state = "home";
    }
  }

  const tgt = a.forcedTarget || a.target;

  switch (a.state) {
    case "idle":
    case "home": {
      const gp = a.guardPos;
      if (gp && dist2(a.x, a.y, gp.x, gp.y) > 36 * 36) {
        moveToward(a, gp.x, gp.y, dt);
      } else {
        a.state = "idle";
        a.bob += dt * 2;
        // patrulhas lentas ao redor do posto
        if (Math.random() < 0.004 && gp) {
          gp.x += rand(-20, 20); gp.y += rand(-20, 20);
        }
      }
      break;
    }
    case "move": {
      if (moveToward(a, a.tx, a.ty, dt)) { a.state = "home"; }
      if (!a.target) a.target = nearestFoe(a, foes, 135);
      if (a.target) a.state = "chase";
      break;
    }
    case "chase": {
      if (!tgt || tgt.dead || tgt.dying) { a.target = null; a.state = "home"; break; }
      const rr = a.st.range + (tgt.bodyR || 12) - 4;
      const d = dist(a.x, a.y, tgt.x, tgt.y);
      a.angle = angLerp(a.angle, Math.atan2(tgt.y - a.y, tgt.x - a.x), 1 - Math.pow(0.0001, dt));
      if (a.def.projSpeed) {
        // unidades à distância (cuspidora / bombeira) mantêm alcance
        if (d > a.st.range * 0.92) moveToward(a, tgt.x, tgt.y, dt);
        else if (d < a.st.range * 0.55) moveToward(a, a.x + (a.x - tgt.x), a.y + (a.y - tgt.y), dt, 0.6);
        else a.bob += dt * 2;
        if (d <= a.st.range && a.atkT <= 0) spitAt(a, tgt, m);
      } else {
        if (d > rr) moveToward(a, tgt.x, tgt.y, dt);
        else if (a.atkT <= 0) attackMelee(a, tgt, dt);
        else a.bob += dt * 2;
      }
      break;
    }
  }
}

function spitAt(a, tgt, m) {
  a.atkT = a.st.atkCd;
  const d = dist(a.x, a.y, tgt.x, tgt.y) || 1;
  const lead = clamp(d / a.st.projSpeed, 0, 0.5);
  const px = tgt.x + (tgt.vx || 0) * lead * 40, py = tgt.y + (tgt.vy || 0) * lead * 40;
  const dd = Math.max(1, dist(a.x, a.y, px, py));
  let dmg = a.st.dmg * packBonus(a) * (m.muts.acidDmg);
  const crit = m.critChance > 0 && Math.random() < m.critChance;
  if (crit) dmg *= 2;
  // Cuidado: o papel da bombeira é "ranged" (como a cuspidora) — o teste pelo
  // role nunca era verdade, então a bomba saía sem área, sem queimadura e com
  // som/visual de cuspe. O que identifica a bombeira é o tipo (ou ter aoe).
  const isBomb = a.type === "bomber" || a.def.bomb === true || a.def.role === "bomber"
    || (a.st.aoe || 0) > 0;
  spawnProj({
    x: a.x + Math.cos(a.angle) * 10, y: a.y + Math.sin(a.angle) * 10 - 4,
    vx: ((px - a.x) / dd) * a.st.projSpeed, vy: ((py - a.y) / dd) * a.st.projSpeed,
    dmg, faction: "ally",
    color: isBomb ? "#ff9a3d" : "#7fe8ff",
    size: isBomb ? 3.4 : 2.5,
    slow: m.muts.acidSlow ? 0.25 : 0,
    weaken: 0,
    bounces: m.muts.ricochet && !isBomb ? 1 : 0,
    aoe: isBomb ? a.st.aoe : 0,
    burnDps: isBomb ? a.st.burnDps : 0,
    burnDur: isBomb ? a.st.burnDur : 0,
    arc: isBomb,
  });
  if (isBomb) { SFX.whoosh(); } else { SFX.spit(); }
  a.lunge = 0.22;
}

// ----------------------------------------------------------- ordens/seleção --
export function selectInRect(x0, y0, x1, y1, additive) {
  let n = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const inside = a.x >= Math.min(x0, x1) && a.x <= Math.max(x0, x1) &&
                   a.y >= Math.min(y0, y1) && a.y <= Math.max(y0, y1);
    if (!additive) a.selected = false;
    if (inside) { a.selected = true; n++; }
  }
  if (n > 0) SFX.select();
  return n;
}

export function selectTypeOnScreen(typeId, rect) {
  let n = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const onScreen = a.x >= rect.x0 && a.x <= rect.x1 && a.y >= rect.y0 && a.y <= rect.y1;
    a.selected = onScreen && a.type === typeId;
    if (a.selected) n++;
  }
  if (n > 0) SFX.select();
  return n;
}

export function clearSelection() { for (const a of allies) a.selected = false; }
export function selectedCount() { let n = 0; for (const a of allies) if (a.selected && !a.dead) n++; return n; }

export function orderSelected(wx, wy, worldQueries) {
  let n = 0;
  for (const a of allies) {
    if (!a.selected || a.dead || a.dying) continue;
    n++;
    a.forcedTarget = null;
    a.target = null;
    // clicou em inimigo? tratado por game.js (orderAttack)
    const off = { x: wx + rand(-16, 16) * (1 + n * 0.06), y: wy + rand(-16, 16) * (1 + n * 0.06) };
    if (a.def.role === "worker") {
      const res = worldQueries.resourceAt(wx, wy);
      if (res) {
        if (res.kind === "food") { a.pile = res; a.node = null; }
        else { a.node = res; a.pile = null; }
        a.cmdPos = { x: res.x, y: res.y };
        a.state = "goto";
      } else {
        a.cmdPos = { x: off.x, y: off.y };
        a.tx = off.x; a.ty = off.y;
        a.state = "move";
      }
    } else if (a.def.role === "healer") {
      a.healTarget = null;
      a.cmdPos = null;
      a.tx = off.x; a.ty = off.y;
      a.state = "move";
    } else {
      a.guardPos = { x: off.x, y: off.y };
      a.tx = off.x; a.ty = off.y;
      a.state = "move";
    }
  }
  if (n > 0) SFX.command();
  return n;
}

/** F: convoca todas as guerreiras para o anel de defesa do formigueiro. */
export function rallyDefenders(anthill) {
  let n = 0;
  for (const a of allies) {
    if (a.dead || a.dying || a.def.role === "worker") continue;
    const ang = (n * 2.4) + 0.6;
    a.guardPos = { x: anthill.x + Math.cos(ang) * 220, y: anthill.y + Math.sin(ang) * 220 };
    a.tx = a.guardPos.x; a.ty = a.guardPos.y;
    a.state = "move";
    n++;
  }
  if (n > 0) SFX.command();
  return n;
}

export function orderAttackSelected(foe) {
  let n = 0;
  for (const a of allies) {
    if (!a.selected || a.dead || a.dying || a.def.role === "worker" || a.def.role === "healer") continue;
    a.forcedTarget = foe;
    a.state = "chase";
    n++;
  }
  if (n > 0) SFX.command();
  return n;
}
