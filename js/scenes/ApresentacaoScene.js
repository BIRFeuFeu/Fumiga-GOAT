/**
 * js/scenes/ApresentacaoScene.js — Tela de Apresentação (Splash) [Dead Cells Tela_apresentacao.jpg]
 * ---------------------------------------------------------------------------
 * Primeira tela após o Boot/Preload. Replicas 1:1 o layout Dead Cells
 * "apresentação" mas com tema FUMIGA (formiga + formigueiro gigante).
 * Mostrada apenas 2.8s e avançar em qualquer input.
 * Ordem pedida: Apresentação > Carregamento > Pré-menu > Menu > Pós-menu > Jogo > Derrota
 * ---------------------------------------------------------------------------
 */
export class ApresentacaoScene extends Phaser.Scene {
    constructor() {
        super('ApresentacaoScene');
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

        // ---------- fundo: degradê céu roxo -> laranja -> amarelo (como Dead Cells) ----------
        const sky = this.add.graphics();
        // Faixa superior roxa
        sky.fillStyle(0x2a0a3a, 1).fillRect(0, 0, W, H * 0.32);
        sky.fillStyle(0x8a2a5a, 1).fillRect(0, H * 0.32, W, H * 0.18);
        sky.fillStyle(0xff7a2a, 1).fillRect(0, H * 0.50, W, H * 0.18);
        sky.fillStyle(0xffc83a, 1).fillRect(0, H * 0.68, W, H * 0.12);
        sky.fillStyle(0xfff2a0, 1).fillRect(0, H * 0.80, W, H * 0.08);

        // Lua gigante à direita (20% do fundo) + brilho
        const moon = this.add.graphics();
        moon.fillStyle(0xfff6b0, 1).fillCircle(W * 0.78, H * 0.28, 52);
        moon.fillStyle(0xffffff, 0.12).fillCircle(W * 0.78, H * 0.28, 68);

        // Castelo / Formigueiro gigante em silhueta roxa escura (direita, 60% largura)
        const castle = this.add.graphics();
        castle.fillStyle(0x1a0a2a, 1);
        // base montanha
        castle.fillTriangle(W * 0.42, H * 0.82, W * 0.78, H * 0.18, W * 1.05, H * 0.82);
        // torres
        castle.fillRect(W * 0.58, H * 0.28, 18, 90);
        castle.fillRect(W * 0.72, H * 0.20, 22, 110);
        castle.fillRect(W * 0.62, H * 0.38, 12, 60);
        // ponte / detalhe
        castle.fillTriangle(W * 0.62, H * 0.62, W * 0.74, H * 0.58, W * 0.74, H * 0.66);

        // Água + reflexo dourado (faixa inferior 22%)
        const water = this.add.graphics();
        water.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        water.fillStyle(0xffffff, 0.08).fillRect(0, H * 0.82, W, 2);
        // barco à vela 8px (silhueta)
        const boat = this.add.graphics();
        boat.fillStyle(0x1a0a1a, 1);
        boat.fillTriangle(W * 0.78, H * 0.79, W * 0.80, H * 0.75, W * 0.82, H * 0.79);
        boat.fillRect(W * 0.79, H * 0.79, 12, 6);

        // Bandada de pássaros (7 em V)
        for (let i = 0; i < 7; i++) {
            const bx = W * 0.42 + i * 10;
            const by = H * 0.22 + (i % 2 ? 6 : -4);
            const bird = this.add.graphics();
            bird.fillStyle(0x1a0a1a, 1);
            bird.fillTriangle(bx, by, bx + 4, by - 3, bx + 8, by);
        }

        // Nuvens amarelas densas (2 blobs)
        const clouds = this.add.graphics();
        clouds.fillStyle(0xffd07a, 0.9).fillCircle(W * 0.48, H * 0.42, 38);
        clouds.fillCircle(W * 0.56, H * 0.40, 44);
        clouds.fillCircle(W * 0.62, H * 0.44, 30);

        // ---------- personagem à esquerda (formiga soldado gigante em contra-luz) ----------
        // Usar sprite ant_soldier se disponível, senão silhueta
        if (this.textures.exists('ant_soldier')) {
            const hero = this.add.image(W * 0.18, H * 0.62, 'ant_soldier', 0).setScale(3.2);
            hero.setTint(0x1a3a6a);
            hero.setAlpha(0.95);
            // brilho olho laranja
            const eye = this.add.graphics();
            eye.fillStyle(0xff9c2a, 1).fillCircle(W * 0.20, H * 0.57, 5);
            eye.fillStyle(0xffffff, 0.6).fillCircle(W * 0.20, H * 0.57, 2);
            // orbe azul na mão (como Dead Cells)
            const orb = this.add.graphics();
            orb.fillStyle(0x3c9aff, 0.9).fillCircle(W * 0.14, H * 0.68, 14);
            orb.fillStyle(0xffffff, 0.35).fillCircle(W * 0.14, H * 0.68, 7);
            // aura
            this.tweens.add({ targets: orb, alpha: { from: 0.9, to: 0.6 }, duration: 800, yoyo: true, repeat: -1 });
            // capa vermelha esvoaçante (triângulo)
            const cape = this.add.graphics();
            cape.fillStyle(0xc82a2a, 1).fillTriangle(W * 0.16, H * 0.50, W * 0.06, H * 0.52, W * 0.14, H * 0.60);
        } else {
            // fallback silhueta
            const hero = this.add.graphics();
            hero.fillStyle(0x1a3a6a, 1).fillRect(W * 0.10, H * 0.48, 48, 80);
        }

        // ---------- logo FUMIGA (réplica Dead Cells: branco puro, grande, ícone célula) ----------
        // helper seguro (headless pode não ter bitmapFont ainda)
        const sb = (x, y, txt, size, tint, alpha=1) => {
            try {
                if (this.cache.bitmapFont.exists('fumiga')) {
                    const t = this.add.bitmapText(x, y, 'fumiga', txt, size).setOrigin(0.5).setTint(tint);
                    if (alpha!==1) t.setAlpha(alpha);
                    return t;
                }
            } catch {}
            const c = '#' + tint.toString(16).padStart(6,'0');
            const t2 = this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: size+'px', color: c }).setOrigin(0.5);
            if (alpha!==1) t2.setAlpha(alpha);
            return t2;
        };
        // Sombra + glow ciano atrás
        try { sb(W * 0.58 + 3, H * 0.72 + 3, 'FUMIGA', 36, 0x000000, 0.55); } catch {}
        try { sb(W * 0.58, H * 0.72, 'FUMIGA', 36, 0x7affff, 0.22); } catch {}
        const logo = sb(W * 0.58, H * 0.72, 'FUMIGA', 36, 0xffffff);
        // ícone "célula" no lugar do O (usar jelly icon se existir)
        if (this.textures.exists('ui_icons')) {
            try {
                const man = this.cache.json.get('manifest') || {};
                const idx = man && man.ui_icons ? man.ui_icons.tiles['jelly'] ?? 0 : 0;
                const icon = this.add.image(W * 0.58 + 58, H * 0.72 - 2, 'ui_icons', idx).setScale(1.4).setTint(0x7affff);
                icon.setAlpha(0.95);
            } catch {}
        }

        try { this.add.bitmapText(W * 0.58, H * 0.78, 'fumiga', 'ROGUELITE  COLONY-SIM', 7).setOrigin(0.5).setTint(0x6d5a41).setAlpha(0.9); } catch { sb(W * 0.58, H * 0.78, 'ROGUELITE  COLONY-SIM', 7, 0x6d5a41, 0.9); }

        // ---------- fade in e auto-avanço ----------
        this.cameras.main.fadeIn(400, 11, 7, 5);

        this._started = false;
        const go = () => {
            if (this._started) return;
            this._started = true;
            this.cameras.main.fadeOut(300, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // Sempre via carregamento para evitar ver elementos sendo carregados
                this.scene.start('CarregamentoScene', { next: 'TitleScene', duration: 900 });
            });
        };

        // 2.8s auto + qualquer input
        this.time.delayedCall(2800, go);
        this.input.once('pointerdown', go);
        this.input.keyboard && this.input.keyboard.once('keydown', go);
    }
}
