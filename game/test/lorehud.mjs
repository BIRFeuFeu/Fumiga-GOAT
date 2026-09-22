// Fase 1: arte real, recortes, cache, vida e coordenadas do feromônio. Node puro.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const requested = [], draws = [], clips = [], scales = [];
let canvases = 0, gradients = 0;
function context() {
  const stack=[];
  const ctx = new Proxy({globalAlpha:1, imageSmoothingEnabled:false}, {
    get(t,k) {
      if (k in t) return t[k];
      if (k==='save') return () => stack.push([t.globalAlpha,t.imageSmoothingEnabled]);
      if (k==='restore') return () => { [t.globalAlpha,t.imageSmoothingEnabled]=stack.pop(); };
      if (k==='drawImage') return (...args) => draws.push(args);
      if (k==='scale') return (...args) => scales.push(args);
      if (k==='rect') return (...args) => clips.push(args);
      if (k==='createRadialGradient' || k==='createLinearGradient') return () => {gradients++;return {addColorStop(){}};};
      return () => {};
    },
  });
  return ctx;
}
globalThis.document = {createElement() {canvases++;return {width:0,height:0,getContext:context};}};
globalThis.Image = class {
  set src(src) {
    this._src=src;
    const png=readFileSync(new URL('../'+src,import.meta.url));
    this.width=png.readUInt32BE(16);this.height=png.readUInt32BE(20);
    requested.push(this);queueMicrotask(()=>this.onload());
  }
};
const hud=await import('../js/lore_hud.js');
const {G}=await import('../js/state.js');
await Promise.all([hud.loadLoreHUD(),hud.loadLoreHUD()]);
assert.equal(requested.length,3,'carregamento idempotente');
assert.deepEqual(requested.map(i=>[i.width,i.height]),[[192,32],[192,16],[192,24]]);
const ctx=context();
for (const [i,biome] of Object.keys(hud.BIOME_HUD).entries()) {
  let n=canvases;
  hud.drawBiomeTexture(ctx,10,8,320,96,biome,0);
  assert.equal(canvases,n+1);
  n=canvases;
  hud.drawBiomeTexture(ctx,10,8,320,96,biome,1);
  assert.equal(canvases,n,'textura cacheada');
  hud.drawFoodIcon(ctx,biome,84,60);
  assert.equal(draws.at(-1)[1],i*16,'ícone próprio do bioma');
}
assert.equal(hud.getBiomeHUD('desconhecido'),hud.BIOME_HUD.planicie);
for (const frac of [-1,0,0.2,1,2,NaN]) {
  hud.drawGasterBar(ctx,96,45,122,12,frac,'planicie',frac<0.3,1);
  const clip=clips.at(-1);
  assert(clip[2]>=0 && clip[2]<=122,'vida limitada ao gaster');
  assert.equal(draws.at(-1)[1],frac<0.3 ? 128 : 64);
}
const cam={x:1000,y:800,zoom:2,offsetX:6,offsetY:-4};
let first;
const food=(x,y)=>{first ||= [x,y];return 0.4;};
const danger=()=>0.8;
hud.drawPheromoneOverlay(ctx,cam,960,540,null,food,danger,1);
assert.deepEqual(first,[1000+(-480-6)/2,800+(-270+4)/2]);
assert.equal(ctx.globalAlpha,1);
const count=gradients, cached=canvases;
hud.drawPheromoneOverlay(ctx,cam,960,540,null,food,danger,2);
assert.equal(gradients,count,'sem gradientes por frame após warmup');
assert.equal(canvases,cached,'sem canvas por frame após warmup');
G.save.accessibility = {...G.save.accessibility,reducedParticles:true};
hud.drawTrailAnt(ctx,10,10,1.5);
assert.equal(draws.at(-1)[1],8*16,'modo reduzido fixa animação');
for (const call of draws) {
  if (call.length!==9 || !call[0]._src) continue;
  const [img,x,y,w,h]=call;
  assert(x>=0 && y>=0 && x+w<=img.width && y+h<=img.height,'recorte dentro do atlas');
}
console.log('LORE HUD OK — 6 biomas, 3 atlas, cache, vida limitada, feromônio com zoom/shake, FX reduzidos');

// Novo acabamento da Fase 1: nomes canônicos, anéis e cache sensorial.
const {MAPS} = await import('../js/config.js');
for (const map of MAPS) assert.equal(map.loreName,hud.getBiomeHUD(map.id).loreName);
for (const fraction of [-1,0,0.5,1,2,NaN]) {
  hud.drawTreeRings(ctx,76,60,fraction,'floresta');
  assert.equal(ctx.globalAlpha,1,'anéis preservam contexto');
}
let samples=0;
const field=()=>{samples++;return 0.8;};
const identity={};
hud.drawScentMinimap(ctx,10,10,180,135,identity,3200,2400,field,field,10);
assert.equal(samples,50*38*2,'grade sensorial limitada');
const miniCanvases=canvases;
hud.drawScentMinimap(ctx,10,10,180,135,identity,3200,2400,field,field,10.05);
assert.equal(samples,50*38*2,'minimapa reaproveita os campos dentro de 100ms');
hud.drawScentMinimap(ctx,10,10,180,135,{},3200,2400,field,field,10.06);
assert.equal(samples,50*38*4,'novo mundo invalida minimapa');
assert.equal(canvases,miniCanvases,'mesmo canvas reutilizado entre mundos');
samples=0;
hud.drawPheromoneOverlay(ctx,cam,960,540,null,field,field,20);
const fogSamples=samples;
hud.drawPheromoneOverlay(ctx,cam,960,540,null,field,field,20.01);
assert.equal(samples,fogSamples,'névoa reaproveitada em 30Hz');
cam.zoom=1;
hud.drawPheromoneOverlay(ctx,cam,960,540,null,field,field,20.02);
assert.equal(samples,fogSamples*2,'zoom invalida névoa imediatamente');
console.log('FECHAMENTO HUD OK — nomes dos mapas, anéis, cache sensorial e invalidação de zoom');

// O alerta pulsa no sprite inteiro; FX reduzidos preservam a leitura sem movimento.
G.save.accessibility.reducedParticles=false;
G.save.settings.particles=true;
let scaleCount=scales.length;
hud.drawGasterBar(ctx,116,55,102,12,0.2,'gelo',true,0.2);
assert.equal(scales.length,scaleCount+1,'gaster ferido pulsa');
assert(scales.at(-1)[0]>1 && scales.at(-1)[0]<=1.04);
assert.notEqual(hud.trailProgress(1,2),hud.trailProgress(2,2),'trilha viva');
G.save.accessibility.reducedParticles=true;
scaleCount=scales.length;
hud.drawGasterBar(ctx,116,55,102,12,0.2,'gelo',true,0.2);
assert.equal(scales.length,scaleCount,'gaster reduzido não pulsa');
assert.equal(hud.trailProgress(1,2),hud.trailProgress(2,2),'trilha reduzida não se desloca');
G.save.accessibility.reducedParticles=false;
G.save.settings.particles=false;
assert.equal(hud.trailProgress(1,2),hud.trailProgress(2,2),'opção de vídeo também reduz movimento');
console.log('ACESSIBILIDADE HUD OK — gaster pulsante e trilha estática com efeitos reduzidos');
