/**
 * js/main.js — Inicialização do Phaser (Game Config)  [TDD §3.1]
 * ---------------------------------------------------------------------------
 * type: WEBGL (necessário p/ Shaders) | scale FIT + CENTER_BOTH |
 * pixelArt true + antialias false (nitidez 16-bit) | physics arcade.
 * ---------------------------------------------------------------------------
 */
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { SkillTreeScene } from './scenes/SkillTreeScene.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    // AUTO: usa WebGL quando disponível (shaders funcionam) e cai p/ Canvas
    // em ambientes sem WebGL — preview em iframes restritos continuam rodando.
    type: Phaser.AUTO,
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
    // Ordem de telas (estilo Dead Cells): Boot -> Preload -> Titulo ->
    // Menu -> (Arvore Real | Loading de bioma) -> Jogo + HUD
    scene: [BootScene, PreloadScene, TitleScene, MainMenuScene, SkillTreeScene, LoadingScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// expõe para debug / testes
if (typeof window !== 'undefined') window.__FUMIGA__ = game;
