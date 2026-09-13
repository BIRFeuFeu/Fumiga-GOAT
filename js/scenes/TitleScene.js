/**
 * js/scenes/TitleScene.js — Tela de título (estilo Dead Cells) 
 * ---------------------------------------------------------------------------
 * Ordem de telas (como em Dead Cells): [engine] -> Preload -> ESTA TELA ->
 * MainMenu -> Loading -> Jogo.
 *
 * Fundo escuro com brasas subindo, logo pixelado gigante com sombra,
 * formiga operária passeando no chão e o clássico "TOQUE PARA COMECAR"
 * piscando. Qualquer toque/tecla leva ao menu principal (com fade).
 * ---------------------------------------------------------------------------
 */
export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor('#0b0705');

        // ---------- silhuetas de fundo (colinas de terra escavada) ----------
        const soil = this.add.graphics();
        soil.fillStyle(0x120c07, 1);
        soil.fillTriangle(-40, H, W * 0.28, H * 0.82, W * 0.6, H);
        soil.fillTriangle(W * 0.3, H, W * 0.75, H * 0.86, W + 40, H);
        soil.fillStyle(0x0e0905, 1);
        soil.fillRect(0, H - 26, W, 26);
        // montinho da formigueiro no horizonte
        soil.fillStyle(0x170f09, 1);
        soil.fillTriangle(W * 0.72, H - 24, W * 0.82, H - 64, W * 0.92, H - 24);

        // ---------- brasas / vagalumes subindo (clima vivo) ----------
        for (let i = 0; i < 26; i++) {
            const x = Phaser.Math.Between(8, W - 8);
            const y = Phaser.Math.Between(H * 0.35, H);
            const p = this.add.image(x, y, 'particle')
                .setTint(i % 3 ? 0xff9c40 : 0xc8ff5a)
                .setAlpha(0)
                .setScale(Phaser.Math.FloatBetween(0.6, 1.4));
            this.tweens.add({
                targets: p,
                y: y - Phaser.Math.Between(60, 160),
                x: x + Phaser.Math.Between(-18, 18),
                alpha: { from: 0, to: Phaser.Math.FloatBetween(0.35, 0.9) },
                duration: Phaser.Math.Between(2200, 4200),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2500),
                ease: 'Sine.easeInOut'
            });
        }

        // ---------- operária passeando (viva, usa as anims do preload) ----------
        const walkAnim = this.anims.get('ant_worker_walk');
        if (walkAnim && walkAnim.frames.length > 0) {
            const st = this.add.sprite(-24, H - 33, 'ant_worker').setScale(1.5);
            st.play('ant_worker_walk');
            const walk = () => {
                st.setFlipX(Math.random() < 0.5);
                const target = st.flipX ? -24 : W + 24;
                this.tweens.add({ targets: st, x: target, duration: 14000, onComplete: walk });
            };
            walk();
        }

        // ---------- logo FUMIGA (bitmap pixel + sombra, estilo DC) ----------
        this.add.bitmapText(W / 2 + 3, 153, 'fumiga', 'FUMIGA', 48).setOrigin(0.5).setTint(0x000000).setAlpha(0.6);
        const logo = this.add.bitmapText(W / 2, 150, 'fumiga', 'FUMIGA', 48).setOrigin(0.5).setTint(0xc8ff5a);
        this.tweens.add({ targets: logo, scale: { from: 1, to: 1.02 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.add.bitmapText(W / 2, 186, 'fumiga', 'ROGUELITE COLONY-SIM', 8).setOrigin(0.5).setTint(0x6d5a41);

        // ---------- TOQUE PARA COMECAR (piscando, estilo DC) ----------
        const prompt = this.add.bitmapText(W / 2, H - 96, 'fumiga', 'TOQUE PARA COMECAR', 12).setOrigin(0.5).setTint(0xe8d9b5);
        this.tweens.add({ targets: prompt, alpha: { from: 1, to: 0.15 }, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // rodapé
        this.add.bitmapText(8, H - 12, 'fumiga', 'V0.1.0 BETA', 8).setTint(0x6d5a41);
        this.add.bitmapText(W - 8, H - 12, 'fumiga', 'UM TRIBUTO A DEAD CELLS', 8).setOrigin(1, 0).setTint(0x4a3520);

        // ---------- qualquer toque/tecla avança (com fade) ----------
        this._started = false;
        this.input.once('pointerdown', () => this._go());
        this.input.keyboard && this.input.keyboard.once('keydown', () => this._go());

        this.cameras.main.fadeIn(350, 11, 7, 5);
    }

    _go() {
        if (this._started) return;
        this._started = true;
        this.cameras.main.fadeOut(260, 11, 7, 5);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    }
}
