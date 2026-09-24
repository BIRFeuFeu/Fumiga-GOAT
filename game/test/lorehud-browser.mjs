// Inspeção opcional no navegador. Requer Playwright no ambiente de testes,
// não no jogo: rode antes  bash tools/setup-dev.sh  (npm run inspect:hud).
// Sobe o próprio servidor (ou use BASE_URL); CHROMIUM_PATH pode apontar a um browser.
// Saídas fora do Git: HUD_SHOTS=/home/user/fumiga-hud-shots (padrão /tmp).
import { startServer } from './lib/server.mjs';
import { launchBrowser } from './lib/browser.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const shots = process.env.HUD_SHOTS || '/tmp/fumiga-hud-shots';
const perfFrames = Math.max(90, Number(process.env.HUD_PERF_FRAMES) || 1800);
fs.mkdirSync(shots,{recursive:true});
const server=process.env.BASE_URL?null:await startServer();
const browser=await launchBrowser();
try {
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400) errors.push(r.status()+' '+r.url())});
await page.goto((process.env.BASE_URL || server.url) + '/game/');
await page.waitForFunction(async()=> (await import('./js/state.js')).G.screen==='PRETITLE');
async function click(x,y){const box=await page.locator('canvas#game').boundingBox();await page.mouse.click(box.x+x*box.width/960,box.y+y*box.height/540);await page.waitForTimeout(900);}
await click(480,270);await click(200,275);await click(114,282);await page.keyboard.press('Escape');await page.waitForTimeout(1200);

await page.evaluate(async()=>{const {G}=await import('./js/state.js');(await import('./js/tutorial.js')).stopTutorial(false);G.run.banner=null;G.run.elapsed=20;G.save.accessibility.invincible=true;});
// Troca controlada de mapas para inspeção visual; não comprova a campanha inteira.
for(let map=0;map<6;map++){
 await page.evaluate(async map=>{
  const {G}=await import('./js/state.js');const {director}=await import('./js/waves.js');
  director.mapIdx=map;director.timer=200;director.timerMax=200;G.run.mapIdx=map;
  (await import('./js/world.js')).genWorld(12345,map);
  const {allies}=await import('./js/units.js');allies.queen.hp=allies.queen.maxHp*(map===5?0.2:1);
 },map);
 await page.waitForTimeout(150);
 fs.writeFileSync(shots+'/bioma-'+map+'.png',Buffer.from((await page.locator('#game').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
}
await page.evaluate(async()=>{
 const {cam}=await import('./js/camera.js'); cam.zoom=1.6;
 const {markFood,markDanger}=await import('./js/brain.js');
 for(let y=-80;y<80;y+=32) for(let x=-160;x<160;x+=32){(x<0?markFood:markDanger)(cam.x+x,cam.y+y,1);}
});
await page.keyboard.down('h');await page.waitForTimeout(250);
assert.equal(await page.evaluate(async()=>(await import('./js/input.js')).keys.KeyH),true,'segurar H ativa visão');
fs.writeFileSync(shots+'/feromonio.png',Buffer.from((await page.locator('#game').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
const perf=await page.evaluate(frameCount=>new Promise(resolve=>{
 const intervals=[];let last;
 function frame(t){if(last)intervals.push(t-last);last=t;if(intervals.length<frameCount)requestAnimationFrame(frame);else resolve({fps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),frames:intervals.length, maxFrameMs:Math.max(...intervals)});}
 requestAnimationFrame(frame);
}), perfFrames);
await page.keyboard.up('h');
assert.equal(await page.evaluate(async()=>(await import('./js/input.js')).keys.KeyH),false,'soltar H desliga visão');
await page.keyboard.down('h');
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
assert.equal(await page.evaluate(async()=>(await import('./js/input.js')).keys.KeyH),false,'perda de foco limpa H');
await page.keyboard.up('h');
await page.evaluate(async()=>{const {G}=await import('./js/state.js');G.save.accessibility.bigFont=true;G.save.accessibility.highContrast=true;G.save.accessibility.reducedParticles=true;});
await click(313,20);
fs.writeFileSync(shots+'/acessibilidade.png',Buffer.from((await page.locator('#game').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
await click(313,20);
await page.setViewportSize({width:844,height:390});
await page.waitForTimeout(250);
await page.screenshot({path:shots+'/mobile-landscape.png'});
await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(250);
await page.screenshot({path:shots+'/mobile-portrait.png'});
await page.setViewportSize({width:1280,height:720});
await page.evaluate(async()=>{const {G}=await import('./js/state.js');G.save.accessibility.bigFont=false;});
await page.keyboard.press('b');await page.waitForTimeout(200);
assert.equal(await page.evaluate(async()=>(await import('./js/state.js')).G.run.baseOpen),true,'B abre formigueiro');
await page.keyboard.press('Escape');await page.waitForTimeout(200);
await page.keyboard.press('g');await page.waitForTimeout(200);
assert.equal(await page.evaluate(async()=>(await import('./js/waves.js')).director.phase),'wave','G inicia onda');
console.log('FPS headless H (diagnóstico, não benchmark de hardware):',perf);
// Gate opt-in: não impõe o desempenho desta máquina ao CI de outros ambientes.
if (process.env.HUD_MIN_FPS) assert(perf.fps >= Number(process.env.HUD_MIN_FPS), 'FPS abaixo da meta configurada');
assert.deepEqual(errors,[],'sem erros JS ou HTTP');
fs.writeFileSync(shots+'/resultado.json',JSON.stringify({perf,errors,biomes:6,checks:['H pressionado/solto/blur','vida baixa','zoom','fonte grande','alto contraste','partículas reduzidas','viewport paisagem/retrato','formigueiro','onda']},null,2));
console.log('BROWSER HUD OK — seis biomas, H, vida baixa, zoom, acessibilidade, viewports mobile, formigueiro e onda');
} finally { await browser.close(); if(server) await server.close(); }

