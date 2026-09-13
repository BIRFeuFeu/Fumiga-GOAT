/**
 * js/main.js — Inicialização do Phaser (Game Config)  [TDD §3.1]
 * ---------------------------------------------------------------------------
 * type: WEBGL (necessário p/ Shaders) | scale FIT + CENTER_BOTH |
 * pixelArt true + antialias false (nitidez 16-bit) | physics arcade.
 * ---------------------------------------------------------------------------
 */
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { ApresentacaoScene } from './scenes/ApresentacaoScene.js';
import { CarregamentoScene } from './scenes/CarregamentoScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { PosMenuScene } from './scenes/PosMenuScene.js';
import { SaveSlotScene } from './scenes/SaveSlotScene.js';
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
    // Ordem de telas (pedido: Apresentação > Carregamento > Pré-menu > Menu > Pós-menu > Jogo > Derrota)
    // Cada transição passa por CarregamentoScene para evitar ver elementos sendo carregados.
    scene: [BootScene, PreloadScene, ApresentacaoScene, CarregamentoScene, TitleScene, MainMenuScene, PosMenuScene, SaveSlotScene, SkillTreeScene, LoadingScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// expõe para debug / testes
if (typeof window !== 'undefined') window.__FUMIGA__ = game;
