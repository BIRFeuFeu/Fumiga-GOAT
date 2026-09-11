/**
 * js/scenes/BootScene.js — Configurações iniciais e transição  [TDD §2 / ROADMAP Fase 1]
 * ---------------------------------------------------------------------------
 * Esconde o splash do index.html e pula para o PreloadScene. "Teste do Diretor":
 * tela preta do Phaser sem erros no console = base pronta.
 * ---------------------------------------------------------------------------
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }
    create() {
        const splash = document.getElementById('boot-splash');
        if (splash) splash.classList.add('hidden');
        this.scene.start('PreloadScene');
    }
}
