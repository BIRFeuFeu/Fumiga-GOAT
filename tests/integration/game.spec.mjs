/**
 * Teste de integração (headless, sem XHR de assets):
 *  1) Importa TODOS os módulos do jogo com o Phaser global definido —
 *     pega erros de extends/import/referência em arquivos dependentes do Phaser.
 *  2) Valida a lógica de mundo + RoomBuilder + economia com uma cena fake,
 *     exercendo o caminho real de escavar/construir usado pelo Menu Radial.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import * as napiCanvas from '@napi-rs/canvas';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- ambiente mínimo p/ o Phaser carregar ----------
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const { window } = dom;
if (!window.CanvasRenderingContext2D) window.CanvasRenderingContext2D = class {};

// shim de canvas 2D real (napi) para os device-checks do Phaser
const origCreate = window.document.createElement.bind(window.document);
window.document.createElement = function (tag) {
    const el = origCreate(tag);
    if (String(tag).toLowerCase() === 'canvas') {
        const backing = napiCanvas.createCanvas(1, 1);
        el.getContext = function () {
            backing.width = el.width || 1;
            backing.height = el.height || 1;
            return backing.getContext('2d');
        };
        Object.defineProperty(el, 'width', { get: () => backing.width, set: (v) => (backing.width = v) });
        Object.defineProperty(el, 'height', { get: () => backing.height, set: (v) => (backing.height = v) });
        el.toDataURL = () => backing.toDataURL();
    }
    return el;
};
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
for (const k of ['Element', 'HTMLElement', 'Node', 'Event', 'CustomEvent', 'screen', 'matchMedia', 'getComputedStyle', 'localStorage', 'performance', 'addEventListener', 'removeEventListener']) {
    if (k in window && !(k in globalThis)) {
        try {
            Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true });
        } catch (e) {}
    }
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.Image = window.Image;
globalThis.HTMLImageElement = window.HTMLImageElement;
globalThis.HTMLCanvasElement = window.HTMLCanvasElement;

const Phaser = require('phaser/dist/phaser.js');
globalThis.Phaser = Phaser;

test('todos os módulos importam com Phaser global', async () => {
    const mods = [
        '../../js/core/Config.js',
        '../../js/core/Emitter.js',
        '../../js/core/EconomyManager.js',
        '../../js/core/SaveManager.js',
        '../../js/core/GameManager.js',
        '../../js/core/TimeController.js',
        '../../js/core/InputHandler.js',
        '../../js/ai/AStarGrid.js',
        '../../js/ai/BehaviorTree.js',
        '../../js/ai/PheromoneSystem.js',
        '../../js/world/MapGenerator.js',
        '../../js/world/RoomBuilder.js',
        '../../js/world/BiomeManager.js',
        '../../js/systems/MutationSystem.js',
        '../../js/systems/AudioManager.js',
        '../../js/systems/WebGLShaders.js',
        '../../js/entities/EntityBase.js',
        '../../js/entities/AntBase.js',
        '../../js/entities/WorkerAnt.js',
        '../../js/entities/CollectorAnt.js',
        '../../js/entities/SoldierAnt.js',
        '../../js/entities/GuardianAnt.js',
        '../../js/entities/ExplorerAnt.js',
        '../../js/entities/EliteClasses.js',
        '../../js/entities/Queen.js',
        '../../js/entities/EnemyBase.js',
        '../../js/ui/RadialMenu.js',
        '../../js/scenes/BootScene.js',
        '../../js/scenes/PreloadScene.js',
        '../../js/scenes/MainMenuScene.js',
        '../../js/scenes/GameScene.js',
        '../../js/scenes/UIScene.js'
    ];
    for (const m of mods) {
        const mod = await import(m);
        assert.ok(mod, 'importou ' + m);
    }
});

test('RoomBuilder: escavar e construir mutam grid + economia', async () => {
    const { MapGenerator } = await import('../../js/world/MapGenerator.js');
    const { RoomBuilder, ROOM_DEFS } = await import('../../js/world/RoomBuilder.js');
    const { EconomyManager } = await import('../../js/core/EconomyManager.js');
    const { Emitter } = await import('../../js/core/Emitter.js');

    const map = MapGenerator.generate({ width: 24, height: 24, seed: 7, biome: { rock: 0.05, hazard: 0.02 } });
    const economy = new EconomyManager({ biomass: 200, maxBiomass: 300 });

    // cena fake com o mínimo que o RoomBuilder usa
    const fakeScene = {
        gameRef: { grid: map.grid, economy, statsRooms: () => {} },
        events: new Emitter(),
        audio: { play: () => {} },
        physics: { add: { zone: () => ({}), overlap: () => {} } },
        redrawTile: () => {}
    };

    const rooms = new RoomBuilder(fakeScene);

    // escavar um tile sólido
    const tx = map.queenPos.x + 2;
    const ty = map.queenPos.y;
    map.grid.set(tx, ty, 0);
    assert.ok(rooms.requestDig(tx, ty));
    const job = rooms.claimJob({ x: tx, y: ty });
    assert.ok(job, 'job reivindicado');
    rooms.completeJob(job, null);
    assert.equal(map.grid.get(tx, ty), 1, 'escavou');

    // construir despensa em tile caminhável
    const before = economy.biomass;
    assert.ok(rooms.buildRoom(tx, ty, 'pantry'), 'construiu despensa');
    assert.equal(map.grid.get(tx, ty), 2, 'virou sala');
    assert.equal(economy.biomass, before - ROOM_DEFS.pantry.cost, 'cobrou biomassa');
    assert.equal(economy.maxBiomass, 400, 'despensa aumentou cap');
});
