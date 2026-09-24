// Arte aprovada, cinza -> cor LOCAL, patamares e gestos em Chromium real.
// Fixtures usam somente o save DEBUG. Não há migração/apagamento do save do jogador.
import assert from "node:assert/strict";
import fs from "node:fs";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage } from "./lib/browser.mjs";

const server = await startServer(), browser = await launchBrowser();
const out = process.env.TREE_ART_SHOTS || "/tmp/fumiga-tree-art";
fs.mkdirSync(out, { recursive: true });
const results = [];
try {
  for (const mobile of [false, true]) {
    const name = mobile ? "mobile" : "pc";
    const context = await browser.newContext({ viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 720 }, hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage(), errors = []; watchPage(page, errors);
    await page.goto(server.url + (mobile ? "/game/mobile/" : "/game/") + "?debug&limpo&hud=0&tela=TREE&essencia=10000");
    await page.waitForFunction(() => window.FUMIGA?.pronto);
    await page.evaluate(() => {
      const root = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, "");
      window.M = file => import(root + file);
      FUMIGA.G.save.accessibility.reducedParticles = true;
    });
    async function xy(x, y) {
      const r = await page.locator("#game").boundingBox();
      return { x: r.x + x * r.width / 960, y: r.y + y * r.height / 540 };
    }
    async function tap(x, y) {
      const p = await xy(x, y);
      if (mobile) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(120);
    }
    async function click(id) {
      const b = await page.evaluate(async id => (await M("ui.js")).uiButtons().find(b => b.id === id), id);
      assert(b, "botão " + id);
      assert(b.w >= 44 && b.h >= 44, "toque de pelo menos 44px: " + id);
      await tap(b.x + b.w / 2, b.y + b.h / 2);
    }
    const view = () => page.evaluate(async () => (await M("meta.js")).treeViewState());
    const nodes = () => page.evaluate(() => ({ ...FUMIGA.G.save.nodes }));
    const essence = () => page.evaluate(() => FUMIGA.G.save.essence);
    async function choose(id) {
      const p = await page.evaluate(async id => (await M("meta.js")).treeNodePosition(id), id);
      await tap(p.x, p.y);
      assert.equal((await view()).selected, id, "seleção por clique/toque: " + id);
    }
    async function audit(label) {
      const a = await page.evaluate(() => FUMIGA.auditarLayout());
      assert.deepEqual(a.issues, [], name + " " + label);
    }
    async function art() {
      return page.evaluate(async () => {
        const module = await M("tree_art.js"), growth = module.treeGrowth(), cv = module.treeArtCanvas(growth);
        const p = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
        let maxChroma = 0, rootChroma = 0, crownChroma = 0, opaque = 0;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
          const k = (y * cv.width + x) * 4;
          if (p[k + 3] < 250) continue;
          opaque++;
          const c = Math.max(p[k], p[k + 1], p[k + 2]) - Math.min(p[k], p[k + 1], p[k + 2]);
          maxChroma = Math.max(maxChroma, c);
          if (x > 280 && x < 440 && y > 500 && y < 635) rootChroma = Math.max(rootChroma, c);
          if (x > 300 && x < 470 && y > 30 && y < 120) crownChroma = Math.max(crownChroma, c);
        }
        return { ...module.treeArtInfo(), restored: growth.restoredPercent, stages: [...growth.stages], maxChroma, rootChroma, crownChroma, opaque };
      });
    }
    const fresh = await art();
    assert.deepEqual([fresh.width, fresh.height], [768, 672]); assert(fresh.opaque > 80000);
    assert.equal(fresh.maxChroma, 0, "a árvore começa realmente acromática, não só escurecida");
    assert.equal(fresh.restored, 0);
    await audit("cinza");
    await page.screenshot({ path: out + "/" + name + "-cinza.png" });
    await page.waitForTimeout(180); assert.equal((await art()).bakes, fresh.bakes, "sem reprocessar pixels por frame");

    // A raiz tem acesso dedicado: iniciante não precisa acertar um ícone minúsculo.
    await click("treeRoot"); assert.equal((await view()).selected, "raiz");
    assert.deepEqual(await nodes(), {}, "selecionar não compra");
    const e0 = await essence(); await click("treeBuy");
    assert.equal((await nodes()).raiz, 1); assert.equal(await essence(), e0, "raiz gratuita");
    const partial = await art();
    assert(partial.rootChroma > 0); assert.equal(partial.crownChroma, 0, "a primeira compra não colore a copa");
    assert(partial.bakes > fresh.bakes);

    // Galho 2 não compra só por ter essência: exige vitória no mundo 1.
    await click("treeStage2"); await choose("g_cri");
    let b = await page.evaluate(async () => (await M("ui.js")).uiButtons().find(b => b.id === "treeBuy"));
    assert(b.disabled);
    const before = JSON.stringify(await nodes()); await click("treeBuy");
    assert.equal(JSON.stringify(await nodes()), before); assert.equal(await essence(), e0);
    await audit("galho bloqueado");
    await page.screenshot({ path: out + "/" + name + "-bloqueio.png" });
    await click("treeStage1"); await choose("g_dan"); await click("treeBuy");
    assert.equal((await nodes()).g_dan, 1);
    await page.evaluate(async () => { (await M("state.js")).unlockFruitForBoss("planicie", "hare", "campanha"); });
    await click("treeStage2"); await choose("g_cri");
    b = await page.evaluate(async () => (await M("ui.js")).uiButtons().find(b => b.id === "treeBuy")); assert(!b.disabled);
    const e1 = await essence(); await click("treeBuy"); assert.equal(e1 - await essence(), 105);
    assert.equal((await nodes()).g_cri, 1);
    await click("treeFit"); await page.screenshot({ path: out + "/" + name + "-cor-parcial.png" });

    // Menu por galho, um fruto em cada ramo, prévia, volta e legibilidade.
    for (const big of [false, true]) {
      await page.evaluate(big => { FUMIGA.G.save.accessibility.bigFont = big; }, big);
      for (let i = 1; i <= 7; i++) {
        await click("treeStage" + i);
        await audit("galho " + i + " fonte " + big);
        const old = await view();
        const p = await page.evaluate(async i => {
          const f = (await M("config.js")).FRUIT_TREES[i - 1];
          return (await M("meta.js")).treeFruitPosition(f.map);
        }, i);
        await tap(p.x, p.y); assert((await view()).fruit, "fruto do galho " + i + " abriu");
        await audit("fruto " + i + " fonte " + big);
        if (i === 7) {
          await click("fruitNode_v_a1");
          const buy = await page.evaluate(async () => (await M("ui.js")).uiButtons().find(b => b.id === "treeBuy"));
          assert(buy.disabled, "Pálida continua futura");
          await audit("Pálida futura " + big);
        }
        await click("treeMiniBack");
        assert.equal((await view()).focusedStage, old.focusedStage);
        assert.equal((await view()).zoom, old.zoom, "volta preserva o enquadramento");
      }
    }
    await page.evaluate(() => { FUMIGA.G.save.accessibility.bigFont = false; });
    await click("treeStage2");
    const savedNodes = JSON.stringify(await nodes()), savedEssence = await essence(), v0 = await view();
    if (mobile) {
      // Dois dedos reais pelo protocolo de input do Chromium, não alteração de mouse.wheel.
      const cdp = await context.newCDPSession(page);
      const a = await xy(455, 302), b = await xy(650, 302), a2 = await xy(380, 302), b2 = await xy(725, 302);
      const pt = (p, id) => ({ x: p.x, y: p.y, id, radiusX: 5, radiusY: 5 });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(a, 0)] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(a, 0), pt(b, 1)] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(a2, 0), pt(b2, 1)] });
      await page.waitForTimeout(90);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(90);
      assert((await view()).zoom > v0.zoom, "pinça aproxima");
      // Arrasto de um dedo também move a árvore, sem inspecionar/comprar.
      const p = await xy(530, 380), q = await xy(470, 350);
      const v = await view();
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(p, 2)] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(q, 2)] });
      await page.waitForTimeout(90);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(90);
      assert.notEqual((await view()).x, v.x, "arrasto de um dedo move câmera");
      await cdp.detach();
    } else {
      const p = await xy(565, 300);
      await page.mouse.move(p.x, p.y); await page.mouse.wheel(0, -250); await page.waitForTimeout(90);
      assert((await view()).zoom > v0.zoom, "roda aproxima");
      const v = await view(), q = await xy(505, 350);
      await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(90); assert.notEqual((await view()).x, v.x, "arrasto move câmera");
    }
    assert.equal((await view()).selected, null, "arrastar/pinçar não seleciona");
    assert.equal((await view()).fruit, null, "arrastar/pinçar não abre fruto");
    assert.equal(JSON.stringify(await nodes()), savedNodes); assert.equal(await essence(), savedEssence);

    // Restauração completa sem conceder nenhum poder do fruto ainda inexistente.
    await page.evaluate(async () => {
      const { TREE_ALL } = await M("tree_layout.js"), { FRUIT_TREES } = await M("config.js");
      FUMIGA.G.save.nodes = Object.fromEntries(TREE_ALL.filter(n => !n._fruit?.pending).map(n => [n.id, n.cost.length]));
      FUMIGA.G.save.clearedMaps = Object.fromEntries(FRUIT_TREES.filter(f => !f.pending).map(f => [f.map, true]));
      FUMIGA.go("TREE");
    });
    await page.waitForTimeout(180);
    const full = await art(); assert.equal(full.restored, 100); assert(full.crownChroma > 20);
    assert.deepEqual(full.stages, Array(7).fill(1));
    const difference = await page.evaluate(async () => {
      const cv = (await M("tree_art.js")).treeArtCanvas();
      const source = document.createElement("canvas"); source.width = cv.width; source.height = cv.height;
      source.getContext("2d").drawImage((await M("assets.js")).IMG.tree_ancestral, 0, 0);
      const a = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      const b = source.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      let max = 0;
      for (let k = 0; k < a.length; k += 4) if (b[k + 3] === 255) for (let c = 0; c < 3; c++) max = Math.max(max, Math.abs(a[k + c] - b[k + c]));
      return max;
    });
    assert.equal(difference, 0, "completa é a arte aprovada, sem nova coloração artificial");
    await audit("restaurada"); await page.screenshot({ path: out + "/" + name + "-restaurada.png" });
    await page.evaluate(async () => { FUMIGA.G.save.accessibility.reducedParticles = false; (await M("state.js")).persistSave(); });
    await page.goto(page.url().replace("&limpo", "").replace("&essencia=10000", ""));
    await page.waitForFunction(() => window.FUMIGA?.pronto);
    await page.evaluate(() => {
      const root = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, ""); window.M = file => import(root + file);
    });
    assert.equal((await art()).restored, 100, "cor volta do save, sem salvar PNG/cache no localStorage");
    const perf = await page.evaluate(() => new Promise(resolve => {
      let first = 0, last = 0, frames = 0, worst = 0;
      function frame(t) {
        if (last) { worst = Math.max(worst, t - last); frames++; } else first = t;
        last = t;
        if (frames < 120) requestAnimationFrame(frame);
        else resolve({ fps: +(frames * 1000 / (t - first)).toFixed(2), worstMs: +worst.toFixed(2) });
      }
      requestAnimationFrame(frame);
    }));
    if (process.env.TREE_MIN_FPS) assert(perf.fps >= Number(process.env.TREE_MIN_FPS), "FPS abaixo do gate");
    const stable = (await art()).bakes; await page.waitForTimeout(180); assert.equal((await art()).bakes, stable);
    await page.evaluate(() => { FUMIGA.G.save.accessibility.bigFont = true; FUMIGA.G.save.accessibility.highContrast = true; });
    await click("treeStage7"); await audit("copa grande/contraste");
    await page.screenshot({ path: out + "/" + name + "-copa.png" });

    // O bônus reforçado de Renascimento chega ao consumidor real da expedição.
    const rebirth = await page.evaluate(async () => {
      const { G } = await M("state.js"); G.save.nodes = { r_ren: 1 }; G.save.accessibility.invincible = false;
      FUMIGA.go("RUN", { mapa: 0, seed: 41 });
      const q = (await M("units.js")).allies.queen;
      q.hp = -100000;
      return new Promise(resolve => requestAnimationFrame(() => resolve({ used: G.run.rebirthUsed, hp: q.hp, max: q.maxHp })));
    });
    assert(rebirth.used); assert.equal(rebirth.hp / rebirth.max, .75);
    assert.deepEqual(errors, []);
    results.push({ profile: name, ...perf, initial: fresh, partial, full, checks: "arte, gates, compras, reload, gestos, fonte grande, contraste, renascimento" });
    console.log(`${name.toUpperCase()}: cinza/cor local/100%, 7 galhos, gates, gestos, save e Renascimento OK — ${perf.fps} FPS`);
    await context.close();
  }
} finally { await browser.close(); await server.close(); }
fs.writeFileSync(out + "/report.json", JSON.stringify(results, null, 2));
console.log("ARTE E PROGRESSÃO NO NAVEGADOR OK — " + out);
