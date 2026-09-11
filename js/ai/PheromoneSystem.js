/**
 * js/ai/PheromoneSystem.js — Zonas de feromônio (atração/pesos no Grid) [TDD §5.3]
 * ---------------------------------------------------------------------------
 * Quando o jogador solta um feromônio pelo Menu Radial, cria-se uma Zone invisível
 * com { type, radius, ttl, x, y }. As Behavior Trees consultam este sistema para
 * achar o "centro gravitacional" da próxima ação. Zonas expiram via TTL.
 * Tipos: 'attack' | 'collect' | 'move' | 'retreat'
 * ---------------------------------------------------------------------------
 */
import { Emitter } from '../core/Emitter.js';

export class PheromoneSystem {
    constructor() {
        this.events = new Emitter();
        this.zones = [];
        this._id = 0;
    }

    drop(type, x, y, radius = 4, ttl = 12) {
        const zone = { id: ++this._id, type, x, y, radius, ttl, maxTtl: ttl, strength: 1 };
        this.zones.push(zone);
        this.events.emit('dropped', zone);
        return zone;
    }

    hasActive(type) {
        return this.zones.some((z) => z.type === type);
    }

    nearest(type, x, y) {
        let best = null;
        let bestD = Infinity;
        for (const z of this.zones) {
            if (z.type !== type) continue;
            const d = (z.x - x) ** 2 + (z.y - y) ** 2;
            if (d < bestD) {
                bestD = d;
                best = z;
            }
        }
        return best;
    }

    of(type) {
        return this.zones.filter((z) => z.type === type);
    }

    clear(type = null) {
        this.zones = type ? this.zones.filter((z) => z.type !== type) : [];
    }

    update(dt) {
        const before = this.zones.length;
        this.zones = this.zones.filter((z) => {
            z.ttl -= dt;
            z.strength = Math.max(0, z.ttl / z.maxTtl);
            return z.ttl > 0;
        });
        if (this.zones.length !== before) this.events.emit('changed');
    }
}
