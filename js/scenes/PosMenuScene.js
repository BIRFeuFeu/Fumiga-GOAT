/**
 * js/scenes/PosMenuScene.js — Pós-Menu (Normal Mode / Custom) [Dead Cells Tela_pós-menu.jpg]
 * ---------------------------------------------------------------------------
 * Réplica 1:1 do pós-menu Dead Cells, adaptado para FUMIGA.
 * Mostrado após clicar em "Jogar" no Menu. Fundo é o mesmo castelo/formigueiro
 * com DLC à esquerda e menu à esquerda. Inclui "Colônias Salvas" (Saves) como
 * pedido: botão de Saves fica aqui.
 *
 * Itens (6):
 * - Modo Normal
 * - Modo Personalizado
 * - Streaming: Desativado
 * - Desafio Diário
 * - Mostrar pop-up de atualização novamente
 * - Colônias Salvas  [NOVO — Saves]
 * ---------------------------------------------------------------------------
 */
import { GameManager } from '../core/GameManager.js';

const POS_ITEMS = [
    { id: 'normal', label: 'Modo Normal', desc: 'Jogue a campanha padrão' },
    { id: 'custom', label: 'Modo Personalizado', desc: 'Ajuste mutações e biomas' },
    { id: 'streaming', label: 'Streaming: Desativado', desc: '' },
    { id: 'daily', label: 'Desafio Diário', desc: '1 tentativa por dia' },
    { id: 'popup', label: 'Mostrar pop-up novamente', desc: '' },
    { id: 'saves', label: 'Colônias Salvas', desc: 'Gerencie suas colônias' },
];

export class PosMenuScene extends Phaser.Scene {
    constructor() {
        super('PosMenuScene');
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

        // ---------- fundo idêntico ao Menu — sprites reais ----------
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
            castle.fillRect(W * 0.58, H * 0.28, 18, 90);
            castle.fillRect(W * 0.72, H * 0.20, 22, 110);
            bg.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        }
        if (this.textures.exists('bg_water')) {
            this.add.image(W * 0.5, H * 0.91, 'bg_water').setDisplaySize(W, H * 0.18);
        } else {
            bg.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        }
        if (this.textures.exists('bg_boat')) {
            this.add.image(W * 0.80, H * 0.80, 'bg_boat').setScale(1.2);
        } else {
            const boat = this.add.graphics();
            boat.fillStyle(0x1a0a1a, 1).fillTriangle(W * 0.78, H * 0.79, W * 0.80, H * 0.75, W * 0.82, H * 0.79);
            boat.fillRect(W * 0.79, H * 0.79, 12, 6);
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

        // ---------- topo: logo pequeno + DLC à esquerda ----------
        this.add.bitmapText(22, 22, 'fumiga', 'FUMIGA', 20).setTint(0x7affff);
        this.add.bitmapText(23, 23, 'fumiga', 'FUMIGA', 20).setTint(0x000000).setAlpha(0.5).setDepth(-1);

        // Banner DLC adaptado para FUMIGA: "Cânion de Geleia" à esquerda (como Return to Castlevania)
        const dlcX = 22, dlcY = 62, dlcW = 168, dlcH = 48;
        const dlcBg = this.add.graphics();
        dlcBg.fillStyle(0x1a0f2a, 1).fillRect(dlcX, dlcY, dlcW, dlcH);
        dlcBg.lineStyle(1, 0x3a1a4a, 1).strokeRect(dlcX, dlcY, dlcW, dlcH);
        // ícone + texto DLC
        this.add.bitmapText(dlcX + 6, dlcY + 6, 'fumiga', 'CANION DE GELEIA', 7).setTint(0xffc83a);
        this.add.bitmapText(dlcX + 6, dlcY + 16, 'fumiga', 'NOVO BIOMA', 6).setTint(0xe8d9b5);
        this.add.bitmapText(dlcX + 6, dlcY + 24, 'fumiga', '3x MAIS GELEIA', 6).setTint(0x8a9ab0);
        if (this.textures.exists('tiles_canyon_geleia')) {
            try {
                const thumb = this.add.image(dlcX + dlcW - 22, dlcY + 24, 'tiles_canyon_geleia').setDisplaySize(36, 36).setOrigin(0.5);
                thumb.setTint(0xffffff);
            } catch {}
        }

        // ---------- card "Atualização" canto sup. direito (como Dead Cells DLC is out now!) ----------
        const cardW = 168, cardH = 112, cardX = W - cardW - 14, cardY = 14;
        const card = this.add.graphics();
        card.fillStyle(0x0f1e3a, 1).fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0x2a4a7a, 1).strokeRect(cardX, cardY, cardW, cardH);
        this.add.bitmapText(cardX + 6, cardY + 6, 'fumiga', 'FUMIGA: Cânion', 7).setTint(0xffffff);
        this.add.bitmapText(cardX + 6, cardY + 14, 'fumiga', 'de Geleia DLC!', 7).setTint(0xffffff);
        this.add.bitmapText(cardX + 6, cardY + 22, 'fumiga', 'DLC LANÇADO!', 6).setTint(0xffc83a);
        // thumb
        if (this.textures.exists('tiles_canyon_geleia')) {
            try {
                const img = this.add.image(cardX + cardW/2, cardY + 42, 'tiles_canyon_geleia').setDisplaySize(cardW - 12, 36).setOrigin(0.5);
            } catch {}
        } else {
            const ph = this.add.graphics();
            ph.fillStyle(0xffc83a, 1).fillRect(cardX + 6, cardY + 32, cardW - 12, 36);
        }
        this.add.bitmapText(cardX + 6, cardY + 74, 'fumiga', 'Explore o Cânion', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 82, 'fumiga', 'dourado e colete', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 90, 'fumiga', 'geleia rara!', 6).setTint(0xa0a8b8);
        this.add.bitmapText(cardX + 6, cardY + 98, 'fumiga', 'Boss inédito.', 6).setTint(0xa0a8b8);

        // ---------- menu esquerdo (6 itens) ----------
        this.rows = [];
        this.highlights = [];
        let y = Math.floor(H * 0.32);
        for (let i = 0; i < POS_ITEMS.length; i++) {
            const it = POS_ITEMS[i];
            const hl = this.add.graphics();
            hl.fillStyle(0x2a7aff, 0.18).fillRect(14, y - 2, 164, 16);
            hl.lineStyle(2, 0x3c9aff, 0.9);
            hl.strokeRect(14, y - 2, 164, 16);
            hl.setVisible(false);
            this.highlights.push(hl);

            const txt = this.add.bitmapText(22, y, 'fumiga', it.label, 9).setTint(0xe8d9b5);
            txt.setInteractive({ useHandCursor: true });
            txt.on('pointerover', () => this._select(i));
            txt.on('pointerdown', () => { this._select(i); this._activate(); });
            this.rows.push(txt);
            y += 22;
        }

        // ---------- rodapé ----------
        this.add.bitmapText(8, H - 22, 'fumiga', 'v0.1.0 (2026-09-13)', 6).setTint(0x6d5a41);
        const back = this.add.bitmapText(W - 8, H - 22, 'fumiga', 'B Voltar', 8).setOrigin(1, 0).setTint(0xe8d9b5);
        back.setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => this._back());
        // pill B vermelho
        const bPill = this.add.graphics();
        bPill.fillStyle(0xc83a2a, 1).fillCircle(W - 48, H - 18, 7);
        this.add.bitmapText(W - 48, H - 18, 'fumiga', 'B', 7).setOrigin(0.5).setTint(0xffffff);

        this._select(0);

        // teclado
        const kb = this.input.keyboard;
        if (kb) {
            kb.on('keydown-DOWN', () => this._select((this.sel + 1) % POS_ITEMS.length));
            kb.on('keydown-S', () => this._select((this.sel + 1) % POS_ITEMS.length));
            kb.on('keydown-UP', () => this._select((this.sel + POS_ITEMS.length - 1) % POS_ITEMS.length));
            kb.on('keydown-W', () => this._select((this.sel + POS_ITEMS.length - 1) % POS_ITEMS.length));
            kb.on('keydown-ENTER', () => this._activate());
            kb.on('keydown-SPACE', () => this._activate());
            kb.on('keydown-ESC', () => this._back());
            kb.on('keydown-B', () => this._back());
        }

        this.cameras.main.fadeIn(250, 11, 7, 5);
    }

    _select(i) {
        this.sel = i;
        this.rows.forEach((row, j) => {
            const hl = this.highlights[j];
            if (j === i) {
                hl.setVisible(true);
                row.setTint(0xffffff);
            } else {
                hl.setVisible(false);
                row.setTint(j === 2 || j === 4 ? 0x8a9ab0 : 0xe8d9b5); // Streaming/popup em cinza como DC
            }
        });
    }

    _activate() {
        const it = POS_ITEMS[this.sel];
        this._click();
        if (it.id === 'normal') {
            // Via carregamento para evitar ver tiles sendo gerados
            this.cameras.main.fadeOut(200, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('CarregamentoScene', { next: 'LoadingScene', payload: { biome: 'bosque_umido' }, biome: 'bosque_umido', duration: 1100 });
            });
        } else if (it.id === 'saves') {
            this.cameras.main.fadeOut(180, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('CarregamentoScene', { next: 'SaveSlotScene', duration: 500 });
            });
        } else if (it.id === 'custom') {
            // Por enquanto mostra toast e vai para saves também
            this._toast('MODO PERSONALIZADO EM BREVE');
        } else if (it.id === 'daily') {
            this._toast('DESAFIO DIARIO EM BREVE');
        } else if (it.id === 'streaming') {
            this._toast('STREAMING: DESATIVADO');
        } else if (it.id === 'popup') {
            this._toast('POP-UP: ATIVADO');
        }
    }

    _back() {
        this._click();
        this.cameras.main.fadeOut(180, 11, 7, 5);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CarregamentoScene', { next: 'MainMenuScene', duration: 400 });
        });
    }

    _click() {
        try { this.sound.play('click', { volume: 0.5 }); } catch {}
    }

    _toast(msg) {
        const W = this.scale.width;
        const t = this.add.bitmapText(W/2, this.scale.height - 48, 'fumiga', msg, 8).setOrigin(0.5).setTint(0xffc832);
        this.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, delay: 1200, duration: 400, onComplete: () => t.destroy() });
    }
}
