/**
 * tools/serve.mjs — Servidor estático zero-dependência para o beta web.
 *
 * Necessário porque o jogo usa ES6 Modules (`<script type="module">`),
 * que o protocolo file:// bloqueia por CORS.
 *
 * Características (hardened p/ preview remoto):
 * - Bind dual-stack '::' (IPv6 + IPv4-mapped na mesma porta). Bind só em
 *   '0.0.0.0' recusa conexões IPv6 — rota que proxies de preview costumam usar.
 * - EXATAMENTE UMA porta ($PORT ou 3000) -> um único preview.
 * - Log de cada requisição (prova de tráfego do preview nos logs do processo).
 * - /healthz p/ health-checks, HEAD e OPTIONS (CORS) suportados.
 * - Encerramento gracioso em SIGTERM/SIGINT (reinícios limpos na plataforma).
 *
 * Uso:  node tools/serve.mjs [porta]      (padrão: 3000)
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '::';

// EXATAMENTE UMA porta ($PORT ou 3000) -> um único preview.
const PORTS = [Number(process.env.PORT || process.argv[2] || 3000)];

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

const CORS_BASE = { 'Access-Control-Allow-Origin': '*' };
const CORS_PREFLIGHT = {
    ...CORS_BASE,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
};

async function handle(req, res) {
    const started = Date.now();
    const done = (code) =>
        console.log(`[FUMIGA] ${req.method} ${req.url} -> ${code} (${Date.now() - started}ms)`);
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Health-check para proxies/plataforma
        if (pathname === '/healthz') {
            res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', ...CORS_BASE });
            res.end('ok');
            done(200);
            return;
        }

        // CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, CORS_PREFLIGHT);
            res.end();
            done(204);
            return;
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { 'Content-Type': 'text/plain', Allow: 'GET, HEAD, OPTIONS' });
            res.end('405 Method Not Allowed');
            done(405);
            return;
        }

        let rel = decodeURIComponent(pathname);
        if (rel.endsWith('/')) rel += 'index.html';

        const filePath = path.join(ROOT, rel);
        // Proteção contra path traversal (mais rigorosa que startsWith)
        const relPath = path.relative(ROOT, filePath);
        if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' }).end('Forbidden');
            done(403);
            return;
        }

        const info = await stat(filePath).catch(() => null);
        if (!info || !info.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found');
            done(404);
            return;
        }

        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': info.size,
            'Cache-Control': 'no-cache',
            // Embedding em iframe (preview da plataforma) exige ausência de
            // X-Frame-Options/CSP — nunca adicionar aqui.
            ...CORS_BASE
        });
        done(200);
        if (req.method === 'HEAD') { res.end(); return; }
        const stream = createReadStream(filePath);
        stream.on('error', () => { try { res.destroy(); } catch { /* ignora */ } });
        stream.pipe(res);
    } catch (err) {
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 ' + err.message);
        done(500);
    }
}

const servers = [];
for (const port of PORTS) {
    // Sequencial: garante que 3000 seja a primeira porta bindada.
    await new Promise((resolve) => {
        const server = http.createServer(handle);
        server.on('error', (e) => {
            console.log(`[FUMIGA] porta ${port} indisponível: ${e.message}`);
            resolve();
        });
        // Proxies podem abortar conexões no meio da resposta — não derrubar o processo.
        server.on('clientError', (err, socket) => {
            try { socket.destroy(); } catch { /* ignora */ }
        });
        server.on('connection', (socket) => {
            socket.on('error', () => { /* ignora ECONNRESET/EPIPE de clientes */ });
        });
        server.listen(port, HOST, () => {
            console.log(`[FUMIGA] http://localhost:${port}  (bind ${HOST}, dual-stack IPv4+IPv6)`);
            servers.push(server);
            resolve();
        });
    });
}
console.log(`[FUMIGA] Servindo ${ROOT} nas portas: ${servers.map((s) => s.address().port).join(', ')}`);

let closing = false;
function shutdown(sig) {
    if (closing) return;
    closing = true;
    console.log(`[FUMIGA] recebido ${sig}, encerrando graciosamente...`);
    for (const s of servers) { try { s.close(); } catch { /* ignora */ } }
    setTimeout(() => process.exit(0), 250).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
