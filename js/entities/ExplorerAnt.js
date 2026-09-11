/**
 * js/entities/ExplorerAnt.js — Exploradora nômade (revela Névoa)  [GDD §6.2]
 * ---------------------------------------------------------------------------
 * Anda pelo mapa revelando o Fog of War. Furtiva (inimigos demoram 3x mais para
 * notá-la). Marca recursos encontrados automaticamente para as Coletoras.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';

export class ExplorerAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_scout', cfg, 'scout');
        this.fleeRadius = 6;
        this.canFight = false;
        this.stealth = true;
        this.wanderTarget = null;
        this.revealTimer = 0;
        this.setAlpha(0.85);
    }

    doIdle(ctx) {
        const g = this.scene.gameRef;
        if (!this.wanderTarget || Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y) < TILE) {
            // escolhe um ponto aleatório caminhável (nômade)
            const t = this.scene.randomWalkable();
            if (t) {
                this.wanderTarget = { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
                this.setPathTo(t.x, t.y);
            }
        }
        this.followPath(this.scene.gameDelta / 1000);

        // revela névoa + marca recursos
        this.revealTimer += this.scene.gameDelta / 1000;
        if (this.revealTimer > 0.25) {
            this.revealTimer = 0;
            this.scene.revealFog(this.tile().x, this.tile().y, 4);
            this.scene.markResourcesNear(this.tile().x, this.tile().y, 3);
        }
        return 'success';
    }
}
