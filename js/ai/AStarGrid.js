/**
 * js/ai/AStarGrid.js — Motor de navegação (Pathfinding)  [TDD §5.1]
 * ---------------------------------------------------------------------------
 * A matriz global usa os valores canônicos do TDD:
 *   0 = Parede/Sólido (terra não escavada)
 *   1 = Caminhável (túnel / superfície)
 *   2 = Sala Construída
 *   3 = Indestrutível (pedra)
 * Extensões documentadas do beta (necessárias p/ superfície+céu):
 *   4 = Superfície (caminhável, sem escavação)
 *   5 = Céu (não caminhável, não escavável)
 *
 * `findPath` = A* com heurística de Manhattan (custo G + H), devolve
 * array de waypoints [{x,y}]. Toda alteração de tile incrementa `version`,
 * e as entidades chamam `recalculatePath()` quando percebem a mudança.
 * ---------------------------------------------------------------------------
 */
export const TILE = {
    SOLID: 0,
    WALK: 1,
    ROOM: 2,
    ROCK: 3,
    SURFACE: 4,
    SKY: 5
};

export class AStarGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.matrix = new Uint8Array(width * height);
        this.version = 0;
    }

    index(x, y) {
        return y * this.width + x;
    }

    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    get(x, y) {
        return this.inBounds(x, y) ? this.matrix[this.index(x, y)] : TILE.ROCK;
    }

    set(x, y, value) {
        if (!this.inBounds(x, y)) return;
        if (this.matrix[this.index(x, y)] === value) return;
        this.matrix[this.index(x, y)] = value;
        this.version++;
    }

    /** Andável = túnel, sala ou superfície. */
    isWalkableValue(v) {
        return v === TILE.WALK || v === TILE.ROOM || v === TILE.SURFACE;
    }

    isWalkable(x, y) {
        return this.inBounds(x, y) && this.isWalkableValue(this.matrix[this.index(x, y)]);
    }

    isDigCandidate(x, y) {
        return this.get(x, y) === TILE.SOLID;
    }

    /**
     * A* padrão. `allowDiag` desligado (grid ortogonal), como nos jogos de grade.
     * Retorna array de {x,y} do início (excluído) ao alvo (incluído), ou [].
     */
    findPath(sx, sy, tx, ty, maxNodes = 6000) {
        if (!this.inBounds(sx, sy) || !this.inBounds(tx, ty)) return [];
        if (!this.isWalkable(tx, ty)) return [];
        if (sx === tx && sy === ty) return [];

        const w = this.width;
        const g = new Float32Array(w * this.height).fill(Infinity);
        const f = new Float32Array(w * this.height).fill(Infinity);
        const came = new Int32Array(w * this.height).fill(-1);
        const closed = new Uint8Array(w * this.height);

        // heap binário simples [f, idx]
        const heap = [];
        const push = (fv, idx) => {
            heap.push([fv, idx]);
            let i = heap.length - 1;
            while (i > 0) {
                const p = (i - 1) >> 1;
                if (heap[p][0] <= heap[i][0]) break;
                [heap[p], heap[i]] = [heap[i], heap[p]];
                i = p;
            }
        };
        const pop = () => {
            const top = heap[0];
            const last = heap.pop();
            if (heap.length > 0) {
                heap[0] = last;
                let i = 0;
                for (;;) {
                    const l = i * 2 + 1;
                    const r = l + 1;
                    let m = i;
                    if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                    if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                    if (m === i) break;
                    [heap[m], heap[i]] = [heap[i], heap[m]];
                    i = m;
                }
            }
            return top;
        };

        const startIdx = this.index(sx, sy);
        const targetIdx = this.index(tx, ty);
        g[startIdx] = 0;
        f[startIdx] = Math.abs(tx - sx) + Math.abs(ty - sy);
        push(f[startIdx], startIdx);

        let expanded = 0;
        const DX = [1, -1, 0, 0];
        const DY = [0, 0, 1, -1];

        while (heap.length) {
            const [, cur] = pop();
            if (cur === targetIdx) {
                // reconstrói caminho
                const path = [];
                let c = cur;
                while (c !== -1 && c !== startIdx) {
                    path.push({ x: c % w, y: Math.floor(c / w) });
                    c = came[c];
                }
                path.reverse();
                return path;
            }
            if (closed[cur]) continue;
            closed[cur] = 1;
            if (++expanded > maxNodes) return [];

            const cx = cur % w;
            const cy = Math.floor(cur / w);
            for (let d = 0; d < 4; d++) {
                const nx = cx + DX[d];
                const ny = cy + DY[d];
                if (!this.isWalkable(nx, ny)) continue;
                const ni = this.index(nx, ny);
                if (closed[ni]) continue;
                const ng = g[cur] + 1;
                if (ng < g[ni]) {
                    came[ni] = cur;
                    g[ni] = ng;
                    f[ni] = ng + Math.abs(tx - nx) + Math.abs(ty - ny);
                    push(f[ni], ni);
                }
            }
        }
        return [];
    }

    /** BFS para "tile caminhável mais próximo" (usado p/ alvos em túnel). */
    nearestWalkable(sx, sy, radius = 6) {
        for (let r = 0; r <= radius; r++) {
            for (let y = sy - r; y <= sy + r; y++) {
                for (let x = sx - r; x <= sx + r; x++) {
                    if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) !== r) continue;
                    if (this.isWalkable(x, y)) return { x, y };
                }
            }
        }
        return null;
    }
}
