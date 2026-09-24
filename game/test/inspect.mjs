// INSPEÇÃO NO NAVEGADOR — a Regra 4 automatizada: abre o jogo num Chromium de
// verdade (PC e mobile), passa por todas as telas e pelos 6 mapas, e acusa
// erros de JS, arquivos 404, glifos que viram "?" e queda de desempenho.
// As capturas ficam FORA do Git para revisão visual.
//
//   bash tools/setup-dev.sh            (uma vez por sessão)
//   node game/test/inspect.mjs         PC + mobile, tudo  (= npm run inspect)
//   node game/test/inspect.mjs --pc    só PC   ·  --mobile  só mobile
//   node game/test/inspect.mjs --telas=TREE,RUN   só algumas cenas
//   INSPECT_OUT=/outra/pasta  ·  BASE_URL=http://host:porta (servidor externo)
//
// Usa o modo debug (?debug, save isolado) para pular os menus; a cena
// "novo-jogador" entra SEM debug, como alguém abrindo o jogo pela primeira vez.
import fs from "node:fs";
import path from "node:path";
import { startServer } from "./lib/server.mjs";
import { launchBrowser, watchPage } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const OUT = process.env.INSPECT_OUT || "/tmp/fumiga-inspect";
const telasArg = args.find((a) => a.startsWith("--telas="));
const onlyScenes = telasArg ? telasArg.slice(8).toUpperCase().split(",") : null;
const profiles = [
  { id: "pc", path: "/game/", ctx: { viewport: { width: 1280, height: 720 } } },
  { id: "mobile", path: "/game/mobile/", ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
].filter((p) => !(args.includes("--pc") && p.id !== "pc") && !(args.includes("--mobile") && p.id !== "mobile"));

// cenas via modo debug: [nome do arquivo, parâmetros da URL]
const SCENES = [
  ["TITLE", "tela=TITLE"], ["MODE", "tela=MODE"], ["TREE", "tela=TREE&essencia=4000"],
  ["OPTIONS", "tela=OPTIONS"], ["HELP", "tela=HELP"], ["PROPHECY", "tela=PROPHECY"], ["MEMORY", "tela=MEMORY"],
  ["NINHO", "tela=NINHO&seed=7"],
  ...[1, 2, 3, 4, 5, 6].map((m) => ["RUN-MAPA" + m, "tela=RUN&mapa=" + m + "&seed=" + (100 + m) + "&invencivel"]),
];

fs.mkdirSync(OUT, { recursive: true });
const server = process.env.BASE_URL ? null : await startServer();
const BASE = (process.env.BASE_URL || server.url).replace(/\/$/, "");
const browser = await launchBrowser();
const report = [];
const problems = [];
const t0 = Date.now();

async function waitReady(page, debug) {
  await page.waitForFunction(async (dbg) => {
    // resolve pelo <script> do main.js: vale para /game/ e /game/mobile/
    const js = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, "");
    const { G } = await import(js + "state.js");
    return G.screen !== "BOOT" && (!dbg || (window.FUMIGA && window.FUMIGA.pronto));
  }, debug, { timeout: 30000, polling: 100 });
}

/** Mede frames reais por 2 s: fps médio e pior intervalo (ms). */
function measure(page) {
  return page.evaluate(() => new Promise((res) => {
    const iv = []; let last = 0; const start = performance.now();
    function f(t) { if (last) iv.push(t - last); last = t; if (t - start < 2000) requestAnimationFrame(f); else res(iv); }
    requestAnimationFrame(f);
  }).then((iv) => ({ fps: +(1000 / (iv.reduce((a, b) => a + b, 0) / iv.length)).toFixed(1), piorMs: +Math.max(...iv).toFixed(1) })));
}

async function tapOrClick(page, profile, x, y) {
  const box = await page.locator("canvas#game").boundingBox();
  const px = box.x + x * box.width / 960, py = box.y + y * box.height / 540;
  if (profile.ctx.hasTouch) await page.touchscreen.tap(px, py); else await page.mouse.click(px, py);
  await page.waitForTimeout(1000);
}

for (const profile of profiles) {
  // ----------------------------------------------- 1. novo jogador (sem debug)
  if (!onlyScenes || onlyScenes.includes("NOVO")) {
    const context = await browser.newContext(profile.ctx);
    const page = await context.newPage();
    const errs = []; watchPage(page, errs);
    let bytes = 0;
    page.on("response", async (r) => { try { bytes += (await r.body()).length; } catch { /* redirect */ } });
    const start = Date.now();
    await page.goto(BASE + profile.path);
    await waitReady(page, false);
    const bootMs = Date.now() - start;
    await page.waitForTimeout(800);
    const file = path.join(OUT, profile.id + "-novo-jogador.png");
    await page.screenshot({ path: file });
    const bootMB = bytes / 1e6;
    // primeiro toque: PRETITLE -> TITLE (o mesmo gesto nas duas versões)
    await tapOrClick(page, profile, 480, 270);
    const screen = await page.evaluate(async () => {
      const js = document.querySelector('script[src*="main.js"]').src.replace(/main\.js.*$/, "");
      return (await import(js + "state.js")).G.screen;
    });
    if (screen !== "TITLE") errs.push("primeiro toque não levou ao TITLE (ficou em " + screen + ")");
    await page.screenshot({ path: path.join(OUT, profile.id + "-novo-jogador-title.png") });
    report.push({ perfil: profile.id, cena: "novo-jogador", ok: !errs.length, bootMs, MB: +bootMB.toFixed(2), erros: errs });
    await context.close();
  }

  // ----------------------------------------------- 2. cada tela via modo debug
  for (const [name, params] of SCENES) {
    if (onlyScenes && !onlyScenes.some((s) => name.startsWith(s))) continue;
    const context = await browser.newContext(profile.ctx);
    const page = await context.newPage();
    const errs = []; watchPage(page, errs);
    await page.goto(BASE + profile.path + "?debug&limpo&hud=0&" + params);
    await waitReady(page, true);
    await page.waitForTimeout(name.startsWith("RUN") || name === "NINHO" ? 1800 : 700);
    const perf = name.startsWith("RUN") ? await measure(page) : null;
    const st = await page.evaluate(() => window.FUMIGA.estado());
    const file = path.join(OUT, profile.id + "-" + name.toLowerCase() + ".png");
    await page.screenshot({ path: file });
    const expected = name.startsWith("RUN") || name === "NINHO" ? "RUN" : name;
    if (st.tela !== expected) errs.push("esperava a tela " + expected + ", está em " + st.tela);
    for (const g of st.glifosFaltando) errs.push("glifo fora do atlas (vira ?): " + g);
    for (const e of st.erros) errs.push("erro capturado: " + e);
    report.push({ perfil: profile.id, cena: name, ok: !errs.length, ...(perf || {}), cpuMs: st.trabalhoMs,
      entidades: st.tela === "RUN" ? st.aliadas + st.inimigas + st.particulas : undefined, erros: errs });
    await context.close();
  }
}

await browser.close();
if (server) await server.close();

// ------------------------------------------------------------------ relatório
const pad = (s, n) => String(s ?? "").padEnd(n);
console.log("FUMIGA — inspeção no navegador (" + BASE + ")\n");
console.log(pad("perfil", 8) + pad("cena", 16) + pad("status", 8) + "detalhes");
for (const r of report) {
  const det = r.cena === "novo-jogador"
    ? "boot " + r.bootMs + "ms · " + r.MB + " MB baixados"
    : (r.fps != null ? r.fps + " fps · pior frame " + r.piorMs + "ms · cpu " + r.cpuMs + "ms/frame · " + r.entidades + " entidades" : "");
  console.log(pad(r.perfil, 8) + pad(r.cena, 16) + pad(r.ok ? "ok" : "ERRO", 8) + det);
  for (const e of r.erros) { console.log("        └ " + e); problems.push(r.perfil + "/" + r.cena + ": " + e); }
}
fs.writeFileSync(path.join(OUT, "relatorio.json"), JSON.stringify(report, null, 2));
console.log("\ncapturas + relatorio.json em " + OUT + "  (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
console.log(problems.length ? "✗ INSPEÇÃO ACHOU " + problems.length + " PROBLEMA(S)" : "✓ INSPEÇÃO NO NAVEGADOR OK — nenhum erro de JS, 404 ou glifo faltando");
process.exit(problems.length ? 1 : 0);
