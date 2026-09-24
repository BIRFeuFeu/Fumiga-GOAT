// Fase 3: seleção, leitura, compra explícita, save e áreas de toque reais.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startServer } from './lib/server.mjs';
import { launchBrowser, watchPage } from './lib/browser.mjs';
const server = await startServer(), browser = await launchBrowser();
const out = '/tmp/fumiga-tree'; fs.mkdirSync(out,{recursive:true});
try {
  for(const mobile of [false,true]) {
    const context = await browser.newContext({ viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile });
    const page=await context.newPage(), errors=[];watchPage(page,errors);
    await page.goto(server.url+(mobile?'/game/mobile/':'/game/')+'?debug&limpo&hud=0&tela=TREE');
    await page.waitForFunction(()=>window.FUMIGA?.pronto);
    await page.evaluate(()=>{const root=document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/,'');window.M=n=>import(root+n);});
    const ids=await page.evaluate(async()=> (await M('tree_layout.js')).TREE_ALL.map(n=>n.id));
    async function tap(x,y) {
      const r=await page.locator('#game').boundingBox();
      if(mobile) await page.touchscreen.tap(r.x+x*r.width/960,r.y+y*r.height/540);
      else await page.mouse.click(r.x+x*r.width/960,r.y+y*r.height/540);
      await page.waitForTimeout(60);
    }
    async function pick(id) {
      await page.evaluate(async id=>{(await M('meta.js')).treeFocusNode(id);},id);
      await page.waitForTimeout(40);
      const p=await page.evaluate(async id=>(await M('meta.js')).treeNodePosition(id),id);
      await tap(p.x,p.y);
    }
    async function click(id) {
      const b=await page.evaluate(async id=>(await M('ui.js')).uiButtons().find(b=>b.id===id),id);
      assert.ok(b,'botão '+id);await tap(b.x+b.w/2,b.y+b.h/2);
    }
    // Entrada real pelos frutos da copa: sem usar foco debug para abrir o menu.
    const maps=await page.evaluate(async()=>(await M('config.js')).FRUIT_TREES.map(f=>f.map));
    for(const map of maps){
      const p=await page.evaluate(async map=>(await M('meta.js')).treeFruitPosition(map),map);
      await tap(p.x,p.y);
      const cards=await page.evaluate(async()=>(await M('ui.js')).uiButtons().filter(b=>b.id.startsWith('fruitNode_')));
      assert.equal(cards.length,10,map+' abre miniárvore própria');
      assert.ok(cards.every(b=>b.w>=44 && b.h>=44),'áreas de toque 44px');
      if(map!=='topo'){await click('fruitLegacy');assert.equal(await page.evaluate(async()=>(await M('ui.js')).uiButtons().filter(b=>b.id.startsWith('fruitNode_')).length),3);await click('fruitNew');}
      await click('treeMiniBack');
    }
    for(const big of [false,true]) {
      await page.evaluate(async big=>{const {G}=await M('state.js');G.save.accessibility.bigFont=big;G.save.nodes={};G.save.clearedMaps={};G.save.essence=9999;},big);
      for(const id of ids) {
        await pick(id);
        const audit=await page.evaluate(()=>FUMIGA.auditarLayout());
        assert.deepEqual(audit.issues,[],`${mobile?'mobile':'PC'} fonte ${big} ${id}`);
        assert.equal(await page.evaluate(async()=>Object.keys((await M('state.js')).G.save.nodes).length),0,'inspecionar não compra');
      }
    }
    await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-detalhe.png'});
    await page.evaluate(async()=>{ const {G}=await M('state.js');G.save.essence=50000;for(const f of (await M('config.js')).FRUIT_TREES) G.save.clearedMaps[f.map]=true; });
    for(const id of ids.filter(id=>id.startsWith('f_') || id.startsWith('v_') && !id.startsWith('v_a'))) {
      await pick(id);await click('treeBuy');
      assert.equal(await page.evaluate(async id=>(await M('state.js')).G.save.nodes[id],id),1,id+' comprado pelo botão');
    }
    await page.goto(page.url().replace('&limpo','')); await page.waitForFunction(()=>window.FUMIGA?.pronto);
    await page.evaluate(()=>{const root=document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/,'');window.M=n=>import(root+n);});
    const saved=await page.evaluate(()=>FUMIGA.G.save);
    assert.equal(Object.keys(saved.nodes).filter(id=>id.startsWith('f_') || id.startsWith('v_')).length,78,'78 compras acessíveis persistidas após reload');
    assert.equal(saved.era,1,'lendário dá uma Era só');
    await page.evaluate(()=>FUMIGA.go('TREE'));await page.waitForTimeout(200);
    await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-arvore.png'});
    await pick('v_i6');await page.screenshot({path:out+'/'+(mobile?'mobile':'pc')+'-mini-gelo.png'});
    await page.keyboard.press('Escape');await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>FUMIGA.G.screen),'TREE');
    await page.keyboard.press('Escape');await page.waitForTimeout(80);
    assert.ok(await page.evaluate(async()=>(await M('ui.js')).uiButtons().some(b=>b.id==='treeMemories')),'Escape volta da miniárvore para árvore');
    if(mobile) {
      await page.evaluate(()=>FUMIGA.go('RUN',{mapa:5,seed:7})); await page.waitForTimeout(700);
      await click('hudMore'); await click('touchScent');
      assert.equal(await page.evaluate(async()=>(await M('input.js')).keys.KeyH),true,'olfato por toque');
      await click('touchScent');
      assert.equal(await page.evaluate(async()=>(await M('input.js')).keys.KeyH),false,'desligar olfato');
    }
    assert.deepEqual(errors,[]);
    console.log((mobile?'MOBILE':'PC')+': 137 detalhes normal/grande sem colisão, sem compra acidental; 78 compras por botão persistiram');
    await context.close();
  }
} finally { await browser.close();await server.close(); }
console.log('ÁRVORE NO NAVEGADOR OK — capturas em '+out);
