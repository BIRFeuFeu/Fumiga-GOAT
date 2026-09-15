/**
 * js/scenes/GameScene.js — Core Loop, Tilemap e instanciamento do mundo [TDD §2]
 * ---------------------------------------------------------------------------
 * Monta o grid do bioma, renderiza tiles em RenderTexture, névoa, entidades,
 * ondas de inimigos, chefe, perigos do bioma e executa as ações do Menu Radial.
 * ---------------------------------------------------------------------------
 */
import { TILE, ANT_CLASSES, ENEMY_TYPES, BOSS_TYPES } from '../core/Config.js';
import { GameManager } from '../core/GameManager.js';
import { EconomyManager } from '../core/EconomyManager.js';
import { TimeController } from '../core/TimeController.js';
import { InputHandler } from '../core/InputHandler.js';
import { RoomBuilder, ROOM_DEFS } from '../world/RoomBuilder.js';
import { MapGenerator } from '../world/MapGenerator.js';
import { BiomeManager } from '../world/BiomeManager.js';
import { MutationSystem } from '../systems/MutationSystem.js';
import { PheromoneSystem } from '../ai/PheromoneSystem.js';
import { Analytics } from '../core/Analytics.js';
import { AudioManager } from '../systems/AudioManager.js';
import { RadialMenu } from '../ui/RadialMenu.js';
import { TILE_KIND } from '../ai/AStarGrid.js';
const T = TILE_KIND;
import { Queen } from '../entities/Queen.js';
import { WorkerAnt } from '../entities/WorkerAnt.js';
import { CollectorAnt } from '../entities/CollectorAnt.js';
import { SoldierAnt } from '../entities/SoldierAnt.js';
import { GuardianAnt } from '../entities/GuardianAnt.js';
import { ExplorerAnt } from '../entities/ExplorerAnt.js';
import { SniperAnt, SpyAnt, GiantAnt, HealerAnt, DiggerAnt } from '../entities/EliteClasses.js';
import { EnemyBase } from '../entities/EnemyBase.js';
import { Minimap } from './Minimap.js';
import { TutorialManager } from './Tutorial.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.biomeId = (data && data.biome) || 'bosque_umido';
    }

    create() {
        const biome = BiomeManager.byId(this.biomeId);
        this.gameDelta = 16;
        this.audio = new AudioManager(this);
        this.timeController = new TimeController(this);
        this.inputHandler = new InputHandler(this);
        this.radial = new RadialMenu(this);

        // ---------- mundo ----------
        const seed = this.biomeId.split('').reduce((a, c) => a + c.charCodeAt(0), 7);
        this.map = MapGenerator.generate({ width: 64, height: 64, seed, biome: biome.terrain });
        this.grid = this.map.grid;
        this.surfaceRow = this.map.surfaceRow;

        this.economy = new EconomyManager({ biomass: 140, maxBiomass: GameManager.maxBiomassBase, royalJelly: 0 }); // [A-01] 100→140, max 260
        this.economy.setPassiveRate(0.1);
        this.rooms = new RoomBuilder(this);
        this.pheromone = new PheromoneSystem();
        this.mutationSystem = new MutationSystem(this.cache.json.get('mutations'));

        // entra em estado de jogo (ativa ondas + simulação)
        GameManager.startRun(this.biomeId);
        this._runStart = Date.now();

        // grupos
        this.ants = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = [];
        this.resources = this.map.resources.map((r) => ({ ...r, value: 12, taken: false })); // [A-01] 10→12

        // refs globais p/ entidades
        this.gameRef = {
            grid: this.grid,
            pheromone: this.pheromone,
            rooms: this.rooms,
            economy: this.economy,
            gm: GameManager,
            queenTile: this.map.queenPos,
            queenPx: { x: (this.map.queenPos.x + 0.5) * TILE, y: (this.map.queenPos.y + 0.5) * TILE },
            incubation: GameManager.incubationMult,
            globalSpeedMult: biome.effect === 'slow' ? 0.5 : 1,
            queenTilePx: { x: (this.map.queenPos.x + 0.5) * TILE, y: (this.map.queenPos.y + 0.5) * TILE },
            rivalQueen: null,
            statsBiomass: (n) => (GameManager.stats.biomassCollected += n),
            statsRooms: () => GameManager.stats.roomsBuilt++
        };

        this.cam = this.cameras.main;
        this.cam.setBounds(0, 0, 64 * TILE, 64 * TILE);

        // ---------- render ----------
        this.tileKey = 'tiles_' + this.biomeId;
        this.mapRT = this.add.renderTexture(0, 0, 64 * TILE, 64 * TILE).setOrigin(0);
        this.propLayer = this.add.container(0, 0);
        this.redrawAll();
        // decoração nova: árvores, arbustos, pedras, cristais (recorte fiel)
        try { this._spawnDecor(); } catch(e){ console.warn('[decor]', e); }

        this.fog = this.add.renderTexture(0, 0, 64 * TILE, 64 * TILE).setOrigin(0);
        this._initFog();

        // ---------- entidades base ----------
        this.queen = new Queen(this, this.gameRef.queenPx.x, this.gameRef.queenPx.y, { hp: 400 * GameManager.hpBuff });
        this.ants.add(this.queen);

        // operárias iniciais
        this.spawnAnt('worker', this.queen.x, this.queen.y + TILE);
        this.spawnAnt('worker', this.queen.x - TILE, this.queen.y);

        // ninho rival + rainha rival
        this.rivalQueen = new EnemyBase(this, (this.map.rivalNest.x + 0.5) * TILE, (this.map.rivalNest.y + 0.5) * TILE, 'queen', { hp: 220, speed: 0, damage: 0, armor: 4 }, 'rival');
        this.rivalQueen.bossKind = 'rival';
        this.rivalQueen.setScale(0.8);
        this.gameRef.rivalQueen = this.rivalQueen;
        this.enemies.add(this.rivalQueen);
        for (let i = 0; i < 3; i++) this.spawnEnemy('ant', this.rivalQueen.x + (i - 1) * 20, this.rivalQueen.y + 20);

        // ---------- input ----------
        this.inputHandler.attach();

        // ---------- ondas ----------
        this.wave = 0;
        this.waveTimer = 10; // [G-01] 8→10
        this.bossSpawned = false;
        this.boss = null;

        // ---------- eventos ----------
        this._events();

        // HUD inicial
        this.game.events.emit('hud', { biomass: this.economy.biomass, jelly: GameManager.save.royalJelly });
        this.economy.events.on('changed', () => this.game.events.emit('hud', { biomass: this.economy.biomass, jelly: GameManager.save.royalJelly + this.economy.royalJelly }));

        // música
        this.audio.playBgm(this.biomeId === 'nucleo_primordial' ? 'bgm_boss' : 'bgm_underground');

        // lança HUD
        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
        // minimapa [J-06a]
        try{ this.minimap = new Minimap(this); this.minimap.create(); }catch{}
        // tutorial [A-05]
        try{ if(!GameManager.save.tutorialDone) this.tutorial = new TutorialManager(this); }catch{}

        this.revealFog(this.map.queenPos.x, this.map.queenPos.y, 8);
        // telemetria [F-02]
        try{ Analytics.log('run_start', {biome:this.biomeId, seed}); }catch{}
        // [D-07] partículas ambiente por bioma (otimizado: 6 em vez de 12, pool único)
        try{
            const biome = BiomeManager.byId(this.biomeId);
            const effect = biome.effect;
            const cols = effect==='burn'?0xff6a2a : effect==='poison'?0x5ad25a : effect==='slow'?0x6a9eff : effect==='crystal'?0xffe066 : 0xffffff;
            for(let i=0;i<6;i++){
                const x = Phaser.Math.Between(0, 64*TILE), y=Phaser.Math.Between(0, 64*TILE);
                const p = this.add.image(x,y,'particle').setTint(cols).setAlpha(0.45).setDepth(3);
                this.tweens.add({targets:p, y: y-12, alpha:{from:0.45,to:0}, duration:Phaser.Math.Between(3000,5000), repeat:-1, delay: Phaser.Math.Between(0,2000)});
            }
        }catch{}
    }

    /* ================= RENDER ================= */
    redrawAll() {
        // Otimizado: fatiamento por coluna para não bloquear main thread em mobile (16 batch)
        let y = 0;
        const batch = () => {
            for (let b = 0; b < 4 && y < 64; b++, y++) {
                for (let x = 0; x < 64; x++) this._drawTile(x, y);
            }
            if (y < 64) this.time.delayedCall(0, batch);
        };
        batch();
    }

    redrawTile(x, y, roomId = null) {
        this._drawTile(x, y);
        if (roomId) this._drawProp(x, y, roomId);
    }

    _drawProp(x, y, roomId) {
        try {
            const man = this.cache.json.get('manifest') || {};
            const frame = man.props?.tiles?.[ROOM_DEFS[roomId].prop];
            if (frame === undefined) return;
            const img = this.add.image(x * TILE + 8, y * TILE + 8, 'props', frame);
            this.propLayer.add(img);
        } catch {}
    }

    _drawTile(x, y) {
        try {
            const v = this.grid.get(x, y);
            const man = this.cache.json.get('manifest') || {};
            const tiles = man[this.tileKey]?.tiles;
            if (!tiles) { this.mapRT.fill(x * TILE, y * TILE, TILE, TILE, 0x060409); return; }
            let frame;
            if (v === T.SOLID) frame = (x + y) % 2 ? tiles.dirt : tiles.dirt_alt;
            else if (v === T.WALK) frame = tiles.tunnel;
            else if (v === T.ROOM) frame = tiles.tunnel;
            else if (v === T.ROCK) frame = tiles.rock;
            else if (v === T.SURFACE) frame = (x + y) % 2 ? tiles.surface : tiles.surface_alt;
            else frame = null; // céu

            if (frame === null || frame === undefined) {
                this.mapRT.fill(x * TILE, y * TILE, TILE, TILE, 0x060409);
            } else {
                try { this.mapRT.drawFrame(this.tileKey, frame, x * TILE, y * TILE); } catch {}
                // [D-07] tint por bioma 0.08
                try{
                    const biome = BiomeManager.byId(this.biomeId);
                    if(biome.light) this.mapRT.fill(x*TILE, y*TILE, TILE, TILE, biome.light, 0.08);
                }catch{}
            }
            // hazard overlay na superfície
            if (this.map.hazards.has(`${x},${y}`) && (v === T.SURFACE || v === T.WALK)) {
                try { this.mapRT.drawFrame(this.tileKey, (x + y) % 2 ? tiles.hazard : tiles.hazard_alt, x * TILE, y * TILE); } catch {}
            }
        } catch (e) {
            try { this.mapRT.fill(x * TILE, y * TILE, TILE, TILE, 0x060409); } catch {}
        }
    }

    _spawnDecor(){
        // usa os novos props recortados: árvores, arbustos, pedras, cristais
        const man = this.cache.json.get('manifest')||{};
        const pick = (key) => {
            const m = man[key];
            if(!m || !this.textures.exists(key)) return null;
            const f = Phaser.Math.Between(0, (m.frames||1)-1);
            return {key, frame:f, w:m.frameWidth, h:m.frameHeight};
        };
        // distribui 40 decorações na superfície + 20 no subterrâneo
        const decorSets = [
            {key:'props_arvores', weight:0.15, scale:1}, // árvores grandes
            {key:'props_arbustos', weight:0.25, scale:1},
            {key:'props_pedras', weight:0.35, scale:0.9},
            {key:'props_pedras2', weight:0.15, scale:0.9},
            {key:'props_cristais', weight:0.1, scale:1},
        ];
        const tryPlace = (x,y)=>{
            const r = Math.random();
            let acc=0, chosen=null;
            for(const s of decorSets){
                acc+=s.weight;
                if(r<acc){ chosen=s; break; }
            }
            if(!chosen) chosen=decorSets[2];
            const p = pick(chosen.key);
            if(!p) return;
            // evita colocar em cima da entrada ou da rainha rival
            if(Math.hypot(x - this.map.anthillPos.x, y - this.map.anthillPos.y) < 3) return;
            if(Math.hypot(x - this.map.rivalNest.x, y - this.map.rivalNest.y) < 4) return;
            if(this.grid.get(x,y)===T.ROCK) return;
            const img = this.add.image(x*TILE+8, y*TILE+8, p.key, p.frame);
            img.setOrigin(0.5, 0.8); // base no chão
            img.setDepth(y); // y-sort
            img.setScale(chosen.scale);
            // leve variação
            img.setTint(0xffffff);
            this.propLayer.add(img);
        };
        // superfície: 40
        for(let i=0;i<40;i++){
            const x = Phaser.Math.Between(1,62);
            const y = Phaser.Math.Between(this.map.skyRows, this.map.surfaceRow-1);
            if(this.grid.get(x,y)===T.SURFACE) tryPlace(x,y);
        }
        // subterrâneo decor leve: 15 pedras/cristais
        for(let i=0;i<15;i++){
            const x = Phaser.Math.Between(4,60);
            const y = Phaser.Math.Between(this.map.surfaceRow+2, 62);
            if(this.grid.get(x,y)===T.SOLID || this.grid.get(x,y)===T.WALK) {
                const p = pick(Math.random()<0.5?'props_pedras':'props_cristais');
                if(!p) continue;
                const img = this.add.image(x*TILE+8, y*TILE+8, p.key, p.frame);
                img.setOrigin(0.5,0.5);
                img.setAlpha(0.85);
                img.setDepth(y);
                this.propLayer.add(img);
            }
        }
        // gen cenários como background distante (2-3 ao fundo)
        try{
            const bgs = Object.keys(man).filter(k=>k.startsWith('bg_cenario_') && this.textures.exists(k));
            for(let i=0;i<Math.min(2,bgs.length);i++){
                const k = Phaser.Math.RND.pick(bgs);
                const img = this.add.image(Phaser.Math.Between(100, 900), Phaser.Math.Between(20, 80), k);
                img.setScrollFactor(0.3,0.3);
                img.setDepth(-10);
                img.setAlpha(0.6);
                img.setScale(0.5);
            }
        }catch{}
    }
    _initFog() {
        this.fog.fill(0, 0, 64 * TILE, 64 * TILE, 0x000000, 0.55);
        // pincel de névoa: usa arquivo se já carregado, senão gera fallback
        if (!this.textures.exists('fogbrush')) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(16, 16, 16);
            g.generateTexture('fogbrush', 32, 32);
            g.destroy();
        }
    }

    revealFog(tx, ty, radius) {
        // [J-06b] radius usado com *8
        const r = radius * 8;
        const brush = this.textures.exists('fogbrush') ? 'fogbrush' : null;
        if (brush) this.fog.erase(brush, tx * TILE + 8 - r/2, ty * TILE + 8 - r/2);
        else this.fog.erase('fogbrush', tx * TILE + 8 - 16, ty * TILE + 8 - 16);
        // também limpa círculo manual para garantir raio
        try {
            const g = this.add.graphics(); g.fillStyle(0xffffff,1).fillCircle(0,0,r); g.generateTexture('fogbig_'+r, r*2, r*2); g.destroy();
            this.fog.erase('fogbig_'+r, tx*TILE+8 - r, ty*TILE+8 - r);
        } catch {}
    }

    /* ================= SPAWNS ================= */
    spawnAnt(cls, x, y) {
        const def = ANT_CLASSES[cls];
        const cfg = { hp: def.hp * GameManager.hpMult(), speed: def.speed * GameManager.speed(), damage: def.damage * GameManager.damage(), armor: def.armor + GameManager.armor() };
        let a;
        if (cls.startsWith('ant_new_')) {
            const n = parseInt(cls.split('_')[2]||'1',10);
            if (n <= 2) { a = new SoldierAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 4) { a = new GuardianAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 6) { a = new HealerAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 8) { a = new GiantAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 10) { a = new SoldierAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 12) { a = new GuardianAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else if (n <= 14) { a = new HealerAnt(this, x, y, cfg); a.setTexture(def.sprite); }
            else { a = new GiantAnt(this, x, y, cfg); a.setTexture(def.sprite); }
        } else {
            switch (cls) {
                case 'worker': a = new WorkerAnt(this, x, y, cfg); break;
                case 'collector': a = new CollectorAnt(this, x, y, cfg); break;
                case 'soldier': a = new SoldierAnt(this, x, y, cfg); break;
                case 'guardian': a = new GuardianAnt(this, x, y, cfg); break;
                case 'scout': a = new ExplorerAnt(this, x, y, cfg); break;
                case 'sniper': a = new SniperAnt(this, x, y, cfg); break;
                case 'spy': a = new SpyAnt(this, x, y, cfg); break;
                case 'healer': a = new HealerAnt(this, x, y, cfg); break;
                case 'digger': a = new DiggerAnt(this, x, y, cfg); break;
                case 'giant': a = new GiantAnt(this, x, y, cfg); break;
                default: a = new WorkerAnt(this, x, y, cfg);
            }
        }
        // aplica escala se houver
        if(def.scale) try{ a.setScale(def.scale); }catch{}
        this.ants.add(a);
        this.audio.play('spawn');
        return a;
    }

    spawnEnemy(type, x, y) {
        const def = ENEMY_TYPES[type];
        const diff = BiomeManager.difficulty(this.biomeId);
        const cfg = { hp: def.hp * diff, speed: def.speed, damage: def.damage * diff, armor: def.armor, biomass: def.biomass };
        const e = new EnemyBase(this, x, y, def.sprite, cfg, type);
        if (this.anims.exists(def.sprite + '_walk')) try { e.play(def.sprite + '_walk'); } catch {}
        this.enemies.add(e);
        return e;
    }

    spawnBoss() {
        const biome = BiomeManager.byId(this.biomeId);
        const def = BOSS_TYPES[biome.boss];
        const diff = BiomeManager.difficulty(this.biomeId);
        const cfg = { hp: def.hp * diff, speed: def.speed, damage: def.damage * diff, armor: def.armor, boss: true };
        const b = new EnemyBase(this, (this.map.rivalNest.x + 0.5) * TILE, this.surfaceRow * TILE, def.sprite, cfg, biome.boss);
        b.boss = true;
        b.bossKind = biome.boss;
        if (this.anims.exists(def.sprite + '_walk')) try { b.play(def.sprite + '_walk'); } catch {}
        this.enemies.add(b);
        this.boss = b;
        this.bossSpawned = true;
        this.game.events.emit('bossAnnounce', def.name.toUpperCase());
        this.audio.play('boss');
        this.audio.playBgm('bgm_boss');
    }

    /* ================= AÇÕES DO MENU RADIAL ================= */
    openRadial(pointer) {
        const p = pointer && pointer.keyboard
            ? { x: this.game.config.width / 2, y: this.game.config.height / 2 }
            : pointer;
        this.radial.open(p);
    }

    executeRadialAction(id, tile) {
        const g = this.gameRef;
        if (id === 'dig') {
            const digTime = BiomeManager.byId(this.biomeId).effect === 'hardrock' ? 1.6 : 0.8;
            this.rooms.requestDig(tile.x, tile.y, digTime);
        } else if (id.startsWith('build:')) {
            this.rooms.buildRoom(tile.x, tile.y, id.slice(6));
        } else if (id.startsWith('pher:')) {
            const t = id.slice(5);
            this.pheromone.drop(t, tile.x, tile.y, 5, 12);
            this.audio.play('pheromone');
        } else if (id.startsWith('spawn:')) {
            const cls = id.slice(6);
            const def = ANT_CLASSES[cls];
            if (this.economy.spend(def.cost)) {
                this.queen.enqueue(cls);
            } else {
                this.audio.play('hurt');
            }
        }
    }

    /* ================= HELPERS P/ ENTIDADES ================= */
    findNearestEnemy(self) {
        let best = null;
        let bd = Infinity;
        for (const e of this.enemies.getChildren()) {
            if (e.dead || e === self) continue;
            if (e.faction !== 'Enemy') continue;
            const d = this._d2(self, e);
            if (d < bd) {
                bd = d;
                best = e;
            }
        }
        return best;
    }

    findNearestAlly(self) {
        let best = null;
        let bd = Infinity;
        for (const a of this.ants.getChildren()) {
            if (a.dead || a === self) continue;
            if (a.ignored) continue;
            if (a.stealth && this._d2(self,a) > (4*TILE)**2) continue; // [M-02] exploradora stealth >4 tiles ignorada
            if (a.faction !== 'Player') continue;
            const d = this._d2(self, a);
            if (d < bd) { bd = d; best = a; }
        }
        return best;
    }

    findNearestWard(self) {
        let best = null;
        let bd = Infinity;
        for (const a of this.ants.getChildren()) {
            if (a.dead || a.cls !== 'collector') continue;
            const d = this._d2(self, a);
            if (d < bd) {
                bd = d;
                best = a;
            }
        }
        return best;
    }

    findNearestWoundedAlly(self) {
        let best = null;
        let bd = Infinity;
        for (const a of this.ants.getChildren()) {
            if (a.dead || a.currentHp >= a.maxHp * 0.9) continue;
            const d = this._d2(self, a);
            if (d < bd) {
                bd = d;
                best = a;
            }
        }
        return best;
    }

    findResourceNear(tx, ty) {
        let best = null;
        let bd = Infinity;
        for (const r of this.resources) {
            if (r.taken) continue;
            const d = (r.x - tx) ** 2 + (r.y - ty) ** 2;
            if (d < bd) {
                bd = d;
                best = r;
            }
        }
        return best;
    }

    markResourcesNear(tx, ty, radius) {
        // exploradoras marcam recursos (coletoras usam via feromônio de coleta)
    }

    removeResource(r) {
        r.taken = true;
    }

    randomWalkable() {
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, 63);
            const y = Phaser.Math.Between(0, 63);
            if (this.grid.isWalkable(x, y)) return { x, y };
        }
        return null;
    }

    _d2(a, b) {
        return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    }

    spawnProjectile(from, to, dmg, type = 'physical') {
        const p = this.add.image(from.x, from.y, 'projectile_acid', 0);
        p.setDepth(5);
        this.projectiles.push({ obj: p, target: to, dmg, type, speed: 160 });
    }

    aoe(x, y, radius, dmg, faction, source = null, type = 'physical') {
        const group = faction === 'Player' ? this.enemies : this.ants;
        for (const e of group.getChildren()) {
            if (e.dead) continue;
            if (Math.hypot(e.x - x, e.y - y) <= radius) e.takeDamage(dmg, source, type);
        }
        this._burst(x, y, radius);
    }

    explodeAround(x, y, radius, dmg) {
        for (const e of this.enemies.getChildren()) {
            if (!e.dead && Math.hypot(e.x - x, e.y - y) <= radius) e.takeDamage(dmg, null);
        }
        this._burst(x, y, radius);
    }

    pullEnemies(x, y, radius) {
        for (const e of this.enemies.getChildren()) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - x, e.y - y);
            if (d <= radius && d > 1) {
                e.x += ((x - e.x) / d) * 8;
                e.y += ((y - e.y) / d) * 8;
            }
        }
    }

    convertEnemy(e) {
        this.economy.add(e.biomassDrop || 5);
        GameManager.stats.kills++;
        e.takeDamage(e.currentHp + 999, null);
    }

    shake(ms) {
        // [D-05] shake proporcional já tratado em damageNumber, aqui só garante clamp
        const c = Phaser.Math.Clamp(ms/1000, 0.002, 0.012);
        this.cam.shake(ms, c);
    }

    _burst(x, y, radius) {
        const n = 5;
        for (let i = 0; i < n; i++) {
            const p = this.add.image(x, y, 'particle').setDepth(6);
            p.setTint(0xffe066);
            const a = (i / n) * Math.PI * 2;
            this.tweens.add({ targets: p, x: x + Math.cos(a) * radius * 0.5, y: y + Math.sin(a) * radius * 0.5, alpha: 0, duration: 220, onComplete: () => p.destroy() });
        }
    }

    /* ================= EVENTOS ================= */
    _events() {
        this.events.on('enemyDied', (e) => {
            GameManager.stats.kills++;
            if (e !== this.rivalQueen && e.faction === 'Enemy') {
                this.economy.add(e.biomassDrop || 5);
                if (e.elite || e.boss) this._offerMutation();
            }
            // zumbis (floresta de fungos)
            if (BiomeManager.byId(this.biomeId).effect === 'zombie' && !e.boss && Math.random() < 0.4) {
                this.spawnEnemy('spiderling', e.x, e.y);
            }
            this.audio.play('death');
        });

        this.events.on('allyDied', (a) => {
            if (GameManager.flag('toxic_blood')) this.aoe(a.x, a.y, TILE * 1.5, 10, 'Player');
        });

        this.events.on('entityHurt', (e, d, src, type) => {
            if (e === this.queen) {
                this.game.events.emit('queenHp', this.queen.currentHp / this.queen.maxHp);
                this.game.events.emit('showQueenBar');
            }
        });

        this.events.on('queenDied', () => this._endRun(false));

        this.events.on('bossDied', (b) => {
            if (b === this.boss) {
                this.economy.royalJelly += BOSS_TYPES[BiomeManager.byId(this.biomeId).boss].jelly;
                this._offerMutation();
                this.time.delayedCall(800, () => this._offerMigration());
            } else if (b === this.rivalQueen) {
                // assimilação simplificada: inimigos viram biomassa
                for (const e of this.enemies.getChildren()) if (!e.dead && e !== b) this.economy.add(5), e.destroy();
                this.audio.play('win');
            }
        });

        this.game.events.on('mutationChosen', (id) => {
            const m = this.mutationSystem.mutations.find((x) => x.id === id);
            if (m) {
                GameManager.applyMutation(m);
                this.audio.play('card');
            }
            this._resumePlay();
        });

        this.game.events.on('migrationChosen', (id) => {
            GameManager.discoverBiome(id);
            GameManager.persist();
            // Sempre via carregamento para evitar ver tiles sendo gerados (ordem pós-menu > carregamento > jogo)
            this.scene.stop('UIScene');
            this.scene.start('CarregamentoScene', { next: 'LoadingScene', payload: { biome: id }, biome: id, duration: 800 });
        });
    }

    _offerMutation() {
        GameManager.setState('mutation');
        this.time.timeScale = 0;
        const cards = this.mutationSystem.rollMutations(GameManager.luck);
        this.game.events.emit('mutationOffer', cards);
    }

    _offerMigration() {
        GameManager.setState('migration');
        const choices = BiomeManager.nextChoices(this.biomeId).map((id) => ({ id, name: BiomeManager.byId(id).name }));
        this.game.events.emit('migrationOffer', choices);
    }

    _resumePlay() {
        this.time.timeScale = 1;
        GameManager.setState('playing');
    }

    _endRun(win) {
        if (this._ended) return;
        this._ended = true;
        let jelly = this.economy.royalJelly + (win ? 100 : 0);
        // [A-03] bônus vitória: +20 sem dano Rainha, +50 speedrun <5min, stage*10, derrota *0.6
        try{
            const stage = (BiomeManager.byId(this.biomeId).stage||0);
            if(win){
                if(this.queen && this.queen.currentHp >= this.queen.maxHp) jelly+=20;
                const duration = (Date.now() - (this._runStart||Date.now()))/1000;
                if(duration < 300) jelly+=50;
                jelly += stage*10;
            } else {
                jelly = Math.floor(jelly*0.6);
            }
        }catch{}
        GameManager.addRoyalJelly(jelly);
        GameManager.discoverBiome(this.biomeId);
        GameManager.persist();
        GameManager.gameOver(win);
        this.audio.play(win ? 'win' : 'gameover');
        this.audio.stopBgm();
        this.game.events.emit('gameOver', { win, stats: GameManager.stats, jelly });
        try{ Analytics.log('run_end', {win, wave:this.wave, biomass:GameManager.stats.biomassCollected, rooms:GameManager.stats.roomsBuilt, duration: (Date.now()-(this._runStart||Date.now()))/1000, jelly}); }catch{}
    }

    getTimeScale() {
        return this.timeController ? this.timeController.getTimeScale() : 1;
    }

    /* ================= UPDATE ================= */
    update(time, delta) {
        this.gameDelta = delta;
        this.inputHandler.update();
        const dt = delta / 1000;
        const playing = GameManager.state === 'playing';
        // wave emit para HUD [HUD-02]
        try{ if(playing) this.game.events.emit('wave', {wave:this.wave, maxWave:GameManager.maxWave, timer:this.waveTimer}); }catch{}
        // culling 40*TILE [GOLD-02] otimizado: a cada 6 frames + distância ao quadrado
        this._cullTick = (this._cullTick||0)+1;
        if(this._cullTick%6===0){
            try{
                const cx = this.cam.worldView.x + this.cam.worldView.width/2;
                const cy = this.cam.worldView.y + this.cam.worldView.height/2;
                const r2 = (40*16)*(40*16);
                const doCulling = (group)=>{
                    for(const e of group.getChildren()){
                        const dx=e.x-cx, dy=e.y-cy;
                        e.visible = (dx*dx+dy*dy) < r2;
                    }
                };
                doCulling(this.ants); doCulling(this.enemies);
            }catch{}
        }
        // tsunami [Mut-01] a cada 14s
        try{
            if(GameManager.flag('tsunami') && playing){
                this._tsunamiTimer = (this._tsunamiTimer||14) - dt*this.timeController.getTimeScale();
                if(this._tsunamiTimer<=0){
                    this._tsunamiTimer=14;
                    this.aoe(this.queen.x, this.queen.y, 16*6, 12, 'Player');
                    this._burst(this.queen.x, this.queen.y, 16*6);
                }
            }
            if(GameManager.flag('time_fissure') && playing){
                this._fissureTimer = (this._fissureTimer||22) - dt*this.timeController.getTimeScale();
                if(this._fissureTimer<=0){
                    this._fissureTimer=22;
                    for(const e of this.enemies.getChildren()) if(!e.dead) e.addStatus('freeze',{duration:2.2});
                }
            }
        }catch{}

        // entidades só simulam durante o jogo (cartas/migração = pausa 100%)
        if (playing) {
            for (const a of this.ants.getChildren()) if (a.update && !a.dead) a.update(dt);
            for (const e of this.enemies.getChildren()) if (e.update && !e.dead) e.update(dt);
        }

        // economia passiva
        if (!this.timeController.isPaused && playing) this.economy.update(dt * this.timeController.getTimeScale());
        if (playing) this.pheromone.update(dt * this.timeController.getTimeScale());

        // ondas
        if (GameManager.state === 'playing' && !this.bossSpawned) {
            this.waveTimer -= (delta / 1000) * this.timeController.getTimeScale();
            if (this.waveTimer <= 0) {
                this.waveTimer = 18; // [G-01] 14→18
                this.wave++;
                if (this.wave >= GameManager.maxWave) { if (this.rooms.rooms.length >= 2 || GameManager.stats.biomassCollected >= 80) this.spawnBoss(); else { this.waveTimer = 2; } } // [G-01] gate salas 2 ou biomass 80
                else this._spawnWave();
            }
        }

        // perigos do bioma
        if (playing) this._hazards(delta);

        // projéteis
        if (playing) this._updateProjectiles(delta);

        // rainha morta -> game over já tratado; chefe final
        if (this.biomeId === 'nucleo_primordial' && this.boss && this.boss.dead) {
            this._endRun(true);
        }
    }

    _spawnWave() {
        const biome = BiomeManager.byId(this.biomeId);
        const count = 2 + this.wave;
        for (let i = 0; i < count; i++) {
            const type = biome.enemies[Phaser.Math.Between(0, biome.enemies.length - 1)];
            const side = Phaser.Math.Between(0, 1);
            const x = side ? 4 * TILE : 60 * TILE;
            const y = (this.map.skyRows + Phaser.Math.Between(0, 3)) * TILE;
            this.spawnEnemy(type, x, y);
        }
        if (biome.effect === 'flora') this.spawnEnemy('plant', Phaser.Math.Between(6, 58) * TILE, (this.map.skyRows + 1) * TILE);
    }

    _hazards(delta) {
        const effect = BiomeManager.byId(this.biomeId).effect;
        const dt = (delta / 1000) * this.timeController.getTimeScale();
        if (effect === 'none') return;
        for (const a of this.ants.getChildren()) {
            if (a.dead) continue;
            const t = a.tile();
            const onHazard = this.map.hazards.has(`${t.x},${t.y}`);
            if (onHazard) {
                if (effect === 'burn' && !GameManager.flag('crystal')) a.takeDamage(4 * dt, null, 'fire');
                if (effect === 'poison' && !GameManager.flag('crystal')) a.addStatus('poison', { dps: 3, duration: 1 });
            }
            if (effect === 'slow') a.addStatus('slow', { duration: 0.5 });
        }
        if (effect === 'mutation' && Math.random() < 0.001) this._offerMutation();
    }

    _updateProjectiles(delta) {
        const dt = (delta / 1000) * this.timeController.getTimeScale();
        this.projectiles = this.projectiles.filter((p) => {
            if (p.target.dead) {
                p.obj.destroy();
                return false;
            }
            const dx = p.target.x - p.obj.x;
            const dy = p.target.y - p.obj.y;
            const d = Math.hypot(dx, dy);
            if (d < 6) {
                p.target.takeDamage(p.dmg, null, p.type === 'acid' ? 'acid' : 'physical');
                p.obj.destroy();
                return false;
            }
            p.obj.x += (dx / d) * p.speed * dt;
            p.obj.y += (dy / d) * p.speed * dt;
            return true;
        });
    }
}
