/**
 * js/world/MapGenerator.js — Geração procedural do terreno e biomas  [TDD §2/§6]
 * ---------------------------------------------------------------------------
 * Produz uma AStarGrid + metadados: fileira da superfície, posição da Rainha,
 * entrada do formigueiro, ninho rival, recursos e tiles de perigo (hazard).
 * O terreno varia por bioma (densidade de pedra, perigos, água/cristal etc.).
 * ---------------------------------------------------------------------------
 */
import { AStarGrid, TILE_KIND } from '../ai/AStarGrid.js';

export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class MapGenerator {
    /**
     * @param {object} cfg { width, height, skyRows, surfaceDepth, seed, biome:{ rock, hazard, water } }
     */
    static generate(cfg) {
        const {
            width = 64,
            height = 64,
            skyRows = 8,
            surfaceDepth = 5,
            seed = 1,
            biome = { rock: 0.06, hazard: 0.05, water: 0 }
        } = cfg;
        const rng = mulberry32(seed);
        const grid = new AStarGrid(width, height);
        const surfaceRow = skyRows + surfaceDepth; // primeira fileira subterrânea

        // céu + superfície
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (y < skyRows) grid.set(x, y, TILE_KIND.SKY);
                else if (y < surfaceRow) grid.set(x, y, TILE_KIND.SURFACE);
                else grid.set(x, y, TILE_KIND.SOLID);
            }
        }

        // pedras indestrutíveis no subterrâneo (clusters)
        const rockClusters = Math.floor(width * height * biome.rock * 0.06); // [G-02a] 0.02→0.06 (3x)
        for (let i = 0; i < rockClusters; i++) {
            const cx = 2 + Math.floor(rng() * (width - 4));
            const cy = surfaceRow + 2 + Math.floor(rng() * (height - surfaceRow - 4));
            const size = 1 + Math.floor(rng() * 3);
            for (let dy = -size; dy <= size; dy++)
                for (let dx = -size; dx <= size; dx++) {
                    if (rng() < 0.6) grid.set(cx + dx, cy + dy, TILE_KIND.ROCK);
                }
        }

        // Câmara Central (3x3 ROOM) + Rainha no centro-baixo
        const qcx = Math.floor(width / 2);
        const qcy = height - Math.floor((height - surfaceRow) * 0.35);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) grid.set(qcx + dx, qcy + dy, TILE_KIND.ROOM);
        const queenPos = { x: qcx, y: qcy };

        // túneis iniciais ao redor da câmara
        for (let dx = -2; dx <= 2; dx++) {
            grid.set(qcx + dx, qcy - 2, TILE_KIND.WALK);
            grid.set(qcx + dx, qcy + 2, TILE_KIND.WALK);
        }
        for (let dy = -2; dy <= 2; dy++) {
            grid.set(qcx - 2, qcy + dy, TILE_KIND.WALK);
            grid.set(qcx + 2, qcy + dy, TILE_KIND.WALK);
        }

        // poço de acesso superfície <-> subterrâneo (entrada do formigueiro)
        const ax = qcx;
        for (let y = skyRows; y <= qcy - 1; y++) {
            grid.set(ax, y, y < surfaceRow ? TILE_KIND.SURFACE : TILE_KIND.WALK);
        }
        const anthillPos = { x: ax, y: surfaceRow - 1 };

        // ninho rival na superfície (lado oposto)
        const rivalX = ax > width / 2 ? Math.floor(width * 0.18) : Math.floor(width * 0.82);
        const rivalNest = { x: rivalX, y: skyRows + 2 };

        // 2 ruínas pré-escavadas 3x3 ROOM [G-02b]
        for(let ri=0; ri<2; ri++){
            const rx = 4 + Math.floor(rng()*(width-8));
            const ry = surfaceRow + 4 + Math.floor(rng()*(height-surfaceRow-8));
            if(Math.abs(rx - qcx) < 4 && Math.abs(ry - qcy) < 4) continue;
            for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) grid.set(rx+dx, ry+dy, TILE_KIND.ROOM);
            // loot 10 no centro
            // resources will be added later, but mark as room
        }

        // recursos de biomassa na superfície
        const resources = [];
        const resourceCount = Math.floor(width * 0.75); // [A-01] 32→48
        for (let i = 0; i < resourceCount; i++) {
            const x = 1 + Math.floor(rng() * (width - 2));
            const y = skyRows + Math.floor(rng() * surfaceDepth);
            if (Math.abs(x - rivalX) < 3) continue;
            resources.push({ x, y });
        }

        // tiles de perigo do bioma (overlay, ainda caminháveis)
        const hazards = new Set();
        const hazardCount = Math.floor(width * height * biome.hazard * 0.12); // [G-02a] 0.06→0.12 (2x)
        for (let i = 0; i < hazardCount; i++) {
            const x = Math.floor(rng() * width);
            const y = skyRows + Math.floor(rng() * (height - skyRows));
            hazards.add(`${x},${y}`);
        }

        // água (jardim flutuante) — bloqueia caminhada no solo [AquaFix]
        if (biome.water > 0) {
            const pools = Math.floor(biome.water * 10);
            for (let i = 0; i < pools; i++) {
                let cx, cy, tries=0;
                do {
                    cx = Math.floor(rng() * width);
                    cy = skyRows + Math.floor(rng() * surfaceDepth);
                    tries++;
                } while (tries<10 && Math.hypot(cx - anthillPos.x, cy - anthillPos.y) < 3);
                for (let dx = -2; dx <= 2; dx++) for (let dy = 0; dy <= 1; dy++) {
                    if (rng() < 0.7) grid.set(cx + dx, cy + dy, TILE_KIND.SKY);
                }
            }
        }
        // [AquaFix] garante anthill e rival walkable
        grid.set(anthillPos.x, anthillPos.y, TILE_KIND.SURFACE);
        grid.set(rivalNest.x, rivalNest.y, TILE_KIND.SURFACE);
        grid.set(queenPos.x, queenPos.y, TILE_KIND.ROOM);

        return { grid, surfaceRow, skyRows, queenPos, anthillPos, rivalNest, resources, hazards };
    }
}
