/**
 * js/main.js — Inicialização do Phaser (Game Config)  [TDD §3.1]
 * ---------------------------------------------------------------------------
 * type: WEBGL (necessário p/ Shaders) | scale FIT + CENTER_BOTH |
 * pixelArt true + antialias false (nitidez 16-bit) | physics arcade.
 * ---------------------------------------------------------------------------
 */
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    backgroundColor: '#0b0705',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 480,
        height: 480
    },
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: [BootScene, PreloadScene, MainMenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// expõe para debug / testes
if (typeof window !== 'undefined') window.__FUMIGA__ = game;
