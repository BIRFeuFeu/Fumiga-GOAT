/**
 * js/ui/RadialMenu.js — Menu Radial em fatias (Pie Chart)  [COPIE E COLE PARA O MANUS]
 * ---------------------------------------------------------------------------
 * Anel dividido em fatias com fundo rgba(20,20,20,0.8), separadores âmbar,
 * ícone centralizado + texto curto em fonte Pixel Art, e realce (verde/dourado)
 * ao passar o dedo. Confirmar = soltar o dedo. Desenhado em screen-space
 * (scrollFactor 0) sobre o Canvas, sem botões HTML fixos.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';

const INNER = 26;
const OUTER = 78;

export class RadialMenu {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.options = [];
        this.hoverIndex = -1;
        this.center = { x: 0, y: 0 };
        this.targetTile = null;
        this.g = null; // graphics
        this.nodes = []; // {icon,text}
    }

    buildOptions(tile, worldXY) {
        const s = this.scene;
        const gm = s.gameRef.gm;
        const v = s.gameRef.grid.get(tile.x, tile.y);
        const opts = [];

        const isQueen = tile.x >= s.gameRef.queenTile.x - 1 && tile.x <= s.gameRef.queenTile.x + 1 && tile.y >= s.gameRef.queenTile.y - 1 && tile.y <= s.gameRef.queenTile.y + 1;

        if (isQueen) {
            const classes = ['worker', 'collector', 'scout', 'soldier', 'guardian'];
            if (gm.hasUnlock('unlock_sniper')) classes.push('sniper');
            if (gm.hasUnlock('unlock_spy')) classes.push('spy');
            if (gm.hasUnlock('unlock_healer')) classes.push('healer');
            if (gm.hasUnlock('unlock_digger')) classes.push('digger');
            for (const c of classes) opts.push({ id: 'spawn:' + c, label: c.toUpperCase(), icon: 'ant' });
            if (gm.hasUnlock('unlock_giant')) opts.push({ id: 'spawn:giant', label: 'GIGANTE', icon: 'hp' });
            // novas formigas recortadas (sempre visíveis para teste, custo 35-80)
            if (gm.hasUnlock('unlock_giant') || true) { // mostra 2 novas como demo
                opts.push({ id: 'spawn:ant_new_1', label: 'NOVA1', icon: 'ant' });
                opts.push({ id: 'spawn:ant_new_3', label: 'NOVA3', icon: 'ant' });
            }
        } else if (v === 0) {
            opts.push({ id: 'dig', label: 'CAVAR', icon: 'dig' });
        } else if (v === 1) {
            opts.push({ id: 'build:nursery', label: 'BERCARIO', icon: 'egg_icon' });
            opts.push({ id: 'build:pantry', label: 'DESPENSA', icon: 'leaf' });
            opts.push({ id: 'build:defense', label: 'DEFESA', icon: 'shield' });
            if (gm.hasUnlock('unlock_trap')) opts.push({ id: 'build:trap', label: 'ARMADILHA', icon: 'poison' });
            if (gm.hasUnlock('unlock_fungus')) opts.push({ id: 'build:fungus', label: 'FUNGOS', icon: 'fungus_icon' });
        } else if (v === 4) {
            opts.push({ id: 'pher:collect', label: 'COLETAR', icon: 'pheromone_collect' });
            opts.push({ id: 'pher:attack', label: 'ATACAR', icon: 'pheromone_attack' });
            opts.push({ id: 'pher:retreat', label: 'RECUAR', icon: 'pheromone_retreat' });
        }
        opts.push({ id: 'cancel', label: 'X', icon: 'cancel' });
        return opts.slice(0, 8);
    }

    open(pointer) {
        const s = this.scene;
        let cx = pointer.x, cy = pointer.y;
        // teclado: centra na Rainha, não no centro da câmera [J-08]
        if (pointer.keyboard && s.gameRef && s.gameRef.queenTile) {
            try {
                const q = s.gameRef.queenTile;
                const wx = q.x * TILE + 8, wy = q.y * TILE + 8;
                // converte world -> screen
                const cam = s.cam;
                // Phaser cam: worldView + zoom
                if (cam.worldView) {
                    cx = (wx - cam.worldView.x) * cam.zoom;
                    cy = (wy - cam.worldView.y) * cam.zoom;
                    // clamp dentro da tela
                    cx = Phaser.Math.Clamp(cx, 60, s.game.config.width - 60);
                    cy = Phaser.Math.Clamp(cy, 60, s.game.config.height - 60);
                }
            } catch {}
        }
        const world = s.cam.getWorldPoint(cx, cy);
        this.center = { x: cx, y: cy };
        this.targetTile = { x: Math.floor(world.x / TILE), y: Math.floor(world.y / TILE) };
        this.options = this.buildOptions(this.targetTile, world);
        this.hoverIndex = -1;
        this.isOpen = true;
        this._draw();
        try { s.audio.play('click'); } catch {}
    }

    _clear() {
        if (this.g) this.g.destroy();
        this.nodes.forEach((n) => {
            if (n.icon) n.icon.destroy();
            if (n.text) n.text.destroy();
        });
        this.nodes = [];
        this.g = null;
    }

    _draw() {
        const s = this.scene;
        this._clear();
        const g = s.add.graphics();
        g.setScrollFactor(0);
        g.setDepth(20);
        const n = this.options.length;
        const step = (Math.PI * 2) / n;
        for (let i = 0; i < n; i++) {
            const a0 = -Math.PI / 2 + i * step;
            const a1 = a0 + step;
            const hov = i === this.hoverIndex;
            const isCancel = this.options[i].id === 'cancel';
            // cancel cinza [J-07]
            if (isCancel) g.fillStyle(hov ? 0x555555 : 0x333333, hov ? 0.92 : 0.85);
            else g.fillStyle(hov ? 0x2e7d32 : 0x141414, hov ? 0.92 : 0.8);
            g.slice(this.center.x, this.center.y, OUTER, a0, a1, false);
            g.fillPath();
            g.lineStyle(2, 0xc8912a, 0.9);
            g.beginPath();
            g.moveTo(this.center.x, this.center.y);
            g.lineTo(this.center.x + Math.cos(a0) * OUTER, this.center.y + Math.sin(a0) * OUTER);
            g.strokePath();
        }
        // furo central = cancel
        g.fillStyle(0x0b0705, 0.95);
        g.fillCircle(this.center.x, this.center.y, INNER - 4);
        // X central
        g.lineStyle(2, 0x888888, 0.9);
        g.beginPath();
        g.moveTo(this.center.x - 6, this.center.y - 6);
        g.lineTo(this.center.x + 6, this.center.y + 6);
        g.moveTo(this.center.x + 6, this.center.y - 6);
        g.lineTo(this.center.x - 6, this.center.y + 6);
        g.strokePath();
        this.g = g;

        // ícones + rótulos
        for (let i = 0; i < n; i++) {
            const mid = -Math.PI / 2 + i * step + step / 2;
            const r = (INNER + OUTER) / 2;
            const x = this.center.x + Math.cos(mid) * r;
            const y = this.center.y + Math.sin(mid) * r;
            const opt = this.options[i];
            const icon = s.add.image(x, y - 6, 'ui_icons', this._iconFrame(opt.icon));
            icon.setScrollFactor(0);
            icon.setDepth(21);
            icon.setScale(1.4);
            const text = s.add.bitmapText(x, y + 10, 'fumiga', opt.label, 7);
            text.setOrigin(0.5);
            text.setScrollFactor(0);
            text.setDepth(21);
            text.setTint(i === this.hoverIndex ? 0xc8ff5a : 0xe8d9b5);
            this.nodes.push({ icon, text });
        }
    }

    _iconFrame(name) {
        const manifest = this.scene.cache.json.get('manifest');
        const tiles = manifest.ui_icons.tiles;
        return tiles[name] ?? 0;
    }

    hover(pointer) {
        if (!this.isOpen) return;
        const dx = pointer.x - this.center.x;
        const dy = pointer.y - this.center.y;
        const d = Math.hypot(dx, dy);
        let idx = -1;
        if (d < INNER) {
            // dentro do furo central = cancel [J-07]
            const ci = this.options.findIndex(o => o.id === 'cancel');
            idx = ci >= 0 ? ci : -1;
        } else if (d >= INNER - 6 && d <= OUTER + 10) {
            const n = this.options.length;
            const step = (Math.PI * 2) / n;
            let ang = Math.atan2(dy, dx) + Math.PI / 2;
            while (ang < 0) ang += Math.PI * 2;
            idx = Math.floor(ang / step) % n;
        }
        if (idx !== this.hoverIndex) {
            this.hoverIndex = idx;
            this._draw();
        }
    }

    resolve(pointer) {
        if (!this.isOpen) return;
        this.hover(pointer);
        const idx = this.hoverIndex;
        const opt = idx >= 0 ? this.options[idx] : null;
        this.close();
        this.scene.timeController.resume();
        if (opt && opt.id !== 'cancel') {
            this.scene.executeRadialAction(opt.id, this.targetTile);
        }
    }

    forceResolve() {
        const opt = this.hoverIndex >= 0 ? this.options[this.hoverIndex] : null;
        this.close();
        this.scene.timeController.resume();
        if (opt && opt.id !== 'cancel') this.scene.executeRadialAction(opt.id, this.targetTile);
    }

    close() {
        this.isOpen = false;
        this._clear();
    }
}
