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

        // ---- HUD sup. esquerdo [HUD-01] ----
        this.bioIcon = this.add.image(16, 16, 'ui_icons', this.icon('leaf')).setScale(1.3);
        this.bioText = this.add.bitmapText(28, 10, 'fumiga', '0', 10).setTint(0xc8ff5a);
        this.bioMaxText = this.add.bitmapText(28, 20, 'fumiga', '/ 260', 6).setTint(0x6d5a41);
        this.bioBar = this.add.graphics().setDepth(5);
        this.jellyIcon = this.add.image(16, 36, 'ui_icons', this.icon('jelly')).setScale(1.3);
        this.jellyText = this.add.bitmapText(28, 30, 'fumiga', '0', 10).setTint(0xffc832);
        // fila de ovos [HUD-01] 5 ovos com timer radial
        this.eggQueue = [];
        for (let i=0;i<5;i++) {
            const ix = 16 + i*14;
            const bg = this.add.graphics().setDepth(6);
            bg.fillStyle(0x1a0f09,0.9).fillCircle(ix, 52, 6);
            bg.lineStyle(1,0xc8912a,0.6).strokeCircle(ix,52,6);
            const img = this.add.image(ix,52,'ui_icons', this.icon('egg_icon')).setScale(0.9).setDepth(7).setVisible(false);
            const ring = this.add.graphics().setDepth(8);
            this.eggQueue.push({bg,img,ring,progress:0});
        }
        // contador de ondas top-center [HUD-02]
        this.waveText = this.add.bitmapText(this.scale.width/2, 10, 'fumiga', 'ONDA 0/7 — 00:00', 8).setOrigin(0.5).setTint(0xe8d9b5).setDepth(10);
        this.waveSkull = this.add.graphics().setDepth(10);
        this.pheromoneLayer = this.add.container(0,0).setDepth(9);
        // pool damage numbers [D-05] 12 bitmapText
        this.damagePool = [];
        for(let i=0;i<12;i++){
            const txt = this.add.bitmapText(0,0,'fumiga','',8).setOrigin(0.5).setDepth(15).setVisible(false);
            this.damagePool.push(txt);
        }
        this._damageIdx=0;

        // ---- engrenagem sup. direito ----
        this.gear = this.add.image(W - 18, 18, 'ui_icons', this.icon('gear')).setScale(1.5).setInteractive({ useHandCursor: true });
        this.gear.on('pointerdown', () => {
            const g = this.scene.get('GameScene');
            if (g && g.timeController) {
                if (g.timeController.isPaused) g.timeController.resume();
                else g.timeController.triggerTacticalPause({ worldX: g.cam.getWorldPoint(W / 2, H / 2).x, worldY: g.cam.getWorldPoint(W / 2, H / 2).y, keyboard: true });
            }
        });

        // ---- HP da Rainha — sempre visível 20% [D-01] ----
        this.queenBarBg = this.add.graphics();
        this.queenBar = this.add.graphics();
        this.queenBarAlpha = 0.22;
        this._drawQueenBar(1);
        // seta off-screen amarela
        this.queenArrow = this.add.bitmapText(W / 2, H - 38, 'fumiga', '▲', 10).setOrigin(0.5).setTint(0xffc832).setVisible(false).setDepth(10);
        // pulse tween para borda quando baixa vida
        this._queenPulse = null;

        // ---- overlays ----
        this.overlay = this.add.container(0, 0).setDepth(50).setVisible(false);

        this._subscribe();
        // atualiza seta off-screen a cada 200ms [D-01]
        this.time.addEvent({ delay: 200, loop: true, callback: () => this._updateQueenArrow() });
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
        ge.on('wave', (d) => this._updateWave(d.wave, d.maxWave, d.timer));
        ge.on('eggQueue', (q) => this._updateEggQueue(q));
        ge.on('damageNumber', (d) => this._showDamageNumber(d.x, d.y, d.amount, d.crit));
    }

    _hud({ biomass, jelly }) {
        if (biomass !== undefined) {
            this.bioText.setText(String(Math.floor(biomass)));
            try {
                const g = this.scene.get('GameScene');
                const max = g && g.economy ? g.economy.maxBiomass : 260;
                this.bioMaxText.setText('/ ' + max);
                // barra 60x4 verde pisca vermelho se custo>saldo
                const frac = biomass / max;
                this.bioBar.clear();
                this.bioBar.fillStyle(0x141414,0.8).fillRect(28, 22, 60, 4);
                this.bioBar.fillStyle(frac<0.3?0xe03a3a:0x5ad25a,1).fillRect(28,22,60*Phaser.Math.Clamp(frac,0,1),4);
                this.bioBar.lineStyle(1,0xc8912a,0.5).strokeRect(28,22,60,4);
            } catch {}
        }
        if (jelly !== undefined) this.jellyText.setText(String(Math.floor(jelly)));
    }

    _updateWave(wave, maxWave, timer){
        if(!this.waveText) return;
        const m = Math.floor(timer/60), s = Math.floor(timer%60);
        this.waveText.setText(`ONDA ${wave}/${maxWave} — ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
        // skull preenchendo
        try{
            const frac = wave / maxWave;
            this.waveSkull.clear();
            this.waveSkull.fillStyle(0x141414,0.6).fillCircle(this.scale.width/2 + 70, 10, 8);
            this.waveSkull.fillStyle(0xe03a3a,0.9).fillCircle(this.scale.width/2+70,10,8*frac);
        }catch{}
        if(timer<5 && wave<maxWave){
            this.waveText.setTint(0xffc832);
        } else this.waveText.setTint(0xe8d9b5);
    }

    _updateEggQueue(queue){
        // queue: array of {cls, progress}
        for(let i=0;i<5;i++){
            const q = this.eggQueue[i];
            const item = queue && queue[i];
            if(item){
                q.img.setVisible(true);
                q.ring.clear();
                q.ring.lineStyle(2,0xc8ff5a,0.9);
                const prog = item.progress || 0;
                q.ring.beginPath();
                q.ring.arc(q.img.x, q.img.y, 7, -Math.PI/2, -Math.PI/2 + Math.PI*2*prog, false);
                q.ring.strokePath();
            } else {
                q.img.setVisible(false);
                q.ring.clear();
            }
        }
    }

    _showDamageNumber(x,y,amount,crit){
        const txt = this.damagePool[this._damageIdx % this.damagePool.length];
        this._damageIdx++;
        txt.setPosition(x,y);
        txt.setText(String(amount));
        txt.setTint(crit?0xffc832:0xffffff);
        txt.setAlpha(1);
        txt.setVisible(true);
        this.tweens.add({targets:txt, y: y-12, alpha:0, duration:400, onComplete:()=>txt.setVisible(false)});
        // shake proporcional [D-05]
        try{
            const g=this.scene.get('GameScene');
            if(g) g.shake(Phaser.Math.Clamp(amount/60*12,2,12));
        }catch{}
    }

    _drawQueenBar(frac) {
        const W = this.scale.width;
        const H = this.scale.height;
        const w = 200;
        const x = W / 2 - w / 2;
        const y = H - 18;
        const h = 6;
        const low = frac < 0.7;
        this.queenBarBg.clear();
        this.queenBarBg.fillStyle(0x141414, low ? 0.95 : 0.22);
        this.queenBarBg.fillRect(x, y, w, h);
        this.queenBarBg.lineStyle(low ? 2 : 1, low ? 0xff3b30 : 0xc8912a, low ? 1 : 0.6);
        this.queenBarBg.strokeRect(x, y, w, h);
        this.queenBar.clear();
        // cor: verde c8ff5a → vermelho e03a3a quando low
        const col = low ? 0xe03a3a : 0xc8ff5a;
        this.queenBar.fillStyle(col, 1);
        this.queenBar.fillRect(x + 1, y + 1, (w - 2) * Phaser.Math.Clamp(frac, 0, 1), h - 2);
        // pulsação borda se low
        if (low && !this._queenPulse) {
            this._queenPulse = this.tweens.add({ targets: [this.queenBarBg, this.queenBar], alpha: { from: 1, to: 0.6 }, duration: 400, yoyo: true, repeat: -1 });
        } else if (!low && this._queenPulse) {
            this._queenPulse.stop(); this._queenPulse = null;
            this.queenBarBg.setAlpha(1); this.queenBar.setAlpha(1);
        }
        // seta off-screen [D-01]
        this._updateQueenArrow();
    }

    _updateQueenArrow() {
        try {
            const g = this.scene.get('GameScene');
            if (!g || !g.queen || !g.cam) { this.queenArrow.setVisible(false); return; }
            const q = g.queen;
            const view = g.cam.worldView;
            const inside = q.x >= view.x && q.x <= view.right && q.y >= view.y && q.y <= view.bottom;
            if (inside) { this.queenArrow.setVisible(false); return; }
            // fora da viewport → mostra seta
            this.queenArrow.setVisible(true);
            const cx = this.scale.width / 2, cy = this.scale.height - 38;
            // direção simplificada: aponta para queen
            const dx = q.x - (view.x + view.width/2), dy = q.y - (view.y + view.height/2);
            const ang = Math.atan2(dy, dx);
            this.queenArrow.setPosition(cx + Math.cos(ang)*30, cy + Math.sin(ang)*12);
            this.queenArrow.setAngle(ang * 180 / Math.PI + 90);
        } catch { this.queenArrow.setVisible(false); }
    }

    _queenHp(frac) {
        this._drawQueenBar(frac);
        if (frac < 1) {
            this._queenHurt = true;
            this._setQueenBarVisible(true);
            clearTimeout(this._barTimer);
            // não esconde se HP<90% [D-01]
            if (frac < 0.9) return;
            this._barTimer = setTimeout(() => {
                this._queenHurt = false;
                if (!this._tactical) this._setQueenBarVisible(false);
            }, 2000);
        }
    }

    flashQueenBar() {
        this._setQueenBarVisible(true);
        // se já está sempre visível 20%, garante que fica opaco por 1s
        clearTimeout(this._barTimer);
        this._barTimer = setTimeout(() => {
            if (!this._queenHurt) this._setQueenBarVisible(false);
        }, 1000);
    }

    _setQueenBarVisible(v) {
        this._tactical = v;
        // [D-01] sempre visível 20%, só aumenta para 100% quando tactical/hurt
        const a = v ? 1 : 0.22;
        this.queenBarBg.setAlpha(a);
        this.queenBar.setAlpha(a);
        this.queenArrow.setAlpha(a);
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

    /* ---------- Cartas de Mutação (pausa 100%) [D-02] ---------- */
    _mutationCards(cards) {
        const W = this.scale.width;
        const H = this.scale.height;
        this._clearOverlay();
        this.overlay.setVisible(true);
        const man = this.cache.json.get('manifest') || {};
        const rar = man.mutation_cards ? man.mutation_cards.tiles : {};
        // estado reroll [D-02]
        this._rerolled = this._rerolled || false;
        this._currentCards = cards;

        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
        this.overlay.add(dim);
        const title = this.add.bitmapText(W / 2, 70, 'fumiga', 'BIOMASSA ESPECIAL - ESCOLHA UM GENE', 10).setOrigin(0.5).setTint(0xb44ad2);
        this.overlay.add(title);
        // mostra delta ANTES→DEPOIS [D-02]
        const getDelta = (card) => {
            try {
                const gm = this.scene.get('GameScene').gameRef.gm;
                if(card.effect.type==='stat' && card.effect.stat==='damage') return `DANO ${Math.round(gm.damage()*9)}→${Math.round(gm.damage()*9*card.effect.mult)}`;
                if(card.effect.type==='stat' && card.effect.stat==='speed') return `VEL ${gm.speed().toFixed(2)}→${(gm.speed()*card.effect.mult).toFixed(2)}`;
                if(card.effect.type==='stat' && card.effect.stat==='hp') return `HP x${gm.hpMult().toFixed(1)}→x${(gm.hpMult()*card.effect.mult).toFixed(1)}`;
            } catch {}
            return card.desc;
        };

        const cardW = 96;
        const gap = 16;
        const total = cards.length * cardW + (cards.length - 1) * gap;
        let x = W / 2 - total / 2;
        // responsivo: se W<400 empilha [D-03]
        const stack = W < 400;
        if(stack){
            // 1 coluna 280x90 com scroll simplificado
            let y = 110;
            cards.forEach(card=>{
                const frame = this.add.rectangle(W/2, y, 280, 90, 0x1a0f09, 0.95).setStrokeStyle(2, card.rarityColor?Phaser.Display.Color.HexStringToColor(card.rarityColor).color:0xc8912a).setInteractive({useHandCursor:true});
                const icon = this.add.image(W/2 -100, y, 'ui_icons', this.icon(card.icon)||0).setScale(1.8);
                const name = this.add.bitmapText(W/2 -70, y-20, 'fumiga', card.name, 8).setTint(0xffffff);
                const desc = this.add.bitmapText(W/2 -70, y, 'fumiga', this._wrap(getDelta(card)), 6).setTint(0xcfc4a8);
                const rarTxt = this.add.bitmapText(W/2 -70, y+18, 'fumiga', card.rarity.toUpperCase(), 6).setTint(card.rarityColor?Phaser.Display.Color.HexStringToColor(card.rarityColor).color:0xffffff);
                [frame,icon,name,desc,rarTxt].forEach(o=>this.overlay.add(o));
                frame.on('pointerdown',()=>{this.game.events.emit('mutationChosen',card.id); this._clearOverlay();});
                y+=100;
            });
        } else {
            cards.forEach((card, i) => {
                const cx = x + cardW / 2;
                const frame = this.add.image(cx, H / 2, 'mutation_cards', rar[card.rarity] ?? 0);
                frame.setInteractive({ useHandCursor: true });
                const icon = this.add.image(cx, H / 2 - 28, 'ui_icons', this.icon(card.icon) || 0).setScale(2);
                const name = this.add.bitmapText(cx, H / 2 + 20, 'fumiga', card.name, 7).setOrigin(0.5).setTint(0xffffff);
                const delta = getDelta(card);
                const desc = this.add.bitmapText(cx, H / 2 + 36, 'fumiga', this._wrap(delta), 6).setOrigin(0.5).setTint(0x5ad25a);
                const rarTxt = this.add.bitmapText(cx, H / 2 + 48, 'fumiga', card.rarity.toUpperCase(), 5).setOrigin(0.5).setTint(card.rarityColor?Phaser.Display.Color.HexStringToColor(card.rarityColor).color:0xffffff);
                const group = [frame, icon, name, desc, rarTxt];
                group.forEach((o) => this.overlay.add(o));
                frame.on('pointerover', () => frame.setScale(1.05));
                frame.on('pointerout', () => frame.setScale(1));
                frame.on('pointerdown', () => {
                    this.game.events.emit('mutationChosen', card.id);
                    this._clearOverlay();
                });
                x += cardW + gap;
            });
        }
        // botão reroll 1x 10 geleia [D-02]
        if(!this._rerolled){
            const rr = this.add.bitmapText(W/2, H - 40, 'fumiga', '[ REROLL 10 GELEIA ]', 8).setOrigin(0.5).setTint(0xffc832).setInteractive({useHandCursor:true});
            rr.on('pointerdown',()=>{
                const gm = this.scene.get('GameScene').gameRef.gm;
                if(gm.spendJelly(10)){
                    this._rerolled=true;
                    const ms = this.scene.get('GameScene').mutationSystem;
                    const newCards = ms.rollMutations(gm.luck);
                    this._mutationCards(newCards);
                } else {
                    rr.setTint(0xe03a3a);
                    this.tweens.add({targets:rr, x: W/2+4, duration:60, yoyo:true, repeat:3});
                }
            });
            this.overlay.add(rr);
        }
        // 4a opção RECUSAR +15 BIO
        const rec = this.add.bitmapText(W/2, H - 22, 'fumiga', '[ RECUSAR +15 BIO ]', 7).setOrigin(0.5).setTint(0x6d5a41).setInteractive({useHandCursor:true});
        rec.on('pointerdown',()=>{
            const g=this.scene.get('GameScene');
            if(g) g.economy.add(15);
            this.game.events.emit('mutationChosen','recusar');
            this._clearOverlay();
        });
        this.overlay.add(rec);
    }

    _wrap(t) {
        return t.length > 26 ? t.slice(0, 26) : t;
    }

    /* ---------- Escolha de Migração [D-04] ---------- */
    _migration(choices) {
        const W = this.scale.width;
        const H = this.scale.height;
        this._clearOverlay();
        this.overlay.setVisible(true);
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8).setInteractive();
        this.overlay.add(dim);
        this.overlay.add(this.add.bitmapText(W / 2, 80, 'fumiga', 'MIGRACAO - ESCOLHA A ROTA', 12).setOrigin(0.5).setTint(0xc8ff5a));
        let y = 130;
        for (const c of choices) {
            const card = this.add.rectangle(W/2, y, Math.min(360, W-20), 36, 0x1a0f09, 0.9).setStrokeStyle(1,0xc8912a).setInteractive({useHandCursor:true});
            const thumbKey = 'tiles_'+c.id;
            if(this.textures.exists(thumbKey)){
                try{ const thumb = this.add.image(W/2 -150, y, thumbKey).setDisplaySize(32,32).setOrigin(0.5); this.overlay.add(thumb);}catch{}
            }
            const label = this.add.bitmapText(W/2, y-8, 'fumiga', c.name, 8).setOrigin(0.5).setTint(0xe8d9b5);
            let info = '';
            try{ const bm = this.scene.get('GameScene').biomeId; info = `ID:${c.id}  GEL:+40`; }catch{ info=c.name; }
            const det = this.add.bitmapText(W/2, y+8, 'fumiga', info, 5).setOrigin(0.5).setTint(0x6d5a41);
            [card,label,det].forEach(o=>this.overlay.add(o));
            card.on('pointerover',()=>card.setFillStyle(0x2a1a0a,0.95));
            card.on('pointerout',()=>card.setFillStyle(0x1a0f09,0.9));
            card.on('pointerdown',()=>{
                this.game.events.emit('migrationChosen', c.id);
                this._clearOverlay();
            });
            y+=46;
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
