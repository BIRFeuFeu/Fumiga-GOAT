/**
 * js/scenes/PreloadScene.js — Carregamento de assets + Barra de progresso [TDD §2/§7.1]
 * ---------------------------------------------------------------------------
 * Varre o manifest (assets/sprites/manifest.json) e usa load.spritesheet com as
 * dimensões injetadas via JSON (TDD §7.1) — nada de código manual por imagem solta.
 * Ao terminar: registra shader ChromaKey, cria animações e segue p/ MainMenu.
 * ---------------------------------------------------------------------------
 */
export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        const w = this.scale.width;
        const bar = this.add.graphics();
        this.load.on('progress', (p) => {
            bar.clear();
            bar.fillStyle(0x170f09).fillRect(w / 2 - 160, 300, 320, 12);
            bar.fillStyle(0xc8ff5a).fillRect(w / 2 - 158, 302, 316 * p, 8);
        });
        this.load.on('complete', () => bar.destroy());

        this.load.json('manifest', 'assets/sprites/manifest.json');
        this.load.json('mutations', 'assets/data/mutations.json');

        // áudio
        const audio = ['bite','acid','dig','build','spawn','hurt','death','pheromone','card','jelly','boss','gameover','win','click'];
        for (const a of audio) this.load.audio(a, `assets/audio/sfx_${a}.wav`);
        this.load.audio('bgm_underground', 'assets/audio/bgm_underground.wav');
        this.load.audio('bgm_surface', 'assets/audio/bgm_surface.wav');
        this.load.audio('bgm_boss', 'assets/audio/bgm_boss.wav');
    }

    create() {
        const manifest = this.cache.json.get('manifest');

        // spritesheets / imagens / fonte
        for (const [key, m] of Object.entries(manifest)) {
            if (m.type === 'bitmapFont') {
                this.load.bitmapFont(key.replace(/^font_/, ''), m.texture, m.file);
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
        const manifest = this.cache.json.get('manifest');

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

        // shader ChromaKey (WebGL apenas)
        import('../systems/WebGLShaders.js').then(({ registerChromaKey }) => registerChromaKey(this.game));

        // texturas de partícula/brilho geradas em runtime
        const p = this.add.graphics();
        p.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3);
        p.generateTexture('particle', 3, 3);
        p.clear();
        p.fillStyle(0xb6ff3c, 1).fillCircle(4, 4, 4);
        p.generateTexture('glow', 8, 8);
        p.destroy();

        this.scene.start('MainMenuScene');
    }
}
