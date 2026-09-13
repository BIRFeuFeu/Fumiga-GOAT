/**
 * js/scenes/LoadingScene.js — Tela de carregamento de run (estilo Dead Cells)
 * ---------------------------------------------------------------------------
 * Ordem de telas: MainMenu -> ESTA TELA -> GameScene (+UIScene).
 *
 * Nome do bioma em destaque, barra de progresso com moldura e uma DICA de
 * gameplay no rodapé (rotativa, de assets/data/tips.json) — como nas telas de
 * load de Dead Cells. Duração mínima para a dica ser legível.
 * ---------------------------------------------------------------------------
 */
import { BiomeManager } from '../world/BiomeManager.js';

const LOAD_MS = 1600;

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene');
    }

    init(data) {
        this.biomeId = (data && data.biome) || 'bosque_umido';
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor('#0b0705');

        const biome = BiomeManager.byId(this.biomeId);
        // fonte bitmap não tem acentos — normaliza p/ exibição
        const clean = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

        // ---------- nome do bioma (destaque, com sombra) ----------
        this.add.bitmapText(W / 2 + 2, 187, 'fumiga', clean(biome.name), 22).setOrigin(0.5).setTint(0x000000).setAlpha(0.65);
        this.add.bitmapText(W / 2, 185, 'fumiga', clean(biome.name), 22).setOrigin(0.5).setTint(0xc8ff5a);
        this.add.bitmapText(W / 2, 215, 'fumiga', 'FASE ' + (biome.stage || 1), 8).setOrigin(0.5).setTint(0x6d5a41);

        // ---------- barra de progresso com moldura (DC) ----------
        const bw = 320, bx = W / 2 - bw / 2, by = 300;
        const frame = this.add.graphics();
        frame.fillStyle(0x170f09, 1).fillRect(bx - 2, by - 2, bw + 4, 16);
        frame.lineStyle(2, 0x4a3520, 1).strokeRect(bx - 2, by - 2, bw + 4, 16);
        const fill = this.add.graphics();
        const prog = this.add.bitmapText(W / 2, by + 24, 'fumiga', '0%', 8).setOrigin(0.5).setTint(0x6d5a41);
        const state = { p: 0 };
        this.tweens.add({
            targets: state,
            p: 1,
            duration: LOAD_MS,
            ease: 'Linear',
            onUpdate: () => {
                fill.clear();
                fill.fillStyle(0xc8ff5a, 1).fillRect(bx, by, bw * state.p, 12);
                prog.setText(Math.round(state.p * 100) + '%');
            },
            onComplete: () => {
                this.cameras.main.fadeOut(220, 11, 7, 5);
                this.cameras.main.once('camerafadeoutcomplete', () =>
                    this.scene.start('GameScene', { biome: this.biomeId }));
            }
        });

        // ---------- DICA (rodapé, estilo DC) ----------
        const tips = (this.cache.json.get('tips') || {}).loading ||
            ['SEGURE PARADO P/ ABRIR O MENU RADIAL'];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        this.add.bitmapText(W / 2, H - 52, 'fumiga', 'DICA', 8).setOrigin(0.5).setTint(0xb44ad2);
        this.add.bitmapText(W / 2, H - 38, 'fumiga', tip, 8).setOrigin(0.5).setTint(0xe8d9b5);

        this.cameras.main.fadeIn(250, 11, 7, 5);
    }
}
