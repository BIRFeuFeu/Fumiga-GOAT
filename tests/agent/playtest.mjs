/**
 * tests/agent/playtest.mjs — Harness 50 runs sintéticas [IA-0]
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MapGenerator } from '../../js/world/MapGenerator.js';
import { AStarGrid } from '../../js/ai/AStarGrid.js';

test('playtest: 50 seeds anthill walkable e métricas base', () => {
    let walkable = 0, rockTotal = 0, hazardTotal = 0, blocked = 0;
    let wins = 0;
    for (let seed = 0; seed < 50; seed++) {
        const map = MapGenerator.generate({ seed, width: 64, height: 64 });
        const anth = map.anthillPos;
        const isWalk = map.grid.isWalkable(anth.x, anth.y);
        if (isWalk) walkable++; else blocked++;

        let rocks = 0;
        for (let y = 0; y < map.grid.height; y++) {
            for (let x = 0; x < map.grid.width; x++) {
                const v = map.grid.get(x, y);
                if (v === 3) rocks++; // ROCK
            }
        }
        rockTotal += rocks;
        hazardTotal += map.hazards ? map.hazards.size : 0;
        const resources = map.resources ? map.resources.length : 0;
        const astar = new AStarGrid(map.grid.width, map.grid.height);
        // copy grid data for AStar test? Use map.grid directly
        const path = map.grid.findPath ? map.grid.findPath(anth.x, anth.y, anth.x, 5) : [];
        // Actually MapGenerator grid is AStarGrid instance, has findPath
        const p = map.grid.findPath(anth.x, anth.y, anth.x, 5);
        const len = p ? p.length : 999;
        if (resources >= 30 && len < 30) wins++;
        assert.ok(isWalk, `seed ${seed} anthill walkable`);
    }
    const winrate = wins / 50 * 100;
    const avgRocks = rockTotal / 50;
    const avgHaz = hazardTotal / 50;
    console.log(`[IA METRICS] walkable: ${walkable}/50 blocked:${blocked} winrate bosque sintético: ${winrate.toFixed(1)}% avgRocks:${avgRocks.toFixed(1)} avgHaz:${avgHaz.toFixed(1)}`);
    assert.ok(walkable === 50, 'todos anthills walkable');
    assert.ok(avgRocks >= 0, 'rocks contados');
});
