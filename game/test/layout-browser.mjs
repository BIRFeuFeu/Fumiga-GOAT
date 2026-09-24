// AUDITORIA DE LAYOUT NO NAVEGADOR — todas as telas e estados do jogo, PC e
// mobile, com e sem FONTE GRANDE. Em cada estado grava um frame (font.js/ui.js)
// e acusa: texto fora da tela, textos colidindo, texto vazando da caixa/botão,
// botões sobrepostos, texto invadindo botão alheio e, no mobile, botões da
// camada de toque (DOM) cobrindo o canvas. Capturas em /tmp/fumiga-layout.
//
//   node game/test/layout-browser.mjs            PC + mobile (= npm run inspect:layout)
//   node game/test/layout-browser.mjs --pc       só PC   ·  --mobile  só mobile
//   node game/test/layout-browser.mjs --so=OPCOES,RUN   estados que começam assim
//   LAYOUT_OUT=/outra/pasta  ·  BASE_URL=http://host:porta
// Requer tools/setup-dev.sh (Playwright + Chromium).
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const OUT = process.env.LAYOUT_OUT || "/tmp/fumiga-layout";
const soArg = args.find((a) => a.startsWith("--so="));
const only = soArg ? soArg.slice(5).toUpperCase().split(",") : null;
const profiles = [
  { id: "pc", path: "/game/", ctx: { viewport: { width: 1280, height: 720 } } },
  { id: "mobile", path: "/game/mobile/", ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
].filter((p) => !(args.includes("--pc") && p.id !== "pc") && !(args.includes("--mobile") && p.id !== "mobile"));

// Cada estado: [nome, função executada NA PÁGINA (recebe M = importador de módulo)]
// As funções viram texto (page.evaluate), então só usam o que recebem.
const S = {
  titulo: async (M) => { window.FUMIGA.go("TITLE"); },
  modo: async (M) => { window.FUMIGA.go("MODE"); },
  arvore: async (M) => { window.FUMIGA.go("TREE"); },
  arvoreDica: async (M) => {
    window.FUMIGA.go("TREE");
    const { mouse } = await M("input.js"); mouse.x = 480; mouse.y = 308;
  },
  ajuda: async (M) => { window.FUMIGA.go("HELP"); },
  profecias: async (M) => { window.FUMIGA.go("PROPHECY"); },
  memorias: async (M) => { window.FUMIGA.go("MEMORY"); },
  opcoes: (tab, fim) => `async (M) => {
    window.FUMIGA.go("OPTIONS");
    await new Promise((r) => setTimeout(r, 60));
    const { uiButtons } = await M("ui.js"); const { mouse } = await M("input.js");
    const b = uiButtons().find((x) => x.id === "tab${tab}");
    if (!b) console.error("aba tab${tab} não achada nos uiButtons()");
    if (b) { mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2; mouse.clickX = mouse.x; mouse.clickY = mouse.y;
      mouse.down = mouse.justDown = true; await new Promise((r) => requestAnimationFrame(r));
      mouse.down = mouse.justDown = false; mouse.justUp = true; await new Promise((r) => requestAnimationFrame(r)); mouse.justUp = false; }
    mouse.x = -50; mouse.y = -50;
    ${fim ? "(await M('game.js')).__optScrollToEnd();" : ""}
  }`,
  run: async (M) => { window.FUMIGA.go("RUN", { mapa: 0, seed: 7 }); },
  runLimpo: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null;
  },
  runExpandido: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 900));
    const { G } = await M("state.js"); G.run.banner = null;
    const { uiButtons } = await M("ui.js"); const { mouse } = await M("input.js");
    const b = uiButtons().find((x) => x.id === "hudMore");
    if (!b) console.error("hudMore não achado nos uiButtons()");
    if (b) { mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2; mouse.down = mouse.justDown = true;
      await new Promise((r) => requestAnimationFrame(r)); mouse.down = mouse.justDown = false; mouse.justUp = true;
      await new Promise((r) => requestAnimationFrame(r)); mouse.justUp = false; }
    mouse.x = 480; mouse.y = 300;
  },
  runFormigas: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 900));
    const { G } = await M("state.js"); G.run.banner = null; G.run.food = 900;
    const { uiButtons } = await M("ui.js"); const { mouse } = await M("input.js");
    const b = uiButtons().find((x) => x.id === "shopToggle");
    if (!b) console.error("shopToggle não achado nos uiButtons()");
    if (b) { mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2; mouse.down = mouse.justDown = true;
      await new Promise((r) => requestAnimationFrame(r)); mouse.down = mouse.justDown = false; mouse.justUp = true;
      await new Promise((r) => requestAnimationFrame(r)); mouse.justUp = false; }
    mouse.x = 480; mouse.y = 300;
  },
  tutorial: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null;
    const t = await M("tutorial.js"); t.startTutorial(); t.TUT.t = 1.2;
  },
  chefe: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null;
    const { director } = await M("waves.js"); const { MAPS } = await M("config.js");
    director.waveInMap = MAPS[0].waves.length; director.phase = "wave"; director.budget = 8;
    const { spawnBoss } = await M("enemies.js"); const { world } = await M("world.js");
    const B = spawnBoss("hare", 1); B.x = world.anthill.x + 120; B.y = world.anthill.y - 60; B.revealT = 5;
  },
  draft: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null;
    G.run.draft = { options: (await M("mutations.js")).rollDraft(), t: 2 };
  },
  pausa: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null;
    (await M("game.js")).setPaused(true);
  },
  transicao: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); G.run.banner = null; G.run.transition = true;
  },
  fim: (won) => `async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const { G } = await M("state.js"); const { MUTATIONS } = await M("config.js");
    G.run.banner = null; G.run.status = "ended"; G.run.endT = 0; G.run.payoutDone = true;
    G.run.won = ${won};
    G.run.payout = ${won} ? { relic: 62, waveBonus: 220, killBonus: 510, mapBonus: 960, winBonus: 200, mult: 1.45, total: 2800 }
      : { relic: 42, waveBonus: 180, killBonus: 320, mapBonus: 480, winBonus: 0, mult: 1.45, total: 1500 };
    G.run.mutationLog = MUTATIONS.slice(0, 10).map((m) => Object.assign({}, m));
    G.run.kills = 1234; G.run.bestWaveThisRun = 23; G.run.mapsCleared = ${won} ? 6 : 3;
  }`,
  ninho: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 120));
    const { G } = await M("state.js"); G.run.banner = null;
    (await M("game.js")).__debug.openNest();
  },
  cutscene: async (M) => {
    window.FUMIGA.go("RUN", { mapa: 0, seed: 7 });
    await new Promise((r) => setTimeout(r, 50));
    const c = await M("cutscenes.js"); c.startCutscene("noite_branca", { force: true });
  },
};

const STATES = [
  ["TITULO", S.titulo], ["MODO", S.modo], ["ARVORE", S.arvore], ["ARVORE-DICA", S.arvoreDica],
  ["AJUDA", S.ajuda], ["PROFECIAS", S.profecias], ["MEMORIAS", S.memorias],
  ...[0, 1, 2, 3, 4].flatMap((t) => [["OPCOES-ABA" + t, S.opcoes(t, false)], ["OPCOES-ABA" + t + "-FIM", S.opcoes(t, true)]]),
  ["RUN-FAIXA", S.run, 1200], ["RUN", S.runLimpo], ["RUN-EXPANDIDO", S.runExpandido], ["RUN-FORMIGAS", S.runFormigas],
  ["RUN-TUTORIAL", S.tutorial], ["RUN-CHEFE", S.chefe], ["RUN-DRAFT", S.draft], ["RUN-PAUSA", S.pausa],
  ["RUN-TRANSICAO", S.transicao], ["RUN-DERROTA", S.fim(false)], ["RUN-VITORIA", S.fim(true)],
  ["NINHO", S.ninho], ["CUTSCENE", S.cutscene, 2600],
];
// fonte grande (acessibilidade) nas telas que mais têm texto
const BIG = new Set(["TITULO", "AJUDA", "MODO", "OPCOES-ABA0", "OPCOES-ABA3", "RUN", "RUN-EXPANDIDO", "RUN-PAUSA", "RUN-DRAFT", "RUN-DERROTA", "NINHO", "MEMORIAS", "PROFECIAS", "RUN-TUTORIAL"]);

fs.mkdirSync(OUT, { recursive: true });
const server = process.env.BASE_URL ? null : await startServer();
const BASE = (process.env.BASE_URL || server.url).replace(/\/$/, "");
const browser = await launchBrowser();
const all = [];
const t0 = Date.now();

for (const profile of profiles) {
  for (const big of [false, true]) {
    for (const [name, fn, waitMs] of STATES) {
      if (big && !BIG.has(name)) continue;
      const label = name + (big ? "+FONTE" : "");
      if (only && !only.some((o) => label.startsWith(o))) continue;
      const context = await browser.newContext(profile.ctx);
      const page = await context.newPage();
      const errs = []; watchPage(page, errs);
      await page.goto(BASE + profile.path + "?debug&limpo&hud=0&essencia=4000");
      await page.waitForFunction(() => window.FUMIGA && window.FUMIGA.pronto, null, { timeout: 30000 });
      await page.evaluate(async ([src, big]) => {
        const js = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, "");
        const M = (n) => import(js + n);
        const { G } = await M("state.js");
        G.save.accessibility.bigFont = big;
        // eslint-disable-next-line no-eval
        await (0, eval)("(" + src + ")")(M);
      }, [typeof fn === "string" ? fn : fn.toString(), big]);
      await page.waitForTimeout(waitMs || 900);
      const res = await page.evaluate((dump) => {
        if (dump) window.FUMIGA_DUMP_TEXTS = true;
        return window.FUMIGA.auditarLayout();
      }, !!process.env.LAYOUT_DUMP);
      const file = path.join(OUT, profile.id + "-" + label.toLowerCase() + ".png");
      await page.screenshot({ path: file });
      for (const e of errs) res.issues.push({ tipo: "erro", msg: e });
      if (process.env.LAYOUT_DUMP && res.detalhes) {
        fs.writeFileSync(path.join(OUT, profile.id + "-" + label.toLowerCase() + ".txt"),
          res.detalhes.map((d) => [d.layer, d.text, Math.round(d.x), Math.round(d.y), Math.round(d.w), Math.round(d.h)].join("\t")).join("\n"));
      }
      all.push({ perfil: profile.id, estado: label, tela: res.tela, textos: res.textos, issues: res.issues, file });
      await context.close();
    }
  }
}
await browser.close();
if (server) await server.close();

let total = 0;
const byType = {};
for (const r of all) {
  const flag = r.issues.length ? "✗ " + r.issues.length : "ok";
  console.log(r.perfil.padEnd(7) + r.estado.padEnd(24) + flag.padEnd(6) + " (" + r.textos + " textos)");
  for (const i of r.issues) { console.log("        " + i.tipo.padEnd(9) + " " + i.msg); byType[i.tipo] = (byType[i.tipo] || 0) + 1; total++; }
}
fs.writeFileSync(path.join(OUT, "layout.json"), JSON.stringify(all, null, 2));
console.log("\ncapturas + layout.json em " + OUT + " (" + ((Date.now() - t0) / 1000).toFixed(0) + "s) · " + all.length + " estados");
console.log(total ? "✗ " + total + " PROBLEMAS DE LAYOUT " + JSON.stringify(byType) : "✓ LAYOUT LIMPO — nada sobreposto, vazando ou coberto");
process.exit(total ? 1 : 0);
