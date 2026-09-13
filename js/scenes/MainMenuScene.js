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

const ITEMS = [
    { id: 'play', label: 'Jogar' },
    { id: 'options', label: 'Opções' },
    { id: 'patch', label: 'Notas da Atualização' },
    { id: 'dlc', label: 'Conteúdo Extra', color: 0xffc832 },
    { id: 'quit', label: 'Sair' },
];

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
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

        const W = this.scale.width;
        const H = this.scale.height;
        this.sel = 0;
        this._muted = this.sound.mute;

        // ---------- FUNDO — Réplica Tela_menu.jpg: castelo + água + barco + nuvens — sprites reais ----------
        this.cameras.main.setBackgroundColor('#0b0705');
        const bg = this.add.graphics();
        bg.fillStyle(0x1a0a2a, 1).fillRect(0, 0, W, H);
        bg.fillStyle(0xff7a2a, 0.85).fillRect(0, H * 0.52, W, H * 0.18);
        bg.fillStyle(0xffc83a, 0.9).fillRect(0, H * 0.70, W, H * 0.12);
        if (this.textures.exists('bg_castle')) {
            const sc = (W * 0.64) / 128;
            this.add.image(W * 0.72, H * 0.52, 'bg_castle').setScale(sc, sc).setAlpha(0.95);
        } else {
            const castle = this.add.graphics();
            castle.fillStyle(0x1a0a2a, 1);
            castle.fillTriangle(W * 0.42, H * 0.82, W * 0.78, H * 0.18, W * 1.05, H * 0.82);
            castle.fillRect(W * 0.58, H * 0.28, 14, 88);
            castle.fillRect(W * 0.72, H * 0.20, 18, 108);
            castle.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        }
        if (this.textures.exists('bg_water')) {
            this.add.image(W * 0.5, H * 0.91, 'bg_water').setDisplaySize(W, H * 0.18);
        } else {
            const w2 = this.add.graphics();
            w2.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        }
        if (this.textures.exists('bg_boat')) {
            this.add.image(W * 0.80, H * 0.80, 'bg_boat').setScale(1.2);
        } else {
            const boat = this.add.graphics();
            boat.fillStyle(0x1a0a1a, 1).fillTriangle(W * 0.78, H * 0.80, W * 0.80, H * 0.76, W * 0.82, H * 0.80);
            boat.fillRect(W * 0.79, H * 0.80, 10, 5);
        }
        if (this.textures.exists('bg_birds')) {
            this.add.image(W * 0.52, H * 0.22, 'bg_birds').setScale(1.6).setAlpha(0.9);
        } else {
            for (let i = 0; i < 6; i++) {
                const bx = W * 0.42 + i * 10;
                const by = H * 0.22 + (i % 2 ? 5 : -3);
                const bird = this.add.graphics();
                bird.fillStyle(0x1a0a1a, 1).fillTriangle(bx, by, bx + 4, by - 3, bx + 8, by);
            }
        }
        // brilho horizonte — já coberto por bg_water reflexo; fallback
        if (!this.textures.exists('bg_water')) {
            const glow = this.add.graphics();
            glow.fillStyle(0xffffff, 0.10).fillRect(W * 0.42, H * 0.78, W * 0.38, 10);
        }
        // brasas sutis
        for (let i = 0; i < 12; i++) {
            const x = Phaser.Math.Between(8, W - 8);
            const y = Phaser.Math.Between(H * 0.50, H * 0.82);
            const p = this.add.image(x, y, 'particle').setTint(0xff9c40).setAlpha(0).setScale(0.5);
            this.tweens.add({ targets: p, y: y - Phaser.Math.Between(30, 70), alpha: { from: 0, to: 0.35 }, duration: Phaser.Math.Between(2600, 4200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000) });
        }

        // ---------- topo: logo + DLC à esquerda ----------
        this.add.bitmapText(16, 18, 'fumiga', 'FUMIGA', 16).setTint(0x7affff);
        this.add.bitmapText(17, 19, 'fumiga', 'FUMIGA', 16).setTint(0x000000).setAlpha(0.45).setDepth(-1);
        this.add.bitmapText(16, 36, 'fumiga', 'BETA  v0.1.0', 7).setTint(0x6d5a41);
        // banner DLC esquerda (como Return to Castlevania)
        const dlcX = 16, dlcY = 52, dlcW = 148, dlcH = 36;
        const dlcBg = this.add.graphics();
        dlcBg.fillStyle(0x1a0f2a, 0.95).fillRect(dlcX, dlcY, dlcW, dlcH);
        dlcBg.lineStyle(1, 0x3a1a4a, 1).strokeRect(dlcX, dlcY, dlcW, dlcH);
        this.add.bitmapText(dlcX + 5, dlcY + 5, 'fumiga', 'CANION DE GELEIA', 6).setTint(0xffc832);
        this.add.bitmapText(dlcX + 5, dlcY + 14, 'fumiga', 'NOVO BIOMA', 6).setTint(0xe8d9b5);
        this.add.bitmapText(dlcX + 5, dlcY + 22, 'fumiga', '3x GELEIA', 6).setTint(0x8a9ab0);
        if (this.textures.exists('tiles_canyon_geleia')) {
            try { this.add.image(dlcX + dlcW - 18, dlcY + 18, 'tiles_canyon_geleia').setDisplaySize(28, 28).setOrigin(0.5); } catch {}
        }

        this.jellyText = this.add.bitmapText(W - 26, 18, 'fumiga', '0', 12).setOrigin(1, 0).setTint(0xffc832);
        this.add.image(W - 14, 24, 'ui_icons', this._icon('jelly')).setScale(1.2);

        // ---------- card DLC sup. direito — Réplica Tela_menu.jpg ----------
        const cardW = Math.min(168, W * 0.45), cardH = 110, cardX = W - cardW - 12, cardY = 52;
        const card = this.add.graphics();
        card.fillStyle(0x0f1e3a, 1).fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0x2a4a7a, 1).strokeRect(cardX, cardY, cardW, cardH);
        this.add.bitmapText(cardX + 6, cardY + 6, 'fumiga', 'FUMIGA: Cânion', 6).setTint(0xffffff);
        this.add.bitmapText(cardX + 6, cardY + 13, 'fumiga', 'de Geleia DLC!', 6).setTint(0xffffff);
        this.add.bitmapText(cardX + 6, cardY + 20, 'fumiga', 'DLC LANÇADO!', 6).setTint(0xffc83a);
        if (this.textures.exists('tiles_canyon_geleia')) {
            try { this.add.image(cardX + cardW/2, cardY + 40, 'tiles_canyon_geleia').setDisplaySize(cardW - 12, 32).setOrigin(0.5); } catch {}
        } else {
            const ph = this.add.graphics();
            ph.fillStyle(0xffc83a, 1).fillRect(cardX + 6, cardY + 30, cardW - 12, 32);
        }
        this.add.bitmapText(cardX + 6, cardY + 70, 'fumiga', 'Explore o Cânion', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 78, 'fumiga', 'dourado e colete', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 86, 'fumiga', 'geleia rara!', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 94, 'fumiga', 'Boss inédito.', 6).setTint(0xa0a8b8);

        // ---------- menu esquerdo — Réplica 1:1 com barra azul atrás da seleção ----------
        this.rows = [];
        this.highlights = [];
        let y = Math.floor(H * 0.34);
        for (let i = 0; i < ITEMS.length; i++) {
            const it = ITEMS[i];
            const hl = this.add.graphics();
            hl.fillStyle(0x2a7aff, 0.18).fillRect(12, y - 2, 164, 16);
            hl.lineStyle(2, 0x3c9aff, 0.95).strokeRect(12, y - 2, 164, 16);
            hl.setVisible(false);
            this.highlights.push(hl);
            const col = it.color ?? 0xe8d9b5;
            const item = this.add.bitmapText(20, y, 'fumiga', it.label, 9).setTint(col);
            item.setInteractive({ useHandCursor: true });
            item.on('pointerover', () => this._select(i));
            item.on('pointerdown', () => { this._select(i); this._activate(); });
            this.rows.push(item);
            y += 18;
        }

        // teclado
        const kb = this.input.keyboard;
        if (kb) {
            kb.on('keydown-DOWN', () => this._select((this.sel + 1) % ITEMS.length));
            kb.on('keydown-S', () => this._select((this.sel + 1) % ITEMS.length));
            kb.on('keydown-UP', () => this._select((this.sel + ITEMS.length - 1) % ITEMS.length));
            kb.on('keydown-W', () => this._select((this.sel + ITEMS.length - 1) % ITEMS.length));
            kb.on('keydown-ENTER', () => this._activate());
            kb.on('keydown-SPACE', () => this._activate());
        }

        // rodapé — versão + hint controle vermelho (como Tela_menu.jpg)
        this.add.bitmapText(8, H - 22, 'fumiga', 'v0.1.0 (2026-09-13)', 6).setTint(0x6d5a41);
        this.add.bitmapText(W/2, H - 12, 'fumiga', 'Recomendamos jogar com controle!', 6).setOrigin(0.5).setTint(0xc83a2a);

        this._select(0);

        GameManager.init().then(() => this._refreshJelly()).catch(() => {});
        this.cameras.main.fadeIn(300, 11, 7, 5);
    }

    /* ---------- infraestrutura do menu ---------- */

    _icon(name) {
        const m = this.cache.json.get('manifest') || {};
        return m?.ui_icons?.tiles?.[name] ?? 0;
    }

    _label(item) {
        if (item === 'SOM') return 'SOM: ' + (this._muted ? 'DESLIGADO' : 'LIGADO');
        return item;
    }

    _select(i) {
        this.sel = i;
        this.rows.forEach((row, j) => {
            const hl = this.highlights[j];
            if (hl) hl.setVisible(j === i);
            if (j === i) row.setTint(0xffffff);
            else {
                const it = ITEMS[j];
                row.setTint(it.color ?? 0xe8d9b5);
            }
        });
    }

    _activate() {
        const it = ITEMS[this.sel];
        this.audioClick();
        if (it.id === 'play') {
            // Via pós-menu (ordem: Menu > Pós-menu > Jogo) — sempre via Carregamento
            this.cameras.main.fadeOut(200, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () =>
                this.scene.start('CarregamentoScene', { next: 'PosMenuScene', duration: 600 }));
        } else if (it.id === 'options') {
            // Som por enquanto
            this._muted = !this._muted;
            this.sound.mute = this._muted;
            const t = this.add.bitmapText(this.scale.width/2, this.scale.height - 32, 'fumiga', 'SOM: ' + (this._muted ? 'DESLIGADO' : 'LIGADO'), 8).setOrigin(0.5).setTint(0xffc832);
            this.time.delayedCall(1200, () => t.destroy());
        } else if (it.id === 'patch') {
            this._credits();
        } else if (it.id === 'dlc') {
            this.cameras.main.fadeOut(200, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CarregamentoScene', { next: 'SkillTreeScene', duration: 500 }));
        } else if (it.id === 'quit') {
            const t = this.add.bitmapText(this.scale.width/2, this.scale.height/2, 'fumiga', 'ATÉ LOGO!', 12).setOrigin(0.5).setTint(0xe8d9b5);
            this.time.delayedCall(800, () => t.destroy());
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
