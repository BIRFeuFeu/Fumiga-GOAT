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

        // ---------- TELA PRÉ-MENU — Réplica 1:1 Tela_pré-menu.jpg Dead Cells ----------
        // Fundo degradê laranja estourado + castelo/formigueiro + água com reflexo + barco
        const bg = this.add.graphics();
        bg.fillStyle(0xff3b30, 1).fillRect(0, 0, W, H * 0.32);
        bg.fillStyle(0xff7a2a, 1).fillRect(0, H * 0.32, W, H * 0.22);
        bg.fillStyle(0xffb82a, 1).fillRect(0, H * 0.54, W, H * 0.16);
        bg.fillStyle(0xffe066, 1).fillRect(0, H * 0.70, W, H * 0.12);
        // silhueta castelo/formigueiro central-direita
        const castle = this.add.graphics();
        castle.fillStyle(0x3a0a2a, 0.85);
        castle.fillTriangle(W * 0.38, H * 0.82, W * 0.68, H * 0.14, W * 1.02, H * 0.82);
        castle.fillRect(W * 0.52, H * 0.26, 14, 88);
        castle.fillRect(W * 0.66, H * 0.18, 18, 108);
        castle.fillStyle(0x1a0a1a, 1);
        castle.fillTriangle(W * 0.46, H * 0.48, W * 0.60, H * 0.44, W * 0.60, H * 0.50);
        // água + reflexo
        castle.fillStyle(0xffb82a, 1).fillRect(0, H * 0.82, W, H * 0.18);
        castle.fillStyle(0xffffff, 0.18).fillRect(W * 0.48, H * 0.82, W * 0.44, 2);
        const boat = this.add.graphics();
        boat.fillStyle(0x1a0a1a, 1).fillTriangle(W * 0.70, H * 0.80, W * 0.72, H * 0.76, W * 0.74, H * 0.80);
        boat.fillRect(W * 0.71, H * 0.80, 10, 5);
        // nuvens amarelas
        const clouds = this.add.graphics();
        clouds.fillStyle(0xffd07a, 0.85).fillCircle(W * 0.44, H * 0.38, 34);
        clouds.fillCircle(W * 0.52, H * 0.36, 38);
        clouds.fillCircle(W * 0.58, H * 0.40, 26);
        // brilho estourado no horizonte
        const glow = this.add.graphics();
        glow.fillStyle(0xffffff, 0.14).fillRect(W * 0.42, H * 0.78, W * 0.38, 12);

        // ---------- logo FUMIGA — Réplica Dead Cells: ciano brilhante com outer glow, centralizado topo ----------
        // glow atrás (duplicata ciana 22% alpha)
        this.add.bitmapText(W / 2 + 1, 68 + 1, 'fumiga', 'FUMIGA', 32).setOrigin(0.5).setTint(0x7affff).setAlpha(0.22);
        this.add.bitmapText(W / 2 + 2, 68 + 2, 'fumiga', 'FUMIGA', 32).setOrigin(0.5).setTint(0x000000).setAlpha(0.55);
        const logo = this.add.bitmapText(W / 2, 68, 'fumiga', 'FUMIGA', 32).setOrigin(0.5).setTint(0x7affff);
        // ícone célula ao lado (jelly)
        try {
            const man = this.cache.json.get('manifest') || {};
            const idx = man?.ui_icons?.tiles?.['jelly'] ?? 0;
            const ic = this.add.image(W / 2 + 92, 68 - 2, 'ui_icons', idx).setScale(1.2).setTint(0x7affff);
            ic.setAlpha(0.95);
        } catch {}
        // sub-título pequeno
        this.add.bitmapText(W / 2, 92, 'fumiga', 'ROGUELITE  COLONY-SIM', 7).setOrigin(0.5).setTint(0x6d5a41);

        // ---------- "Press A to start" — Réplica 1:1 Tela_pré-menu (esquerda, com pill Ⓐ) ----------
        const promptY = Math.floor(H * 0.44);
        // pill branco para o A
        const pill = this.add.graphics();
        pill.fillStyle(0xffffff, 1).fillRoundedRect(18, promptY - 8, 14, 14, 3);
        pill.lineStyle(1, 0x000000, 0.25).strokeRoundedRect(18, promptY - 8, 14, 14, 3);
        this.add.bitmapText(25, promptY - 1, 'fumiga', 'A', 8).setOrigin(0.5).setTint(0x000000);
        const prompt = this.add.bitmapText(38, promptY, 'fumiga', 'Pressione  para começar', 8).setOrigin(0, 0.5).setTint(0xe8d9b5);
        // Ajuste: "Pressione [A] para começar" — o [A] já está no pill, então texto sem A
        prompt.setText('Pressione      para começar');
        this.add.bitmapText(38 + this.add.bitmapText(0,0,'fumiga','Pressione ',8).width, promptY, 'fumiga', '      ', 8).setOrigin(0,0.5).setAlpha(0);
        this.tweens.add({ targets: [pill, prompt], alpha: { from: 1, to: 0.45 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // toque também funciona (mobile)
        const touchHint = this.add.bitmapText(W / 2, H - 52, 'fumiga', 'TOQUE PARA COMEÇAR', 8).setOrigin(0.5).setTint(0xe8d9b5).setAlpha(0.0);
        this.tweens.add({ targets: touchHint, alpha: { from: 0.0, to: 0.55 }, duration: 1200, yoyo: true, repeat: -1 });

        // ---------- rodapé versão (inf. esq.) ----------
        this.add.bitmapText(8, H - 12, 'fumiga', 'v0.1.0 (2026-09-13)', 6).setTint(0x6d5a41);

        // operária passeando discreta no chão (mantido do original, mas menor)
        const walkAnim = this.anims.get('ant_worker_walk');
        if (walkAnim && walkAnim.frames.length > 0) {
            const st = this.add.sprite(-16, H - 18, 'ant_worker').setScale(1.1);
            st.play('ant_worker_walk');
            const walk = () => {
                st.setFlipX(Math.random() < 0.5);
                const target = st.flipX ? -16 : W + 16;
                this.tweens.add({ targets: st, x: target, duration: 16000, onComplete: walk });
            };
            walk();
        }

        // brasas sutis (menos que antes, para não competir com logo)
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(8, W - 8);
            const y = Phaser.Math.Between(H * 0.50, H * 0.82);
            const p = this.add.image(x, y, 'particle').setTint(0xff9c40).setAlpha(0).setScale(0.6);
            this.tweens.add({
                targets: p,
                y: y - Phaser.Math.Between(30, 70),
                alpha: { from: 0, to: 0.35 },
                duration: Phaser.Math.Between(2600, 4200),
                yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000)
            });
        }

        // ---------- transição sempre via CarregamentoScene ----------
        this._started = false;
        const go = () => {
            if (this._started) return;
            this._started = true;
            this.cameras.main.fadeOut(220, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('CarregamentoScene', { next: 'MainMenuScene', duration: 600 });
            });
        };
        this.input.once('pointerdown', go);
        this.input.keyboard && this.input.keyboard.once('keydown', go);

        this.cameras.main.fadeIn(350, 11, 7, 5);
    }

    _go() {}
}
