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

let game;
try {
    game = new Phaser.Game(config);
} catch (e) {
    // Fallback Canvas se WebGL falhar (comum em iframes restritos / WebView antigo)
    try {
        console.error('[FUMIGA] Phaser.AUTO falhou, tentando CANVAS', e);
        config.type = Phaser.CANVAS;
        game = new Phaser.Game(config);
    } catch (e2) {
        console.error('[FUMIGA] Falha crítica ao criar Phaser.Game', e2);
        const box = typeof document !== 'undefined' ? document.getElementById('boot-errors') : null;
        if (box) {
            box.hidden = false;
            box.textContent += '[ERRO CRÍTICO] ' + (e2 && (e2.stack || e2.message) || e2) + '\n';
            box.textContent += '[INFO] Tente recarregar ou limpar o cache. Se persistir, o navegador pode não suportar WebGL/Canvas necessário.\n';
        }
    }
}

// expõe para debug / testes (mesmo que falhe, expõe erro)
if (typeof window !== 'undefined') {
    window.__FUMIGA__ = game || { __error: true };
    // Se a criação falhou, watchdog não deve ficar esperando 30s em silêncio
    if (!game) {
        setTimeout(() => {
            const box = document.getElementById('boot-errors');
            if (box && box.hidden) {
                box.hidden = false;
                box.textContent += '[WATCHDOG] Game não criado. Verifique o erro acima.\n';
            }
        }, 1000);
    }
}
