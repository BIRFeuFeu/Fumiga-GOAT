#!/usr/bin/env python3
# tools/build_dist.py — Compila o BETA inteiro em UM único arquivo: dist/index.html
# ---------------------------------------------------------------------------
# Foco: preview à prova de falhas. O browser passa a precisar de apenas DUAS
# coisas: "/" (este arquivo único) e "/assets/*" (sprites/áudio/JSON do jogo).
#
# O que o bundle elimina:
# - ~35 requisições de ES Modules (e a exigência estrita de MIME text/javascript)
# - CORS/aninhamento de módulos e caches intermediários
# - Qualquer dependência de resolução de grafos pelo browser (ordem pré-computada)
#
# Como: ordenação topológica do grafo de imports (js/main.js como entrada),
# remoção de `import ... from`/`export ` e concatenação em um IIFE estrito,
# junto do Phaser (vendor) e do CSS. Assets continuam em /assets (verificados
# 200 + MIME correto pelo servidor). O jogo segue 100% conforme o TDD; isto é
# apenas a camada de empacotamento para entrega.
#
# Uso: python3 tools/build_dist.py   (idempotente; chamado pelo serve.py)

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = 'js/main.js'
OUT_DIR = os.path.join(ROOT, 'dist')
OUT_FILE = os.path.join(OUT_DIR, 'index.html')

IMPORT_RE = re.compile(
    r"^\s*import\s+(?:[^'\"]+?\s+from\s+)?['\"]([^'\"]+)['\"]\s*;?\s*$", re.M)
EXPORT_DECL_RE = re.compile(r"^(\s*)export\s+(?=(?:async\s+)?(?:class|function|const|let|var)\b)", re.M)
EXPORT_BRACE_RE = re.compile(r"^\s*export\s*\{[^}]*\}\s*;?\s*$", re.M)
# import('../systems/WebGLShaders.js').then(({ registerChromaKey }) => BODY)
#   -> Promise.resolve({ registerChromaKey }).then(({ registerChromaKey }) => BODY)
DYNAMIC_RE = re.compile(r"import\(\s*['\"]([^'\"]+)['\"]\s*\)")


def resolve(from_file, spec):
    """Resolve um import relativo './x.js' a partir de from_file."""
    base = os.path.dirname(from_file)
    p = os.path.normpath(os.path.join(base, spec))
    if not os.path.isfile(os.path.join(ROOT, p)):
        raise SystemExit(f"[build] import não resolvido: {spec} (em {from_file})")
    return p.replace(os.sep, '/')


def collect(entry):
    """DFS pós-ordem: dependências primeiro; rejeita ciclos."""
    order, state = [], {}  # state: 1=em pilha, 2=ok

    def visit(f):
        if state.get(f) == 2:
            return
        if state.get(f) == 1:
            raise SystemExit(f"[build] ciclo de imports envolvendo {f}")
        state[f] = 1
        src = read(f)
        specs = list(IMPORT_RE.findall(src)) + list(DYNAMIC_RE.findall(src))
        for spec in specs:
            if not spec.startswith('.'):
                continue  # vendor/global (Phaser) é externo
            visit(resolve(f, spec))
        state[f] = 2
        order.append(f)

    visit(entry)
    return order


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as fh:
        return fh.read()


def strip_module_syntax(src, rel):
    src = EXPORT_DECL_RE.sub(r"\1", src)
    src = EXPORT_BRACE_RE.sub("", src)
    # Preserva aliases `import { X as Y }` → `const Y = X;` (topo-ordenado já garante X definido)
    # Detecta imports nomeados com `as` antes de removê-los.
    alias_re = re.compile(r"^\s*import\s*\{([^}]+)\}\s*from\s*['\"][^'\"]+['\"]\s*;?\s*$", re.M)
    aliases = []
    for m in alias_re.finditer(src):
        inner = m.group(1)
        for part in inner.split(','):
            part = part.strip()
            if ' as ' in part:
                orig, alias = [p.strip() for p in part.split(' as ', 1)]
                if orig != alias:
                    aliases.append(f"const {alias} = {orig};")
    src = IMPORT_RE.sub("", src)  # imports relativos e globais somem (topo-ordenados)
    if aliases:
        # Injeta aliases logo no topo do módulo (após remoção, mas antes do código)
        src = "\n".join(aliases) + "\n" + src

    def dyn(m):
        target = resolve(rel, m.group(1))
        if target != 'js/systems/WebGLShaders.js':
            raise SystemExit(
                f"[build] import dinâmico não suportado no bundle: {m.group(1)} (em {rel})")
        return "Promise.resolve({ registerChromaKey })"

    src = DYNAMIC_RE.sub(dyn, src)
    return src


HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0b0705">
<meta name="description" content="FUMIGA — Roguelite / Colony-Sim. Escave, colete, mute e sobreviva.">
<title>FUMIGA — Beta</title>
<link rel="icon" href="assets/ui/favicon.svg" type="image/svg+xml">
<style>
__CSS__
</style>
</head>
<body>
    <div id="game-container"></div>
    <div id="tactical-vignette"></div>
    <div id="damage-flash"></div>

    <div id="boot-splash">
        <div class="title">FUMIGA</div>
        <div class="bar"><i></i></div>
        <div class="hint">CARREGANDO ENGINE…</div>
    </div>

    <pre id="boot-errors" hidden></pre>
    <script>
    (function () {
        'use strict';
        var box = document.getElementById('boot-errors');
        function show(msg) {
            if (!box) return;
            box.hidden = false;
            box.textContent += msg + '\\n';
        }
        window.addEventListener('error', function (e) {
            show('[ERRO] ' + (e.message || e.error) +
                 (e.filename ? '\\n  em ' + e.filename + ':' + (e.lineno || '?') : ''));
        });
        window.addEventListener('unhandledrejection', function (e) {
            var r = e.reason;
            show('[PROMISE] ' + (r && (r.stack || r.message) || r));
        });
        // Watchdog: se a engine não subiu, diz na tela (não fica preto sem pistas)
        // Aumentado para 30s para dispositivos lentos (1.5MB bundle + 56 assets)
        setTimeout(function () {
            if (!window.__FUMIGA__) {
                show('[WATCHDOG] A engine não inicializou em 30s. ' +
                     'Se o erro acima estiver vazio, o carregamento de /assets/* ' +
                     'pode estar bloqueado pela rede ou o dispositivo está lento. ' +
                     'Tente recarregar ou limpar o cache. (build ' + new Date().toISOString().slice(0,10) + ')');
            }
        }, 30000);
    })();
    </script>

    <noscript>
        <div id="no-js">FUMIGA precisa de JavaScript habilitado.</div>
    </noscript>

    <!-- ===== Phaser 3 (vendor, UMD) — inline: zero requisições de script ===== -->
    <script>__PHASER__</script>
    <!-- ===== FUMIGA — bundle dos módulos do jogo (gerado por tools/build_dist.py) ===== -->
    <script>(function(){'use strict';
__BUNDLE__
})();</script>
</body>
</html>
"""


def detect_collisions(order):
    """Nomes declarados no top-level de 2+ módulos quebrariam o bundle plano."""
    decl_re = re.compile(
        r"^(?:export\s+)?(?:async\s+)?(class|function|const|let|var)\s+([A-Za-z_$][\w$]*)", re.M)
    seen = {}
    collisions = {}
    for rel in order:
        for m in decl_re.finditer(read(rel)):
            if m.start() == 0 or read(rel)[m.start() - 1] == '\n':
                name = m.group(2)
                if name in seen and seen[name] != rel:
                    collisions.setdefault(name, {seen[name]}).add(rel)
                seen[name] = rel
    if collisions:
        detail = '; '.join(f"{n}: {', '.join(v)}" for n, v in collisions.items())
        raise SystemExit(f"[build] colisão de nomes top-level no bundle — {detail}\n"
                         f"Renomeie em um dos módulos (padrão: sufixo descritivo).")


def main():
    order = collect(ENTRY)
    detect_collisions(order)

    parts = []
    for rel in order:
        code = strip_module_syntax(read(rel), rel)
        banner = f"\n/* ======== {rel} ======== */\n"
        parts.append(banner + code.strip('\n') + "\n")
    bundle = ''.join(parts)

    # Sanidade: nada de sintaxe de módulo pode sobrar
    if re.search(r"^\s*import\s", bundle, re.M) or re.search(r"^\s*export\s", bundle, re.M):
        raise SystemExit("[build] sintaxe de módulo sobrevivente no bundle")

    phaser = read('vendor/phaser.min.js')
    css = read('css/style.css')
    # `</script>` dentro de strings JS quebraria o inline — não deve existir:
    for name, blob in (('bundle', bundle), ('phaser', phaser)):
        if '</script' in blob.lower():
            raise SystemExit(f"[build] '</script' encontrado no {name} — inline inseguro")

    html = (HTML
            .replace('__CSS__', css)
            .replace('__PHASER__', phaser)
            .replace('__BUNDLE__', bundle))

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        fh.write(html)

    kb = os.path.getsize(OUT_FILE) // 1024
    print(f"[FUMIGA build] dist/index.html gerado: {kb} KB, "
          f"{len(order)} módulos em ordem topológica (entrada: {ENTRY})")


if __name__ == '__main__':
    sys.exit(main())
