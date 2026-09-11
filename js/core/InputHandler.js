/**
 * js/core/InputHandler.js — Captura de toques, Swipe/Pan, Pinch e Menu Radial [TDD §2/§3]
 * ---------------------------------------------------------------------------
 * - Arrastar (movimento >10px) -> Pan de câmera.
 * - Pinch (2 dedos) -> Zoom.
 * - Segurar parado 300ms -> Pausa Tática + Menu Radial (TimeController).
 * - Teclado (beta desktop): WASD pan, Q/E ou +/- zoom, Espaço pausa.
 * ---------------------------------------------------------------------------
 */
export class InputHandler {
    constructor(scene) {
        this.scene = scene;
        this.pointers = new Map();
        this.panLast = null;
        this.pinchDist = 0;
        this.keys = null;
    }

    attach() {
        const s = this.scene;
        const input = s.input;

        input.on('pointerdown', (p) => {
            this.pointers.set(p.id, p);
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
                s.timeController.cancelLongPress();
                return;
            }
            this.panLast = { x: p.x, y: p.y };
            if (s.radial && s.radial.isOpen) return; // menu aberto: não re-dispara
            s.timeController.onPointerDown(p);
        });

        input.on('pointermove', (p) => {
            if (this.pointers.has(p.id)) this.pointers.set(p.id, p);

            // radial hover
            if (s.radial && s.radial.isOpen) {
                s.radial.hover(p);
                return;
            }

            // pinch
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (this.pinchDist > 0) {
                    const zoom = Phaser.Math.Clamp(s.cam.zoom * (d / this.pinchDist), 0.75, 3);
                    s.cam.setZoom(zoom);
                }
                this.pinchDist = d;
                return;
            }

            // pan
            if (p.isDown && this.panLast) {
                const dx = p.x - this.panLast.x;
                const dy = p.y - this.panLast.y;
                if (Math.abs(dx) + Math.abs(dy) > 2) {
                    s.timeController.movedBeyond();
                    s.cam.scrollX -= dx / s.cam.zoom;
                    s.cam.scrollY -= dy / s.cam.zoom;
                }
                this.panLast = { x: p.x, y: p.y };
            }
        });

        input.on('pointerup', (p) => {
            this.pointers.delete(p.id);
            this.pinchDist = 0;
            this.panLast = null;
            if (s.radial && s.radial.isOpen) {
                s.radial.resolve(p);
            }
            s.timeController.cancelLongPress();
        });

        // teclado (beta desktop)
        if (s.input.keyboard) {
            this.keys = s.input.keyboard.addKeys('W,A,S,D,Q,E,SPACE');
            s.input.keyboard.on('keydown-SPACE', () => {
                if (s.timeController.isPaused) {
                    s.radial && s.radial.forceResolve();
                } else {
                    const center = s.cam.getWorldPoint(s.game.config.width / 2, s.game.config.height / 2);
                    s.timeController.triggerTacticalPause({ worldX: center.x, worldY: center.y, keyboard: true });
                }
            });
        }
    }

    update() {
        const s = this.scene;
        if (!this.keys || s.timeController.isPaused) return;
        const sp = 240 / s.cam.zoom;
        if (this.keys.W.isDown) s.cam.scrollY -= sp * 0.016 * 60 * 0.016;
        if (this.keys.S.isDown) s.cam.scrollY += sp * 0.016;
        if (this.keys.A.isDown) s.cam.scrollX -= sp * 0.016;
        if (this.keys.D.isDown) s.cam.scrollX += sp * 0.016;
        if (this.keys.Q.isDown) s.cam.setZoom(Phaser.Math.Clamp(s.cam.zoom + 0.02, 0.75, 3));
        if (this.keys.E.isDown) s.cam.setZoom(Phaser.Math.Clamp(s.cam.zoom - 0.02, 0.75, 3));
    }
}
