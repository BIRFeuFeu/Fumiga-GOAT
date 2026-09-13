/**
 * js/scenes/UIScene.js — HUD sobreposto + Pausa Tática + Cartas + Game Over [TDD §2 / GDD §10]
 * ---------------------------------------------------------------------------
 * HUD minimalista (regras do doc de refação):
 *  - Sup. esquerdo: Biomassa (folha) + Geleia Real (gota).
 *  - Sup. direito: engrenagem (pause).
 *  - Centro inferior: HP da Rainha, oculto por padrão (opacity 0) — aparece só
 *    quando a Rainha sofre dano ou na Câmera Lenta.
 * Sem botões fixos, sem caixas flutuantes. Cartas de Mutação, Migração e
 * Game Over são overlays desta cena.
 * ---------------------------------------------------------------------------
 */
export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
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
        const man = this.cache.json.get('manifest') || {};
        this.icon = (n) => man?.ui_icons?.tiles?.[n] ?? 0;

        // ---- HUD sup. esquerdo ----
        this.bioIcon = this.add.image(16, 16, 'ui_icons', this.icon('leaf')).setScale(1.3);
        this.bioText = this.add.bitmapText(28, 10, 'fumiga', '0', 10).setTint(0xc8ff5a);
        this.jellyIcon = this.add.image(16, 36, 'ui_icons', this.icon('jelly')).setScale(1.3);
        this.jellyText = this.add.bitmapText(28, 30, 'fumiga', '0', 10).setTint(0xffc832);

        // ---- engrenagem sup. direito ----
        this.gear = this.add.image(W - 18, 18, 'ui_icons', this.icon('gear')).setScale(1.5).setInteractive({ useHandCursor: true });
        this.gear.on('pointerdown', () => {
            const g = this.scene.get('GameScene');
            if (g && g.timeController) {
                if (g.timeController.isPaused) g.timeController.resume();
                else g.timeController.triggerTacticalPause({ worldX: g.cam.getWorldPoint(W / 2, H / 2).x, worldY: g.cam.getWorldPoint(W / 2, H / 2).y, keyboard: true });
            }
        });

        // ---- HP da Rainha (oculto por padrão) ----
        this.queenBarBg = this.add.graphics();
        this.queenBar = this.add.graphics();
        this.queenBarAlpha = 0;
        this._drawQueenBar(1);

        // ---- overlays ----
        this.overlay = this.add.container(0, 0).setDepth(50).setVisible(false);

        this._subscribe();
    }

    _subscribe() {
        const ge = this.game.events;
        ge.on('hud', (d) => this._hud(d));
        ge.on('queenHp', (f) => this._queenHp(f));
        ge.on('showQueenBar', () => this.flashQueenBar());
        ge.on('tacticalPause', () => this._setQueenBarVisible(true));
        ge.on('tacticalResume', () => {
            if (!this._queenHurt) this._setQueenBarVisible(false);
        });
        ge.on('mutationOffer', (cards) => this._mutationCards(cards));
        ge.on('migrationOffer', (choices) => this._migration(choices));
        ge.on('gameOver', (d) => this._gameOver(d));
        ge.on('bossAnnounce', (name) => this._announce(name));
    }

    _hud({ biomass, jelly }) {
        if (biomass !== undefined) this.bioText.setText(String(Math.floor(biomass)));
        if (jelly !== undefined) this.jellyText.setText(String(Math.floor(jelly)));
    }

    _drawQueenBar(frac) {
        const W = this.scale.width;
        const H = this.scale.height;
        const w = 200;
        const x = W / 2 - w / 2;
        const y = H - 24;
        this.queenBarBg.clear();
        this.queenBarBg.fillStyle(0x141414, 0.8);
        this.queenBarBg.fillRect(x, y, w, 10);
        this.queenBarBg.lineStyle(2, 0xc8912a, 0.9);
        this.queenBarBg.strokeRect(x, y, w, 10);
        this.queenBar.clear();
        this.queenBar.fillStyle(0xe03a3a, 1);
        this.queenBar.fillRect(x + 1, y + 1, (w - 2) * Phaser.Math.Clamp(frac, 0, 1), 8);
    }

    _queenHp(frac) {
        this._drawQueenBar(frac);
        if (frac < 1) {
            this._queenHurt = true;
            this._setQueenBarVisible(true);
            clearTimeout(this._barTimer);
            this._barTimer = setTimeout(() => {
                this._queenHurt = false;
                if (!this._tactical) this._setQueenBarVisible(false);
            }, 2000);
        }
    }

    flashQueenBar() {
        this._setQueenBarVisible(true);
    }

    _setQueenBarVisible(v) {
        this._tactical = v;
        const a = v ? 1 : 0;
        this.queenBarBg.setAlpha(a);
        this.queenBar.setAlpha(a);
    }

    _announce(name) {
        const W = this.scale.width;
        const t = this.add.bitmapText(W / 2, this.scale.height / 2 - 60, 'fumiga', name, 14).setOrigin(0.5).setTint(0xff4b2e).setDepth(60);
        this.tweens.add({ targets: t, alpha: 0, delay: 1600, duration: 600, onComplete: () => t.destroy() });
    }

    _clearOverlay() {
        this.overlay.removeAll(true);
        this.overlay.setVisible(false);
    }

    /* ---------- Cartas de Mutação (pausa 100%) ---------- */
    _mutationCards(cards) {
        const W = this.scale.width;
        const H = this.scale.height;
        this._clearOverlay();
        this.overlay.setVisible(true);
        const man = this.cache.json.get('manifest') || {};
        const rar = man.mutation_cards.tiles;

        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
        this.overlay.add(dim);
        const title = this.add.bitmapText(W / 2, 70, 'fumiga', 'BIOMASSA ESPECIAL - ESCOLHA UM GENE', 10).setOrigin(0.5).setTint(0xb44ad2);
        this.overlay.add(title);

        const cardW = 96;
        const gap = 16;
        const total = cards.length * cardW + (cards.length - 1) * gap;
        let x = W / 2 - total / 2;
        cards.forEach((card, i) => {
            const cx = x + cardW / 2;
            const frame = this.add.image(cx, H / 2, 'mutation_cards', rar[card.rarity] ?? 0);
            frame.setInteractive({ useHandCursor: true });
            const icon = this.add.image(cx, H / 2 - 28, 'ui_icons', this.icon(card.icon) || 0).setScale(2);
            const name = this.add.bitmapText(cx, H / 2 + 20, 'fumiga', card.name, 8).setOrigin(0.5).setTint(0xffffff);
            const desc = this.add.bitmapText(cx, H / 2 + 40, 'fumiga', this._wrap(card.desc), 7).setOrigin(0.5).setTint(0xcfc4a8);
            const group = [frame, icon, name, desc];
            group.forEach((o) => this.overlay.add(o));
            frame.on('pointerover', () => group.forEach((o) => o.setScale && o.setScale(o === frame ? 1.05 : o.scale * 1.05)));
            frame.on('pointerout', () => group.forEach((o) => o.setScale && o.setScale(o === frame ? 1 : o.scale / 1.05)));
            frame.on('pointerdown', () => {
                this.game.events.emit('mutationChosen', card.id);
                this._clearOverlay();
            });
            x += cardW + gap;
        });
    }

    _wrap(t) {
        return t.length > 26 ? t.slice(0, 26) : t;
    }

    /* ---------- Escolha de Migração ---------- */
    _migration(choices) {
        const W = this.scale.width;
        const H = this.scale.height;
        this._clearOverlay();
        this.overlay.setVisible(true);
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8).setInteractive();
        this.overlay.add(dim);
        this.overlay.add(this.add.bitmapText(W / 2, 80, 'fumiga', 'MIGRACAO - ESCOLHA A ROTA', 12).setOrigin(0.5).setTint(0xc8ff5a));
        let y = 140;
        for (const c of choices) {
            const label = this.add.bitmapText(W / 2, y, 'fumiga', '> ' + c.name, 10).setOrigin(0.5).setTint(0xe8d9b5).setInteractive({ useHandCursor: true });
            label.on('pointerover', () => label.setTint(0xc8ff5a));
            label.on('pointerout', () => label.setTint(0xe8d9b5));
            label.on('pointerdown', () => {
                this.game.events.emit('migrationChosen', c.id);
                this._clearOverlay();
            });
            this.overlay.add(label);
            y += 34;
        }
    }

    /* ---------- Game Over ---------- */
    _gameOver({ win, stats, jelly }) {
        const W = this.scale.width;
        const H = this.scale.height;
        this._clearOverlay();
        this.overlay.setVisible(true);
        this.add.rectangle(W / 2, H / 2, W, H, 0x0b0705, 0.92).setDepth(49);
        this.overlay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.0));
        this.overlay.add(
            this.add.bitmapText(W / 2, H / 2 - 70, 'fumiga', win ? 'VITORIA!' : 'A COLONIA CAIU', 18).setOrigin(0.5).setTint(win ? 0xc8ff5a : 0xe03a3a)
        );
        this.overlay.add(this.add.bitmapText(W / 2, H / 2 - 30, 'fumiga', `ABATES ${stats.kills}  BIOMASSA ${stats.biomassCollected}`, 9).setOrigin(0.5));
        this.overlay.add(this.add.bitmapText(W / 2, H / 2 - 12, 'fumiga', `SALAS ${stats.roomsBuilt}  GENES ${stats.mutations}`, 9).setOrigin(0.5));
        this.overlay.add(this.add.bitmapText(W / 2, H / 2 + 10, 'fumiga', `GELEIA REAL +${jelly}`, 11).setOrigin(0.5).setTint(0xffc832));
        const btn = this.add.bitmapText(W / 2, H / 2 + 60, 'fumiga', '[ VOLTAR AO MENU ]', 12).setOrigin(0.5).setTint(0xc8ff5a).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            // Sempre via carregamento (evita ver elementos sendo carregados) — ordem: Derrota > Carregamento > Menu
            this.scene.start('CarregamentoScene', { next: 'MainMenuScene', duration: 700 });
        });
        this.overlay.add(btn);
    }
}
