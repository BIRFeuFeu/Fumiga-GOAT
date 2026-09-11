/**
 * js/entities/GuardianAnt.js — Sentinela de escolta (Hard Aggro)  [GDD §6.2]
 * ---------------------------------------------------------------------------
 * Escolta Coletoras formando um perímetro. Hard Aggro de 10 blocos (ataca sem
 * ordem). Não persegue além de 15 blocos para não abandonar a escolta.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';

export class GuardianAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_guardian', cfg, 'guardian');
        this.aggroRadius = 10;
        this.maxChase = 15;
        this.canFight = true;
        this.hardAggro = true;
        this.range = 1;
        this.pheromoneTypes = ['retreat'];
        this.anchor = null;
    }

    doIdle(ctx) {
        // escolta a coletora mais próxima
        const ward = this.scene.findNearestWard(this);
        this.anchor = ward || this.scene.gameRef.queenTilePx;
        if (this.anchor && Math.hypot(this.anchor.x - this.x, this.anchor.y - this.y) > TILE * 3) {
            this.chase({ x: this.anchor.x, y: this.anchor.y }, this.scene.gameDelta / 1000);
        }
        return 'success';
    }

    // limita perseguição
    attackNearest(ctx) {
        const e = this._nearestEnemy;
        if (e && this.anchor && this.distTo(this.anchor) > this.maxChase * TILE) {
            return 'failure'; // volta para a escolta
        }
        return super.attackNearest(ctx);
    }
}
