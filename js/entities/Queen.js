/**
 * js/entities/Queen.js — O Núcleo (Spawner e Game Over)  [TDD §4.2 / GDD §6.1]
 * ---------------------------------------------------------------------------
 * Não controlável. Drena a Fila de Spawn e cospe formigas. Se um inimigo chega
 * a 5 blocos, entra em Pânico e foge p/ o canto oposto da sala. HP 0 -> Game Over.
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { EntityBase } from './EntityBase.js';

export class Queen extends EntityBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'queen', cfg, 'Player');
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 2.5; // segundos (reduzido por Berçário / Incubação)
        this.panic = false;
        this.setDepth(3);
        try { if (scene.anims && scene.anims.exists('queen_idle')) this.play('queen_idle'); } catch {}
    }

    enqueue(cls) {
        this.spawnQueue.push(cls);
        this.scene.events.emit('queueChanged', this.spawnQueue.length);
    }

    update(dt) {
        this.tickStatuses(dt);
        const g = this.scene.gameRef;

        // incuba
        if (this.spawnQueue.length) {
            this.spawnTimer += dt * this.scene.getTimeScale();
            const interval = this.spawnInterval * g.incubation * (g.rooms ? g.rooms.nurseryMult() : 1);
            if (this.spawnTimer >= interval) {
                this.spawnTimer = 0;
                const cls = this.spawnQueue.shift();
                this.scene.events.emit('queueChanged', this.spawnQueue.length);
                this.scene.spawnAnt(cls, this.x, this.y + TILE);
            }
        }

        // pânico
        const enemy = this.scene.findNearestEnemy(this);
        if (enemy && this.distTo(enemy) < 5 * TILE) {
            this.panic = true;
            const gx = g.queenTile.x + (this.x >= g.queenTile.x * TILE ? -1 : 1);
            const gy = g.queenTile.y + (this.y >= g.queenTile.y * TILE ? -1 : 1);
            this.x += Math.sign(gx * TILE - this.x) * 12 * dt;
            this.y += Math.sign(gy * TILE - this.y) * 12 * dt;
            this.setTintFill(0xff8888);
        } else if (this.panic) {
            this.panic = false;
            this.clearTint();
        }
    }

    takeDamage(amount, source, type) {
        const g = this.scene.gameRef;
        if (g.gm.flag('immortality')) return 0;
        const d = super.takeDamage(amount, source, type);
        if (g.gm.flag('divine_vengeance') && source && source.faction === 'Enemy') {
            this.scene.explodeAround(this.x, this.y, TILE * 3, 40);
        }
        document.body && document.body.classList.add('queen-hit');
        setTimeout(() => document.body && document.body.classList.remove('queen-hit'), 300);
        return d;
    }

    die(source) {
        if (this.dead) return;
        this.dead = true;
        try { if (this.scene.anims && this.scene.anims.exists('queen_death')) this.play('queen_death'); } catch {}
        this.scene.events.emit('queenDied', this);
        this.scene.time.delayedCall(600, () => this.destroy());
    }
}
