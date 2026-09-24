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


const { FRUIT_TREES: ALL_FRUIT_TREES, UNITS, MAPS } = await import('../js/config.js');
const FRUIT_TREES = ALL_FRUIT_TREES.filter(f=>!f.pending).map(f=>({...f,nodes:f.legacyNodes}));
const { G, metaBonus, metaBuy, metaCanBuy, loadSave, persistSave } = await import('../js/state.js');
const { TREE_ALL } = await import('../js/tree_layout.js');
const U = await import('../js/units.js');
const E = await import('../js/enemies.js');
const C = await import('../js/combat.js');
const { genWorld, world } = await import('../js/world.js');
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} != ${b}`);
const run = mapIdx => { G.run = { mapIdx, mode:'campanha', level:0, mutations:new Set(), chambers:{barracks:0,nursery:0,refinery:0,pantry:0,fungus:0}, kills:0,xp:0,mapsCleared:0,food:100 }; };
// Nenhum nó se sobrepõe na geometria literal (raio de desenho, zoom 1).
for(let i=0;i<TREE_ALL.length;i++) for(let j=i+1;j<TREE_ALL.length;j++) {
  const a=TREE_ALL[i],b=TREE_ALL[j];
  if(a._fruit || b._fruit) continue; // miniárvores têm seu próprio viewport (testado no navegador)
  const radius=n=>n._fruit ? [16,18,22][n.tier||0] : [34,42,52][n.tier||0];
  assert.ok(Math.hypot((a.x-b.x)*142,(a.y-b.y)*142*.5)>radius(a)+radius(b)+4, `nós sobrepostos: ${a.id}/${b.id}`);
}
for (const f of FRUIT_TREES) {
  G.save.nodes={}; G.save.clearedMaps={}; G.save.essence=1000;
  assert.equal(metaCanBuy(f.nodes[0].id).ok,false);
  G.save.clearedMaps[f.map]=true;
  assert.equal(metaBuy(f.nodes[2].id),false,'pré-requisitos');
  for(const n of f.nodes) {
    G.save.essence=n.cost[0]-1;
    assert.equal(metaBuy(n.id),false,'saldo insuficiente');
    G.save.essence=n.cost[0];
    const era=G.save.era;
    assert.equal(metaBuy(n.id),true); assert.equal(G.save.essence,0);
    assert.equal(metaBuy(n.id),false,'sem recompra');
    if(n.id==='f_g_3') assert.equal(G.save.era,era+1);
    const saved=JSON.stringify(G.save);
    G.save.nodes={}; loadSave(); assert.equal(JSON.stringify(G.save),saved,'reload byte-equivalente');
  }
}
// Save antigo sem clearedMaps continua válido e não perde compras.
store.set('fumiga_goat_save_v1',JSON.stringify({essence:42,nodes:{t_col:2,f_p_1:1}}));
loadSave(); assert.equal(G.save.nodes.f_p_1,1); assert.equal(G.save.nodes.t_col,2); assert.deepEqual(G.save.clearedMaps,{});
G.save.nodes={};
// Cada fruto só modifica bônus no bioma descrito.
for(const [fi,f] of FRUIT_TREES.entries()) for(const n of f.nodes) {
  for(let mi=0;mi<6;mi++) {
    run(mi); G.save.nodes={}; const neutral=metaBonus();
    G.save.nodes={[n.id]:1}; const bought=metaBonus();
    if(mi!==fi) assert.deepEqual(bought,neutral,`${n.id} vazou para ${MAPS[mi].id}`);
    else assert.notDeepEqual(bought,neutral,`${n.id} não produz bônus`);
  }
}
genWorld(7,0);
const stats=(type,mi,nodes)=>{ run(mi); G.save.nodes=nodes; return U.spawnAnt(type,100,100).st; };
for(const type of ['worker','soldier','weaver','scout']) near(stats(type,0,{f_p_1:1}).speed/stats(type,0,{}).speed,1.08);
near(stats('weaver',1,{f_f_2:1}).speed/stats('weaver',1,{}).speed,1.20);
near(stats('scout',2,{f_pa_1:1}).speed/stats('scout',2,{}).speed,1.15);
near(stats('soldier',3,{f_d_1:1}).dmg/stats('soldier',3,{}).dmg,1.12);
assert.equal(stats('tank',4,{f_o_2:1}).hp,Math.round(UNITS.tank.hp*1.18));
run(3); G.save.nodes={f_d_2:1}; assert.equal(metaBonus().popCap,1);
G.save.nodes={f_d_3:1}; near(metaBonus().essMult,1.15);
run(0); G.save.nodes={f_p_3:1}; near(metaBonus().foodBonus,1.10);
run(4); G.save.nodes={f_o_1:1,f_o_3:1}; near(metaBonus().foodBonus,1.12); near(metaBonus().healPower,1.15); near(metaBonus().allHealing,1.15);
run(1); G.save.nodes={f_f_1:1,f_f_3:1}; near(metaBonus().fruitVision,.12); near(metaBonus().healPower,1.10);
run(2); G.save.nodes={f_pa_2:1,f_pa_3:1}; near(metaBonus().fruitShriekResist,.20);
C.clearCombat(); C.dropOrb(100,100,3); for(const o of C.orbs) {o.delay=0;o.x=o.y=100;} assert.equal(C.updateOrbs(.01,{x:100,y:100},true),6);
// Resistências exercitadas nos handlers reais dos ataques.
run(0); G.save.nodes={f_p_2:1};
const hare=E.spawnBoss('hare',1); hare.sub='thumpAim'; hare.t=0;
let received=0;
E.updateBoss(.01,[{x:hare.x,y:hare.y,stunT:0,takeDamage(d){received=d;}}]);
assert.equal(received,Math.round(hare.def.thumpDmg*.85));
run(2); G.save.nodes={f_pa_2:1};
const grouse=E.spawnBoss('grouse',1);grouse.hp=grouse.maxHp*.4;
E.updateBoss(.01,[]);near(G.run.invertT,grouse.def.phase2.invertDur*.8);
// Chefes recebem +20% no Gelo. Inimigos comuns não recebem, mesmo com projétil.
run(5); G.save.nodes={f_g_1:1};
const foe=E.spawnEnemy('runner',100,100,1), before=foe.hp; foe.takeDamage(1,'ally',{type:'test'}); near(before-foe.hp,1);
const boss=E.spawnBoss('boar',1), hp=boss.hp; boss.takeDamage(10); near(hp-boss.hp,12);
run(0); const hp2=boss.hp; boss.takeDamage(10); near(hp2-boss.hp,10);
// Toda vitória de campanha desbloqueia e persiste só o mapa vencido.
G.save.clearedMaps={}; G.save.nodes={};
for(let i=0;i<6;i++) {
  run(i); E.spawnBoss(['hare','fox','grouse','matriarch','deer','boar'][i],1).takeDamage(1e9);
  assert.equal(G.save.clearedMaps[MAPS[i].id],true);
  G.save.clearedMaps={}; loadSave(); assert.equal(G.save.clearedMaps[MAPS[i].id],true);
}
G.save.clearedMaps={}; run(0); G.run.mode='sobrevivencia'; E.spawnBoss('hare',1).takeDamage(1e9); assert.deepEqual(G.save.clearedMaps,{});
// Troca de bioma atualiza veteranas, mantendo fração de vida.
run(4); G.save.nodes={f_o_2:1}; const a=U.spawnAnt('tank',100,100);a.hp=a.maxHp/2;
G.run.mapIdx=0; U.recomputeAllies(); assert.equal(a.maxHp,UNITS.tank.hp); assert.ok(Math.abs(a.hp/a.maxHp-.5)<.01);
console.log('FASE 3 OK — 49 nós principais sem colisões; 18 compras legadas, gates, saves, bônus locais e consumidores');
