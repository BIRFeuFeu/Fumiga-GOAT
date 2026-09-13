/**
 * js/scenes/SaveSlotScene.js — Tela de Saves (JOGOS SALVOS) [Dead Cells Tela_saves.jpg]
 * ---------------------------------------------------------------------------
 * Réplica 1:1 da tela "JOGOS SALVOS" do Dead Cells, adaptada para FUMIGA
 * "COLÔNIAS SALVAS". Mostra 3 slots horizontais com:
 *  - Header: Slot N [ativo], Última jogatina, Número de jornadas
 *  - Grid de ícones (salas, mutações, classes) + 5 células de geleia
 *  - Rodapé Y Deletar / X Copiar / A Confirmar / B Voltar
 *
 * Botão de Saves fica no pós-menu (PosMenuScene) como pedido.
 * ---------------------------------------------------------------------------
 */
import { GameManager } from '../core/GameManager.js';

export class SaveSlotScene extends Phaser.Scene {
    constructor() {
        super('SaveSlotScene');
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
        this.sel = 0; // slot selecionado 0..2

        this.cameras.main.setBackgroundColor('#0b0f1e');

        // ---------- header ----------
        this.add.bitmapText(W/2, 14, 'fumiga', 'COLÔNIAS SALVAS', 10).setOrigin(0.5).setTint(0xe8d9b5);
        // linha fina abaixo do header
        const line = this.add.graphics();
        line.lineStyle(1, 0x2a3a5a, 0.9);
        line.lineBetween(12, 24, W - 12, 24);

        // ---------- preparar dados dos 3 slots ----------
        // Slot 0 = save atual (GameManager.save), Slot 1 = mock com 41 jornadas, Slot 2 = vazio
        const now = new Date();
        const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        this.slots = [
            {
                id: 0,
                name: '01 [ativo]',
                date: fmt(now),
                runs: GameManager.save.discoveredBiomes.length * 7 + 12,
                data: GameManager.save,
                empty: false
            },
            {
                id: 1,
                name: 'Slot 2 - Atualização 29',
                date: '25/08/22 14:54',
                runs: 41,
                data: null,
                empty: false
            },
            {
                id: 2,
                name: 'Slot 3',
                date: '',
                runs: 0,
                data: null,
                empty: true
            }
        ];

        // ---------- desenhar 3 slots horizontais ----------
        this.slotGfx = [];
        this.slotTexts = [];
        const slotW = Math.floor((W - 20) / 3) - 4; // ~150 para 480
        const slotH = Math.floor(H * 0.62); // ~297
        const slotY = 32;
        for (let i = 0; i < 3; i++) {
            const sx = 10 + i * (slotW + 6);
            const slot = this.slots[i];

            // fundo + borda
            const g = this.add.graphics();
            g.fillStyle(0x111a33, 1).fillRect(sx, slotY, slotW, slotH);
            g.lineStyle(1, 0x2a4a7a, 1).strokeRect(sx, slotY, slotW, slotH);
            this.slotGfx.push(g);

            // highlight se selecionado (desenhado depois)
            const hl = this.add.graphics();
            hl.lineStyle(2, 0x3cffb4, 1).strokeRect(sx - 1, slotY - 1, slotW + 2, slotH + 2);
            hl.setVisible(i === this.sel);
            this.slotGfx.push(hl);

            // conteúdo do slot
            const cx = sx + slotW/2;
            // nome
            const nameColor = i === 1 ? 0xffc83a : 0xe8d9b5;
            const name = this.add.bitmapText(cx, slotY + 10, 'fumiga', slot.name, 7).setOrigin(0.5).setTint(nameColor);
            this.slotTexts.push(name);

            if (!slot.empty) {
                // última jogatina
                this.add.bitmapText(cx, slotY + 26, 'fumiga', 'Última incursão:', 6).setOrigin(0.5).setTint(0x8a9ab0);
                this.add.bitmapText(cx, slotY + 36, 'fumiga', slot.date, 6).setOrigin(0.5).setTint(0xe8d9b5);
                // número de jornadas
                this.add.bitmapText(cx, slotY + 52, 'fumiga', 'Número de incursões:', 6).setOrigin(0.5).setTint(0x8a9ab0);
                this.add.bitmapText(cx, slotY + 62, 'fumiga', String(slot.runs), 7).setOrigin(0.5).setTint(0xffffff);

                // grid de ícones (3 linhas, 6 colunas) — salas, mutações, classes
                const iconStartY = slotY + 78;
                const iconSize = 14, gap = 4, cols = 6;
                const startX = sx + 8;
                // linha 1: recursos (jelly, biomass, II, etc)
                const iconsRow1 = ['jelly', 'leaf', 'fungus_icon', 'egg_icon', 'shield', 'poison'];
                const iconsRow2 = ['ant', 'hp', 'speed', 'acid', 'gene', 'eye'];
                const iconsRow3 = ['skull', 'crown', 'dig', 'pheromone_attack', 'pheromone_collect', 'gear'];
                const allRows = [iconsRow1, iconsRow2, iconsRow3];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 6; c++) {
                        const iconName = allRows[r][c];
                        const ix = startX + c * (iconSize + gap);
                        const iy = iconStartY + r * (iconSize + gap);
                        // fundo do ícone
                        const bg = this.add.graphics();
                        bg.fillStyle(0x0d1a33, 1).fillRect(ix, iy, iconSize, iconSize);
                        bg.lineStyle(1, 0x2a4a7a, 0.6).strokeRect(ix, iy, iconSize, iconSize);
                        // ícone (se existir)
                        try {
                            const man = this.cache.json.get('manifest') || {};
                            const idx = man?.ui_icons?.tiles?.[iconName] ?? 0;
                            const img = this.add.image(ix + iconSize/2, iy + iconSize/2, 'ui_icons', idx).setDisplaySize(10, 10);
                            // tint por tipo
                            if (iconName === 'jelly') img.setTint(0xffc83a);
                            else if (iconName === 'leaf') img.setTint(0x5ad25a);
                            else if (iconName === 'skull') img.setTint(0xc83a2a);
                        } catch {}
                    }
                }

                // segunda seção: 5 células de geleia vermelhas (Boss Cells adaptado)
                const cellY = slotY + slotH - 28;
                for (let ci = 0; ci < 5; ci++) {
                    const cxCell = startX + 18 + ci * 22;
                    const cell = this.add.graphics();
                    // célula preenchida se run > ci*8
                    const filled = slot.runs > ci * 10;
                    cell.fillStyle(filled ? 0xc83a2a : 0x2a1a33, 1).fillCircle(cxCell, cellY, 9);
                    cell.lineStyle(1, filled ? 0xff6a3a : 0x2a4a7a, 1).strokeCircle(cxCell, cellY, 9);
                    // núcleo roxo
                    cell.fillStyle(0x6a1a9a, 1).fillCircle(cxCell, cellY, 4);
                    cell.fillStyle(0xffffff, 0.9).fillCircle(cxCell, cellY - 1, 1.5);
                }

                // tornar slot interativo
                const hit = this.add.rectangle(sx + slotW/2, slotY + slotH/2, slotW, slotH, 0x000000, 0).setInteractive({ useHandCursor: true });
                hit.on('pointerdown', () => { this._select(i); this._confirm(); });
                hit.on('pointerover', () => this._select(i));
            } else {
                // vazio
                this.add.bitmapText(cx, slotY + slotH/2 - 10, 'fumiga', 'Vazio', 8).setOrigin(0.5).setTint(0x8a9ab0);
                this.add.bitmapText(cx, slotY + slotH/2 + 8, 'fumiga', '+ NOVA COLÔNIA', 6).setOrigin(0.5).setTint(0x3cffb4);
                const hit = this.add.rectangle(sx + slotW/2, slotY + slotH/2, slotW, slotH, 0x000000, 0).setInteractive({ useHandCursor: true });
                hit.on('pointerdown', () => { this._select(i); this._newColony(i); });
                hit.on('pointerover', () => this._select(i));
            }
        }

        // scrollbar fina embaixo dos slots
        const sb = this.add.graphics();
        sb.fillStyle(0x0d1a33, 1).fillRect(12, slotY + slotH + 8, W - 24, 4);
        sb.fillStyle(0x8a9ab0, 0.5).fillRect(12, slotY + slotH + 8, (W - 24) * 0.42, 4);

        // ---------- rodapé: Y Deletar / X Copiar / A Confirmar / B Voltar ----------
        const footY = H - 18;
        // Y amarelo
        this._pill( W * 0.18, footY, 'Y', 0xffc83a, 'Deletar');
        this._pill( W * 0.38, footY, 'X', 0x3c7aff, 'Copiar');
        this._pill( W * 0.60, footY, 'A', 0x2aff7a, 'Confirmar');
        this._pill( W * 0.82, footY, 'B', 0xc83a2a, 'Voltar');

        // teclado / gamepad
        const kb = this.input.keyboard;
        if (kb) {
            kb.on('keydown-LEFT', () => this._select((this.sel + 2) % 3));
            kb.on('keydown-A', () => this._select((this.sel + 2) % 3));
            kb.on('keydown-RIGHT', () => this._select((this.sel + 1) % 3));
            kb.on('keydown-D', () => this._select((this.sel + 1) % 3));
            kb.on('keydown-ENTER', () => this._confirm());
            kb.on('keydown-SPACE', () => this._confirm());
            kb.on('keydown-ESC', () => this._back());
            kb.on('keydown-B', () => this._back());
            kb.on('keydown-Y', () => this._delete());
            kb.on('keydown-X', () => this._copy());
        }

        this._select(this.sel);
        this.cameras.main.fadeIn(200, 10, 15, 30);
    }

    _pill(x, y, letter, color, text) {
        const g = this.add.graphics();
        g.fillStyle(color, 1).fillCircle(x - 18, y, 7);
        this.add.bitmapText(x - 18, y, 'fumiga', letter, 7).setOrigin(0.5).setTint(0xffffff);
        const t = this.add.bitmapText(x - 8, y, 'fumiga', text, 7).setOrigin(0, 0.5).setTint(0xe8d9b5);
        t.setInteractive({ useHandCursor: true });
        if (letter === 'B') t.on('pointerdown', () => this._back());
        if (letter === 'A') t.on('pointerdown', () => this._confirm());
        if (letter === 'X') t.on('pointerdown', () => this._copy());
        if (letter === 'Y') t.on('pointerdown', () => this._delete());
    }

    _select(i) {
        this.sel = i;
        // atualizar highlights (cada slot tem 2 gfx: bg e hl)
        // hl indices: 1,3,5
        this.slotGfx.forEach((g, idx) => {
            if (idx % 2 === 1) {
                const slotIdx = Math.floor(idx / 2);
                g.setVisible(slotIdx === this.sel);
            }
        });
        try { this.sound.play('click', { volume: 0.3 }); } catch {}
    }

    _confirm() {
        const slot = this.slots[this.sel];
        if (slot.empty) {
            this._newColony(this.sel);
            return;
        }
        // Slot com dados → carregar e ir para jogo (via carregamento)
        this.cameras.main.fadeOut(200, 10, 15, 30);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CarregamentoScene', { next: 'LoadingScene', payload: { biome: 'bosque_umido' }, biome: 'bosque_umido', duration: 1100 });
        });
    }

    _newColony(idx) {
        const t = this.add.bitmapText(this.scale.width/2, this.scale.height - 38, 'fumiga', 'NOVA COLÔNIA CRIADA!', 8).setOrigin(0.5).setTint(0x3cffb4);
        this.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, delay: 1000, duration: 400, onComplete: () => t.destroy() });
        this.slots[idx].empty = false;
        this.slots[idx].name = `0${idx+1} [ativo]`;
        this.slots[idx].runs = 1;
        // recarregar cena para mostrar slot preenchido
        this.time.delayedCall(600, () => this.scene.restart());
    }

    _delete() {
        const slot = this.slots[this.sel];
        if (slot.empty) return;
        // modal simples
        const W = this.scale.width, H = this.scale.height;
        const dim = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75).setInteractive();
        const box = this.add.graphics();
        box.fillStyle(0x111a33, 1).fillRect(W/2 - 110, H/2 - 36, 220, 72);
        box.lineStyle(2, 0xc83a2a, 1).strokeRect(W/2 - 110, H/2 - 36, 220, 72);
        const txt = this.add.bitmapText(W/2, H/2 - 16, 'fumiga', 'DELETAR COLÔNIA?', 8).setOrigin(0.5).setTint(0xe8d9b5);
        const yes = this.add.bitmapText(W/2 - 30, H/2 + 12, 'fumiga', 'SIM (Y)', 7).setOrigin(0.5).setTint(0xc83a2a).setInteractive({ useHandCursor: true });
        const no = this.add.bitmapText(W/2 + 30, H/2 + 12, 'fumiga', 'NÃO (B)', 7).setOrigin(0.5).setTint(0x8a9ab0).setInteractive({ useHandCursor: true });
        const close = () => { dim.destroy(); box.destroy(); txt.destroy(); yes.destroy(); no.destroy(); };
        yes.on('pointerdown', () => { close(); slot.empty = true; this.scene.restart(); });
        no.on('pointerdown', close);
        dim.on('pointerdown', close);
    }

    _copy() {
        const slot = this.slots[this.sel];
        if (slot.empty) return;
        const t = this.add.bitmapText(this.scale.width/2, this.scale.height - 38, 'fumiga', 'COLÔNIA COPIADA PARA SLOT VAZIO!', 7).setOrigin(0.5).setTint(0x3c7aff);
        // encontrar slot vazio
        const emptyIdx = this.slots.findIndex(s => s.empty);
        if (emptyIdx >= 0) {
            this.slots[emptyIdx].empty = false;
            this.slots[emptyIdx].name = `0${emptyIdx+1} [cópia]`;
            this.slots[emptyIdx].runs = slot.runs;
        }
        this.tweens.add({ targets: t, alpha: { from: 1, to: 0 }, delay: 1200, duration: 400, onComplete: () => { t.destroy(); this.scene.restart(); } });
    }

    _back() {
        this.cameras.main.fadeOut(180, 10, 15, 30);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('CarregamentoScene', { next: 'PosMenuScene', duration: 400 });
        });
    }
}
