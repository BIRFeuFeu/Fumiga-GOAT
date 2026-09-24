// Abre um Chromium headless para os testes de navegador (inspect.mjs,
// lorehud-browser.mjs). Ferramenta de desenvolvimento: nada disso vai para o jogo.
//
// Onde procura o navegador, nesta ordem:
//   1. CHROMIUM_PATH (+ CHROMIUM_LIBS opcional, pasta de .so extras)
//   2. o Chromium preparado por tools/setup-dev.sh em ~/.cache/fumiga-dev
//      (rota para sandboxes onde o download padrão do Playwright é bloqueado)
//   3. o navegador padrão do Playwright (`npx playwright install chromium`, ex.: CI)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEV_CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "fumiga-dev");

export async function launchBrowser() {
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch {
    console.error("Playwright não está instalado. Rode primeiro:  bash tools/setup-dev.sh");
    process.exit(3);
  }
  let exe = process.env.CHROMIUM_PATH || null;
  let libs = process.env.CHROMIUM_LIBS || null;
  if (!exe && fs.existsSync(path.join(DEV_CACHE, "chromium"))) {
    exe = path.join(DEV_CACHE, "chromium");
    libs = libs || path.join(DEV_CACHE, "al2023", "lib");
  }
  const env = { ...process.env };
  const fontsConf = path.join(DEV_CACHE, "fonts.conf");
  if (exe && exe.startsWith(DEV_CACHE) && !env.FONTCONFIG_FILE && fs.existsSync(fontsConf)) env.FONTCONFIG_FILE = fontsConf;
  if (libs) env.LD_LIBRARY_PATH = libs + (env.LD_LIBRARY_PATH ? ":" + env.LD_LIBRARY_PATH : "");
  try {
    return await chromium.launch({
      executablePath: exe || undefined, env, headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--no-zygote", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
    });
  } catch (e) {
    console.error("Não consegui abrir o Chromium (" + (exe || "padrão do Playwright") + ").\n" +
      "Rode  bash tools/setup-dev.sh  e tente de novo.\n\n" + e.message.split("\n").slice(0, 6).join("\n"));
    process.exit(3);
  }
}

/** Registra erros de JS, console.error, HTTP >= 400 e falhas de rede da página. */
export function watchPage(page, sink) {
  page.on("pageerror", (e) => sink.push("JS: " + (e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") sink.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) sink.push("HTTP " + r.status() + ": " + r.url()); });
  page.on("requestfailed", (r) => {
    const why = r.failure() ? r.failure().errorText : "";
    if (!/ERR_ABORTED/.test(why)) sink.push("rede: " + r.url() + " " + why);
  });
}
