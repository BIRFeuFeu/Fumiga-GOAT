/**
 * js/entities/SoldierAnt.js — Força base de combate (Melee)  [GDD §6.2]
 * ---------------------------------------------------------------------------
 * Fica em prontidão na base; corre p/ superfície com o "Feromônio de Ataque",
 * ativa Aggro de 12 blocos e engaja o inimigo mais próximo.
 * ---------------------------------------------------------------------------
 */
import { AntBase } from './AntBase.js';

export class SoldierAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_soldier', cfg, 'soldier');
        this.aggroRadius = 12;
        this.canFight = true;
        this.range = 1;
        this.pheromoneTypes = ['attack', 'retreat'];
    }

    doIdle() {
        // garrison: mantém-se próximo da Rainha
        const g = this.scene.gameRef;
        const d = Math.hypot(g.queenTile.x * 16 - this.x, g.queenTile.y * 16 - this.y);
        if (d > 16 * 5) {
            this.setPathTo(g.queenTile.x, g.queenTile.y);
            this.followPath(this.scene.gameDelta / 1000);
        }
        return 'success';
    }
}
