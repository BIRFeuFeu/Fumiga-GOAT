// Roda a bateria headless inteira EM PARALELO e mostra um resumo com tempos.
// Sem dependências (Node puro). Cada teste continua rodando sozinho também.
//
//   node game/test/run-all.mjs            bateria completa (a mesma do CI)
//   node game/test/run-all.mjs --quick    só os rápidos (~10 s): para iterar
//   node game/test/run-all.mjs --only=sim,tree   só os escolhidos
//   node game/test/run-all.mjs -j 2       limita processos simultâneos
//
// Os testes que precisam de navegador (inspect.mjs, lorehud-browser.mjs) ficam
// de fora: rodam com `npm run inspect` depois de tools/setup-dev.sh.
import { spawn } from "node:child_process";
import { cpus, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, "..");

// slow = fica fora do --quick. Ordem: os mais lentos primeiro (menor tempo total).
const TESTS = [
  { name: "endless", file: "endless.mjs", slow: true },
  { name: "uitest", file: "uitest.mjs", slow: true },
  { name: "mobile", file: "mobile.mjs", slow: true },
  { name: "boot", file: "boot.mjs" },
  { name: "sim", file: "sim.mjs" },
  { name: "sim-chefe1", file: "sim.mjs", env: { FORCE: "1" } },
  { name: "sim-chefe3", file: "sim.mjs", env: { FORCE: "3" } },
  { name: "sim-chefe6", file: "sim.mjs", env: { FORCE: "6" } },
  { name: "layout", file: "layout.mjs" },
  { name: "assets", file: "assets.mjs" },
  { name: "stuck", file: "stuck.mjs" },
  { name: "title-parallax", file: "title-parallax.mjs" },
  { name: "lorehud", file: "lorehud.mjs" },
  { name: "tree", file: "tree.mjs" },
  { name: "treemap", file: "treemap.mjs", env: { TREEMAP_OUT: path.join(tmpdir(), "arvore-layout.png") } },
  { name: "nestmap", file: "nestmap.mjs", env: { NESTMAP_OUT: path.join(tmpdir(), "formigueiro-layout.png") } },
  { name: "attack", file: "attack.mjs" },
  { name: "prophecy", file: "prophecy.mjs" },
  { name: "docs", file: "docs.mjs" },
];

const args = process.argv.slice(2);
const quick = args.includes("--quick");
const verbose = args.includes("--verbose") || args.includes("-v");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").filter(Boolean) : null;
const jIdx = args.findIndex((a) => a === "-j" || a.startsWith("-j="));
const jobs = jIdx < 0 ? Math.max(4, cpus().length * 2)
  : Number(args[jIdx].includes("=") ? args[jIdx].split("=")[1] : args[jIdx + 1]) || 1;
const TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) || 300000;

let list = TESTS.filter((t) => !(quick && t.slow));
if (only) {
  const unknown = only.filter((n) => !TESTS.some((t) => t.name === n));
  if (unknown.length) {
    console.error("teste desconhecido: " + unknown.join(", ") + "\ndisponíveis: " + TESTS.map((t) => t.name).join(", "));
    process.exit(2);
  }
  list = TESTS.filter((t) => only.includes(t.name));
}

const t0 = Date.now();
const results = [];
const pad = (s, n) => String(s).padEnd(n);
const secs = (ms) => (ms / 1000).toFixed(1).padStart(5) + "s";

function runOne(t) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, [path.join(HERE, t.file)], {
      cwd: GAME, env: { ...process.env, ...(t.env || {}) }, stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => { out += "\n[run-all] TEMPO ESGOTADO (" + TIMEOUT_MS / 1000 + "s)"; child.kill("SIGKILL"); }, TIMEOUT_MS);
    child.on("close", (code) => {
      clearTimeout(timer);
      const r = { ...t, code, ms: Date.now() - start, out };
      const last = out.trim().split("\n").pop() || "";
      console.log((code === 0 ? "ok    " : "FALHOU") + "  " + pad(t.name, 15) + secs(r.ms) + "  " + last.slice(0, 90));
      if (verbose) console.log(out);
      results.push(r);
      resolve();
    });
  });
}

console.log("FUMIGA — " + list.length + " testes" + (quick ? " (rápidos)" : "") + ", " + Math.min(jobs, list.length) + " em paralelo\n");
const queue = [...list];
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  while (queue.length) await runOne(queue.shift());
}));

const failed = results.filter((r) => r.code !== 0);
for (const f of failed) {
  console.log("\n──── " + f.name + " (código " + f.code + ") — últimas linhas ────");
  console.log(f.out.trim().split("\n").slice(-30).join("\n"));
}
const total = Date.now() - t0;
const serial = results.reduce((a, r) => a + r.ms, 0);
console.log("\n" + (failed.length ? "✗ " + failed.length + " FALHARAM: " + failed.map((f) => f.name).join(", ")
  : "✓ TODOS OS " + results.length + " TESTES PASSARAM") +
  "  —  " + (total / 1000).toFixed(1) + "s (em série seriam " + (serial / 1000).toFixed(1) + "s)");
process.exit(failed.length ? 1 : 0);
