// Servidor estático mínimo do repositório, SEM CACHE (Node puro).
//
// Por que não `python3 -m http.server`: ele manda Last-Modified e o navegador
// guarda módulos ES em cache — depois de editar um .js o preview continuava
// rodando a versão velha. Aqui toda resposta sai com Cache-Control: no-store.
//
//   node game/test/lib/server.mjs            -> 0.0.0.0:8000 (preview)
//   node game/test/lib/server.mjs 8080       -> outra porta
//   import { startServer } from "./lib/server.mjs"  (testes: porta livre, 127.0.0.1)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
  ".woff2": "font/woff2", ".ttf": "font/ttf",
};

/** Sobe o servidor. Resolve com { url, port, close }. port 0 = porta livre. */
export function startServer({ root = REPO, port = 0, host = "127.0.0.1", quiet = true } = {}) {
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { res.writeHead(400).end("bad url"); return; }
    let file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403).end("forbidden"); return; }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        if (!rel.endsWith("/")) { res.writeHead(301, { Location: rel + "/" }).end(); return; }
        file = path.join(file, "index.html");
      }
      fs.readFile(file, (err2, data) => {
        if (!quiet) console.log((err2 ? 404 : 200) + " " + req.url);
        if (err2) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404 " + rel); return; }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        res.end(data);
      });
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const p = server.address().port;
      resolve({ url: "http://" + (host === "0.0.0.0" ? "127.0.0.1" : host) + ":" + p, port: p,
        close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

// uso direto pela linha de comando: servidor do preview
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 8000;
  const s = await startServer({ port, host: "0.0.0.0", quiet: !process.argv.includes("--log") });
  console.log("FUMIGA servindo " + REPO + " em 0.0.0.0:" + s.port + " (sem cache) — jogo em /game/ · mobile em /game/mobile/");
}
