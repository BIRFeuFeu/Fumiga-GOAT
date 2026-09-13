/**
 * js/scenes/MainMenuScene.js — Menu principal (estilo Dead Cells) [GDD §9]
 * ---------------------------------------------------------------------------
 * Ordem de telas: Title -> ESTA TELA -> (Loading -> Jogo | Árvore Real).
 *
 * Estilo Dead Cells: itens de TEXTO puro empilhados à esquerda (sem caixas),
 * cursor '>' ao lado do item selecionado, seleção em amarelo, fundo escuro
 * animado com brasas. Botão ARVORE REAL envia p/ a Árvore de Meta-habilidades.
 * ---------------------------------------------------------------------------
 */
import { GameManager } from '../core/GameManager.js';

const ITEMS = ['INICIAR COLONIA', 'ARVORE REAL', 'SOM', 'CREDITOS'];

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.sel = 0;
        this._muted = this.sound.mute;

        this.cameras.main.setBackgroundColor('#0b0705');

        // ---------- fundo: silhueta + brasas (eco da tela de título) ----------
        const soil = this.add.graphics();
        soil.fillStyle(0x120c07, 1);
        soil.fillTriangle(-40, H, W * 0.3, H * 0.86, W * 0.62, H);
        soil.fillStyle(0x0e0905, 1);
        soil.fillRect(0, H - 22, W, 22);
        for (let i = 0; i < 18; i++) {
            const x = Phaser.Math.Between(8, W - 8);
            const y = Phaser.Math.Between(H * 0.4, H);
            const p = this.add.image(x, y, 'particle')
                .setTint(i % 3 ? 0xff9c40 : 0xc8ff5a)
                .setAlpha(0).setScale(Phaser.Math.FloatBetween(0.5, 1.2));
            this.tweens.add({
                targets: p,
                y: y - Phaser.Math.Between(40, 120),
                alpha: { from: 0, to: Phaser.Math.FloatBetween(0.25, 0.7) },
                duration: Phaser.Math.Between(2400, 4600),
                yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2200), ease: 'Sine.easeInOut'
            });
        }

        // ---------- topo: logo pequeno + Geleia Real ----------
        this.add.bitmapText(16, 18, 'fumiga', 'FUMIGA', 16).setTint(0xc8ff5a);
        this.add.bitmapText(17, 19, 'fumiga', 'FUMIGA', 16).setTint(0x2c3a10).setDepth(-1);
        this.add.bitmapText(16, 40, 'fumiga', 'BETA', 8).setTint(0x6d5a41);

        this.jellyText = this.add.bitmapText(W - 26, 18, 'fumiga', '0', 12).setOrigin(1, 0).setTint(0xffc832);
        this.add.image(W - 14, 24, 'ui_icons', this._icon('jelly')).setScale(1.2);

        // ---------- menu (texto puro, estilo DC) ----------
        this.rows = [];
        let y = Math.floor(H * 0.42);
        for (const label of ITEMS) {
            const item = this.add.bitmapText(34, y, 'fumiga', this._label(label), 12).setTint(0xe8d9b5);
            item.setInteractive({ useHandCursor: true });
            item.on('pointerover', () => this._select(ITEMS.indexOf(label)));
            item.on('pointerdown', () => { this._select(ITEMS.indexOf(label)); this._activate(); });
            this.rows.push(item);
            y += 20;
        }
        this.cursor = this.add.bitmapText(20, 0, 'fumiga', '>', 12).setTint(0xffc832);
        this.tweens.add({ targets: this.cursor, x: { from: 20, to: 24 }, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // teclado (desktop): setas + enter, como em Dead Cells
        const kb = this.input.keyboard;
        if (kb) {
            kb.on('keydown-DOWN', () => this._select((this.sel + 1) % ITEMS.length));
            kb.on('keydown-S', () => this._select((this.sel + 1) % ITEMS.length));
            kb.on('keydown-UP', () => this._select((this.sel + ITEMS.length - 1) % ITEMS.length));
            kb.on('keydown-W', () => this._select((this.sel + ITEMS.length - 1) % ITEMS.length));
            kb.on('keydown-ENTER', () => this._activate());
            kb.on('keydown-SPACE', () => this._activate());
        }

        // rodapé
        this.add.bitmapText(8, H - 12, 'fumiga', 'V0.1.0 BETA', 8).setTint(0x6d5a41);
        this.add.bitmapText(W - 8, H - 12, 'fumiga', 'MENU RADIAL: SEGURE PARADO NO JOGO', 8).setOrigin(1, 0).setTint(0x4a3520);

        this._select(0);

        // metaprogresso (async, à prova de storage bloqueado)
        GameManager.init().then(() => this._refreshJelly()).catch(() => {});
        this.cameras.main.fadeIn(300, 11, 7, 5);
    }

    /* ---------- infraestrutura do menu ---------- */

    _icon(name) {
        const m = this.cache.json.get('manifest');
        return m.ui_icons.tiles[name] ?? 0;
    }

    _label(item) {
        if (item === 'SOM') return 'SOM: ' + (this._muted ? 'DESLIGADO' : 'LIGADO');
        return item;
    }

    _select(i) {
        this.sel = i;
        this.rows.forEach((row, j) => {
            row.setY(Math.floor(this.scale.height * 0.42) + j * 20);
            row.setTint(j === i ? 0xffc832 : 0xe8d9b5);
        });
        this.cursor.setY(this.rows[i].y);
    }

    _activate() {
        const item = ITEMS[this.sel];
        this.audioClick();
        if (item === 'INICIAR COLONIA') {
            this.cameras.main.fadeOut(260, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () =>
                this.scene.start('LoadingScene', { biome: 'bosque_umido' }));
        } else if (item === 'ARVORE REAL') {
            this.cameras.main.fadeOut(260, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('SkillTreeScene'));
        } else if (item === 'SOM') {
            this._muted = !this._muted;
            this.sound.mute = this._muted;
            this.rows[this.sel].setText(this._label('SOM'));
        } else if (item === 'CREDITOS') {
            this._credits();
        }
    }

    audioClick() {
        try {
            const s = this.sound;
            if (s && s.get && s.get('click')) s.play('click', { volume: 0.5 });
        } catch (e) { /* áudio indisponível */ }
    }

    _refreshJelly() {
        this.jellyText.setText(String(GameManager.save.royalJelly));
    }

    /* ---------- créditos (overlay à la Dead Cells) ---------- */
    _credits() {
        const W = this.scale.width;
        const H = this.scale.height;
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x0b0705, 0.94).setInteractive();
        const lines = [
            ['FUMIGA', 0xc8ff5a, 16],
            ['', 0, 8],
            ['ROGUELITE / COLONY-SIM DE FORMIGAS', 0xe8d9b5, 8],
            ['MOTOR: PHASER 3 - ARTE E AUDIO 100% PROCEDURAIS', 0xe8d9b5, 8],
            ['ESTETICA E MENUS: TRIBUTO A DEAD CELLS', 0x6d5a41, 8],
            ['', 0, 8],
            ['TOQUE PARA VOLTAR', 0xffc832, 10]
        ];
        let y = H / 2 - 60;
        for (const [txt, tint, size] of lines) {
            this.add.bitmapText(W / 2, y, 'fumiga', txt || ' ', size).setOrigin(0.5).setTint(tint);
            y += size + 10;
        }
        overlay.once('pointerdown', () => {
            this.scene.restart();
        });
    }
}
