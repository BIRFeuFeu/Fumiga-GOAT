/**
 * tools/serve.mjs — Servidor estático zero-dependência para o beta web.
 *
 * Necessário porque o jogo usa ES6 Modules (`<script type="module">`),
 * que o protocolo file:// bloqueia por CORS.
 *
 * Bind em 0.0.0.0 (obrigatório para preview remoto / testes no celular).
 *
 * Uso:  node tools/serve.mjs [porta]      (padrão: 8080)
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || process.argv[2] || 8080);
const HOST = '0.0.0.0';

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

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let rel = decodeURIComponent(url.pathname);
        if (rel.endsWith('/')) rel += 'index.html';

        const filePath = path.join(ROOT, rel);
        // Proteção contra path traversal
        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403).end('Forbidden');
            return;
        }

        const info = await stat(filePath).catch(() => null);
        if (!info || !info.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 Not Found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': info.size,
            'Cache-Control': 'no-cache'
        });
        createReadStream(filePath).pipe(res);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' }).end('500 ' + err.message);
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[FUMIGA] Servindo ${ROOT}`);
    console.log(`[FUMIGA] http://localhost:${PORT}  (bind ${HOST})`);
});
