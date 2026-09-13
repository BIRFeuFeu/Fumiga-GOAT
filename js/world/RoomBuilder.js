/**
 * js/world/RoomBuilder.js — Construção de salas e buffs de grid  [TDD §6.2 / GDD §5]
 * ---------------------------------------------------------------------------
 * Ao confirmar no Menu Radial: altera o índice da matriz p/ o ID da sala,
 * instancia o sprite do tile e aplica lógicas embutidas (Túnel Falso = Zone de
 * lentidão via overlap; Câmara de Fungos = renda passiva; Berçário = spawn).
 * Escavação usa a Fila de Tarefas consumida pelas Operárias.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';

export const ROOM_DEFS = {
    nursery: { cost: 50, name: 'Berçário', prop: 'nursery', desc: '+20% velocidade de nascimento' },
    pantry: { cost: 40, name: 'Despensa', prop: 'pantry', desc: '+100 Biomassa máx.' },
    defense: { cost: 60, name: 'Câmara de Defesa', prop: 'defense', desc: '+10% Armadura guarnição' },
    trap: { cost: 30, name: 'Túnel Falso', prop: 'trap', desc: 'Inimigos -50% velocidade' },
    fungus: { cost: 100, name: 'Câmara de Fungos', prop: 'fungus', desc: '+2 Biomassa / 5s' }
};

export class RoomBuilder {
    constructor(scene) {
        this.scene = scene;
        this.pendingJobs = [];
        this.rooms = []; // {x,y,id}
        this.trapZones = [];
        this.sprites = [];
    }

    /** Operária reivindica a tarefa mais próxima não reivindicada. */
    claimJob(fromTile) {
        let best = null;
        let bestD = Infinity;
        for (const j of this.pendingJobs) {
            if (j.claimed) continue;
            const d = (j.x - fromTile.x) ** 2 + (j.y - fromTile.y) ** 2;
            if (d < bestD) {
                bestD = d;
                best = j;
            }
        }
        if (best) best.claimed = true;
        return best;
    }

    requestDig(x, y, digTime = 0.8) {
        const g = this.scene.gameRef;
        if (g.grid.get(x, y) !== 0) return false;
        if (this.pendingJobs.some((j) => j.x === x && j.y === y && j.kind === 'dig')) return false;
        this.pendingJobs.push({ x, y, kind: 'dig', claimed: false, digTime });
        return true;
    }

    /** Conclui uma tarefa (escavar vira WALK; construir vira ROOM). */
    completeJob(job, worker) {
        const g = this.scene.gameRef;
        this.pendingJobs = this.pendingJobs.filter((j) => j !== job);
        if (job.kind === 'dig') {
            g.grid.set(job.x, job.y, 1);
            this.scene.redrawTile(job.x, job.y);
            this.scene.audio.play('dig');
        } else if (job.kind === 'build') {
            this._placeRoom(job.x, job.y, job.roomId);
        }
    }

    /** Construção instantânea (pagando Biomassa) usada pelo Menu Radial. */
    buildRoom(x, y, roomId) {
        const def = ROOM_DEFS[roomId];
        const g = this.scene.gameRef;
        if (!def) return false;
        if (g.grid.get(x, y) !== 1) return false; // só em espaço vazio
        if (!g.economy.spend(def.cost)) return false;
        this._placeRoom(x, y, roomId);
        return true;
    }

    _placeRoom(x, y, roomId) {
        const g = this.scene.gameRef;
        g.grid.set(x, y, 2);
        this.scene.redrawTile(x, y, roomId);
        this.rooms.push({ x, y, id: roomId });
        g.statsRooms();
        this.scene.audio.play('build');

        if (roomId === 'pantry') g.economy.addMax(120); // [A-01] +100→+120
        if (roomId === 'fungus') this._recomputePassive();
        if (roomId === 'trap') {
            const zone = this.scene.physics.add.zone(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE, TILE);
            this.trapZones.push(zone);
            this.scene.physics.add.overlap(this.scene.enemies, zone, (enemy) => {
                enemy.addStatus('slow', { duration: 1 });
            });
        }
        this.scene.events.emit('roomBuilt', { x, y, id: roomId });
    }

    _recomputePassive() {
        const fungus = this.rooms.filter((r) => r.id === 'fungus').length;
        this.scene.gameRef.economy.setPassiveRate(0.1 + fungus * 0.4); // [A-01] base 0.1/s
    }

    count(id) {
        return this.rooms.filter((r) => r.id === id).length;
    }

    nurseryMult() {
        return Math.pow(0.8, this.count('nursery'));
    }

    defenseArmor() {
        return Math.min(20, this.count('defense') * 2);
    }
}
