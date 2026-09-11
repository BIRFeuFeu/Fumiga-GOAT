/**
 * js/scenes/MainMenuScene.js — Interface Inicial + Árvore de Metaprogresso [TDD §2 / GDD §9]
 * ---------------------------------------------------------------------------
 * Menu Principal: título, Geleia Real acumulada, Árvore de Habilidades (gastar
 * Geleia) e o botão INICIAR (começa no Bosque Úmido). Tudo com tipografia Pixel Art.
 * ---------------------------------------------------------------------------
 */
import { GameManager } from '../core/GameManager.js';

const SKILLS = [
    { key: 'hp_buff', name: 'CARAPACA FORTALECIDA', max: 5, base: 40, desc: '+10% HP' },
    { key: 'speed_buff', name: 'PATAS AGEIS', max: 5, base: 40, desc: '+8% VEL' },
    { key: 'luck', name: 'SORTE GENETICA', max: 5, base: 60, desc: '+DROP RARO' },
    { key: 'pantry', name: 'DESPENSA OTIMIZADA', max: 5, base: 30, desc: '+20 CAP' },
    { key: 'incubation', name: 'INCUBACAO ACELERADA', max: 5, base: 40, desc: '-SPAWN CD' },
    { key: 'unlock_fungus', name: 'SALA: CAMARA DE FUNGOS', max: 1, base: 120, desc: '' },
    { key: 'unlock_trap', name: 'SALA: TUNEL FALSO', max: 1, base: 80, desc: '' },
    { key: 'unlock_sniper', name: 'CLASSE: CUSPIDORA', max: 1, base: 150, desc: '' },
    { key: 'unlock_spy', name: 'CLASSE: ESPIA', max: 1, base: 200, desc: '' },
    { key: 'unlock_giant', name: 'CLASSE: FORMIGA GIGANTE', max: 1, base: 300, desc: '' },
    { key: 'unlock_digger', name: 'CLASSE: ESCAVADEIRA', max: 1, base: 120, desc: '' },
    { key: 'unlock_healer', name: 'CLASSE: CURANDEIRA', max: 1, base: 140, desc: '' }
];

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#0b0705');
        const W = this.scale.width;

        this.add.bitmapText(W / 2, 40, 'fumiga', 'FUMIGA', 24).setOrigin(0.5).setTint(0xc8ff5a);
        this.add.bitmapText(W / 2, 70, 'fumiga', 'ROGUELITE COLONY-SIM - BETA', 8).setOrigin(0.5).setTint(0x6d5a41);

        this.jellyText = this.add.bitmapText(W - 12, 12, 'fumiga', '', 10).setOrigin(1, 0).setTint(0xffc832);
        this.add.image(W - 12 - 90, 18, 'ui_icons', this.icon('jelly')).setScale(1.4);

        this.add.bitmapText(12, 96, 'fumiga', 'ARVORE DE HABILIDADES (GELEIA REAL)', 9).setTint(0xb44ad2);

        this.rows = [];
        let y = 118;
        for (const skill of SKILLS) {
            this.rows.push(this._row(skill, 12, y, W));
            y += 24;
        }

        // botão iniciar
        const btn = this.add.bitmapText(W / 2, this.scale.height - 40, 'fumiga', '[ INICIAR COLONIA ]', 14).setOrigin(0.5).setTint(0xc8ff5a).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setTint(0xffffff));
        btn.on('pointerout', () => btn.setTint(0xc8ff5a));
        btn.on('pointerdown', () => this._start());

        this._refresh();
        this.audioPlay('click');
    }

    icon(name) {
        const m = this.cache.json.get('manifest');
        return m.ui_icons.tiles[name] ?? 0;
    }

    _row(skill, x, y, W) {
        const lvl = GameManager.skill(skill.key);
        const isUnlock = skill.max === 1;
        const owned = isUnlock ? GameManager.hasUnlock(skill.key) : false;
        const cost = skill.base * (isUnlock ? 1 : lvl + 1);
        const maxed = isUnlock ? owned : lvl >= skill.max;

        const label = this.add.bitmapText(x, y, 'fumiga', skill.name, 8).setTint(maxed ? 0x5ad25a : 0xe8d9b5);
        const info = this.add.bitmapText(W - 12, y, 'fumiga', '', 8).setOrigin(1, 0);
        const hit = this.add.rectangle(x + W / 2 - 12, y + 4, W - 24, 22, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
            if (maxed) return;
            if (GameManager.buySkill(skill.key, cost)) {
                this.audioPlay('jelly');
                GameManager.persist();
                this.scene.restart();
            } else {
                this.audioPlay('hurt');
            }
        });
        return { skill, info, maxedCheck: () => (skill.max === 1 ? GameManager.hasUnlock(skill.key) : GameManager.skill(skill.key) >= skill.max), lvlCheck: () => GameManager.skill(skill.key), costCheck: () => skill.base * (skill.max === 1 ? 1 : GameManager.skill(skill.key) + 1) };
    }

    _refresh() {
        this.jellyText.setText('GELEIA ' + GameManager.save.royalJelly);
        for (const r of this.rows) {
            const maxed = r.maxedCheck();
            r.info.setText(maxed ? 'MAX' : `LV${r.lvlCheck()} ${r.costCheck()}g`);
            r.info.setTint(maxed ? 0x5ad25a : 0xffc832);
        }
    }

    audioPlay(k) {
        if (this.sound.get && this.sound.get(k)) this.sound.play(k);
    }

    _start() {
        this.scene.stop('MainMenuScene');
        this.scene.start('GameScene', { biome: 'bosque_umido' });
    }
}
