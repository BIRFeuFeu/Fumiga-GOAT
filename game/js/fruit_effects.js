// Motor dos 70 poderes. Sem IA duplicada: hooks nos consumidores do jogo.
// Estado temporário vive na expedição, nunca no save de progressão.
import { G } from './state.js';
export const fruitWorld = { allies: [], foes: [], home: () => ({x:0,y:0}), freeWorker: () => false };
export const hasFruitPower = key => (G.save.nodes['v_'+key] | 0) > 0;
const has = hasFruitPower;
const live = a => a && !a.dead && !a.dying;
const hp = a => a?.maxHp || 1;
const ratio = a => (a?.hp || 0)/hp(a);
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const queen = () => fruitWorld.allies.queen;
const time = () => G.run?.elapsed || 0;
function state() {
  if (!G.run) return {};
  return G.run.fruitRuntime ||= { hits:0, shots:0, kills:0, poisonKills:0, born:0, free:0 };
}
export function fruitHeal(a, amount) {
  if (live(a) && amount>0) a.hp = Math.min(hp(a),a.hp+amount);
}
function healColony(frac) { for(const a of fruitWorld.allies) fruitHeal(a,hp(a)*frac); if(!fruitWorld.allies.includes(queen())) fruitHeal(queen(),hp(queen())*frac); }
function nearFoes(e,radius,limit) {
  const out=[];
  for(const t of fruitWorld.foes) if(t!==e && live(t) && dist(e,t)<=radius) {out.push(t);if(out.length>=limit)break;}
  return out;
}
// Explosões têm orçamento por frame e jamais podem provocar cadeias recursivas.
function secondary(t,dmg) {
  const r=state(); if(r.budgetAt!==G.time) {r.budgetAt=G.time;r.budget=12;}
  if(!(r.budget>0) || !live(t)) return;
  r.budget--; t.fruitSecondaryDeath=true;
  try { t.takeDamage(dmg,'ally',{fruitSecondary:true}); } finally {t.fruitSecondaryDeath=false;}
}
export function applyFruitBonuses(b) {
  if(has('p6')) b.rangeBonus+=45;
  if(has('p9')) {b.startWorkers+=3;b.startFood+=60;}
  if(has('s4')) b.aoeMult*=1.4;
  if(has('d2')) b.hatchSpeed*=.65;
  if(has('d9')) b.critChance+=.15;
  if(has('o8')) b.queenRegen+=3;
  if(has('a1')) b.startEssence+=100;
  if(has('a3')) b.xpGain*=1.4;
  if(has('a4')) {b.healPower*=1.35;b.allHealing*=1.35;}
  return b;
}
export function fruitUnitStats(type,s) {
  if(has('f3')) s.healRange*=1.7;
  if(has('f8') && type==='weaver') {s.speed*=1.8;s.carry+=2;}
  if(has('i4') && type==='tank') {s.hp=Math.round(s.hp*1.4);s.speed*=.9;}
  return s;
}
export function fruitSpeed(a) {
  let n=1;
  if(has('p1') && time()<20) n*=1.35;
  if(has('p7') && ratio(a)<.35) n*=1.6;
  return n;
}
export function fruitIgnoreSlow(a) { return has('o6') && dist(a,fruitWorld.home())<=240; }
export function fruitGatherRate() { return has('d5') && time()<30 ? 2 : 1; }
export function fruitAttackCd(a, cd) {return has('i7') && ratio(a)>=1 ? cd/1.3 : cd;}
export function fruitHealingMultiplier(target) {return has('f6') && ratio(target)<.35 ? 1.5 : 1;}
export function fruitSight() {return has('a7') ? 1.5 : 1;}
export function fruitOrbSpeed() {return has('s5') ? 2 : 1;}
export function fruitOrbExtra() {return has('a8') ? 2 : 0;}
export function fruitProjectile(p) {
  if(p.faction!=='ally') return p;
  const r=state();r.shots=(r.shots||0)+1;
  if(has('p6')) {p.vx*=1.5;p.vy*=1.5;}
  if(has('d3')) {p.burnDur=Math.max(p.burnDur||0,4);p.burnDps=Math.max(p.burnDps||0,8);}
  if(has('i6') && r.shots%4===0) p.aoe=Math.max(p.aoe||0,90*(has('s4')?1.4:1));
  return p;
}
export function fruitEnemyDamage(t,dmg,from,attacker) {
  if(from!=='ally' || attacker?.fruitSecondary) return dmg;
  const r=state();r.hits=(r.hits||0)+1;
  if(has('p3') && r.hits%4===0) dmg*=1.8;
  if(has('f2') && ratio(t)>=1) dmg*=1.6;
  if(has('f9') && t.revealT>0) dmg*=1.25;
  if(has('s7') && t.burnT>0) dmg*=1.3;
  if(has('d1')) {
    r.heat = time()-(r.lastHit ?? -100)>3 ? 1 : Math.min(40,(r.heat||0)+1);
    r.lastHit=time();dmg*=1+r.heat*.01;
  }
  const source=attacker?.owner || attacker;
  if(has('d6') && source?.faction==='ally' && ratio(source)<.4) dmg*=1.5;
  if(has('o3') && ratio(t)<.2) dmg*=t.isBoss?1.2:2;
  if(has('i2') && t.slowT>0) dmg*=1.6;
  if(has('i9') && t.isBoss) dmg*=1.25;
  if(has('a2') && r.hits%5===0) {dmg*=2;fruitHeal(queen(),2);}
  if(has('p8') && t.slowT>0 && time()>=(r.drumAt??0)) {
    r.drumAt=time()+.4;for(const other of nearFoes(t,130,3)) secondary(other,dmg*.15);
  }
  if(has('s1')) {t.burnT=Math.max(t.burnT||0,3);t.burnDps=Math.max(t.burnDps||0,6);}
  if(has('s8') && !t.isBoss && r.hits%5===0) t.weakT=Math.max(t.weakT||0,4);
  if(!t.isBoss && r.hits%3===0) {
    const duration=has('i5')?2:1;
    if(has('f1')) t.slowT=Math.max(t.slowT||0,2*duration);
    if(has('i1')) {t.slowT=Math.max(t.slowT||0,3*duration);t.stunT=Math.max(t.stunT||0,.35);}
  }
  if(attacker?.burnDur>0) {t.burnT=Math.max(t.burnT||0,attacker.burnDur);t.burnDps=Math.max(t.burnDps||0,attacker.burnDps||0);}
  return dmg;
}
export function fruitAllyDamage(a,dmg,attacker) {
  if(a.type==='queen') {if(has('a9')) dmg*=.8;}
  else {
    let flatReduction=false;
    if(has('d8') && attacker?.isProjectile) {a.fruitProjectiles=(a.fruitProjectiles||0)+1;if(a.fruitProjectiles%3===0)return 0;}
    if(has('s6') && attacker) {
      const origin={x:attacker.originX??attacker.x,y:attacker.originY??attacker.y};
      if(dist(a,origin)>220)dmg*=.65;
    }
    if(has('d4') && ratio(a)<.5)dmg*=.75;
    if(has('p4') && time()>=(a.fruitGrassAt??0)) {dmg-=12;flatReduction=true;a.fruitGrassAt=time()+8;}
    if(has('i3')){dmg-=6;flatReduction=true;}
    if(has('f5') && live(attacker) && !attacker.isBoss && !attacker.isProjectile && time()>=(a.fruitSilkAt??0)) {
      attacker.stunT=Math.max(attacker.stunT||0,.4);a.fruitSilkAt=time()+6;
    }
    dmg=Math.max(flatReduction?1:0,dmg);
  }
  const absorb=Math.min(a.fruitShield||0,dmg);a.fruitShield=Math.max(0,(a.fruitShield||0)-absorb);
  return Math.max(0,dmg-absorb);
}
export function fruitSurvive(a) {
  if(a.hp>0)return false;
  const r=state();
  if(a.type==='queen') {
    if(has('o7') && !r.lastLeaf) {r.lastLeaf=true;a.hp=hp(a)*.3;return true;}
  } else {
    if(has('f4') && !a.fruitCocoon) {a.fruitCocoon=true;a.hp=hp(a)*.25;return true;}
    if(has('a6') && time()>=(r.rescueAt??0)) {r.rescueAt=time()+30;a.hp=hp(a)*.1;return true;}
  }
  return false;
}
export function fruitQueenBorn(q) {q.fruitShield=has('i8')?hp(q)*.2:0;}
export function fruitBorn(a,free=false) {
  const r=state();if(!free)r.born=(r.born||0)+1;
  a.fruitShield=hp(a)*((has('o1') ? .2 : 0)+(has('a5') && !free && r.born<=5 ? .5 : 0));
  if(!free && has('d7') && r.born%8===0 && (r.free||0)<3) {
    // Reserva o crédito antes do spawn recursivo.
    r.free=(r.free||0)+1;if(!fruitWorld.freeWorker(a))r.free--;
  }
}
export function fruitDeath() {if(has('s9') && G.run)G.run.essencePool=(G.run.essencePool||0)+5;}
export function fruitDeposit(a,amount) {
  const r=state();a.fruitDeposits=(a.fruitDeposits||0)+1;
  if(has('p5') && a.fruitDeposits<=3)amount*=2;
  if(has('f7'))amount+=6;
  if(has('p2') && time()>=(r.dewAt??0)) {r.dewAt=time()+1;fruitHeal(queen(),8);}
  if(has('o4') && G.run)G.run.essencePool=(G.run.essencePool||0)+1;
  if(has('o5'))fruitHeal(a,hp(a)*.08);
  return amount;
}
export function fruitKill(e) {
  if(e.fruitSecondaryDeath || !G.run)return;
  const r=state();r.kills=(r.kills||0)+1;
  if(has('p10') && r.kills%20===0)healColony(.08);
  if(e.burnT>0 || e.fruitBurnDeath) {
    r.poisonKills=(r.poisonKills||0)+1;
    if(has('s2'))G.run.food+=4;
    if(has('s3'))for(const t of nearFoes(e,130,3)) {t.burnT=Math.max(t.burnT||0,e.burnT);t.burnDps=Math.max(t.burnDps||0,e.burnDps||0);}
    if(has('s10') && r.poisonKills%10===0)fruitHeal(queen(),hp(queen())*.15);
    if(has('d10'))for(const t of nearFoes(e,130,3))secondary(t,20);
  }
  if(has('o2')) {
    let chosen=null,d=301;
    for(const a of fruitWorld.allies)if(live(a) && a.hp<hp(a)) {const nd=dist(a,e);if(nd<d){d=nd;chosen=a;}}
    fruitHeal(chosen,8);
  }
  if(has('o10') && r.kills%50===0) {G.run.food+=30;G.run.essencePool=(G.run.essencePool||0)+15;}
  if(has('i10') && r.kills%15===0)for(const t of nearFoes(e,250,6))if(!t.isBoss)t.stunT=Math.max(t.stunT||0,1);
}
export function fruitTick(dt) {
  const r=state();r.grove=(r.grove||0)+dt;
  if(has('f10') && r.grove>=12) {r.grove=0;const q=queen();if(live(q))for(const a of fruitWorld.allies)if(dist(a,q)<=300)fruitHeal(a,hp(a)*.08);}
  const q=queen();
  if(has('a10') && live(q) && ratio(q)<.3 && !r.heart) {r.heart=true;healColony(.4);}
}
export function fruitRally(called) {
  const r=state();if(!has('o9') || time()<(r.rallyAt??0) || !called.length)return;
  r.rallyAt=time()+15;for(const a of called)fruitHeal(a,hp(a)*.25);
}
