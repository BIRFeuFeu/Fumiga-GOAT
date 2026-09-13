/**
 * js/core/InputHandler.js — Captura de toques, Swipe/Pan, Pinch e Menu Radial [TDD §2/§3]
 * ---------------------------------------------------------------------------
 * - Arrastar (movimento >14px) -> Pan de câmera [J-01]
 * - Pinch (2 dedos) -> Zoom ancorado [J-04]
 * - Segurar parado 300ms (threshold 14px + histerese 80ms) -> Pausa Tática + Menu Radial [J-02]
 * - Máquina HOLDING vs DRAGGING + anel progresso 0→360° em 300ms + vibrate [J-02]
 * - Teclado (beta desktop): WASD pan, Q/E zoom, Espaço pausa sobre Rainha [J-08]
 * ---------------------------------------------------------------------------
 */
export class InputHandler {
    constructor(scene) {
        this.scene = scene;
        this.pointers = new Map();
        this.panLast = null;
        this.pinchDist = 0;
        this.pinchMid = null;
        this.keys = null;
        this.state = 'idle'; // idle | holding | tactical | dragging
        this.progressRing = null;
        this.progressTween = null;
        this.holdStart = { x: 0, y: 0, t: 0 };
    }

    attach() {
        const s = this.scene;
        const input = s.input;

        input.on('pointerdown', (p) => {
            this.pointers.set(p.id, p);
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
                this.pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                s.timeController.cancelLongPress();
                this._clearProgress();
                this.state = 'idle';
                return;
            }
            this.panLast = { x: p.x, y: p.y };
            if (s.radial && s.radial.isOpen) return;
            s.timeController.onPointerDown(p);
            this.state = 'holding';
            this.holdStart = { x: p.x, y: p.y, t: Date.now() };
            this._showProgress(p.x, p.y);
        });

        input.on('pointermove', (p) => {
            if (this.pointers.has(p.id)) this.pointers.set(p.id, p);

            if (s.radial && s.radial.isOpen) {
                s.radial.hover(p);
                return;
            }

            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                if (this.pinchDist > 0) {
                    const factor = d / this.pinchDist;
                    const newZoom = Phaser.Math.Clamp(s.cam.zoom * factor, 0.75, 3);
                    // zoom ancorado no ponto médio [J-04]
                    if (s.cam.zoomToPoint) {
                        try { s.cam.zoomToPoint(newZoom, mid); } catch { s.cam.setZoom(newZoom); }
                    } else s.cam.setZoom(newZoom);
                    // HUD zoom temporário
                    if (s.showZoomHUD) s.showZoomHUD(newZoom);
                }
                this.pinchDist = d;
                this.pinchMid = mid;
                return;
            }

            if (this.state === 'holding' && p.isDown) {
                const dx = p.x - this.holdStart.x;
                const dy = p.y - this.holdStart.y;
                const dist = Math.hypot(dx, dy);
                const elapsed = Date.now() - this.holdStart.t;
                // se moveu >14 antes de 300ms → vira dragging/pan [J-02]
                if (dist > 14 && elapsed < 300) {
                    this.state = 'dragging';
                    s.timeController.movedBeyond(dist);
                    this._clearProgress();
                } else if (dist > 14) {
                    s.timeController.movedBeyond(dist);
                }
                // se ainda holding, não faz pan (bloqueia scroll durante tactical)
                if (this.state === 'holding') return;
            }

            if (p.isDown && this.panLast && this.state !== 'holding') {
                const dx = p.x - this.panLast.x;
                const dy = p.y - this.panLast.y;
                if (Math.abs(dx) + Math.abs(dy) > 2) {
                    if (!s.timeController.isPaused) {
                        s.cam.scrollX -= dx / s.cam.zoom;
                        s.cam.scrollY -= dy / s.cam.zoom;
                    }
                }
                this.panLast = { x: p.x, y: p.y };
            }
        });

        input.on('pointerup', (p) => {
            this.pointers.delete(p.id);
            this.pinchDist = 0;
            this.pinchMid = null;
            this.panLast = null;
            this._clearProgress();
            if (s.radial && s.radial.isOpen) {
                s.radial.resolve(p);
                this.state = 'idle';
                return;
            }
            s.timeController.cancelLongPress();
            this.state = 'idle';
        });

        // teclado
        if (s.input.keyboard) {
            this.keys = s.input.keyboard.addKeys('W,A,S,D,Q,E,SPACE,SHIFT');
            s.input.keyboard.on('keydown-SPACE', () => {
                if (s.timeController.isPaused) {
                    s.radial && s.radial.forceResolve();
                    this.state = 'idle';
                } else {
                    // abre sobre Rainha, não centro [J-08]
                    let wx, wy;
                    try {
                        const q = s.gameRef ? s.gameRef.queenTile : null;
                        if (q) {
                            wx = q.x * 16 + 8;
                            wy = q.y * 16 + 8;
                            const sp = s.cam.worldView;
                            // se fora da viewport, busca walkable próximo
                            if (wx < sp.x || wx > sp.right || wy < sp.y || wy > sp.bottom) {
                                const near = s.gameRef.grid.nearestWalkable(q.x, q.y, 6);
                                if (near) { wx = near.x * 16 + 8; wy = near.y * 16 + 8; }
                            }
                            const screen = s.cam.worldToCamera ? s.cam.worldToCamera(wx, wy) : { x: s.game.config.width/2, y: s.game.config.height/2 };
                            // fallback se worldToCamera não existir
                            const sx = s.cam.worldView ? (wx - s.cam.worldView.x) * s.cam.zoom : s.game.config.width/2;
                            const sy = s.cam.worldView ? (wy - s.cam.worldView.y) * s.cam.zoom : s.game.config.height/2;
                            wx = sx; wy = sy;
                        } else {
                            wx = s.game.config.width / 2; wy = s.game.config.height / 2;
                        }
                    } catch {
                        wx = s.game.config.width / 2; wy = s.game.config.height / 2;
                    }
                    this.state = 'tactical';
                    s.timeController.triggerTacticalPause({ x: wx, y: wy, worldX: wx, worldY: wy, keyboard: true });
                }
            });
            s.events.on('tacticalResume', () => { this.state = 'idle'; });
            s.events.on('tacticalPause', () => { this.state = 'tactical'; this._clearProgress(); });
        }
    }

    _showProgress(x, y) {
        const s = this.scene;
        this._clearProgress();
        try {
            const g = s.add.graphics();
            g.setScrollFactor(0);
            g.setDepth(30);
            g.lineStyle(3, 0xc8ff5a, 0.95);
            // anel 0→360 em 300ms
            let prog = 0;
            this.progressTween = s.tweens.add({
                targets: { p: 0 },
                p: 1,
                duration: 300,
                onUpdate: (tw) => {
                    prog = tw.getValue();
                    g.clear();
                    g.lineStyle(3, 0xc8ff5a, 0.95);
                    if (prog > 0.02) {
                        g.beginPath();
                        g.arc(x, y, 18, -Math.PI/2, -Math.PI/2 + Math.PI*2*prog, false);
                        g.strokePath();
                    }
                    // fundo sutil
                    g.lineStyle(2, 0xffffff, 0.15);
                    g.strokeCircle(x, y, 18);
                },
                onComplete: () => {
                    // quando completa, o TimeController já disparou tactical
                }
            });
            this.progressRing = g;
        } catch {}
    }

    _clearProgress() {
        try {
            if (this.progressTween) { this.progressTween.stop(); this.progressTween = null; }
            if (this.progressRing) { this.progressRing.destroy(); this.progressRing = null; }
        } catch {}
    }

    update() {
        const s = this.scene;
        if (!this.keys || s.timeController.isPaused) return;
        const dt = 0.016; // 60fps
        const base = 240 / s.cam.zoom;
        const sp = base * dt;
        const fast = this.keys.SHIFT && this.keys.SHIFT.isDown ? 1.8 : 1;
        if (this.keys.W.isDown) s.cam.scrollY -= sp * fast;
        if (this.keys.S.isDown) s.cam.scrollY += sp * fast;
        if (this.keys.A.isDown) s.cam.scrollX -= sp * fast;
        if (this.keys.D.isDown) s.cam.scrollX += sp * fast;
        if (this.keys.Q.isDown) s.cam.setZoom(Phaser.Math.Clamp(s.cam.zoom + 0.02, 0.75, 3));
        if (this.keys.E.isDown) s.cam.setZoom(Phaser.Math.Clamp(s.cam.zoom - 0.02, 0.75, 3));
    }
}
