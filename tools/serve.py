#!/usr/bin/env python3
# tools/serve.py — Servidor estático (tooling em Python, fora do core do jogo).
#
# O TDD prescreve o JOGO em Vanilla ES6 + HTML5 + CSS3; o servidor de dev não
# faz parte dessa stack, então vive aqui em Python padrão (zero dependências).
#
# Características:
# - EXATAMENTE UMA porta (padrão 3000, ou $PORT) -> um único preview.
# - Bind dual-stack '::' (IPv6 + IPv4-mapped); fallback 0.0.0.0 sem IPv6.
# - Log de cada requisição; /healthz p/ health-checks; HEAD e OPTIONS (CORS).
# - Encerramento gracioso em SIGTERM/SIGINT.
#
# Uso: python3 tools/serve.py [porta]

import mimetypes
import os
import signal
import socket
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn, TCPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_INDEX = os.path.join(ROOT, 'dist', 'index.html')

MIME_EXTRA = {
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.frag': 'text/plain; charset=utf-8',
    '.vert': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # --- MIME à prova de sistema (o .js PRECISA ser text/javascript p/ ES modules)
    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in MIME_EXTRA:
            return MIME_EXTRA[ext]
        return super().guess_type(path)

    # --- CORS + no-cache em todas as respostas (embedding em iframe do preview
    #     exige ausência de X-Frame-Options/CSP — nunca adicionar aqui).
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # --- Health-check p/ proxies da plataforma
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/healthz':
            body = b'ok\n'
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/':
            # Preview serve o BUNDLE de arquivo único (dist/index.html).
            # Sem bundle (build falhou), cai para o dev (index.html + ES modules).
            if os.path.isfile(DIST_INDEX):
                self.path = '/dist/index.html'
        super().do_GET()

    def do_HEAD(self):
        path = self.path.split('?')[0]
        if path == '/healthz':
            body = b'ok\n'
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            return
        if path == '/':
            if os.path.isfile(DIST_INDEX):
                self.path = '/dist/index.html'
        super().do_HEAD()

    # --- CORS preflight
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        self.send_header('Content-Length', '0')
        self.end_headers()

    # --- Log de cada requisição (prova de tráfego do preview)
    def log_message(self, fmt, *args):
        sys.stdout.write(f'[FUMIGA] {self.address_string()} {fmt % args}\n')
        sys.stdout.flush()


class Server(ThreadingMixIn, TCPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, addr, handler):
        if addr[0] == '::':
            self.address_family = socket.AF_INET6
        super().__init__(addr, handler)

    def server_bind(self):
        if self.address_family == socket.AF_INET6:
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except OSError:
                pass
        super().server_bind()


def main():
    arg = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    port = arg or int(os.environ.get('PORT') or 3000)

    # Compila o bundle de arquivo único (dist/index.html) antes de servir.
    try:
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_dist.py')],
                           capture_output=True, text=True, timeout=60)
        sys.stdout.write(r.stdout.strip() + '\n')
        if r.returncode != 0:
            sys.stdout.write('[FUMIGA] build do bundle FALHOU — servindo dev (ES modules):\n'
                             + r.stderr.strip() + '\n')
            sys.stdout.flush()
    except Exception as e:  # noqa: BLE001 — resilience: preview > build perfeita
        sys.stdout.write(f'[FUMIGA] build indisponível ({e}) — servindo dev\n')
        sys.stdout.flush()

    try:
        httpd = Server(('::', port), Handler)
        stack = ':: dual-stack IPv4+IPv6'
    except OSError:
        httpd = Server(('0.0.0.0', port), Handler)
        stack = '0.0.0.0 IPv4'

    def shutdown(sig, _frame):
        sys.stdout.write(f'[FUMIGA] recebido {sig}, encerrando graciosamente...\n')
        sys.stdout.flush()
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    print(f'[FUMIGA] Servindo {ROOT}')
    print(f'[FUMIGA] http://localhost:{port}  (bind {stack}) — porta única: preview único')
    sys.stdout.flush()

    with httpd:
        httpd.serve_forever(poll_interval=0.25)


if __name__ == '__main__':
    main()
