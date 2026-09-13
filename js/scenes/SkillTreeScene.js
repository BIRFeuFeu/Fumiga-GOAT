/**
 * js/scenes/SkillTreeScene.js — ARVORE REAL (meta-habilidades) [GDD §9 / TDD §2]
 * ---------------------------------------------------------------------------
 * Alvo do botão ARVORE REAL no menu principal. Gasta Geleia Real (permanente)
 * em buffs e unlocks. Estilo Dead Cells: tipografia pixel, sem caixas, jelly
 * no topo, "< VOLTAR" no rodapé.
 * ---------------------------------------------------------------------------
 */
import { GameManager } from '../core/GameManager.js';

export class SkillTreeScene extends Phaser.Scene {
    constructor() {
        super('SkillTreeScene');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        this.cameras.main.setBackgroundColor('#0b0705');

        // brasas sutis de fundo
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(8, W - 8);
            const y = Phaser.Math.Between(H * 0.4, H);
            const p = this.add.image(x, y, 'particle').setTint(0xff9c40).setAlpha(0).setScale(0.7);
            this.tweens.add({
                targets: p, y: y - Phaser.Math.Between(40, 100),
                alpha: { from: 0, to: 0.35 },
                duration: Phaser.Math.Between(2600, 4600),
                yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000), ease: 'Sine.easeInOut'
            });
        }

        // ---------- topo ----------
        this.add.bitmapText(W / 2 + 2, 21, 'fumiga', 'ARVORE REAL', 16).setOrigin(0.5).setTint(0x000000).setAlpha(0.6);
        this.add.bitmapText(W / 2, 20, 'fumiga', 'ARVORE REAL', 16).setOrigin(0.5).setTint(0xb44ad2);
        this.add.bitmapText(W / 2, 42, 'fumiga', 'GELEIA REAL: MELHORIAS PERMANENTES', 8).setOrigin(0.5).setTint(0x6d5a41);

        this.jellyText = this.add.bitmapText(W - 26, 14, 'fumiga', '0', 12).setOrigin(1, 0).setTint(0xffc832);
        this.add.image(W - 14, 20, 'ui_icons', this._icon('jelly')).setScale(1.2);

        // ---------- linhas da árvore (skills.json) ----------
        this.rows = [];
        let y = 64;
        for (const skill of this._skills()) {
            this.rows.push(this._row(skill, 16, y, W));
            y += 26;
        }

        // ---------- rodapé ----------
        const back = this.add.bitmapText(16, H - 20, 'fumiga', '< VOLTAR', 12).setTint(0xe8d9b5)
            .setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setTint(0xffc832));
        back.on('pointerout', () => back.setTint(0xe8d9b5));
        back.on('pointerdown', () => {
            this.audioClick();
            this.cameras.main.fadeOut(220, 11, 7, 5);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
        });
        const kb = this.input.keyboard;
        if (kb) kb.once('keydown-ESC', () => this.scene.start('MainMenuScene'));

        GameManager.init().then(() => this._refreshAll()).catch(() => {});
        this.cameras.main.fadeIn(300, 11, 7, 5);
    }

    _skills() {
        return this.cache.json.get('skills') || [];
    }

    _icon(name) {
        const m = this.cache.json.get('manifest');
        return m.ui_icons.tiles[name] ?? 0;
    }

    audioClick() {
        try {
            const s = this.sound;
            if (s && s.get && s.get('click')) s.play('click', { volume: 0.5 });
        } catch (e) { /* áudio indisponível */ }
    }

    _row(skill, x, y, W) {
        const lvl = GameManager.skill(skill.key);
        const isUnlock = skill.max === 1;
        const owned = isUnlock ? GameManager.hasUnlock(skill.key) : false;
        const cost = skill.base * (isUnlock ? 1 : lvl + 1);
        const maxed = isUnlock ? owned : lvl >= skill.max;

        const label = this.add.bitmapText(x, y, 'fumiga', skill.name, 8).setTint(maxed ? 0x5ad25a : 0xe8d9b5);
        const info = this.add.bitmapText(W - 16, y, 'fumiga', '', 8).setOrigin(1, 0);
        const hit = this.add.rectangle(x + W / 2 - 16, y + 4, W - 32, 22, 0x000000, 0).setInteractive({ useHandCursor: true });

        const row = { skill, label, info, cost, maxed, x, y };
        hit.on('pointerdown', () => this._buy(row));
        this._paint(row);
        return row;
    }

    _paint(row) {
        const lvl = GameManager.skill(row.skill.key);
        const isUnlock = row.skill.max === 1;
        const owned = isUnlock ? GameManager.hasUnlock(row.skill.key) : false;
        const cost = row.skill.base * (isUnlock ? 1 : lvl + 1);
        const maxed = isUnlock ? owned : lvl >= row.skill.max;
        const jelly = GameManager.save.royalJelly;

        if (maxed) {
            row.info.setText(isUnlock ? 'ADQUIRIDO' : `MAX ${lvl}/${row.skill.max}`);
            row.info.setTint(0x5ad25a);
        } else {
            row.info.setText(`NIVEL ${lvl} - CUSTO ${cost}`);
            row.info.setTint(jelly >= cost ? 0xffc832 : 0x6d5a41);
        }
        row.label.setAlpha(maxed ? 0.7 : 1);
    }

    _buy(row) {
        const lvl = GameManager.skill(row.skill.key);
        const isUnlock = row.skill.max === 1;
        const owned = isUnlock ? GameManager.hasUnlock(row.skill.key) : false;
        const cost = row.skill.base * (isUnlock ? 1 : lvl + 1);
        const maxed = isUnlock ? owned : lvl >= row.skill.max;
        if (maxed) return;

        if (GameManager.buySkill(row.skill.key, cost)) {
            this.audioClick();
            GameManager.persist().catch(() => {});
            this._refreshAll();
        } else {
            // sem geleia: feedback curto (tremida no preço)
            this.tweens.add({ targets: row.info, x: { from: this.scale.width - 16, to: this.scale.width - 12 }, duration: 60, yoyo: true, repeat: 3 });
        }
    }

    _refreshAll() {
        this.jellyText.setText(String(GameManager.save.royalJelly));
        for (const row of this.rows) this._paint(row);
    }
}
