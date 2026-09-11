/**
 * js/entities/CollectorAnt.js — IA de coleta de Biomassa  [TDD §4.2 / GDD §6.2]
 * ---------------------------------------------------------------------------
 * Segue o "Feromônio de Coleta", extrai recurso (1s) e retorna à Despensa.
 * Fuga automática se um inimigo entrar num raio de 8 blocos.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';

export class CollectorAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_collector', cfg, 'collector');
        this.fleeRadius = 8;
        this.canFight = false;
        this.pheromoneTypes = ['collect', 'retreat'];
        this.extractTimer = 0;
        this.targetNode = null;
    }

    doIdle(ctx) {
        const g = this.scene.gameRef;
        // retornando com carga
        if (this.carrying > 0) {
            this.setPathTo(g.queenTile.x, g.queenTile.y);
            const moving = this.followPath(this.scene.gameDelta / 1000);
            if (this.tile().x === g.queenTile.x && this.tile().y === g.queenTile.y) {
                g.economy.add(this.carrying);
                g.statsBiomass(this.carrying);
                this.carrying = 0;
            }
            return 'running';
        }
        // com feromônio de coleta: busca nó de recurso na zona
        const z = g.pheromone.nearest('collect', this.tile().x, this.tile().y);
        if (z) {
            if (!this.targetNode || this.targetNode.taken) {
                this.targetNode = this.scene.findResourceNear(z.x, z.y);
            }
            if (this.targetNode) {
                this.setPathTo(this.targetNode.x, this.targetNode.y);
                this.followPath(this.scene.gameDelta / 1000);
                const d = Math.hypot(this.targetNode.x * TILE - this.x, this.targetNode.y * TILE - this.y);
                if (d <= TILE) {
                    this.extractTimer += this.scene.gameDelta / 1000;
                    if (this.extractTimer >= 1) {
                        this.extractTimer = 0;
                        this.carrying = this.targetNode.value || 10;
                        this.scene.removeResource(this.targetNode);
                        this.targetNode = null;
                    }
                }
                return 'running';
            }
        }
        // sem tarefa: fica perto da base
        return 'success';
    }
}
