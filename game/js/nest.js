// ============================================================================
// FUMIGA — INTERIOR DO FORMIGUEIRO (inspirado em Ant Colony: inspiração1)
//
// Corte transversal vivo da colônia: túneis, câmaras de terra e as formigas
// trabalhando de verdade — carregando comida da entrada até a despensa,
// escavando a câmara que você mandou abrir, cuidando das larvas no berçário e
// a rainha botando ovos na câmara real.
//
// REWORK DA BOCA (2026): aqui dentro só entra quem REALMENTE passou pela boca
// do formigueiro (allies.inside, mantido em units.js). O mundo lá fora NÃO
// congela mais — ele continua rodando ao mesmo tempo, e a janela "OLHO LÁ
// FORA" (render.js: drawOutsideEye) mostra essa outra tela viva. Quem está
// dentro continua dentro (e trabalhando) mesmo depois de o jogador sair.
// ============================================================================
import { CHAMBERS, MAPS, PAL, VIEW_W, VIEW_H } from "./config.js";
import { G, mods } from "./state.js";
import { IMG, rotFrame, rotDrawSize } from "./assets.js";
import { drawOutsideEye, PIP } from "./render.js";
import { drawText, textWidth, wrapText, fitTextBlock, fontScale } from "./font.js";
import { button, panel, bar, pointInRect, isTouchUI } from "./ui.js";
import { world } from "./world.js";
import { SFX } from "./audio.js";
import {
  allies, spawnAnt, popUsed, popCapTotal, recomputeAllies,
  antExitNest, antEnterNest, insideCount, requestNestExit,
} from "./units.js";
import { colony } from "./brain.js";
import { clamp, rand, lerp, TAU } from "./utils.js";

// ------------------------------------------------------------------ salas ---
// Coordenadas fixas na tela (960x540). As salas usam os mesmos ids de
// CHAMBERS, então run.chambers[id] continua mandando no nível.
// NOTA (rework da boca): a DESPENSA desceu de y=130 para y=232 para abrir o
// canto superior direito, onde vive a janela "OLHO LÁ FORA".
const ROOMS = [
  { id: "entrance",  x: 62,  y: 60,  w: 168, h: 76, accent: "#ffd479" },
  { id: "nursery",   x: 128, y: 196, w: 178, h: 88, accent: "#7fd6a0" },
  { id: "royal",     x: 380, y: 112, w: 204, h: 94, accent: "#ffd479" },
  { id: "pantry",    x: 658, y: 232, w: 178, h: 88, accent: "#ffb347" },
  { id: "barracks",  x: 372, y: 300, w: 196, h: 92, accent: "#8fd3ff" },
  { id: "fungus",    x: 92,  y: 348, w: 176, h: 84, accent: "#c77dff" },
  { id: "refinery",  x: 664, y: 340, w: 180, h: 84, accent: "#c77dff" },
];
const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
const EDGES = [
  ["entrance", "nursery"], ["nursery", "royal"], ["royal", "pantry"],
  ["royal", "barracks"], ["barracks", "refinery"], ["nursery", "fungus"],
  ["fungus", "barracks"], ["pantry", "refinery"],
];
const NEIGHBORS = (() => {
  const m = Object.fromEntries(ROOMS.map((r) => [r.id, []]));
  for (const [a, b] of EDGES) { m[a].push(b); m[b].push(a); }
  return m;
})();

const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function pathBetween(from, to) {
  if (!(from in NEIGHBORS)) from = "entrance";     // cinto de segurança
  if (!(to in NEIGHBORS)) return [];
  if (from === to) return [to];
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    for (const n of NEIGHBORS[cur]) {
      if (n in prev) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  if (!(to in prev)) return [to];
  const out = [];
  let cur = to;
  while (cur) { out.unshift(cur); cur = prev[cur]; }
  return out;
}

// ------------------------------------------------------------------ estado ---
export const nest = {
  open: false,
  t: 0,
  ants: [],        // formigas dentro do formigueiro (espelham allies)
  floats: [],      // textos flutuantes locais
  bits: [],        // partículas locais (poeira, brilhos)
  dig: null,       // { id, lvl, t, total } escavação em andamento
  eggs: [],        // ovos a caminho do berçário
  larvae: [],      // larvas no berçário
  laidT: 3,
  growT: 12,
  deliveries: 0,
  dug: 0,
  hover: null,
  eatT: 0,
};

const BOTTOM = 452;                    // faixa do rodapé
const rnd = (a, b) => a + Math.random() * (b - a);
const roomOf = (id) => ROOM_BY_ID[id];

// ------------------------------------------------------------------ entrada --
export function nestEnter() {
  nest.open = true;
  nest.t = 0;
  nest.floats.length = 0;
  nest.bits.length = 0;
  nest.hover = null;
  nest.dig = null;
  nest.eggs.length = 0;
  nest.deliveries = 0;
  if (!nest.larvae.length) {
    for (let i = 0; i < 4; i++) nest.larvae.push({ i, x: 0, y: 0, t: rand(0, 6.28), born: 0 });
  }
  // REWORK: nada de espelhar a colônia inteira. A cena de dentro mostra SÓ
  // quem realmente passou pela boca e está aqui dentro agora (allies.inside).
  syncAnts(true);
}

export function nestExit() {
  nest.open = false;
  // quem está dentro CONTINUA dentro (e continua trabalhando na cena de
  // dentro quando o jogador voltar). Antes o roster era zerado aqui e a
  // colônia inteira "renascia" lá dentro na próxima entrada.
} 

/**
 * Espelha o ROSTER REAL do formigueiro (allies.inside, de units.js) — quem
 * entrou pela boca vira uma formiga da cena de dentro; quem saiu, some daqui.
 */
function syncAnts(force = false) {
  if (force) nest.ants.length = 0;
  const roster = allies.inside || [];
  // remove quem saiu pela boca (ou morreu)
  if (!force) {
    for (let i = nest.ants.length - 1; i >= 0; i--) {
      const a = roster.find((r) => r.id === nest.ants[i].id);
      if (!a) nest.ants.splice(i, 1);
    }
  }
  for (const a of roster) {
    if (a.dead || a.dying) continue;
    if (nest.ants.some((n) => n.id === a.id)) continue;
    if (nest.ants.length >= 26) break;   // o resto fica "nos túneis"
    nest.ants.push(makeNestAnt(a));
  }
}

function jobFor(type) {
  if (type === "worker" || type === "gatherer") return "carrier";
  if (type === "healer") return "nurse";
  if (type === "giant") return "colossus";
  return "guard";
}

function makeNestAnt(a) {
  // quem chega do mundo desce pela BOCA: entra pela sala da ENTRADA e, a
  // partir dela, a rota interna leva cada casta ao seu posto de trabalho
  const home = "entrance";
  const c = center(roomOf(home));
  const n = {
    id: a.id, type: a.type, job: jobFor(a.type), sprite: a.def ? a.def.sprite : a.type,
    x: c.x + rnd(-40, 40), y: c.y + rnd(-20, 20),
    angle: rnd(0, TAU), bob: rnd(0, 6.28), speed: rnd(92, 118) * (mods().nestSpeed || 1),
    room: home, route: null, leg: 0, t: rnd(0, 3),
    carry: null, workT: 0, scale: 0,
  };
  // o colosso não passa nos túneis: fica de folga no quartel
  if (n.job === "colossus") n.scale = 105 / Math.max(1, rotDrawSize("giant") || 105);
  return n;
}

// ------------------------------------------------------------------- rotas ---
function setRoute(n, toId, point) {
  const ids = pathBetween(n.room, toId);
  const pts = ids.map((id) => center(roomOf(id)));
  if (point) pts.push(point);
  pts.unshift({ x: n.x, y: n.y });
  n.route = pts;
  n.leg = 1;
  n.routeDest = toId;      // n.room continua sendo a sala de ORIGEM: é dela
}                          // que o caminho é traçado (não pode virar null)

function advance(n, dt) {
  if (!n.route) return true;
  // Quem vai para a boca anda com pressa (+25%): a fila não pode arrastar.
  const speed = n.speed * (n.carry ? 0.8 : 1) * (n.leaving ? 1.25 : 1);
  let move = speed * dt;
  while (move > 0 && n.leg < n.route.length) {
    const p = n.route[n.leg];
    const dx = p.x - n.x, dy = p.y - n.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.6) { n.x = p.x; n.y = p.y; n.leg++; continue; }
    n.angle = Math.atan2(dy, dx);
    const step = Math.min(d, move);
    n.x += (dx / d) * step;
    n.y += (dy / d) * step;
    move -= step;
  }
  if (n.leg >= n.route.length) {
    n.route = null;
    n.room = n.routeDest;
    return true;
  }
  return false;
}

// ------------------------------------------------- fila da boca (saída) ---
// SAIR É ANDAR (2026): quem vai para fora atravessa os túneis de verdade, ao
// contrário da entrada. requestNestExit (units.js) marca o pedido no roster;
// aqui o corpo larga o trabalho, corre até a ENTRADA e só então antExitNest
// a põe no mundo — brotando junto à porta, não longe dela.
function pickupExitQueue() {
  const roster = allies.inside || [];
  for (const a of roster) {
    if (!a.exitRequested || a.dead || a.dying || a.doorT > 0) continue;
    let n = nest.ants.find((v) => v.id === a.id);
    if (!n) {
      if (nest.ants.length >= 26) continue;   // sem corpo visível: espera vaga
      n = makeNestAnt(a);
      nest.ants.push(n);
    }
    if (!n.leaving) {
      n.leaving = true;
      n.leaveT = 0;
      n.carry = null;                          // larga a carga: quem sai não entrega
      n.route = null;                          // larga a rota: o destino é a boca
    }
  }
}

// Um passo de quem está na fila (corpo sem rota: ou chegou, ou parte).
function stepLeaving(n) {
  if (n.room === "entrance") {
    const a = (allies.inside || []).find((r) => r.id === n.id);
    n.leaving = false;
    if (a && !a.dead && !a.dying) {
      dustOut(n);
      antExitNest(a);
      float(center(roomOf("entrance")).x, center(roomOf("entrance")).y - 26,
        "PELA BOCA!", "#ffd479", 1.4);
    } else {
      const i = nest.ants.indexOf(n);
      if (i >= 0) nest.ants.splice(i, 1);
    }
    return;
  }
  setRoute(n, "entrance");
}

// ------------------------------------------------------------------ update ---
/**
 * Update da cena de dentro. Ela roda SEMPRE — mesmo com o jogador lá fora —
 * porque quem está no ninho é formiga de verdade trabalhando (leva comida à
 * despensa, cuida das larvas, escava). visible = o jogador está olhando:
 * só nesse caso a chocagem grátis do berçário anda (o "presente" da visita).
 */
export function nestUpdate(dt, visible = true) {
  nest.t += dt;
  syncAnts();
  pickupExitQueue();   // quem pediu para sair larga o trabalho e vai à boca

  // ---- quem pega na picareta: operárias largam a coleta e vão para a obra
  {
    let diggers = nest.ants.filter((n) => n.job === "digger").length;
    const want = nest.dig ? 4 : 0;
    for (const n of nest.ants) {
      if (n.leaving) continue;   // quem está indo para a boca não pega na picareta
      if (n.job === "carrier" && diggers < want) { n.job = "digger"; n.route = null; diggers++; }
      else if (n.job === "digger" && diggers > want) { n.job = "carrier"; n.route = null; diggers--; }
    }
  }

  // ---- escavação em andamento: o tempo corre e as escavadoras ajudam
  if (nest.dig) {
    const workers = nest.ants.filter((n) => n.job === "digger").length;
    // FORMIGA-TECELÃ (Oecophylla): a seda reforça as galerias recém-abertas -
    // cada Tecelã viva (até 3) acelera a escavação
    const weavers = Math.min(3, colony.counts.weaver || 0);
    const speed = (1 + workers * 0.16) * (1 + 0.12 * weavers * (mods().weaverBoost || 1)) * (mods().digSpeed || 1);
    nest.dig.t += dt * speed;
    const r = roomOf(nest.dig.id);
    if (Math.random() < dt * 14) {
      const cx = center(r);
      nest.bits.push({
        x: cx.x + rnd(-r.w * 0.3, r.w * 0.3), y: cx.y + rnd(-r.h * 0.3, r.h * 0.3),
        vx: rnd(-14, 14), vy: rnd(-30, -8), life: rnd(0.4, 0.9), max: 0.9,
        color: "#6b4a24", size: rnd(1, 2.4),
      });
    }
    if (nest.dig.t >= nest.dig.total) finishDig();
  }

  // ---- chocagem de ovos no berçário (comida grátis da colônia)
  // Só enquanto o jogador está olhando o formigueiro: é o presente da visita
  // (fora disso a colônia de dentro trabalha, mas não se multiplica de graça).
  if (visible && nest.larvae.length && runRef() && runRef().chambers) {
    const nursery = runRef().chambers.nursery;
    nest.growT -= dt;
    if (nest.growT <= 0) {
      nest.growT = Math.max(9, 20 - nursery * 4) / ((1 + 0.1 * Math.min(3, colony.counts.weaver || 0) * (mods().weaverBoost || 1)) * (mods().nurserySpeed || 1));
      if (popUsed() < popCapTotal()) {
        // A formiga nasce no MUNDO (junto ao formigueiro, como as chocadas na
        // loja) — o que é posicionado na entrada é só o corpo dela na cena de
        // dentro. Antes o spawn saía em (145, 98) do mundo, o canto do mapa.
        const A = world.anthill;
        const a = spawnAnt("worker", A.x + rand(-40, 40), A.y + rand(-40, 40), { spawnT: 0.34 });
        const na = makeNestAnt(a);
        na.room = "entrance";
        const c = center(roomOf("entrance"));
        na.x = c.x; na.y = c.y;
        nest.ants.push(na);
        // a larva que virou formiga sai da lista e nasce uma nova no lugar
        nest.larvae.pop();
        const i = nest.larvae.length;
        nest.larvae.push({ i, x: 0, y: 0, t: rand(0, 6.28), born: 0 });
        float(center(roomOf("nursery")).x, center(roomOf("nursery")).y - 30,
          "NOVA CORTADEIRA!", "#7fd6a0", 1.8);
        SFX.hatch();
      }
    }
  }

  // ---- a rainha bota ovos
  if (nest.eggs.length < 3) {
    nest.laidT -= dt;
    if (nest.laidT <= 0) {
      nest.laidT = rnd(5.5, 8.5) * (mods().nestEgg || 1);
      const c = center(roomOf("royal"));
      nest.eggs.push({ t: 0, x: c.x + rnd(-26, 26), y: c.y + rnd(-6, 12), taken: false, grow: 0 });
      SFX.chime();
    }
  }
  for (const e of nest.eggs) e.t += dt;

  // ---- as larvas se mexem
  for (const l of nest.larvae) { l.t += dt; l.born += dt; }

  // ---- IA das formigas
  for (const n of nest.ants) {
    n.t += dt;
    n.bob += dt * (n.route ? 8 : 2);
    const r = n.room ? roomOf(n.room) : null;
    const moving = !!n.route;
    // Fila da boca: atravessa os túneis até a ENTRADA (rede de 15s incluída).
    if (n.leaving) {
      n.leaveT = (n.leaveT || 0) + dt;
      if (n.leaveT > 15) {
        const a = (allies.inside || []).find((v) => v.id === n.id);
        n.leaving = false;
        if (a && !a.dead && !a.dying) antExitNest(a);
        const i = nest.ants.indexOf(n);
        if (i >= 0) nest.ants.splice(i, 1);
        continue;
      }
      if (moving) { advance(n, dt); continue; }
      stepLeaving(n);
      continue;
    }
    if (moving) { advance(n, dt); continue; }
    if (n.job === "colossus") { n.angle = lerp(n.angle, 1.2, 0.02); continue; }

    if (n.job === "carrier") {
      if (!n.carry) {
        // pega um pedaço de comida na entrada
        if (n.room !== "entrance") setRoute(n, "entrance");
        else {
          n.carry = 1;
          n.workT = 0.5;
          setRoute(n, "pantry");
        }
      } else {
        if (n.room !== "pantry") setRoute(n, "pantry");
        else {
          // entrega: a despensa guarda e a comida entra no cofre da run
          const mult = 1 + 0.15 * (runRef().chambers.pantry || 0);
          const amount = Math.round(rnd(2, 4) * mult + (mods().nestDeposit || 0));
          if (runRef()) runRef().food += amount;
          nest.deliveries += amount;
          float(n.x, n.y - 16, "+" + amount, "#ffd479", 0.9);
          n.carry = null;
          n.workT = rnd(0.3, 1.2);
          setRoute(n, "entrance");
        }
      }
      continue;
    }

    if (n.job === "digger") {
      // quem escava vai para a obra; sem obra, patrulha
      if (nest.dig) {
        const r2 = roomOf(nest.dig.id);
        if (n.room !== nest.dig.id && !n.route) setRoute(n, nest.dig.id,
          { x: center(r2).x + rnd(-34, 34), y: center(r2).y + rnd(-16, 22) });
      } else if (n.t > 2) { n.t = 0; setRoute(n, Math.random() < 0.5 ? "barracks" : "entrance"); }
      continue;
    }

    if (n.job === "nurse") {
      const target = nest.larvae[(n.id + (nest.t | 0)) % Math.max(1, nest.larvae.length)];
      if (n.room !== "nursery") setRoute(n, "nursery");
      else if (target && nest.t % 3 < 0.1) {
        const c2 = center(roomOf("nursery"));
        n.x = lerp(n.x, c2.x + rnd(-46, 46), 0.05);
        n.y = lerp(n.y, c2.y + rnd(-22, 24), 0.05);
      }
      continue;
    }

    // guarda: patrulha entre quartel e entrada
    if (n.t > rnd(3, 6)) {
      n.t = 0;
      setRoute(n, Math.random() < 0.5 ? "entrance" : "barracks");
    } else if (r) {
      const c2 = center(r);
      n.x = lerp(n.x, c2.x + Math.sin(n.bob * 0.4) * 44, 0.02);
      n.y = lerp(n.y, c2.y + Math.cos(n.bob * 0.3) * 18, 0.02);
    }
  }

  // ---- partículas e números flutuantes
  for (let i = nest.bits.length - 1; i >= 0; i--) {
    const b = nest.bits[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 40 * dt;
    if (b.life <= 0) nest.bits.splice(i, 1);
  }
  for (let i = nest.floats.length - 1; i >= 0; i--) {
    const f = nest.floats[i];
    f.life -= dt; f.y -= dt * 16;
    if (f.life <= 0) nest.floats.splice(i, 1);
  }
}

function runRef() { return G.run; }

function float(x, y, text, color, life) {
  nest.floats.push({ x, y, text, color, life, max: life });
}

// ------------------------------------------------------------- escavação ----
/** Começa a escavar/melhorar uma câmara. Retorna { ok, why }. */
export function nestDig(id) {
  const run = runRef();
  const def = CHAMBERS[id];
  if (!run || !def) return { ok: false, why: "SEM CAMINHO" };
  if (nest.dig) return { ok: false, why: "JÁ ESTÃO ESCAVANDO" };
  const lvl = run.chambers[id];
  if (lvl >= def.max) return { ok: false, why: "NÍVEL MÁXIMO" };
  const cost = chamberCost(id, lvl);
  if (run.food < cost.food) return { ok: false, why: "FALTA COMIDA" };
  if (run.essencePool < cost.ess) return { ok: false, why: "FALTA ESSÊNCIA" };
  run.food -= cost.food;
  run.essencePool -= cost.ess;
  nest.dig = { id, lvl, t: 0, total: 6 + lvl * 3 };
  SFX.buy();
  return { ok: true };
}

function finishDig() {
  const run = runRef();
  const d = nest.dig;
  nest.dig = null;
  if (!run || !d) return;
  run.chambers[d.id] = d.lvl + 1;
  nest.dug++;
  recomputeAllies();
  const r = roomOf(d.id);
  const c = center(r);
  for (let i = 0; i < 26; i++) {
    nest.bits.push({
      x: c.x, y: c.y, vx: rnd(-90, 90), vy: rnd(-120, -20),
      life: rnd(0.5, 1.1), max: 1.1, color: i % 3 ? "#8a5f2a" : "#ffd479", size: rnd(1.4, 3),
    });
  }
  float(c.x, c.y - 26, CHAMBERS[d.id].name + " NÍVEL " + (d.lvl + 1), "#ffd479", 2.2);
  SFX.chime();
}

// ------------------------------------------------------------------ clique ---
export function nestClick(x, y) {
  if (!nest.open) return false;
  // clique na ENTRADA = abre a boca e libera uma formiga para o mundo
  const ent = roomOf("entrance");
  if (pointInRect(x, y, ent.x, ent.y, ent.w, ent.h)) {
    if (nestLeaveOne()) return "out";
    float(x, y - 12, "NINGUÉM AQUI PARA SAIR", "#8f86b8", 1.4);
    SFX.deny();
    return true;
  }
  for (const r of ROOMS) {
    if (r.id === "entrance" || r.id === "royal") continue;
    if (!pointInRect(x, y, r.x, r.y, r.w, r.h)) continue;
    const res = nestDig(r.id);
    if (!res.ok) {
      float(x, y - 12, res.why, "#ff4d5a", 1.4);
      SFX.deny();
    }
    return true;
  }
  return false;
}

// ------------------------------------------------------------- boca (saída) --
/**
 * Libera formigas para FORA pela boca (elas voltam a viver no mundo).
 * A saída entra na FILA: a escolhida anda pelos túneis até a ENTRADA e só
 * então atravessa (stepLeaving) — o retorno conta quem entrou na fila.
 * n < 0 chama de volta do lado de fora para o turno interno.
 */
export function nestLeaveOne(dir = 1) {
  const roster = allies.inside || [];
  if (dir > 0) {
    // sai quem está há mais tempo (o turno mais antigo cede a vez), desde
    // que ainda não esteja andando para a boca
    let best = null, bt = -1;
    for (const a of roster) {
      if (a.dead || a.dying || a.doorT > 0 || a.exitRequested) continue;
      const n = nest.ants.find((v) => v.id === a.id);
      if (n && n.leaving) continue;
      if (a.insideT > bt) { bt = a.insideT; best = a; }
    }
    if (!best) return 0;
    requestNestExit(best);
    float(center(roomOf("entrance")).x, center(roomOf("entrance")).y - 26,
      "A CAMINHO DA BOCA!", "#ffd479", 1.4);
    SFX.pickup();
    return 1;
  }
  // chamar de volta: a formiga de fora mais perto da boca desce
  const D = world.anthill.door;
  let pick = null, bd = Infinity;
  for (const a of allies) {
    if (a.dead || a.dying || a.inside || a.doorT > 0 || a.type === "queen") continue;
    if (a.state === "enter") continue;
    const d = Math.hypot(a.x - D.x, a.y - D.y);
    if (d < bd) { bd = d; pick = a; }
  }
  if (!pick) return 0;
  antEnterNest(pick, "rodizio");
  float(pick.x, pick.y - 16, "PARA DENTRO!", "#7fd6a0", 1.4);
  SFX.command();
  return -1;
}

export function nestCallBack(n = 1) {
  let k = 0;
  for (let i = 0; i < n; i++) if (nestLeaveOne(-1) === 0) break; else k++;
  return k;
}

export function nestSendOut(n = 1) {
  let k = 0;
  for (let i = 0; i < n; i++) if (nestLeaveOne(1) === 1) k++;
  return k;
}

/** Poeirinha na boca quando alguém atravessa (feedback de porta giratória). */
function dustOut(n) {
  for (let i = 0; i < 6; i++) {
    nest.bits.push({
      x: n.x + rnd(-8, 8), y: n.y + rnd(-6, 6),
      vx: rnd(-18, 18), vy: rnd(-26, -6), life: rnd(0.3, 0.7), max: 0.7,
      color: i % 2 ? "#8a5f2a" : "#ffd479", size: rnd(1.4, 2.6),
    });
  }
  nest.dirFlash = 0.6;
}

export function nestHover(x, y) {
  nest.hover = null;
  for (const r of ROOMS) {
    if (pointInRect(x, y, r.x, r.y, r.w, r.h)) { nest.hover = r.id; break; }
  }
}

// ------------------------------------------------------------------ desenho --
/** Custo de uma câmara já com o desconto da PLANTA ECONÔMICA (árvore). */
export function chamberCost(id, lvl) {
  const c = CHAMBERS[id].costs[lvl];
  const mult = mods().chamberCost || 1;
  if (mult >= 1) return c;
  return { food: Math.round(c.food * mult), ess: Math.round(c.ess * mult) };
}

function chamberState(id) {
  const run = runRef();
  const def = CHAMBERS[id];
  const lvl = run && run.chambers ? run.chambers[id] : 0;
  const maxed = lvl >= def.max;
  const cost = maxed ? null : chamberCost(id, lvl);
  const afford = !maxed && run && run.food >= cost.food && run.essencePool >= cost.ess;
  return { def, lvl, maxed, cost, afford };
}

export function nestDraw(ctx) {
  const time = nest.t;
  // ------------------------------------------------------------- fundo -----
  ctx.fillStyle = "#0b0704";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);      // tela cheia: o mundo lá fora espera
  ctx.fillStyle = "#150e07";
  ctx.fillRect(0, 0, VIEW_W, BOTTOM);
  // terra com manchas
  for (let i = 0; i < 120; i++) {
    const x = (i * 137) % VIEW_W;
    const y = (i * 421) % BOTTOM;
    ctx.fillStyle = i % 3 ? "rgba(58,40,20,0.35)" : "rgba(34,23,12,0.5)";
    ctx.fillRect(x, y, 22 + (i % 5) * 9, 9 + (i % 3) * 5);
  }
  // pedras e raízes
  for (let i = 0; i < 26; i++) {
    const x = (i * 313) % VIEW_W, y = 30 + ((i * 197) % (BOTTOM - 60));
    ctx.fillStyle = "rgba(20,13,7,0.7)";
    ctx.beginPath(); ctx.ellipse(x, y, 7 + (i % 4) * 3, 4 + (i % 3) * 2, 0.4, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "rgba(24,16,8,0.8)";
  for (let i = 0; i < 9; i++) {
    const rx = 60 + i * 108;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.quadraticCurveTo(rx + 26, 120, rx - 18, 260);
    ctx.stroke();
  }

  // ------------------------------------------------------------ túneis -----
  for (const [a, b] of EDGES) {
    const A = center(roomOf(a)), B = center(roomOf(b));
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2a1c0f";
    ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.strokeStyle = "#3a2716";
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }

  // ------------------------------------------------------------- salas ------
  for (const r of ROOMS) {
    const isRoyal = r.id === "royal";
    const isEntrance = r.id === "entrance";
    const st = isRoyal || isEntrance ? null : chamberState(r.id);
    const built = isRoyal || isEntrance || st.lvl > 0;
    const hovered = nest.hover === r.id;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;

    // piso
    ctx.fillStyle = built ? "#2f2113" : "#1d140a";
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 2, r.h / 2, 0, 0, TAU); ctx.fill();
    // luz interna
    const g = ctx.createRadialGradient(cx, cy - 6, 4, cx, cy, r.w / 2);
    g.addColorStop(0, built ? "rgba(255,214,140,0.16)" : "rgba(120,90,50,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 2 - 2, r.h / 2 - 2, 0, 0, TAU); ctx.fill();
    // borda
    ctx.strokeStyle = hovered ? (st && st.afford ? "#ffd479" : "#efe9ff") : (built ? "#6b4a24" : "#3a2a16");
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, r.w / 2 - 1, r.h / 2 - 1, 0, 0, TAU); ctx.stroke();

    // sombreamento do túnel (topo do buraco)
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy - r.h * 0.22, r.w / 2 - 6, r.h * 0.2, 0, 0, TAU);
    ctx.fill();
  }

  // --------------------------------------------------- conteúdo das salas ---
  drawRoyal(ctx, time);
  drawNursery(ctx, time);
  drawPantry(ctx);
  drawBarracks(ctx);
  drawFungus(ctx);
  drawRefinery(ctx);

  // --------------------------------------------------------- formigas -------
  for (const n of nest.ants) drawNestAnt(ctx, n);

  // ------------------------------------------------------------ rótulos -----
  // Rótulo, dica e custo ficam DENTRO da câmara: quebram em 2 linhas e o passo
  // é calculado com o tamanho real do texto, então nada invade a câmara vizinha
  // nem sai do canvas com FONTE GRANDE (era o caso de "BERÇO DE SEDA DA TECELÃ").
  const labFS = fontScale();
  for (const r of ROOMS) {
    const cx = r.x + r.w / 2;
    if (r.id === "entrance") {
      drawText(ctx, "ENTRADA", cx, r.y + 6, { color: "#ffd479", align: "center", maxWidth: r.w - 12 });
      const ent = fitTextBlock("Comida vindo de fora", r.w - 14, 34, { scale: 0.8, minScale: 0.7, lineStep: 15 });
      ent.lines.forEach((L, i) => drawText(ctx, L, cx, r.y + r.h - 22 - (ent.lines.length - 1 - i) * ent.step,
        { color: PAL.textDim, align: "center", scale: ent.scale, maxWidth: r.w - 14 }));
      continue;
    }
    if (r.id === "royal") {
      drawText(ctx, "CÂMARA REAL", cx, r.y + 6, { color: "#ffd479", align: "center", maxWidth: r.w - 12 });
      continue;
    }
    const st = chamberState(r.id);
    const digging = nest.dig && nest.dig.id === r.id;
    drawText(ctx, st.def.name, cx, r.y + 4, {
      color: st.lvl > 0 ? "#ffd479" : st.afford ? PAL.text : "#6b5a3e", align: "center", scale: 0.9, maxWidth: r.w - 14,
    });
    // pips de nível (só quando há nível comprado — sem nível eles não dizem nada
    // e ocupavam a faixa onde fica o custo)
    if (st.lvl > 0) {
      for (let i = 0; i < st.def.max; i++) {
        ctx.fillStyle = i < st.lvl ? "#ffd479" : "#2c2414";
        ctx.fillRect(cx - (st.def.max - 1) * 8 + i * 16 - 6, r.y + r.h - 14, 12, 5);
      }
    }
    if (digging) {
      const frac = clamp(nest.dig.t / nest.dig.total, 0, 1);
      bar(ctx, r.x + 18, r.y + r.h - 40, r.w - 36, 8, frac, { c1: "#ffd479", c2: "#a35a2c", segments: 6 });
      drawText(ctx, "ESCAVANDO " + Math.floor(frac * 100) + "%", cx, r.y + r.h - 60,
        { color: "#ffb347", align: "center", maxWidth: r.w - 12 });
    } else if (!st.maxed && st.lvl === 0) {
      drawText(ctx, st.cost.food + " COMIDA" + (st.cost.ess ? " + " + st.cost.ess + " ESS" : ""),
        cx, r.y + r.h - 22, { color: st.afford ? "#ffd479" : "#8a6a4a", align: "center", maxWidth: r.w - 12 });
      drawText(ctx, isTouchUI() ? "TOQUE PARA ESCAVAR" : "CLIQUE PARA ESCAVAR", cx, r.y + r.h - 42,
        { color: st.afford ? PAL.text : "#6b5a3e", align: "center", maxWidth: r.w - 12 });
    } else if (!st.maxed) {
      drawText(ctx, "MELHORAR: " + st.cost.food + " COMIDA" + (st.cost.ess ? " + " + st.cost.ess + " ESS" : ""),
        cx, r.y + r.h - 40, { color: st.afford ? "#ffd479" : "#8a6a4a", align: "center", maxWidth: r.w - 12 });
    }
  }

  // ícones das câmaras
  for (const r of ROOMS) {
    if (r.id === "entrance" || r.id === "royal") continue;
    const st = chamberState(r.id);
    const ic = IMG["i_" + st.def.icon];
    if (!ic) continue;
    ctx.globalAlpha = st.lvl > 0 ? 1 : 0.5;
    ctx.drawImage(ic, r.x + r.w / 2 - 13, r.y + r.h / 2 - 14, 26, 26);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------- partículas -------
  for (const b of nest.bits) {
    ctx.globalAlpha = clamp(b.life / b.max, 0, 1);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.size, b.size);
  }
  ctx.globalAlpha = 1;

  // -------------------------------------------------- OLHO LÁ FORA (PiP) ----
  // A segunda tela: o mundo rodando de verdade enquanto você está aqui dentro.
  // Com FONTE GRANDE a barra do topo cresce: a janela desce e encurta para não
  // ficar embaixo dela nem encostar na despensa (y=232).
  const eyeFS = fontScale();
  const eyeY = eyeFS > 1 ? 68 : 46;
  const eyeH = eyeFS > 1 ? PIP.h - 24 : PIP.h;
  drawOutsideEye(ctx, VIEW_W - PIP.w - 22, eyeY, PIP.w, eyeH);

  // -------------------------------------------------------------- HUD -------
  return drawNestHud(ctx);
}

function drawNestAnt(ctx, n) {
  const sprite = n.sprite || n.type;
  const frame = rotFrame(sprite, n.angle);
  const full = rotDrawSize(sprite) || frame.width;
  const sc = n.job === "colossus" ? n.scale : 0.42;
  const size = full * sc;
  const wob = Math.sin(n.bob) * (n.route ? 1.2 : 0.6);
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.translate(n.x, n.y + wob);
  if (n.route) ctx.rotate(Math.sin(n.bob * 0.5) * 0.05);
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, size * 0.3, size * 0.28, size * 0.12, 0, 0, TAU); ctx.fill();
  ctx.drawImage(frame, -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.globalAlpha = 1;

  // carga na boca
  if (n.carry) {
    ctx.fillStyle = n.type === "gatherer" ? "#7fd6a0" : "#ffd479";
    ctx.beginPath();
    ctx.arc(n.x + Math.cos(n.angle) * size * 0.5, n.y + Math.sin(n.angle) * size * 0.5, Math.max(2, size * 0.12), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,8,16,0.8)"; ctx.lineWidth = 1; ctx.stroke();
  }
  // poeira de quem escava
  if (nest.dig && n.job === "digger" && !n.route) {
    const a = nest.t * 9 + n.id;
    ctx.fillStyle = "rgba(180,140,80,0.75)";
    ctx.fillRect(n.x + Math.cos(a) * 12 - 1.5, n.y + size * 0.25 + Math.sin(a * 1.3) * 4, 3, 3);
  }
}

function drawRoyal(ctx, time) {
  const r = roomOf("royal");
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 4;
  const q = allies.queen;
  const frame = rotFrame("queen", Math.PI / 2);
  const size = 92;
  ctx.save();
  ctx.translate(cx, cy + Math.sin(time * 1.6) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(0, size * 0.34, size * 0.34, size * 0.12, 0, 0, TAU); ctx.fill();
  ctx.drawImage(frame, -size / 2, -size / 2, size, size);
  ctx.restore();
  if (q) {
    const frac = clamp(q.hp / q.maxHp, 0, 1);
    bar(ctx, cx - 60, r.y + r.h - 40, 120, 9, frac, { c1: "#ffd479", c2: "#a35a2c", segments: 8 });
  }
  // ovos esperando
  for (const e of nest.eggs) {
    const ex = e.x, ey = e.y + Math.sin(time * 3 + e.x) * 1.6;
    ctx.fillStyle = "#efe9ff";
    ctx.beginPath(); ctx.ellipse(ex, ey, 5, 6.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#c9bce8"; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawNursery(ctx, time) {
  const r = roomOf("nursery");
  const st = chamberState("nursery");
  // MEGA LORE VFX: BERÇO DE SEDA - seda flutuando
  for (let s=0; s<3 + st.lvl; s++) {
    const sx = r.x + 20 + (s*41) % (r.w-20) + Math.sin(time*0.6+s)*8;
    const sy = r.y + 12 + Math.cos(time*0.4+s*1.3)*6 + (s%2)*14;
    ctx.strokeStyle = "rgba(232,244,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx+6, sy+8, sx+2, sy+18);
    ctx.stroke();
    // brilho seda
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(sx+1, sy+6, 1.2, 0, TAU);
    ctx.fill();
  }
  const n = nest.larvae.length;
  for (let i = 0; i < n; i++) {
    const l = nest.larvae[i];
    const lx = r.x + 34 + (i % 2) * 46 + Math.sin(time * 2 + i) * 3;
    const ly = r.y + r.h / 2 - 12 + ((i / 2) | 0) * 26 + Math.cos(time * 2.3 + i) * 2;
    const grow = clamp(l.born / 20, 0, 1);
    ctx.fillStyle = st.lvl > 0 ? "#dfead0" : "#9a8f78";
    ctx.beginPath(); ctx.ellipse(lx, ly, 9 + grow * 3, 6 + grow * 2, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7fd6a0"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#3a2a18";
    ctx.fillRect(lx - 3, ly - 1.5, 2, 2);
    ctx.fillRect(lx + 1, ly - 1.5, 2, 2);
  }
  if (st.lvl > 0) {
    const grow = clamp(1 - nest.growT / Math.max(9, 20 - st.lvl * 4), 0, 1);
    bar(ctx, r.x + 26, r.y + r.h - 34, r.w - 52, 7, grow, { c1: "#7fd6a0", c2: "#33543f", segments: 0 });
    drawText(ctx, "PRÓXIMA CORTADEIRA", r.x + r.w / 2, r.y + r.h - 46, { color: "#7fd6a0", align: "center" });
  }
}

function drawPantry(ctx) {
  const r = roomOf("pantry");
  const st = chamberState("pantry");
  const t = nest.t;
  // MEGA LORE VFX: VENTRE DE ÂMBAR - mel escorrendo
  for (let m=0; m<2+st.lvl; m++) {
    const mx = r.x + 30 + m*32 + Math.sin(t*0.3+m)*4;
    const my = r.y + 14;
    ctx.fillStyle = "rgba(255,180,71,0.55)";
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx+3, my+18 + Math.sin(t+m)*2);
    ctx.lineTo(mx-2, my+22 + Math.cos(t*0.7+m)*1);
    ctx.closePath();
    ctx.fill();
    // gota caindo
    const dy = (t*18 + m*40) % 26;
    ctx.fillStyle = "rgba(255,212,121,0.8)";
    ctx.beginPath();
    ctx.arc(mx, my+dy, 2.2, 0, TAU);
    ctx.fill();
  }
  const pile = 14 + st.lvl * 8;
  for (let i = 0; i < pile; i++) {
    const px = r.x + 30 + (i % 7) * 17 + ((i / 7) | 0) * 5;
    const py = r.y + r.h - 40 + ((i / 7) | 0) * -7 + (i % 2) * 3;
    ctx.fillStyle = i % 3 === 0 ? "#ffe6a8" : "#ffb347";
    ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill();
  }
  drawText(ctx, "COMIDA GUARDADA", r.x + r.w / 2, r.y + 26, { color: "#ffb347", align: "center", scale: 0.7, maxWidth: r.w - 14 });
}

function drawBarracks(ctx) {
  const r = roomOf("barracks");
  const c = center(r);
  const t = nest.t;
  // MEGA LORE VFX: ARENA DE MANDÍBULAS - marcas de guerra, faíscas
  ctx.strokeStyle = "rgba(107,74,36,0.5)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r.x + 28, r.y + 24); ctx.lineTo(r.x + 40, r.y + 46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r.x + r.w - 28, r.y + 24); ctx.lineTo(r.x + r.w - 40, r.y + 46); ctx.stroke();
  // faíscas guerra
  if (Math.random() < 0.08) {
    const fx = r.x + 40 + Math.random()*(r.w-80);
    const fy = r.y + 30 + Math.random()*20;
    ctx.fillStyle = "rgba(255,212,121,0.7)";
    ctx.fillRect(fx, fy, 2, 2);
  }
  // aura vermelha leve de batalha
  const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, r.w*0.5);
  grad.addColorStop(0, "rgba(255,100,60,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r.w*0.5, r.h*0.5, 0, 0, TAU);
  ctx.fill();
  const g = nest.ants.find((n) => n.job === "colossus");
  if (!g) drawText(ctx, "SEM COLOSSO", c.x, r.y + 26, { color: PAL.textDim, align: "center", scale: 0.7, maxWidth: r.w - 14 });
  else drawText(ctx, "DINOPONERA DE FOLGA", c.x, r.y + 26, { color: "#ffd479", align: "center", scale: 0.7, maxWidth: r.w - 14 });
}

function drawFungus(ctx, time) {
  const r = roomOf("fungus");
  const st = chamberState("fungus");
  // esporos flutuando
  for (let p=0; p<5+st.lvl*2; p++) {
    const px = r.x + 18 + (p*27) % (r.w-10) + Math.sin(time*0.5+p)*10;
    const py = r.y + 10 + (time*8 + p*19) % (r.h-10);
    ctx.fillStyle = p%2 ? "rgba(201,160,255,0.5)" : "rgba(127,214,160,0.4)";
    ctx.beginPath();
    ctx.arc(px, py, 1.5 + Math.sin(time+p)*0.6, 0, TAU);
    ctx.fill();
  }
  const n = 3 + st.lvl * 3;
  for (let i = 0; i < n; i++) {
    const fx = r.x + 30 + (i % 4) * 36;
    const fy = r.y + r.h - 26 - ((i / 4) | 0) * 20 + Math.sin(time * 1.5 + i) * 1.5;
    ctx.fillStyle = "#c9a0ff";
    ctx.beginPath(); ctx.ellipse(fx, fy, 8, 4.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e3d2ff";
    ctx.fillRect(fx - 1.5, fy + 2, 3, 8);
  }
}

function drawRefinery(ctx, time) {
  const r = roomOf("refinery");
  const st = chamberState("refinery");
  const n = 3 + st.lvl * 2;
  for (let i = 0; i < n; i++) {
    const cx = r.x + 34 + (i % 3) * 52 + ((i / 3) | 0) * 18;
    const cy = r.y + r.h - 30 - ((i / 3) | 0) * 16;
    const pulse = 0.6 + Math.sin(time * 2 + i) * 0.25;
    ctx.globalAlpha = pulse;
    // MEGA LORE: cristais geométricos hexagonais
    ctx.fillStyle = "#c77dff";
    ctx.strokeStyle = "#e8d5ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k=0;k<6;k++) {
      const ang = (k/6)*TAU + time*0.3;
      const px = cx + Math.cos(ang)*7;
      const py = cy + Math.sin(ang)*7;
      if (k==0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // brilho interno
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawNestHud(ctx) {
  const run = runRef();
  const FS = fontScale();
  // No PC a barra tem 40px; com FONTE GRANDE ela cresce para caber DUAS linhas
  // (recursos + status) — antes os textos da direita ficavam um sobre o outro e
  // invadiam o painel OLHO LÁ FORA.
  const barH = FS > 1 ? 64 : 40;
  const y1 = FS > 1 ? 10 : 13;
  ctx.fillStyle = "rgba(8,6,4,0.82)";
  ctx.fillRect(0, 0, VIEW_W, barH);
  ctx.strokeStyle = "#4a3a6e"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, barH + 0.5); ctx.lineTo(VIEW_W, barH + 0.5); ctx.stroke();

  // linha 1: recursos medidos (os números crescem durante a partida)
  let bx = 16;
  if (IMG.i_food) ctx.drawImage(IMG.i_food, bx, y1 - 2, 18, 18);
  drawText(ctx, String(run ? run.food : 0), bx + 24, y1, { font: "big", scale: 1, color: "#ffd479", maxWidth: 90 });
  bx += 24 + Math.max(46, textWidth(String(run ? run.food : 0), { font: "big" })) + 16;
  if (IMG.i_essence) ctx.drawImage(IMG.i_essence, bx, y1 - 2, 18, 18);
  drawText(ctx, String(run ? run.essencePool : 0), bx + 24, y1, { font: "big", scale: 1, color: "#c77dff", maxWidth: 90 });
  bx += 24 + Math.max(46, textWidth(String(run ? run.essencePool : 0), { font: "big" })) + 16;
  const lvlTxt = "NÍVEL " + (run ? run.level : 0);
  drawText(ctx, lvlTxt, bx, y1, { font: "big", scale: 1, color: "#6db7ff", maxWidth: 150 });
  bx += Math.min(150, textWidth(lvlTxt, { font: "big" })) + 18;

  const mapTxt = "MAPA " + ((run ? run.mapIdx : 0) + 1) + "/" + MAPS.length +
    "   ONDA " + (run ? run.wave : 0) + "   POP " + popUsed() + "/" + popCapTotal();
  if (FS > 1) {
    // com FONTE GRANDE o resumo do mapa não cabe na mesma faixa dos números:
    // ele encosta na direita da linha 1 e as duas frases de status descem
    drawText(ctx, mapTxt, VIEW_W - 16, y1 + 1, { color: PAL.text, align: "right", maxWidth: VIEW_W - 32 });
    drawText(ctx, "ENTREGUE POR ELAS: +" + nest.deliveries, 16, 40,
      { color: "#7fd6a0", scale: 0.8, maxWidth: 330 });
    drawText(ctx, nest.ants.length + " TRABALHANDO AQUI DENTRO (DE " + insideCount() + " NO NINHO)",
      VIEW_W - 16, 40, { color: PAL.textDim, align: "right", scale: 0.8, maxWidth: VIEW_W - 370 });
  } else {
    // PC normal: exatamente o layout antigo (mapa à esquerda, entregas à
    // direita em duas linhas) — ele já cabia sem sobreposição
    drawText(ctx, mapTxt, Math.max(bx, 380), y1 + 1, { color: PAL.text, maxWidth: VIEW_W - 16 - Math.max(bx, 380) });
    drawText(ctx, "ENTREGUE POR ELAS: +" + nest.deliveries, VIEW_W - 16, 14,
      { color: "#7fd6a0", align: "right", maxWidth: 330 });
    drawText(ctx, nest.ants.length + " TRABALHANDO AQUI DENTRO (DE " + insideCount() + " NO NINHO)",
      VIEW_W - 16, 30, { color: PAL.textDim, align: "right", maxWidth: 330 });
  }

  // rodapé: sair + dica
  ctx.fillStyle = "rgba(8,6,4,0.82)";
  ctx.fillRect(0, BOTTOM, VIEW_W, VIEW_H - BOTTOM);
  ctx.strokeStyle = "#4a3a6e";
  ctx.beginPath(); ctx.moveTo(0, BOTTOM + 0.5); ctx.lineTo(VIEW_W, BOTTOM + 0.5); ctx.stroke();

  if (button(ctx, { x: 16, y: BOTTOM + 10, w: 210, h: 34, label: isTouchUI() ? "VOLTAR À COLÔNIA" : "VOLTAR À COLÔNIA (B)", id: "nestBack", accent: "#37e6c8" })) {
    return "back";
  }
  // segunda fileira de botões: a BOCA — soltar/chamar formigas pela porta
  if (button(ctx, { x: 238, y: BOTTOM + 10, w: 186, h: 34, label: isTouchUI() ? "SAIR PELA BOCA" : "SAIR PELA BOCA (L)", id: "nestOut", accent: "#ffd479" })) {
    return "out";
  }
  if (button(ctx, { x: 430, y: BOTTOM + 10, w: 196, h: 34, label: isTouchUI() ? "CHAMAR P/ DENTRO" : "CHAMAR P/ DENTRO (P)", id: "nestIn", accent: "#7fd6a0" })) {
    return "in";
  }
  // as duas dicas do rodapé em 2 linhas de passo calculado: com FONTE GRANDE a
  // segunda linha saía do canvas (e as duas se sobrepunham)
  const hintStep = Math.ceil(18 * 0.75 * FS);
  drawText(ctx, isTouchUI() ? "TOQUE NUMA CÂMARA PARA ESCAVAR — TOQUE NA ENTRADA PARA ABRIR A BOCA" : "CLIQUE NUMA CÂMARA PARA ESCAVAR  —  CLIQUE NA ENTRADA PARA ABRIR A BOCA",
    VIEW_W / 2, BOTTOM + 50, { color: PAL.textDim, align: "center", scale: 0.75, maxWidth: VIEW_W - 40 });
  drawText(ctx, "O MUNDO LÁ FORA CONTINUA VIVO AGORA MESMO — É O QUE MOSTRA O OLHO LÁ FORA",
    VIEW_W / 2, BOTTOM + 50 + hintStep, { color: "#8a7a5e", align: "center", scale: 0.75, maxWidth: VIEW_W - 40 });

  // tooltip da câmara sob o mouse
  if (nest.hover && nest.hover !== "royal" && nest.hover !== "entrance") {
    const def = CHAMBERS[nest.hover];
    const st = chamberState(nest.hover);
    const w = 340;
    const lines = wrapText(def.tip + " " + def.per, w - 24, {});
    const step = Math.ceil(16 * FS);
    const costTxt = st.maxed ? "" : "CUSTO: " + st.cost.food + " COMIDA" + (st.cost.ess ? " + " + st.cost.ess + " ESSÊNCIA" : "");
    const h = 34 + Math.ceil(20 * FS) + lines.length * step + (costTxt ? Math.ceil(18 * FS) : 0) + 12;
    const r = roomOf(nest.hover);
    let tx = clamp(r.x + r.w / 2 - w / 2, 10, VIEW_W - w - 10);
    let ty = r.y - h - 8;
    if (ty < 46) ty = r.y + r.h + 8;
    ty = clamp(ty, 46, VIEW_H - h - 10);
    panel(ctx, tx, ty, w, h);
    drawText(ctx, def.name + "  (NÍVEL " + st.lvl + "/" + def.max + ")", tx + 12, ty + 10, { color: "#ffd479", maxWidth: w - 24 });
    lines.forEach((L, i) => drawText(ctx, L, tx + 12, ty + 34 + i * step, { color: PAL.text, maxWidth: w - 24 }));
    if (costTxt) {
      drawText(ctx, costTxt, tx + 12, ty + h - 26, { color: st.afford ? "#7fd6a0" : "#ff8a96", maxWidth: w - 24 });
    }
  }

  // números flutuantes por último (sempre legíveis)
  for (const f of nest.floats) {
    drawText(ctx, f.text, f.x, f.y, {
      color: f.color, align: "center", shadow: true,
      alpha: clamp(f.life / f.max * 1.6, 0, 1),
    });
  }
}

export { ROOMS as NEST_ROOMS, BOTTOM as NEST_BOTTOM };
