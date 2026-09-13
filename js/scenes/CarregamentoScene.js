/**
 * js/scenes/CarregamentoScene.js — Tela de Carregamento Genérica [Dead Cells Tela_de_carregamento_geral.jpg]
 * ---------------------------------------------------------------------------
 * Usada SEMPRE que o jogo necessita transicionar para evitar que o jogador
 * veja elementos sendo carregados (bugs visuais). Replica 1:1 o layout Dead Cells
 * "ALOJAMENTO DOS PRISIONEIROS": arte em cima 55% + painel escuro embaixo 45%
 * com título, linhas finas, lore e "Carregando..." pulsante.
 *
 * Uso: this.scene.start('CarregamentoScene', { next: 'MainMenuScene', payload: {...}, title: '...', lore: '...' })
 * Também usada por LoadingScene de bioma (que passa biomeId).
 * ---------------------------------------------------------------------------
 */
import { BiomeManager } from '../world/BiomeManager.js';

export class CarregamentoScene extends Phaser.Scene {
    constructor() {
        super('CarregamentoScene');
    }

    init(data) {
        this.nextScene = (data && data.next) || 'MainMenuScene';
        this.payload = (data && data.payload) || {};
        this.customTitle = data && data.title;
        this.customLore = data && data.lore;
        this.duration = (data && data.duration) || 900; // mínimo para evitar flash
        this.biomeId = (data && data.biome) || null;
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

        this.cameras.main.setBackgroundColor('#0a0f1e');

        // ---------- TOPO 55% — Arte da sala (janela com luz volumétrica) ----------
        // Fundo arte: usar tileset do bioma se houver, senão prisão genérica
        const topH = H * 0.55;
        const topBg = this.add.graphics();
        topBg.fillStyle(0x1a2a3a, 1).fillRect(0, 0, W, topH);
        // parede de tijolos (simular com tiles escuros)
        const tilesKey = this.biomeId ? 'tiles_' + this.biomeId : null;
        if (tilesKey && this.textures.exists(tilesKey)) {
            // desenhar 4 tiles como preview do bioma
            try {
                const man = this.cache.json.get('manifest') || {};
                const tiles = man[tilesKey]?.tiles;
                if (tiles) {
                    const tex = this.add.renderTexture(0, 0, W, topH).setOrigin(0);
                    // preencher com dirt do bioma
                    for (let y = 0; y < topH; y += 16) {
                        for (let x = 0; x < W; x += 16) {
                            const frame = tiles.dirt ?? 0;
                            tex.drawFrame(tilesKey, frame, x, y);
                        }
                    }
                    tex.setAlpha(0.35);
                }
            } catch {}
        }

        // Janela central com luz volumétrica amarela (como Dead Cells)
        const winX = W * 0.52, winY = topH * 0.42;
        const winW = 78, winH = 92;
        // brilho atrás da janela
        const glow = this.add.graphics();
        glow.fillStyle(0xffd54a, 0.18).fillRect(winX - winW, winY - winH * 0.6, winW * 2, winH * 1.6);
        glow.fillStyle(0xffe066, 0.12).fillRect(winX - winW * 0.6, winY - winH * 0.5, winW * 1.2, winH * 1.2);
        // janela em arco
        const win = this.add.graphics();
        win.fillStyle(0x2a3a4a, 1).fillRect(winX - winW/2 - 6, winY - winH/2, winW + 12, winH);
        win.fillStyle(0x4a5a6a, 1).fillCircle(winX, winY - winH/2, winW/2 + 6);
        // grades + luz
        win.fillStyle(0xffd54a, 1).fillRect(winX - winW/2, winY - winH/2 + 6, winW, winH - 12);
        for (let i = 1; i < 4; i++) {
            win.fillStyle(0x2a3a4a, 1).fillRect(winX - winW/2 + i * (winW/4) -1, winY - winH/2 + 6, 2, winH - 12);
        }
        // feixe de luz no chão
        win.fillStyle(0xffe066, 0.22).fillTriangle(winX - winW/2, winY + winH/2, winX + winW/2, winY + winH/2, winX + winW*0.7, topH - 14);
        win.fillStyle(0xffffff, 0.08).fillTriangle(winX - winW/2, winY + winH/2, winX + winW/2, winY + winH/2, winX - winW*0.3, topH - 14);

        // Gaiola pendurada à direita da janela
        const cage = this.add.graphics();
        cage.lineStyle(1.5, 0x0a0f1e, 1);
        cage.strokeRect(winX + winW/2 + 22, winY - winH/2 + 10, 18, 28);
        cage.lineStyle(1, 0x1a2a3a, 0.8);
        for (let i = 0; i < 4; i++) cage.lineBetween(winX + winW/2 + 22 + i*4.5, winY - winH/2 + 10, winX + winW/2 + 22 + i*4.5, winY - winH/2 + 38);
        cage.fillStyle(0x3a0a0a, 1).fillCircle(winX + winW/2 + 31, winY - winH/2 + 30, 3);

        // Caveira / prisioneiro silhueta à esquerda (como Dead Cells)
        const skull = this.add.graphics();
        skull.fillStyle(0x0a0f1e, 0.55).fillCircle(W * 0.18, topH * 0.42, 28);
        skull.fillStyle(0x1a2a3a, 1).fillCircle(W * 0.18, topH * 0.42, 14);
        skull.fillStyle(0x0a0f1e, 1).fillCircle(W * 0.16, topH * 0.40, 3);
        skull.fillCircle(W * 0.20, topH * 0.40, 3);

        // Personagem de costas (prisioneiro) ao centro, pequeno, com lança
        const hero = this.add.graphics();
        hero.fillStyle(0x8a9ab0, 1).fillRect(W * 0.50 - 6, topH - 42, 12, 22);
        hero.fillStyle(0x3a4a6a, 1).fillRect(W * 0.50 - 8, topH - 28, 16, 14);
        // lança esticada para esquerda
        hero.lineStyle(3, 0xc87a2a, 1);
        hero.lineBetween(W * 0.50 - 2, topH - 36, W * 0.12, topH * 0.22);
        hero.lineStyle(1, 0x6a6a6a, 1);
        hero.lineBetween(W * 0.50 - 2, topH - 36, W * 0.50 + 14, topH - 32);

        // Névoa azul nas bordas inferiores da arte
        const fog = this.add.graphics();
        fog.fillStyle(0x0a0f1e, 0.55).fillRect(0, topH - 22, W, 22);
        fog.fillStyle(0x3a5a7a, 0.12).fillRect(0, topH - 40, W, 18);

        // ---------- BASE 45% — Painel escuro com título, lore e carregando ----------
        const botY = topH;
        const botH = H - topH;
        const panel = this.add.graphics();
        panel.fillStyle(0x0a0f1e, 1).fillRect(0, botY, W, botH);

        // Título centralizado (bioma ou genérico)
        let title = this.customTitle;
        if (!title) {
            if (this.biomeId && BiomeManager.byId(this.biomeId)) {
                const b = BiomeManager.byId(this.biomeId);
                title = b.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            } else {
                title = 'CÂMARA DA RAINHA';
                // remover acento se fonte não tem, mas tentar manter
                try { this.add.bitmapText(0,0,'fumiga','Á',8); } catch { title = 'CAMARA DA RAINHA'; }
            }
        }
        // tentativa com acento, fallback sem
        const titleText = title.toUpperCase();
        this.add.bitmapText(W/2 + 1, botY + 28 + 1, 'fumiga', titleText, 10).setOrigin(0.5).setTint(0x000000).setAlpha(0.6);
        this.add.bitmapText(W/2, botY + 28, 'fumiga', titleText, 10).setOrigin(0.5).setTint(0xe8d9b5);

        // Linhas finas acima e abaixo
        const line = this.add.graphics();
        line.lineStyle(1, 0x3c4a6a, 0.9);
        line.lineBetween(W*0.18, botY + 44, W*0.82, botY + 44);
        line.lineBetween(W*0.18, botY + 92, W*0.82, botY + 92);

        // Lore (2 linhas, centralizado, cinza azulado)
        let lore = this.customLore;
        if (!lore) {
            if (this.biomeId) {
                const tips = this.cache.json.get('tips');
                if (tips && tips.lore && tips.lore[this.biomeId]) lore = tips.lore[this.biomeId];
                else if (tips && tips.loading) lore = tips.loading[Math.floor(Math.random()*tips.loading.length)];
                else lore = 'Na hierarquia social desta colônia, há as operárias, os soldados e, abaixo deles, a rainha.';
            } else {
                lore = 'Na hierarquia social desta colônia, há as operárias, os soldados e, abaixo deles, a rainha.';
            }
        }
        // quebra em 2 linhas manuais (max 48 chars cada)
        const wrap = (s, n=48) => {
            const words = s.split(' ');
            const lines = []; let cur = '';
            for (const w of words) {
                if ((cur + ' ' + w).trim().length > n) { lines.push(cur.trim()); cur = w; }
                else cur += ' ' + w;
            }
            if (cur) lines.push(cur.trim());
            return lines.slice(0,2);
        };
        const lines = wrap(lore);
        lines.forEach((ln, i) => {
            this.add.bitmapText(W/2, botY + 58 + i*13, 'fumiga', ln, 7).setOrigin(0.5).setTint(0x8a9ab0);
        });

        // "Carregando..." canto inferior direito com ícone célula/geleia pulsante
        const cx = W - 70, cy = H - 22;
        const icon = this.add.graphics();
        icon.fillStyle(0xc83a2a, 1).fillCircle(cx - 28, cy, 10);
        icon.fillStyle(0xffffff, 0.9).fillCircle(cx - 28, cy - 1, 3);
        // brilho
        this.tweens.add({ targets: icon, alpha: { from: 1, to: 0.55 }, duration: 500, yoyo: true, repeat: -1 });
        const lbl = this.add.bitmapText(cx - 16, cy, 'fumiga', 'Carregando...', 8).setOrigin(0, 0.5).setTint(0xe8d9b5);
        this.tweens.add({ targets: lbl, alpha: { from: 1, to: 0.45 }, duration: 600, yoyo: true, repeat: -1 });

        // Barra fina opcional (oculta, mas preenche para feedback)
        const bw = W * 0.64, bx = W/2 - bw/2, by = H - 44;
        const frame = this.add.graphics();
        frame.fillStyle(0x1a2a3a, 1).fillRect(bx, by, bw, 4);
        frame.lineStyle(1, 0x3c4a6a, 0.6).strokeRect(bx, by, bw, 4);
        const fill = this.add.graphics();
        const state = { p: 0 };
        this.tweens.add({
            targets: state,
            p: 1,
            duration: this.duration,
            ease: 'Linear',
            onUpdate: () => {
                fill.clear();
                fill.fillStyle(0xc83a2a, 1).fillRect(bx + 1, by + 1, (bw - 2) * state.p, 2);
            },
            onComplete: () => this._go()
        });

        this.cameras.main.fadeIn(200, 10, 15, 30);
    }

    _go() {
        this.cameras.main.fadeOut(200, 10, 15, 30);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // payload pode conter biome
            if (this.nextScene === 'GameScene' && this.biomeId) {
                this.scene.start(this.nextScene, { biome: this.biomeId, ...this.payload });
            } else {
                this.scene.start(this.nextScene, this.payload);
            }
        });
    }
}
