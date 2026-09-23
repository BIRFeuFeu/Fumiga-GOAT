// Regressão geométrica: usa as chamadas reais do render e dimensões dos PNGs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/render.js',import.meta.url),'utf8');
const start=source.indexOf('export function drawTitleBg(ctx)');
const end=source.indexOf('    // FASE 1 FINAL - ciclo dia/noite',start);
const names={sky:'layer4_sky_sunset_moon.png',mountains:'layer3_mountains_silhouette.png',main:'layer2_main_grass_ruins_anthill.png',foreground:'layer1_foreground_vines.png'};
const IMG={};
for(const [key,file] of Object.entries(names)){
 const png=fs.readFileSync(new URL('../assets/parallax/menu/'+file,import.meta.url));
 IMG['parallax_'+key]={key,width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
}
const draws=[];const noop=()=>{};
const ctx=new Proxy({drawImage:(...a)=>draws.push(a),createRadialGradient:()=>({addColorStop:noop})},{get:(t,p)=>p in t?t[p]:noop});
const env={IMG,ctx,G:{time:0},mouse:{x:0,y:0},VIEW_W:960,VIEW_H:540,TITLE_SIDE_PAD:128,TAU:Math.PI*2,dayPhase:0,ensureMotes:noop};
vm.createContext(env);
vm.runInContext(source.slice(start,end).replace('export ','')+'}}',env);
for(let time=0;time<=1600;time+=7){
 for(const [x,y] of [[0,0],[960,0],[0,540],[960,540],[480,270],[-100,-100],[1060,640]]){
  env.mouse.x=x;env.mouse.y=y;env.G.time=time;draws.length=0;
  vm.runInContext('drawTitleBg(ctx)',env);
  assert.equal(draws.length,4);
  for(const [img,dx,dy,...scale] of draws){
   assert.equal(scale.length,0,'blit nativo: não aumentar/esticar o PNG');
   assert(dx<=0 && dx+img.width>=960,img.key+' cobre as laterais');
   if(img.key==='sky')assert(dy<=0 && dy+img.height>=540,'céu cobre verticalmente');
   if(['main','foreground'].includes(img.key))assert(dy+img.height>=540,img.key+' cobre base');
  }
  if(time===0&&x===0)assert.equal(draws[0][1],-172.8,'x=0 não vira centro');
 }
}
console.log('TITLE PARALLAX OK — quatro camadas, cantos, centro, input externo e oscilação; escala 1:1.');
