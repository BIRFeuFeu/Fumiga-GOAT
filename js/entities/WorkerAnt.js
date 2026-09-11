/**
 * js/entities/WorkerAnt.js — IA de escavação e construção  [TDD §4.2 / GDD §6.2]
 * ---------------------------------------------------------------------------
 * Restrita ao subterrâneo. Lê a Fila de Tarefas do RoomBuilder, usa A* até o
 * alvo e, ao concluir, altera o tile na matriz global (100% passiva).
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';

export class WorkerAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_worker', cfg, 'worker');
        this.fleeRadius = 4; // foge no sentido oposto de ameaças
        this.canFight = false;
        this.job = null;
    }

    doIdle(ctx) {
        const rooms = this.scene.gameRef.rooms;
        // pega uma tarefa se não tem
        if (!this.job) {
            this.job = rooms.claimJob(this.tile());
            if (this.job) {
                const adj = this.scene.gameRef.grid.nearestWalkable(this.job.x, this.job.y, 2) || this.job;
                this.setPathTo(adj.x, adj.y);
            }
        }
        if (this.job) {
            const moving = this.followPath(this.scene.gameDelta / 1000);
            const d = Math.hypot(this.job.x * TILE + TILE / 2 - this.x, this.job.y * TILE + TILE / 2 - this.y);
            if (d <= TILE * 1.6) {
                // trabalha
                this.playAttack();
                this.workTimer += this.scene.gameDelta / 1000;
                const need = this.job.kind === 'build' ? 1.2 : this.job.digTime || 0.8;
                if (this.workTimer >= need) {
                    this.workTimer = 0;
                    rooms.completeJob(this.job, this);
                    this.job = null;
                }
                return 'running';
            }
            return moving ? 'running' : 'running';
        }
        return 'success';
    }
}
