// Regressão de interface com cliques/toques REAIS, não só leitura de layout.
// node game/test/ui-navigation-browser.mjs (tools/setup-dev.sh primeiro)
import assert from 'node:assert/strict';
import { startServer } from './lib/server.mjs';
import { launchBrowser, watchPage } from './lib/browser.mjs';

const server = await startServer();
const browser = await launchBrowser();
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 }, hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage(), errors = [];
    watchPage(page, errors);
    await page.goto(server.url + (mobile ? '/game/mobile/' : '/game/') + '?debug&limpo&hud=0');
    await page.waitForFunction(() => window.FUMIGA?.pronto);
    await page.evaluate(() => {
      const root = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, '');
      window.M = name => import(root + name);
      window.FUMIGA_DUMP_TEXTS = true;
    });
    async function tap(x, y) {
      const r = await page.locator('#game').boundingBox();
      const px = r.x + x * r.width / 960, py = r.y + y * r.height / 540;
      if (mobile) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
      await page.waitForTimeout(160);
    }
    async function button(id) {
      // Aguarda o quadro que publica o controle, não um prazo fixo: sob carga
      // o render/transição pode levar mais que o sleep anterior.
      const handle = await page.waitForFunction(async id => (await M('ui.js')).uiButtons().find(b => b.id === id), id, { timeout: 5000 });
      const b = await handle.jsonValue(); await handle.dispose();
      assert.ok(b, 'botão acessível: ' + id);
      await tap(b.x + b.w/2, b.y + b.h/2);
    }
    for (const big of [false, true]) {
      await page.evaluate(async big => { (await M('state.js')).G.save.accessibility.bigFont = big; }, big);
      for (const [screen, id, pages] of [['MEMORY', 'memory', 2], ['PROPHECY', 'prophecy', 4]]) {
        await page.evaluate(screen => FUMIGA.go(screen), screen);
        await page.waitForTimeout(200);
        const expected = await page.evaluate(async screen => screen === 'MEMORY'
          ? Object.entries((await M('cutscenes.js')).getCutsceneDefs()).filter(([id]) => !id.startsWith('loading_')).map(([, d]) => d.title)
          : (await M('config.js')).PROPHECIES.map(p => p.name), screen);
        let allText = '';
        for (let n = 0; n < pages; n++) {
          const audit = await page.evaluate(() => FUMIGA.auditarLayout());
          assert.deepEqual(audit.issues, [], screen + ' página ' + (n + 1));
          allText += ' ' + audit.detalhes.map(t => t.text).join(' ');
          if (n < pages - 1) await button(id + 'Next');
        }
        const normalize = t => t.toUpperCase().replace(/\s+/g, '');
        for (const title of expected) assert.ok(normalize(allText).includes(normalize(title)), 'conteúdo preservado: ' + title);
        for (let n = pages - 1; n > 0; n--) await button(id + 'Prev');
        assert.equal(await page.evaluate(async id => (await M('ui.js')).uiButtons().some(b => b.id === id + 'Prev'), id), false);
      }
    }
    await page.evaluate(() => FUMIGA.go('MEMORY'));
    await page.waitForTimeout(200);
    await button('memoryNext');
    await tap(180, 185);
    await page.waitForFunction(async () => (await M('cutscenes.js')).isCutsceneActive());
    console.log((mobile ? 'mobile' : 'PC') + ': todas as páginas, fonte normal/grande, anterior/próxima e replay por toque/clique OK');
    if (mobile) {
      // A fixture do HUD não reutiliza timers/estado transitório do replay.
      // Navegar invalida os callbacks da página anterior, inclusive sob carga.
      await page.goto(server.url + '/game/mobile/?debug&limpo&hud=0&tela=RUN&seed=7');
      await page.waitForFunction(() => window.FUMIGA?.pronto);
      await page.evaluate(() => {
        const root = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, '');
        window.M = name => import(root + name);
        FUMIGA.G.save.accessibility.bigFont = true;
        FUMIGA.G.run.banner = null;
      });
      await page.waitForFunction(async () => FUMIGA.G.screen === 'RUN' &&
        !(await M('render.js')).hasTransition() && !(await M('cutscenes.js')).isCutsceneActive());
      assert.equal(await page.locator('#touch-hud button').count(), 3, 'sem seis botões redundantes');
      await button('nestBtn');
      assert.equal(await page.evaluate(async () => (await M('state.js')).G.run.baseOpen), true);
      assert.equal(await page.locator('#touch-hud').isVisible(), false, 'ninho sem controles duplicados');
      await button('nestOut'); await button('nestIn'); await button('nestBack');
      assert.equal(await page.evaluate(async () => (await M('state.js')).G.run.baseOpen), false);
      await page.getByRole('button', { name: 'PAUSA', exact: true }).tap();
      await page.waitForTimeout(160);
      assert.equal(await page.evaluate(async () => (await M('game.js')).isPaused()), true);
      await page.getByRole('button', { name: 'PAUSA', exact: true }).tap();
      await page.waitForTimeout(160);
      assert.equal(await page.evaluate(async () => (await M('game.js')).isPaused()), false);
      await button('skip');
      assert.equal(await page.evaluate(async () => (await M('waves.js')).director.phase), 'wave');
      console.log('mobile: entrar/sair do ninho, comandos da boca, pausa/retomada e invocar pelo canvas OK');
    }
    assert.deepEqual(errors, [], 'sem erros JS/rede');
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log('NAVEGAÇÃO DE INTERFACE OK');
