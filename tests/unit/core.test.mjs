import test from 'node:test';
import assert from 'node:assert/strict';
import { AStarGrid, TILE_KIND as TILE } from '../../js/ai/AStarGrid.js';
import { MutationSystem } from '../../js/systems/MutationSystem.js';
import { EconomyManager } from '../../js/core/EconomyManager.js';
import { MapGenerator } from '../../js/world/MapGenerator.js';
import { BiomeManager } from '../../js/world/BiomeManager.js';
import { SaveManager } from '../../js/core/SaveManager.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mutData = JSON.parse(readFileSync(path.join(__dirname, '../../assets/data/mutations.json'), 'utf8'));

test('AStarGrid: caminho não atravessa paredes', () => {
    const g = new AStarGrid(8, 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g.set(x, y, TILE.WALK);
    // parede vertical com uma passagem
    for (let y = 0; y < 8; y++) g.set(4, y, TILE.SOLID);
    g.set(4, 3, TILE.WALK);
    const p = g.findPath(0, 0, 7, 7);
    assert.ok(p.length > 0, 'deve achar caminho');
    for (const n of p) assert.notEqual(g.get(n.x, n.y), TILE.SOLID, 'não cruza sólido');
    // deve passar pela passagem
    assert.ok(p.some((n) => n.x === 4 && n.y === 3), 'usa a única passagem');
});

test('AStarGrid: sem caminho -> []', () => {
    const g = new AStarGrid(6, 6);
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) g.set(x, y, TILE.WALK);
    for (let y = 0; y < 6; y++) g.set(3, y, TILE.ROCK);
    const p = g.findPath(0, 0, 5, 5);
    assert.equal(p.length, 0);
});

test('MutationSystem: rola 3 cartas e aplica dano', () => {
    const ms = new MutationSystem(mutData);
    const cards = ms.rollMutations(0, 3);
    assert.equal(cards.length, 3);
    const mods = MutationSystem.freshMods();
    MutationSystem.applyTo(mods, { effect: { type: 'stat', stat: 'damage', mult: 1.1 } });
    assert.ok(Math.abs(mods.damage - 1.1) < 1e-9);
});

test('MutationSystem: flag aplicada', () => {
    const mods = MutationSystem.freshMods();
    MutationSystem.applyTo(mods, { effect: { type: 'flag', flag: 'poison', value: 1 } });
    assert.equal(mods.flags.poison, 1);
});

test('EconomyManager: gastar e limite', () => {
    const e = new EconomyManager({ biomass: 50, maxBiomass: 100 });
    assert.ok(e.spend(30));
    assert.equal(e.biomass, 20);
    assert.ok(!e.spend(50));
    e.addMax(100);
    e.add(500);
    assert.equal(e.biomass, 200); // capped
});

test('MapGenerator: câmara, rainha e recursos', () => {
    const m = MapGenerator.generate({ width: 32, height: 32, seed: 42, biome: { rock: 0.05, hazard: 0.05 } });
    assert.equal(m.grid.get(m.queenPos.x, m.queenPos.y), TILE.ROOM);
    assert.ok(m.resources.length > 0);
    assert.ok(m.grid.isWalkable(m.anthillPos.x, m.anthillPos.y));
});

test('BiomeManager: rotas de migração', () => {
    const next = BiomeManager.nextChoices('bosque_umido');
    assert.ok(next.length >= 1);
    assert.ok(next.every((id) => BiomeManager.byId(id).stage === 2));
    assert.ok(BiomeManager.nextChoices('abismo_bioluminescente').includes('nucleo_primordial'));
    assert.ok(BiomeManager.isFinal('nucleo_primordial'));
});

test('SaveManager: roundtrip em memória', async () => {
    const s = new SaveManager();
    await s.saveProgress({ royalJelly: 77, skillTree: { hp_buff: 2 }, discoveredBiomes: ['bosque_umido'] });
    const loaded = await s.loadProgress();
    assert.equal(loaded.royalJelly, 77);
    assert.equal(loaded.skillTree.hp_buff, 2);
    assert.deepEqual(loaded.discoveredBiomes, ['bosque_umido']);
});

test('SaveManager: storage bloqueado (SecurityError de iframe) cai para memória', async () => {
    // Simula iframe sandboxed/de terceiros no Chrome: o ACESSO a indexedDB
    // (getter global) lança SecurityError. Nada pode rejeitar/estourar erro.
    const g = globalThis;
    const prev = Object.getOwnPropertyDescriptor(g, 'indexedDB');
    Object.defineProperty(g, 'indexedDB', {
        configurable: true,
        get() { throw new Error('SecurityError: acesso a indexedDB bloqueado'); }
    });
    try {
        const s = new SaveManager();
        assert.equal(await s.saveProgress({ royalJelly: 42 }), true, 'saveProgress resolve true (memória)');
        const loaded = await s.loadProgress();
        assert.equal(loaded.royalJelly, 42, 'loadProgress lê da memória');
    } finally {
        if (prev) Object.defineProperty(g, 'indexedDB', prev);
        else delete g.indexedDB;
    }
});

test('SaveManager: open() que rejeita não derruba save/load', async () => {
    // indexedDB presente mas open() lançando (ex.: partitioned storage)
    const g = globalThis;
    const prev = Object.getOwnPropertyDescriptor(g, 'indexedDB');
    Object.defineProperty(g, 'indexedDB', {
        configurable: true,
        value: { open() { throw new Error('SecurityError'); } }
    });
    try {
        const s = new SaveManager();
        assert.equal(await s.saveProgress({ royalJelly: 9 }), true);
        assert.equal((await s.loadProgress()).royalJelly, 9);
    } finally {
        if (prev) Object.defineProperty(g, 'indexedDB', prev);
        else delete g.indexedDB;
    }
});
