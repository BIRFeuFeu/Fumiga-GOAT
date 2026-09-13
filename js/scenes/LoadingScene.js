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

        this.cameras.main.setBackgroundColor('#0b0705');

        const biome = BiomeManager.byId(this.biomeId);
        // ---------- TOPO 55% — Arte do bioma com luz volumétrica (réplica Tela_de_carregamento_geral.jpg) ----------
        const topH = H * 0.55;
        // Arte: preview do tileset do bioma atrás de uma janela com luz
        const topBg = this.add.graphics();
        topBg.fillStyle(0x0a0f1e, 1).fillRect(0, 0, W, topH);
        // tentar desenhar tiles do bioma como textura de fundo suave
        const tilesKey = 'tiles_' + this.biomeId;
        if (this.textures.exists(tilesKey)) {
            try {
                const tex = this.add.renderTexture(0, 0, W, topH).setOrigin(0);
                const man = this.cache.json.get('manifest') || {};
                const tiles = man[tilesKey]?.tiles;
                if (tiles) {
                    for (let y = 0; y < topH; y += 16) for (let x = 0; x < W; x += 16) {
                        const f = tiles.dirt ?? 0;
                        tex.drawFrame(tilesKey, f, x, y);
                    }
                    tex.setAlpha(0.28);
                }
            } catch {}
        }
        // janela em arco com luz amarela (como Dead Cells)
        const winX = W * 0.52, winY = topH * 0.42;
        const winW = 78, winH = 92;
        const glow = this.add.graphics();
        glow.fillStyle(0xffd54a, 0.16).fillRect(winX - winW, winY - winH * 0.6, winW * 2, winH * 1.6);
        const win = this.add.graphics();
        win.fillStyle(0x2a3a4a, 1).fillRect(winX - winW/2 - 6, winY - winH/2, winW + 12, winH);
        win.fillStyle(0x4a5a6a, 1).fillCircle(winX, winY - winH/2, winW/2 + 6);
        win.fillStyle(0xffd54a, 1).fillRect(winX - winW/2, winY - winH/2 + 6, winW, winH - 12);
        for (let i = 1; i < 4; i++) win.fillStyle(0x2a3a4a, 1).fillRect(winX - winW/2 + i * (winW/4) -1, winY - winH/2 + 6, 2, winH - 12);
        win.fillStyle(0xffe066, 0.20).fillTriangle(winX - winW/2, winY + winH/2, winX + winW/2, winY + winH/2, winX + winW*0.7, topH - 14);
        // gaiola
        const cage = this.add.graphics();
        cage.lineStyle(1.4, 0x0a0f1e, 1).strokeRect(winX + winW/2 + 22, winY - winH/2 + 10, 18, 28);
        for (let i = 0; i < 4; i++) cage.lineBetween(winX + winW/2 + 22 + i*4.5, winY - winH/2 + 10, winX + winW/2 + 22 + i*4.5, winY - winH/2 + 38);
        // formiga silhueta prisioneira
        const hero = this.add.graphics();
        hero.fillStyle(0x8a9ab0, 1).fillRect(W * 0.50 - 6, topH - 42, 12, 22);
        hero.fillStyle(0x3a4a6a, 1).fillRect(W * 0.50 - 8, topH - 28, 16, 14);
        hero.lineStyle(2.5, 0xc87a2a, 1).lineBetween(W * 0.50 - 2, topH - 36, W * 0.14, topH * 0.22);
        // névoa inferior da arte
        const fog = this.add.graphics();
        fog.fillStyle(0x0a0f1e, 0.55).fillRect(0, topH - 22, W, 22);

        // ---------- BASE 45% — Painel escuro com título do bioma, linhas, lore e Carregando... ----------
        const botY = topH;
        // título do bioma (sem clean, com acento se fonte tiver)
        let title = biome.name.toUpperCase();
        // tentar manter acento, mas fallback sem acento se bitmap não tem glyph
        try { this.add.bitmapText(0,0,'fumiga','Á',6); } catch { title = title.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
        this.add.bitmapText(W/2 + 1, botY + 24 + 1, 'fumiga', title, 12).setOrigin(0.5).setTint(0x000000).setAlpha(0.6);
        this.add.bitmapText(W/2, botY + 24, 'fumiga', title, 12).setOrigin(0.5).setTint(0xe8d9b5);
        this.add.bitmapText(W/2, botY + 40, 'fumiga', 'FASE ' + (biome.stage || 1), 7).setOrigin(0.5).setTint(0x6d5a41);
        // linhas finas
        const line = this.add.graphics();
        line.lineStyle(1, 0x3c4a6a, 0.9);
        line.lineBetween(W*0.18, botY + 52, W*0.82, botY + 52);
        line.lineBetween(W*0.18, botY + 92, W*0.82, botY + 92);
        // lore por bioma (tips.json -> lore[biomeId] ou genérica)
        let lore = null;
        const tips = this.cache.json.get('tips');
        if (tips && tips.lore && tips.lore[this.biomeId]) lore = tips.lore[this.biomeId];
        else if (tips && tips.loading) lore = tips.loading[Math.floor(Math.random()*tips.loading.length)];
        else lore = 'Na hierarquia desta colônia, há as operárias, os soldados e, abaixo deles, a rainha.';
        const wrap = (s, n=46) => {
            const words = s.split(' ');
            const lines = []; let cur = '';
            for (const w of words) { if ((cur + ' ' + w).trim().length > n) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
            if (cur) lines.push(cur.trim());
            return lines.slice(0,2);
        };
        const llines = wrap(lore);
        llines.forEach((ln,i) => this.add.bitmapText(W/2, botY + 66 + i*12, 'fumiga', ln, 6).setOrigin(0.5).setTint(0x8a9ab0));

        // "Carregando..." pulsante canto inf. dir. com ícone geleia
        const cx = W - 72, cy = H - 18;
        const ic = this.add.graphics();
        ic.fillStyle(0xc83a2a, 1).fillCircle(cx - 26, cy, 8);
        ic.fillStyle(0xffffff, 0.9).fillCircle(cx - 26, cy - 1, 2.5);
        this.tweens.add({ targets: ic, alpha: { from: 1, to: 0.5 }, duration: 500, yoyo: true, repeat: -1 });
        const lbl = this.add.bitmapText(cx - 14, cy, 'fumiga', 'Carregando...', 7).setOrigin(0, 0.5).setTint(0xe8d9b5);
        this.tweens.add({ targets: lbl, alpha: { from: 1, to: 0.45 }, duration: 600, yoyo: true, repeat: -1 });

        // ---------- barra fina + transição para GameScene (sempre via carregamento completo) ----------
        const bw = W * 0.64, bx = W/2 - bw/2, by = H - 36;
        const frame = this.add.graphics();
        frame.fillStyle(0x1a2a3a, 1).fillRect(bx, by, bw, 4);
        frame.lineStyle(1, 0x3c4a6a, 0.6).strokeRect(bx, by, bw, 4);
        const fill = this.add.graphics();
        const prog = this.add.bitmapText(W/2, by - 10, 'fumiga', '0%', 6).setOrigin(0.5).setTint(0x6d5a41);
        const state = { p: 0 };
        this.tweens.add({
            targets: state,
            p: 1,
            duration: LOAD_MS,
            ease: 'Linear',
            onUpdate: () => {
                fill.clear();
                fill.fillStyle(0xc83a2a, 1).fillRect(bx + 1, by + 1, (bw - 2) * state.p, 2);
                prog.setText(Math.round(state.p * 100) + '%');
            },
            onComplete: () => {
                this.cameras.main.fadeOut(200, 10, 15, 30);
                this.cameras.main.once('camerafadeoutcomplete', () =>
                    this.scene.start('GameScene', { biome: this.biomeId }));
            }
        });

        this.cameras.main.fadeIn(250, 10, 15, 30);
    }
}
