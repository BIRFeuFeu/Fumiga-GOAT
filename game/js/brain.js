// ============================================================================
// FUMIGA — CÉREBRO DA COLÔNIA
//
// Cada formiga decide SOZINHA (IA de utilidade), mas dentro de três amarras
// que mantêm a colônia organizada e cada casta na sua função:
//
//   1. NECESSIDADES — a colônia mede o próprio estado (fome, pressão militar,
//      enfermaria, território conhecido) e publica esses números. Toda formiga
//      lê os mesmos valores, então decisões independentes apontam na mesma
//      direção.
//   2. COTAS — a colônia diz que fração das operárias deve estar coletando,
//      explorando ou carregando. Cada formiga compara a cota com a contagem
//      real e só se candidata à tarefa se ainda houver vaga: é isso que impede
//      12 operárias de brigar pela mesma pilha enquanto o resto fica parado.
//   3. ESTIGMERGIA — rastro de comida e de perigo numa grade grossa. Quem acha
//      comida perfuma o caminho; quem apanha marca o chão de alarme. As irmãs
//      sentem o cheiro e seguem/evitam sem ninguém mandar.
//
// PERSONALIDADE: cada formiga nasce com traços estáveis (coragem, gula,
// curiosidade, diligência). É isso que faz duas operárias idênticas escolherem
// coisas diferentes — comportamento individual sem virar ruído.
//
// A ORDEM DO JOGADOR sempre ganha: `forcedTarget`, `cmdPos` e `guardPos`
// vindos de um clique valem +2,0 de utilidade e nenhuma pontuação natural
// chega perto disso.
// ============================================================================
import { WORLD_W, WORLD_H } from "./config.js";
import { world } from "./world.js";
import { clamp, rand, dist2 } from "./utils.js";

// ------------------------------------------------------------------ campo ---
// Grade grossa de feromônio: 64px por célula -> 50x37 no mundo de 3200x2400.
const CELL = 64;
const GW = Math.ceil(WORLD_W / CELL), GH = Math.ceil(WORLD_H / CELL);
const foodField = new Float32Array(GW * GH);   // "aqui tem comida"
const dangerField = new Float32Array(GW * GH); // "aqui morre gente"

const idx = (x, y) => {
  const cx = clamp((x / CELL) | 0, 0, GW - 1);
  const cy = clamp((y / CELL) | 0, 0, GH - 1);
  return cy * GW + cx;
};

export function markFood(x, y, amt = 0.5) {
  foodField[idx(x, y)] = Math.min(1.6, foodField[idx(x, y)] + amt);
}
export function markDanger(x, y, amt = 0.7) {
  dangerField[idx(x, y)] = Math.min(2.2, dangerField[idx(x, y)] + amt);
}
export function dangerAt(x, y) { return dangerField[idx(x, y)]; }
export function foodTrailAt(x, y) { return foodField[idx(x, y)]; }

/** Cheira num cone à frente: devolve [frente, esquerda, direita]. */
function sniff(x, y, ang, reach) {
  const s = (a) => foodField[idx(x + Math.cos(a) * reach, y + Math.sin(a) * reach)];
  return [s(ang), s(ang - 0.7), s(ang + 0.7)];
}
function sniffDanger(x, y, ang, reach) {
  const s = (a) => dangerField[idx(x + Math.cos(a) * reach, y + Math.sin(a) * reach)];
  return [s(ang), s(ang - 0.9), s(ang + 0.9)];
}

// ---------------------------------------------------------------- colônia ---
export const colony = {
  t: 0,
  needs: { food: 0.6, defense: 0, medical: 0, explore: 0.4 },
  quota: { gather: 0.75, explore: 0.25, guard: 0.5, heal: 1 },
  headcount: { gather: 0, explore: 0, haul: 0, fight: 0, heal: 0, hold: 0 },
  counts: { worker: 0, fighter: 0, ranged: 0, healer: 0, colossus: 0 },
  threatsNearNest: 0,
  claims: new Map(),        // recurso -> Set(ids) : quem está a caminho
  knownFood: 0,
};

/** Zera o cérebro (nova expedição). */
export function resetColony() {
  foodField.fill(0);
  dangerField.fill(0);
  colony.t = 0;
  colony.claims.clear();
  colony.needs = { food: 0.6, defense: 0, medical: 0, explore: 0.4 };
  colony.headcount = { gather: 0, explore: 0, haul: 0, fight: 0, heal: 0, hold: 0 };
}

function decayField(f, k) {
  for (let i = 0; i < f.length; i++) {
    const v = f[i] * k;
    f[i] = v < 0.01 ? 0 : v;
  }
}

/** Ponto de referência da colônia: o formigueiro (ou a rainha, se ele sumiu). */
export function nestRef() {
  const A = world.anthill;
  return (A && typeof A.x === "number") ? A : { x: 0, y: 0 };
}

// ------------------------------------------------------------------ traços --
/** Personalidade estável de uma formiga. */
export function newBrain(type) {
  return {
    courage: clamp(rand(0.25, 1) + (type === "tank" || type === "giant" ? 0.35 : 0), 0, 1.2),
    greed: rand(0.15, 1),
    curiosity: rand(0.1, 1),
    diligence: rand(0.85, 1.2),
    // foco atual + memória (histerese: evita formiga "tremendo" entre tarefas)
    focus: null, focusT: 0,
    thinkIn: rand(0.05, 0.35),
    wanderAng: rand(0, Math.PI * 2),
    wanderT: 0,
    lastThreat: null,
    scentT: 0,
    trailScore: 0,
  };
}

// ------------------------------------------------------------------ claims --
function claim(target, a, max = 3) {
  if (!target) return false;
  let set = colony.claims.get(target);
  if (!set) { set = new Set(); colony.claims.set(target, set); }
  set.delete(a.id);                    // reafirma sem duplicar
  if (set.size >= max) return false;
  set.add(a.id);
  return true;
}
function release(target, a) {
  if (!target) return;
  const set = colony.claims.get(target);
  if (set) { set.delete(a.id); if (!set.size) colony.claims.delete(target); }
}
function crowdOf(target) {
  const set = colony.claims.get(target);
  return set ? set.size : 0;
}
/** Limpa claims de recursos esgotados / formigas mortas. */
function pruneClaims() {
  for (const [tgt, set] of colony.claims) {
    if (!tgt || tgt.amount <= 0 || tgt.blocked) { colony.claims.delete(tgt); continue; }
    if (!set.size) colony.claims.delete(tgt);
  }
}

// ---------------------------------------------------------- pulso da colônia -
/**
 * Atualiza necessidades, cotas e o feromônio. Roda 1x por frame com passo
 * interno de 0,25s para a parte cara.
 */
export function colonyTick(dt, allies, foes, run) {
  colony.t += dt;
  // feromônio evapora (meia-vida ~9s comida, ~5s alarme)
  const kf = Math.pow(0.5, dt / 9), kd = Math.pow(0.5, dt / 5);
  decayField(foodField, kf);
  decayField(dangerField, kd);

  colony.thinkT = (colony.thinkT || 0) - dt;
  if (colony.thinkT > 0) return;
  colony.thinkT = 0.25;
  pruneClaims();

  // --- contagem de castas e de quem está fazendo o quê
  const hc = { gather: 0, explore: 0, haul: 0, fight: 0, heal: 0, hold: 0 };
  const cc = { worker: 0, fighter: 0, ranged: 0, healer: 0, colossus: 0, weaver: 0 };
  let wounded = 0, combat = 0;
  for (const a of allies) {
    if (a.dead || a.dying) continue;
    const role = a.def && a.def.role;
    if (a.type === "giant") cc.colossus++;
    else if (a.type === "weaver") cc.weaver++;
    else if (role === "worker") cc.worker++;
    else if (role === "healer") cc.healer++;
    else if (role === "ranged") cc.ranged++;
    else cc.fighter++;
    if (role === "fighter" || role === "ranged" || a.type === "giant") combat++;
    if (a.hp < a.maxHp * 0.85) wounded++;
    const f = a.brain && a.brain.focus;
    if (f && hc[f] !== undefined) hc[f]++;
  }
  colony.headcount = hc;
  colony.counts = cc;

  // --- necessidades -------------------------------------------------------
  const nest = nestRef();
  let near = 0, nearestD = Infinity;
  for (const f of foes) {
    if (f.dead || f.dying) continue;
    const d2 = dist2(f.x, f.y, nest.x, nest.y);
    if (d2 < 460 * 460) near++;
    if (d2 < nearestD) nearestD = d2;
  }
  colony.threatsNearNest = near;

  const foodCap = 120 + (run ? (run.wave || 0) * 14 : 0);
  const foodNow = run ? run.food : 0;
  const n = colony.needs;
  const target = (cur, want, rate) => cur + (want - cur) * rate;
  n.food = target(n.food, clamp(1 - foodNow / foodCap, 0, 1), 0.25);
  n.defense = target(n.defense, clamp(near / 4 + (nearestD < 260 * 260 ? 0.35 : 0), 0, 1), 0.35);
  n.medical = target(n.medical, combat > 0 ? clamp(wounded / combat, 0, 1) : 0, 0.2);
  // território: quanto mais comida conhecida perto, menos vale explorar
  colony.knownFood = countFoodCells();
  n.explore = target(n.explore, clamp(0.55 - colony.knownFood * 0.02 + n.food * 0.2, 0.05, 0.85), 0.12);

  // --- cotas --------------------------------------------------------------
  // Com a despensa cheia e paz, quase todo mundo explora/estoque.
  // Com invasor no quintal, a coleta encolhe e a guarda cresce.
  const gatherWant = clamp(0.35 + 0.55 * n.food - 0.45 * n.defense, 0.15, 0.95);
  colony.quota.gather = gatherWant;
  colony.quota.explore = clamp(1 - gatherWant, 0.05, 0.85);
  colony.quota.guard = clamp(0.35 + 0.6 * n.defense, 0.2, 1);
  colony.quota.heal = cc.healer > 0 ? clamp(0.4 + 0.6 * n.medical, 0, 1) : 0;
}

function countFoodCells() {
  let n = 0;
  for (let i = 0; i < foodField.length; i++) if (foodField[i] > 0.25) n++;
  return n;
}

// ---------------------------------------------------------------- decisões --
const near01 = (d, far) => 1 - clamp(d / far, 0, 1);

/**
 * Decide o próximo foco de uma formiga. Não move nada: só escolhe e devolve
 * { act, target, pos }. O executor continua sendo a máquina de estados de
 * units.js — o cérebro é a camada de cima.
 */
export function think(a, ctx) {
  const b = a.brain;
  if (!b) return null;
  const { foes, allies: friends, m, run } = ctx;
  const role = a.def && a.def.role;
  const t = a.brain.traits || b;
  const A = nestRef();
  const hpFrac = a.maxHp > 0 ? clamp(a.hp / a.maxHp, 0, 1) : 1;
  const dNest = Math.sqrt(dist2(a.x, a.y, A.x, A.y));
  const dg = dangerAt(a.x, a.y);

  // ---------------------------------------------------- 0) ordens do jogador
  // Clique em inimigo, clique no chão e posto de guarda mandam mais que tudo.
  const canAtk = a.def && a.def.attack !== false;
  if (canAtk && a.forcedTarget && !a.forcedTarget.dead && !a.forcedTarget.dying) {
    return { act: "engage", target: a.forcedTarget, why: "ordem" };
  }
  if (a.cmdPos) return { act: "move", pos: a.cmdPos, why: "ordem" };

  // --------------------------------------------------------- 1) sobrevivência
  const fleeU = dg * 0.45 + (1 - hpFrac) * 0.5 + colony.needs.defense * 0.1;
  const panic = !canAtk && (fleeU > 0.85 || hpFrac < 0.22);
  if (panic) return { act: "flee", pos: { x: A.x, y: A.y }, why: "pânico" };

  if (role === "worker") return thinkWorker(a, ctx, { hpFrac, dNest, dg, A });
  if (role === "healer") return thinkHealer(a, ctx, { hpFrac, dNest, dg, A, friends });
  if (!canAtk) return thinkScout(a, ctx, { hpFrac, dNest, dg, A });
  return thinkSoldier(a, ctx, { hpFrac, dNest, dg, A, fleeU });
}

// ---------------------------------------------------------------- operária --
function thinkWorker(a, ctx, S) {
  const b = a.brain, tr = b.traits || b;
  const { foes, m, run } = ctx;
  const n = colony.needs, q = colony.quota, hc = colony.headcount;
  const workers = Math.max(1, colony.counts.worker);

  // Carga cheia = entregar. Antes o cérebro reassumia "gather" e a operária
  // voltava a colher com a boca cheia, nunca depositando (comida travada).
  if (a.carry >= a.st.carry) return { act: "haul", why: "entregar" };

  // COMPROMISSO: já tem um recurso válido no caminho? Termina o que começou.
  // Sem isto a formiga "tremia" entre coletar e explorar e largava a pilha no
  // meio da viagem (nunca enchia a carga). Só reconsidera se esgotou, bloqueou
  // ou cheirou perigo de verdade no destino.
  const tgt0 = a.pile || a.node;
  if (tgt0 && tgt0.amount > 0 && !tgt0.blocked) {
    const dT = dangerAt(tgt0.x, tgt0.y);
    if (dT < 0.9) return { act: "gather", target: tgt0, why: "compromisso" };
  }

  // cota cheia? se já tem gente coletando o bastante, esta aqui explora
  const gatherFull = hc.gather / workers > q.gather + 0.06;
  const exploreFull = hc.explore / workers > q.explore + 0.06;

  const opts = [];
  const carrying = a.carry > 0 && a.carry < a.st.carry;

  // --- COLETAR: o pão da colônia
  {
    let best = null, bestScore = -Infinity;
    const consider = (res, kind) => {
      if (!res || res.amount <= 0 || res.blocked) return;
      const d = Math.sqrt(dist2(a.x, a.y, res.x, res.y));
      const crowd = crowdOf(res);
      const dang = dangerAt(res.x, res.y);
      let u = 0.30 + 0.42 * n.food + 0.18 * tr.greed;
      u += 0.22 * near01(d, 520);              // perto rende mais
      // viagem longa demais não compensa: a operária trabalha no quintal
      u -= 0.38 * clamp((d - 420) / 620, 0, 1);
      u -= 0.30 * clamp(dang, 0, 1.5);         // cheiro de morte afasta
      u -= 0.13 * Math.min(3, crowd);          // não amontoa
      u -= gatherFull ? 0.55 : 0;
      if (kind !== "food") u -= 0.08;          // comida antes de essência
      // carregando meia carga: TERMINA a carga — não larga a pilha no meio
      if (carrying) u += 0.6;
      if (u > bestScore) { bestScore = u; best = res; }
    };
    const ctxPiles = ctx.piles || [];
    for (const p of ctxPiles) consider(p, p.kind);
    if (best && bestScore > 0.12 && claim(best, a)) {
      opts.push({ act: "gather", target: best, u: bestScore, why: "coleta" });
    }
  }

  // --- EXPLORAR: abrir território e achar comida nova
  {
    let u = 0.14 + 0.34 * n.explore + 0.20 * tr.curiosity;
    if (carrying) u -= 0.8;                    // cheia/na metade: vai entregar
    if (exploreFull) u -= 0.5;
    if (n.food > 0.8) u += 0.12;               // despensa vazia: sai procurar
    // seguir o rastro das irmãs vale mais do que andar à toa
    const [fwd, lft, rgt] = sniff(a.x, a.y, b.wanderAng, 150);
    b.trailScore = Math.max(fwd, lft, rgt);
    u += 0.18 * clamp(b.trailScore, 0, 1);
    u -= 0.25 * clamp(dangerAt(a.x, a.y), 0, 1.5);
    if (u > 0.1) {
      let ang = b.wanderAng;
      if (lft > fwd && lft > rgt) ang -= 0.8;
      else if (rgt > fwd && rgt > lft) ang += 0.8;
      const reach = 220 + tr.curiosity * 180;
      opts.push({
        act: "explore",
        pos: { x: a.x + Math.cos(ang) * reach, y: a.y + Math.sin(ang) * reach },
        u, why: "explorar", ang,
      });
    }
  }

  // --- FICAR: sem nada útil, volta para perto do formigueiro
  {
    const u = 0.06 + 0.1 * (1 - n.food) + 0.12 * near01(S.dNest, 500);
    opts.push({ act: "idle", u, why: "esperar" });
  }

  return commit(a, opts);
}

// -------------------------------------------------------------- batedora ---
// A batedora não luta: o "trabalho" dela é abrir mapa e farejar. Utilidades só
// de exploração/fuga — nenhum "engage", então ela jamais entra em combate.
function thinkScout(a, ctx, S) {
  const b = a.brain, tr = b.traits || b;
  const n = colony.needs;
  const opts = [];
  {
    let u = 0.45 + 0.30 * n.explore + 0.25 * tr.curiosity;
    const [fwd, lft, rgt] = sniff(a.x, a.y, b.wanderAng, 170);
    u += 0.15 * clamp(Math.max(fwd, lft, rgt), 0, 1);
    u -= 0.30 * clamp(dangerAt(a.x, a.y), 0, 1.5);
    let ang = b.wanderAng;
    if (lft > fwd && lft > rgt) ang -= 0.8;
    else if (rgt > fwd && rgt > lft) ang += 0.8;
    const reach = 260 + tr.curiosity * 220;
    opts.push({ act: "explore", pos: { x: a.x + Math.cos(ang) * reach, y: a.y + Math.sin(ang) * reach }, u, ang, why: "batedura" });
  }
  opts.push({ act: "idle", u: 0.12 + 0.1 * (1 - n.explore), why: "esperar" });
  return commit(a, opts);
}

// ------------------------------------------------------------- combatentes --
function thinkSoldier(a, ctx, S) {
  const b = a.brain, tr = b.traits || b;
  const { foes, m } = ctx;
  const n = colony.needs;
  const opts = [];
  const ranged = !!(a.def && a.def.projSpeed);
  const aggro = (a.st && a.st.aggro) || 260;

  // --- RECUAR: ferida demais, ela volta a se recompor perto da rainha
  if (S.hpFrac < 0.3 && S.fleeU > 0.45) {
    opts.push({ act: "fallBack", pos: { x: S.A.x, y: S.A.y }, u: 0.75 + (1 - S.hpFrac) * 0.4, why: "recuar" });
  }

  // --- ATACAR o alvo mais valioso ao alcance
  {
    let best = null, bestU = -Infinity;
    for (const f of foes) {
      if (f.dead || f.dying) continue;
      const d = Math.sqrt(dist2(a.x, a.y, f.x, f.y));
      if (d > aggro * 1.35) continue;
      const threat = f.isBoss ? 1 : (f.maxHp ? clamp(f.hp / 120, 0.2, 1) : 0.5);
      const toNest = Math.sqrt(dist2(f.x, f.y, S.A.x, S.A.y));
      let u = 0.24 + 0.5 * n.defense + 0.26 * tr.courage;
      u += 0.22 * near01(d, aggro);            // perto é prioridade
      u += 0.18 * near01(toNest, 520);         // defender o formigueiro
      u += 0.14 * threat;
      // Inimigo dentro do próprio raio de ação: nenhuma outra tarefa ganha.
      // Sem isto a soldado preferia "voltar ao posto" a defender a colônia.
      u += 0.5 * near01(d, aggro) + (d < 140 ? 0.35 : 0);
      if (ranged) u += d > (a.st.range * 0.8) ? 0.06 : -0.02;
      u -= 0.10 * clamp(dangerAt(f.x, f.y) - 0.6, 0, 1) * (1 - tr.courage);
      if (u > bestU) { bestU = u; best = f; }
    }
    if (best && bestU > 0.2) opts.push({ act: "engage", target: best, u: bestU, why: "atacar" });
  }

  // --- GUARDAR o posto (formação em volta da rainha / do formigueiro)
  {
    const post = a.guardPos || { x: S.A.x, y: S.A.y };
    const d = Math.sqrt(dist2(a.x, a.y, post.x, post.y));
    let u = 0.3 + 0.28 * (1 - n.defense) + 0.1 * (1 - tr.courage);
    // fora do posto ela volta — mas quanto maior a pressão inimiga, menos o
    // posto pesa (a guarda existe para virar linha de frente, não estátua)
    if (d > 46) u += 0.14 * (1 - 0.6 * n.defense);
    opts.push({ act: "guard", pos: post, u, why: "guarda" });
  }

  // --- INTERCEPTAR: adiantar-se ao invasor que vem para o ninho
  {
    if (n.defense > 0.25) {
      let best = null, bd = Infinity;
      for (const f of foes) {
        if (f.dead || f.dying) continue;
        const d = dist2(f.x, f.y, S.A.x, S.A.y);
        if (d < bd) { bd = d; best = f; }
      }
      if (best) {
        const dx = best.x - S.A.x, dy = best.y - S.A.y;
        const dd = Math.max(1, Math.hypot(dx, dy));
        const ring = 190;
        const pos = { x: S.A.x + (dx / dd) * ring, y: S.A.y + (dy / dd) * ring };
        let u = 0.2 + 0.42 * n.defense + 0.2 * tr.courage;
        if (ranged) u -= 0.12;                 // quem atira de longe não avança
        opts.push({ act: "intercept", pos, u, why: "interceptar" });
      }
    }
  }

  // --- APOIAR: ficar perto das irmãs (fome coletiva / linha de frente)
  if (m && m.muts && m.muts.packDmg) {
    opts.push({ act: "support", u: 0.22 + 0.1 * tr.courage, why: "matilha" });
  }

  return commit(a, opts);
}

// ------------------------------------------------------------- curandeira ---
function thinkHealer(a, ctx, S) {
  const b = a.brain, tr = b.traits || b;
  const { allies: friends, foes } = ctx;
  const n = colony.needs;
  const opts = [];
  const range = (a.st && a.st.healRange) || 150;

  // --- CURAR a mais ferida ao alcance
  {
    let best = null, bestU = -Infinity;
    for (const o of friends) {
      if (o === a || o.dead || o.dying) continue;
      if (o.type === "queen") continue;
      const d = Math.sqrt(dist2(a.x, a.y, o.x, o.y));
      const frac = o.maxHp > 0 ? o.hp / o.maxHp : 1;
      if (frac > 0.98) continue;
      let u = 0.3 + 0.5 * n.medical + 0.5 * (1 - frac);
      u += 0.2 * near01(d, range * 2.4);
      u -= 0.3 * clamp(dangerAt(o.x, o.y), 0, 1.5) * (1 - tr.courage);
      if (u > bestU) { bestU = u; best = o; }
    }
    if (best && bestU > 0.32) opts.push({ act: "heal", target: best, u: bestU, why: "curar" });
  }

  // --- ESCORTAR a linha de frente
  {
    let leader = null, bd = Infinity;
    for (const o of friends) {
      if (o === a || o.dead || o.dying) continue;
      const r = o.def && o.def.role;
      if (r !== "fighter" && r !== "ranged" && o.type !== "giant") continue;
      const d = dist2(a.x, a.y, o.x, o.y);
      if (d < bd) { bd = d; leader = o; }
    }
    let u = 0.22 + 0.3 * n.defense + 0.1 * tr.courage;
    if (leader) u += 0.12 * near01(Math.sqrt(bd), 420);
    opts.push({ act: "escort", target: leader, u, why: "escolta" });
  }

  // --- RECUAR se o bicho pegar
  if (S.hpFrac < 0.45) {
    opts.push({ act: "fallBack", pos: { x: S.A.x, y: S.A.y }, u: 0.6 + (1 - S.hpFrac) * 0.35, why: "recuar" });
  }

  // --- GUARDAR posto
  const post = a.guardPos || { x: S.A.x, y: S.A.y - 40 };
  opts.push({ act: "guard", pos: post, u: 0.2, why: "guarda" });

  return commit(a, opts);
}

// ------------------------------------------------------------------- commit --
/**
 * Escolhe a maior utilidade, com histerese: o foco atual ganha um bônus para a
 * formiga não trocar de ideia a cada frame (e por +0,06 por traço de
 * diligência, já que formiga teimosa termina o que começou).
 */
function commit(a, opts) {
  if (!opts.length) return null;
  const b = a.brain;
  let best = null;
  for (const o of opts) {
    let u = o.u;
    if (b.focus === o.act) u += 0.16 + 0.06 * ((b.traits || b).diligence || 1);
    if (best === null || u > best.u) { o.u = u; best = o; }
  }
  b.focus = best.act;
  return best;
}

/** Uma formiga morreu / terminou: devolve o lugar na fila do recurso. */
export function forget(a) {
  if (!a) return;
  release(a.pile || a.node, a);
}

/** Perfuma o caminho quando a formiga acha comida de verdade. */
export function announceFood(a, dt) {
  const b = a.brain;
  if (!b) return;
  b.scentT -= dt;
  if (b.scentT > 0) return;
  b.scentT = 0.35;
  markFood(a.x, a.y, a.carry > 0 ? 0.45 : 0.28);
}

/** Estatísticas para o HUD (opcional). */
export function colonyReport() {
  return {
    fome: colony.needs.food,
    defesa: colony.needs.defense,
    enfermaria: colony.needs.medical,
    exploracao: colony.needs.explore,
    coletando: colony.headcount.gather,
    explorando: colony.headcount.explore,
    rastro: colony.knownFood,
  };
}
