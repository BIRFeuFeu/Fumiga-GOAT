/**
 * js/core/TimeController.js — Pausa Tática e timeScale  [TDD §3.2 / GDD §3.1]
 * ---------------------------------------------------------------------------
 * Long Press (300ms, delta<10px) -> triggerTacticalPause():
 *   scene.time.timeScale = 0.1 (câmera lenta)
 *   scene.physics.world.timeScale = 10 (compensação de colisão)
 *   emite evento p/ UIScene instanciar o Menu Radial.
 * onPointerUp -> executa a ação, destrói o menu, timeScale = 1.0.
 * ---------------------------------------------------------------------------
 */
export class TimeController {
    constructor(scene) {
        this.scene = scene;
        this.isPaused = false;
        this.longPressTimer = null;
        this.pointerStartX = 0;
        this.pointerStartY = 0;
        this.startTime = 0;
        this.heldMs = 0;
    }

    onPointerDown(pointer) {
        this.pointerStartX = pointer.x;
        this.pointerStartY = pointer.y;
        this.startTime = Date.now();
        this.heldMs = 0;
        this.cancelLongPress();
        this.longPressTimer = this.scene.time.delayedCall(300, () => this.triggerTacticalPause(pointer));
    }

    /** Só cancela pausa se delta>14 e held>80ms [J-01] */
    movedBeyond(delta = 10) {
        const held = Date.now() - this.startTime;
        this.heldMs = held;
        // jitter <14px nunca cancela; <80ms também não (histerese)
        if (delta < 14) return;
        if (held < 80) return;
        this.cancelLongPress();
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            this.longPressTimer.remove();
            this.longPressTimer = null;
        }
    }

    triggerTacticalPause(pointer) {
        if (this.isPaused) return;
        this.isPaused = true;
        this.scene.time.timeScale = 0.1; // câmera lenta extrema
        this.scene.physics.world.timeScale = 10; // compensação física
        if (typeof document !== 'undefined') document.body.classList.add('tactical-pause');
        try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
        this.scene.events.emit('tacticalPause', pointer);
        this.scene.game.events.emit('tacticalPause', pointer);
        this.scene.openRadial && this.scene.openRadial(pointer);
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.scene.time.timeScale = 1.0;
        this.scene.physics.world.timeScale = 1;
        if (typeof document !== 'undefined') document.body.classList.remove('tactical-pause');
        this.scene.events.emit('tacticalResume');
        this.scene.game.events.emit('tacticalResume');
    }

    getTimeScale() {
        return this.isPaused ? 0.1 : 1.0;
    }
}
