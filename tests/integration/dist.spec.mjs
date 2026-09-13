/**
 * Teste de integração do BUNDLE de produção (dist/index.html):
 *  1) Roda tools/build_dist.py (o mesmo passo que o serve.py executa no boot).
 *  2) Valida o HTML gerado: 3 scripts inline (watchdog, engine, bundle do jogo),
 *     cenas presentes, sem imports sobrando, tamanho sadio.
 *  3) BOOTA o bundle de verdade: jsdom com shim de canvas 2D (@napi-rs/canvas),
 *     scripts executados NA JANELA (window.eval — this = window, como no
 *     browser). Espera window.__FUMIGA__ (Game criada por js/main.js), cena
 *     Boot registrada/ativa e zero erros de runtime.
 *
 * Se este teste passa, o preview serve uma página que inicializa a engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ---------- 1) build ----------
execFileSync('python3', [path.join(ROOT, 'tools', 'build_dist.py')], { cwd: ROOT });
const html = readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');

test('bundle: HTML único contém Phaser, cenas e nenhum import/export', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.equal(scripts.length, 3, 'exatamente 3 scripts inline (watchdog, engine, bundle)');
    assert.ok(scripts[1].length > 500000, '2º script é a engine Phaser inline');
    for (const scene of ['class BootScene', 'class PreloadScene', 'class MainMenuScene', 'class GameScene', 'class UIScene']) {
        assert.ok(html.includes(scene), `contém ${scene}`);
    }
    assert.ok(html.includes('new Phaser.Game'), 'bootstrap da Game presente');
    const tail = html.split('/* ======== js/main.js')[1] || '';
    assert.ok(!/^\s*import\s/m.test(tail), 'main.js sem imports não resolvidos');
    assert.ok(html.length < 4 * 1024 * 1024, 'bundle abaixo de 4MB');
});

// ---------- 2) boot real do bundle ----------
test('bundle: dist/index.html boota a engine headless (window.__FUMIGA__ + TitleScene/Menu)', async () => {
    const { JSDOM, ResourceLoader } = require('jsdom');
    const napiCanvas = require('@napi-rs/canvas');
    const fs = require('node:fs');

    // ResourceLoader que serve os assets DO REPOSITÓRIO — o jsdom passa a
    // carregar XHRs (manifest.json, sprites, áudio) como o browser no preview.
    class RepoLoader extends ResourceLoader {
        fetch(url, options) {
            const u = new URL(url, 'http://localhost/');
            const rel = decodeURIComponent(u.pathname);
            const abs = path.join(ROOT, rel);
            if (!abs.startsWith(ROOT)) return Promise.reject(new Error('fora da raiz'));
            try {
                return Promise.resolve(fs.readFileSync(abs));
            } catch (e) {
                return Promise.reject(new Error('404 ' + rel));
            }
        }
    }

    const dom = new JSDOM(html, {
        url: 'http://localhost:3000/',
        resources: new RepoLoader(),
        pretendToBeVisual: true,
        runScripts: 'outside-only'
    });
    const { window } = dom;
    if (!window.CanvasRenderingContext2D) window.CanvasRenderingContext2D = class {};

    // shim de canvas 2D real p/ os device-checks e renders do Phaser
    const origCreate = window.document.createElement.bind(window.document);
    window.document.createElement = function (tag) {
        const el = origCreate(tag);
        if (String(tag).toLowerCase() === 'canvas') {
            const backing = napiCanvas.createCanvas(8, 8);
            el.getContext = function () {
                backing.width = el.width || 8;
                backing.height = el.height || 8;
                const ctx = backing.getContext('2d');
                // Phaser usa ctx.canvas (deve ser o ELEMENTO jsdom, não o backing)
                try {
                    Object.defineProperty(ctx, 'canvas', { get: () => el, configurable: true });
                } catch (e) { /* ignora */ }
                // drawImage/createPattern do napi rejeitam fontes do jsdom (Image /
                // canvas element). No headless o raster final é irrelevante —
                // degrada para no-op apenas nessas chamadas.
                for (const m of ['drawImage', 'createPattern']) {
                    const raw = ctx[m] ? ctx[m].bind(ctx) : null;
                    if (!raw) continue;
                    ctx[m] = function (src, ...rest) {
                        try {
                            return raw(src, ...rest);
                        } catch (e) {
                            return null; // fonte não-napi: ignorado no headless
                        }
                    };
                }
                return ctx;
            };
            Object.defineProperty(el, 'width', { get: () => backing.width, set: (v) => { backing.width = v; } });
            Object.defineProperty(el, 'height', { get: () => backing.height, set: (v) => { backing.height = v; } });
            el.toDataURL = () => backing.toDataURL();
        }
        return el;
    };

    const asyncErrors = [];
    window.addEventListener('error', (e) => asyncErrors.push(String(e.message || e)));

    // ---- emulação de blob: URLs (o ImageFile do Phaser dá XHR nos bytes do
    // PNG e aponta image.src p/ um blob; browser real tem URL.createObjectURL,
    // jsdom não). Registry + decodificação do IHDR p/ width/height reais.
    const blobStore = new Map();
    let blobId = 0;
    window.URL.createObjectURL = function (blob) {
        const id = `blob:fumiga-${++blobId}`;
        blobStore.set(id, blob);
        return id;
    };
    window.URL.revokeObjectURL = function (id) { blobStore.delete(id); };

    function pngSize(buf) {
        // assinatura PNG (8) + IHDR len/type (8) -> width@16, height@20
        if (buf && buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
            return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
        }
        return { w: 32, h: 32 };
    }

    // jsdom não dispara load p/ data: nem blob: — o Image simula o browser:
    // decodifica (quando possível) e dispara onload assíncrono.
    const NativeImage = window.Image;
    const srcDesc = Object.getOwnPropertyDescriptor(NativeImage.prototype, 'src');
    window.Image = function () {
        const img = new NativeImage();
        let fired = false;
        Object.defineProperty(img, 'src', {
            set(v) {
                srcDesc.set.call(img, v);
                const s = String(v);
                if (fired || !(s.startsWith('data:') || s.startsWith('blob:'))) return;
                fired = true;
                const finish = (w, h) => {
                    try {
                        Object.defineProperty(img, 'naturalWidth', { value: w, configurable: true });
                        Object.defineProperty(img, 'naturalHeight', { value: h, configurable: true });
                        Object.defineProperty(img, 'width', { value: w, configurable: true });
                        Object.defineProperty(img, 'height', { value: h, configurable: true });
                    } catch (e) { /* ignora */ }
                    setTimeout(() => { if (typeof img.onload === 'function') img.onload(); }, 0);
                };
                if (s.startsWith('blob:')) {
                    const blob = blobStore.get(s);
                    if (blob && blob.arrayBuffer) {
                        blob.arrayBuffer().then((ab) => {
                            const { w, h } = pngSize(Buffer.from(ab));
                            finish(w, h);
                        }).catch(() => finish(32, 32));
                        return;
                    }
                }
                finish(2, 2); // data: URL (texturas base do Phaser, 2x2)
            },
            get() { return srcDesc.get.call(img); }
        });
        return img;
    };
    window.Image.prototype = NativeImage.prototype;

    const scripts = [...window.document.querySelectorAll('script')];
    const srcs = scripts.map((s) => s.textContent);
    assert.ok(srcs[1].length > 500000, '2º script é a engine inline');
    assert.ok(srcs[2].includes('new Phaser.Game'), '3º script é o bundle do jogo');

    // Executa os <script> inline NA JANELA do jsdom (this = window, globals de
    // browser nativos) — mesmo efeito das tags <script> no browser do preview.
    window.eval(srcs[1]); // engine (UMD -> window.Phaser)
    assert.ok(window.Phaser, 'window.Phaser definido pela engine');
    window.eval(srcs[2]); // bundle FUMIGA (new Phaser.Game + cenas)

    // Tempo p/ o pipeline completo: READY -> BootScene -> PreloadScene (XHR de
    // todos os assets via RepoLoader) -> TitleScene (tela de título).
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100));
        const g = window.__FUMIGA__;
        const keys = g ? g.scene.getScenes(true).map((s) => s.scene.key) : [];
        if (keys.includes('TitleScene')) break;
    }

    const game = window.__FUMIGA__;
    const active = game ? game.scene.getScenes(true).map((s) => s.scene.key) : [];
    const registered = game ? game.scene.getScenes(false).map((s) => s.scene.key) : [];

    assert.ok(game, 'window.__FUMIGA__ definido (Game instanciada pelo bundle)');
    assert.ok(registered.includes('BootScene'), 'cena Boot registrada (' + registered.join(',') + ')');
    assert.ok(active.includes('TitleScene'), 'pipeline completo até TitleScene (ativo: ' + active.join(',') + ')');

    // Avança como um jogador: Title -> Menu (ARVORE REAL acessível)
    game.scene.getScene('TitleScene').scene.start('MainMenuScene');
    await new Promise((r) => setTimeout(r, 300));
    const active2 = game.scene.getScenes(true).map((s) => s.scene.key);
    assert.ok(active2.includes('MainMenuScene'), 'Title -> MainMenu funciona (ativo: ' + active2.join(',') + ')');

    // Menu -> Árvore Real (novo botão) e Loading de bioma existem
    assert.ok(game.scene.getScene('SkillTreeScene'), 'SkillTreeScene registrada (botão ARVORE REAL)');
    assert.ok(game.scene.getScene('LoadingScene'), 'LoadingScene registrada (tela de load de bioma)');

    assert.ok(asyncErrors.length === 0, 'nenhum erro de runtime: ' + asyncErrors.join(' | '));

    // encerra rAF/timers do jogo p/ o node:test não ficar pendurado no event loop
    try { game.destroy(true, false); } catch (e) { /* ignora */ }
    window.close();
});
