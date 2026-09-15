/**
 * js/scenes/PreloadScene.js — Carregamento de assets + Barra de progresso [TDD §2/§7.1]
 * ---------------------------------------------------------------------------
 * Fase 1 (preload): bitmapFont + JSONs (manifest/mutations/skills/tips) + GLSL
 * + áudio (se o dispositivo suportar). Fase 2 (create): sprites do manifest —
 * com visual estilo Dead Cells (logo pixel + barra com moldura + status).
 *
 * IMPORTANTE: a fonte bitmap carrega na fase 1 para que o create() possa usá-la.
 * Ao terminar: registra shader ChromaKey, cria animações e segue p/ TitleScene
 * (ordem de telas: Preload -> Titulo -> Menu -> Load -> Jogo).
 * ---------------------------------------------------------------------------
 */
export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // FONTE PRIMEIRO: o create() desenha textos com ela
        this.load.bitmapFont('fumiga', 'assets/fonts/fumiga.png', 'assets/fonts/fumiga.xml');

        this.load.json('manifest', 'assets/sprites/manifest.json');
        this.load.json('mutations', 'assets/data/mutations.json');
        // Árvore de habilidades + dicas de loading: dados em JSON (data-driven)
        this.load.json('skills', 'assets/data/skills.json');
        this.load.json('tips', 'assets/data/tips.json');
        // Fonte GLSL do ChromaKey em arquivo próprio (não-inline)
        this.load.text('chromakey_frag', 'assets/shaders/chromakey.frag');

        // Áudio: carrega APENAS se o dispositivo tiver decodificador (wav via
        // HTML5/WebAudio). Ambientes sem suporte (headless, codecs ausentes)
        // não devem travar o pipeline de load — AudioManager já é no-op seguro.
        const dev = this.sys.game.device;
        if (dev.audio && (dev.audio.wav || dev.audio.audioData)) {
            const audio = ['bite', 'acid', 'dig', 'build', 'spawn', 'hurt', 'death', 'pheromone', 'card', 'jelly', 'boss', 'gameover', 'win', 'click'];
            for (const a of audio) this.load.audio(a, `assets/audio/sfx_${a}.wav`);
            this.load.audio('bgm_underground', 'assets/audio/bgm_underground.wav');
            this.load.audio('bgm_surface', 'assets/audio/bgm_surface.wav');
            this.load.audio('bgm_boss', 'assets/audio/bgm_boss.wav');
        }
    }

    create() {
        // helper seguro headless (font pode não ter decodificado)
        const _safeBT = (x, y, txt, size, tint, alpha=1, origin=0.5) => {
            try {
                if (this.cache.bitmapFont.exists('fumiga')) {
                    const t = this.add.bitmapText(x, y, 'fumiga', txt, size).setOrigin(origin);
                    if (tint!==undefined) t.setTint(tint);
                    if (alpha!==1) t.setAlpha(alpha);
                    return t;
                }
            } catch {}
            const col = tint!==undefined ? '#' + tint.toString(16).padStart(6,'0') : '#ffffff';
            const t2 = this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: size+'px', color: col }).setOrigin(origin);
            if (alpha!==1) t2.setAlpha(alpha);
            return t2;
        };
        const _safeBTLeft = (x, y, txt, size, tint, alpha=1) => {
            try {
                if (this.cache.bitmapFont.exists('fumiga')) {
                    const t = this.add.bitmapText(x, y, 'fumiga', txt, size).setOrigin(0, 0.5);
                    if (tint!==undefined) t.setTint(tint);
                    if (alpha!==1) t.setAlpha(alpha);
                    return t;
                }
            } catch {}
            const col = tint!==undefined ? '#' + tint.toString(16).padStart(6,'0') : '#ffffff';
            const t2 = this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: size+'px', color: col }).setOrigin(0, 0.5);
            if (alpha!==1) t2.setAlpha(alpha);
            return t2;
        };

        // monkey-patch: tenta bitmap, cai para text silenciosamente
        const _origBT = this.add.bitmapText.bind(this.add);
        this.add.bitmapText = (x, y, font, txt, size, ...rest) => {
            try {
                if (font==='fumiga' && this.cache.bitmapFont.exists('fumiga')) return _origBT(x, y, font, txt, size, ...rest);
            } catch {}
            // fallback
            const t = this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: (size||16)+'px', color: '#ffffff' });
            // mimic bitmapText API (setTint/setOrigin/setAlpha no-ops)
            t.setTint = (c)=>{ t.setColor('#'+c.toString(16).padStart(6,'0')); return t; };
            if (rest.length===0) return t;
            return t;
        };

        const w = this.scale.width;
        this.cameras.main.setBackgroundColor('#0b0705');

        // helper resiliente: se bitmapFont ainda não decodificou no headless, usa Text
        const t = (x, y, txt, size, color) => {
            try {
                if (this.cache.bitmapFont.exists('fumiga')) return this.add.bitmapText(x, y, 'fumiga', txt, size).setOrigin(0.5).setTint(color);
            } catch {}
            return this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: size + 'px', color: '#'+color.toString(16).padStart(6,'0') }).setOrigin(0.5);
        };
        // ---------- visual estilo Dead Cells (fonte já disponível) ----------
        try {
            this.add.bitmapText(w / 2 + 2, 192, 'fumiga', 'FUMIGA', 32).setOrigin(0.5).setTint(0x000000).setAlpha(0.6);
            this.add.bitmapText(w / 2, 190, 'fumiga', 'FUMIGA', 32).setOrigin(0.5).setTint(0xc8ff5a);
        } catch {
            t(w / 2, 190, 'FUMIGA', 32, 0xc8ff5a);
        }
        let status;
        try { status = this.add.bitmapText(w / 2, 332, 'fumiga', 'DESPIERTO NO BOSQUE UMIDO...', 8).setOrigin(0.5).setTint(0x6d5a41); }
        catch { status = t(w / 2, 332, 'DESPIERTO NO BOSQUE UMIDO...', 8, 0x6d5a41); }
        const stages = ['DESPIERTO NO BOSQUE UMIDO...', 'GERANDO AS OPERARIAS...', 'AFIANDO AS MANDIBULAS...', 'FUNGOS NA DESPENSA...'];
        let si = 0;
        const stageTimer = this.time.addEvent({
            delay: 700, loop: true,
            callback: () => { si = (si + 1) % stages.length; status.setText(stages[si]); }
        });

        // moldura + preenchimento da barra
        const frame = this.add.graphics();
        frame.fillStyle(0x170f09, 1).fillRect(w / 2 - 162, 298, 324, 16);
        frame.lineStyle(2, 0x4a3520, 1).strokeRect(w / 2 - 162, 298, 324, 16);
        const bar = this.add.graphics();
        this.load.on('progress', (p) => {
            bar.clear();
            bar.fillStyle(0xc8ff5a, 1).fillRect(w / 2 - 160, 300, 320 * p, 12);
        });
        this.load.on('loaderror', (file) => {
            const msg = '[LOADERROR] ' + (file && (file.key || file.src || file.url) || 'arquivo desconhecido');
            console.warn(msg);
            const box = document.getElementById('boot-errors');
            if (box) { box.hidden = false; box.textContent += msg + '\n'; }
        });
        this.load.once('complete', () => stageTimer.remove());

        // ---------- fase 2: sprites/texturas do manifest ----------
        const manifest = this.cache.json.get('manifest') || {};
        if (!manifest || typeof manifest !== 'object' || Object.keys(manifest).length === 0) {
            console.warn('[Preload] manifest vazio ou não carregado — seguindo mesmo assim');
            // ainda tenta gerar particle e seguir
            this._setup();
            return;
        }
        for (const [key, m] of Object.entries(manifest)) {
            if (m.type === 'bitmapFont') {
                const k = key.replace(/^font_/, '');
                if (!this.cache.bitmapFont.exists(k)) this.load.bitmapFont(k, m.texture, m.file);
            } else if (m.frames > 1) {
                this.load.spritesheet(key, m.file, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
            } else {
                this.load.image(key, m.file);
            }
        }
        this.load.once('complete', () => this._setup());
        this.load.start();
    }

    _setup() {
        const manifest = this.cache.json.get('manifest') || {};

        // animações a partir do manifest
        for (const [key, m] of Object.entries(manifest)) {
            if (!m.anims) continue;
            for (const [animName, frames] of Object.entries(m.anims)) {
                this.anims.create({
                    key: `${key}_${animName}`,
                    frames: this.anims.generateFrameNumbers(key, { frames }),
                    frameRate: animName === 'walk' ? 8 : 6,
                    repeat: animName === 'attack' ? 0 : -1
                });
            }
        }

        // shader ChromaKey (WebGL apenas) — fonte GLSL carregada de assets/shaders/
        import('../systems/WebGLShaders.js').then(({ registerChromaKey }) =>
            registerChromaKey(this.game, this.cache.text.get('chromakey_frag'))
        );

        // texturas de partícula/brilho: usa arquivo se já carregado via manifest, senão fallback runtime (headless)
        if (!this.textures.exists('particle')) {
            const p = this.add.graphics();
            p.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3);
            p.generateTexture('particle', 3, 3);
            p.destroy();
        }
        if (!this.textures.exists('glow')) {
            const g = this.add.graphics();
            g.fillStyle(0xb6ff3c, 1).fillCircle(4, 4, 4);
            g.generateTexture('glow', 8, 8);
            g.destroy();
        }
        if (!this.textures.exists('fogbrush')) {
            // fogbrush já vem de assets/sprites/fogbrush.png via manifest; fallback apenas se ausente
            const f = this.add.graphics();
            f.fillStyle(0xffffff, 1).fillCircle(16, 16, 16);
            f.generateTexture('fogbrush', 32, 32);
            f.destroy();
        }

        // Próxima tela na ordem pedida: Apresentação > Carregamento > Pré-menu
        this.scene.start('ApresentacaoScene');
    }
}
