import assert from "node:assert/strict";
const grad = { addColorStop() {} };
function makeCtx() {
  return new Proxy({ canvas: { width: 960, height: 540 } }, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => grad;
      if (p === "measureText") return () => ({ width: 10 });
      if (p === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
      if (p === "canvas") return t.canvas;
      if (typeof p === "string" && p in t) return t[p];
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.document = {
  createElement() { return { width: 0, height: 0, style: {}, getContext: makeCtx }; },
  getElementById() { return null; },
  addEventListener() {}, createElementNS() { return { getContext: makeCtx }; },
};
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) };
globalThis.Image = class {
  constructor() { this.width = 264; this.height = 180; this._src = ""; }
  set src(v) { this._src = v; if (this.onload) setTimeout(() => this.onload(), 0); }
  get src() { return this._src; }
};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);


const {G,loadSave,mods,isFruitUnlocked}=await import('../js/state.js');
const {world,genWorld}=await import('../js/world.js');
const {spawnAnt,spawnQueen,allies,updateAllies}=await import('../js/units.js');
const {spawnEnemy,spawnBoss,foes,clearFoes}=await import('../js/enemies.js');
const {projectiles,spawnProj,updateProjectiles,clearCombat,dropOrb,orbs,updateOrbs}=await import('../js/combat.js');
const {MAPS,FRUIT_TREES}=await import('../js/config.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function reset(...keys){
 loadSave();G.save.nodes=Object.fromEntries(keys.map(k=>['v_'+k,1]));G.time=1;G.save.clearedMaps={};
 G.run={mode:'campanha',mapIdx:0,food:0,essencePool:0,kills:0,elapsed:0,level:0,mutations:new Set(),chambers:{nursery:0,pantry:0,barracks:0,fungus:0,refinery:0}};
 allies.length=0;allies.queen=null;clearFoes();clearCombat();genWorld(42,0);spawnQueen();
 return spawnAnt('worker',world.anthill.x,world.anthill.y,{spawnT:0});
}
// A velocidade de coleta reduz o intervalo: não o multiplica (regressão encontrada na integração).
let a=reset('d5');a.state='gather';a.gatherT=0;a.node={x:a.x,y:a.y,r:15,amount:100,kind:'food'};
updateAllies(.01,[]);near(a.gatherT,a.st.gatherRate/2);
G.run.elapsed=31;a.gatherT=0;updateAllies(.01,[]);near(a.gatherT,a.st.gatherRate);
// Depósito pelo autômato real do trabalhador, não chamada direta do helper.
a=reset('p2','p5','f7','o4','o5');allies.queen.hp-=20;a.hp=a.maxHp/2;
a.state='return';a.carry=3;a.carryKind='food';const hp=a.hp, qhp=allies.queen.hp;
updateAllies(.01,[]);near(G.run.food,12);near(G.run.essencePool,1);assert.ok(a.hp>hp);assert.ok(allies.queen.hp>=qhp+8);
// Nascer, absorver dano e resgatar uma unidade só uma vez.
a=reset('o1','f4');near(a.fruitShield,a.maxHp*.2);a.takeDamage(10000);assert.equal(a.dead,false);near(a.hp,a.maxHp*.25);a.takeDamage(10000);assert.ok(a.dying>0);
// A morte real credita efeitos do veneno e contador do ápice.
a=reset('s1','s2','p10');a=spawnAnt('soldier',world.anthill.x+150,world.anthill.y,{spawnT:0});a.hp=a.maxHp/2;
for(let i=0;i<20;i++){const e=spawnEnemy('runner',a.x+20,a.y,1);e.takeDamage(10000,'ally',a);}
near(G.run.food,80);near(G.run.fruitRuntime.kills,20);assert.ok(a.hp>a.maxHp/2);
// Projéteis carregam a dona e origem, incendeiam e acertam pelo motor de colisão.
a=reset('d3','p6');const e=spawnEnemy('runner',a.x+10,a.y,1);const old=e.hp;
spawnProj({x:e.x,y:e.y,vx:10,vy:0,dmg:1,faction:'ally',owner:a});
near(projectiles[0].vx,15);assert.equal(projectiles[0].owner,a);near(projectiles[0].originX,e.x);
updateProjectiles(.001,allies,foes);assert.ok(e.hp<old);assert.ok(e.burnT>0);near(e.burnDps,8);
// Prole gratuita: callback efetivo, limite populacional e não-recursão.
a=reset('d7');for(let i=0;i<7;i++)spawnAnt('soldier',a.x+100,a.y,{spawnT:0});
assert.equal(G.run.fruitRuntime.free,1);assert.equal(allies.length,9);
// A derrota efetiva de cada chefe concede apenas seu próprio fruto.
for(let i=0;i<MAPS.length;i++){
 reset();G.run.mapIdx=i;const b=spawnBoss(FRUIT_TREES[i].boss,1);b.takeDamage(1e9,'ally');
 assert.equal(isFruitUnlocked(MAPS[i].id),true);assert.equal(Object.keys(G.save.clearedMaps).length,1);
 b.takeDamage(1e9,'ally');assert.equal(Object.keys(G.save.clearedMaps).length,1);
}
reset();G.run.mode='endless';spawnBoss('hare',1).takeDamage(1e9,'ally');assert.equal(isFruitUnlocked('planicie'),false);
reset();spawnBoss('fox',1).takeDamage(1e9,'ally');assert.equal(isFruitUnlocked('planicie'),false);
console.log('INTEGRAÇÃO DOS FRUTOS OK — coleta, depósito, vida, nascimento, projéteis, mortes e seis chefes reais');
