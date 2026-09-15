# 🗺️ MAPA DE SPRITES — FUMIGA GOAT

**Gerado em:** 2026-09-14 — Branch `arena/01a09b21-fumiga-goat` (commit `bda7ddf`)  
**Total de assets mapeados:** 57 entradas no `manifest.json` + 16 biomas + 7 backgrounds + 23 retratos  
**Onde os arquivos vivem:** `assets/sprites/`, `assets/tilesets/`, `assets/ui/`, `assets/fonts/`, `assets/sprites/portraits/`

Este documento lê **todas as pastas que organizam os sprites** (o nome da pasta/arquivo já diz o que é) e descreve **onde cada um se encaixa no jogo**, qual cena o carrega e qual mecânica o usa. Serve também como guia para você adicionar os **novos sprites** que organizou.

---

## 1. Visão Rápida da Organização

| Pasta / Padrão | O que é | Quantos | Onde aparece no jogo |
|---|---|---|---|
| `ant_*.png` | Formigas jogáveis (10 classes) | 10 + 1 inimiga | `GameScene` → `spawnAnt()` / `Queen.enqueue()` / Menu Radial `spawn:*` |
| `queen.png` | Rainha do jogador | 1 (32×32, 6 frames) | Centro da Câmara Central, `Queen.js`, HP da run |
| `enemy_*.png` | Inimigos comuns | 7 + 1 aranha | `MapGenerator` biomas + `GameScene._spawnWave()` |
| `boss_*.png` | Chefes de bioma + Rainha Final | 4 | Onda 7, `GameScene.spawnBoss()`, `BiomeManager.boss` |
| `tiles_*.png` | Chão de cada bioma (8 tiles p/ bioma) | 16 | `GameScene._drawTile()` → `tiles_<biomeId>` |
| `bg_*.png` | Parallax / fundos distantes | 7 | `MainMenuScene`, `CarregamentoScene`, `GameScene` céu |
| `portraits/*.png` | Retratos 64×64 para cartas/UI | 23 | `UIScene`, `mutation_cards`, `RadialMenu`, barra da Rainha |
| `props.png` | Props 16×16 das salas (berçário/dispensa) | 16 tiles | `RoomBuilder` → `props` + `GameScene._drawProp()` |
| `ui/*` | Ícones, painel 9-slice, cartas | 3 arquivos | `UIScene`, `RadialMenu`, `PreloadScene` |
| `projectile_acid.png` | Projétil ácido | 1 | `GameScene.spawnProjectile()` (Sniper/Planta) |
| `particle/glow/fogbrush.png` | Efeitos | 3 | `GameScene._burst()`, névoa, partículas de bioma |

---

## 2. Formigas Jogáveis — `assets/sprites/ant_*.png` (20×20, 8 frames)

Todas têm a mesma sheet: **8 frames** em `128?` → 4 `walk` + 2 `idle` + 2 `attack`. São hexápodes estilizados, cabeça 1.1×, olhos 1.70 + blush 52α (V2 Híbrida SK×DC×Celeste×Ant). Usam paleta ≤20 cores, outline 1.8px, ramp 4 tons.

| Arquivo | Classe | Custo | HP | Dano | Onde se encaixa / Mecânica |
|---|---|---|---|---|---|
| `ant_worker.png` | **Operária** | 10 | 30 | 0 | Escavação base (`dig`), primeira operária da run. `WorkerAnt.js` |
| `ant_collector.png` | **Coletor** | 15 | 26 | 0 | Coleta biomassa na superfície (`pher:collect`), `CollectorAnt.js` |
| `ant_scout.png` | **Exploradora** | 20 | 24 | 0 | Stealth >4 tiles ignorada, revela recursos (`pher:attack` scout), `ExplorerAnt.js` |
| `ant_soldier.png` | **Soldada** | 25 | 60 | 9 | Tanque leve, ataca em onda, `SoldierAnt.js` |
| `ant_guardian.png` | **Guardiã** | 30 | 95 | 7 | Tanque pesado armor 14, `GuardianAnt.js` |
| `ant_sniper.png` | **Franco-Atiradora** | 40 | 12 | 14 | Alcance 3, `spawnProjectile`, `SniperAnt` |
| `ant_spy.png` | **Espião** | 100 | 40 | 0 | Converte inimigo (`convertEnemy`), `SpyAnt` |
| `ant_healer.png` | **Curandeira** | 60 | 45 | 0 | Cura área 2 tiles, `HealerAnt` |
| `ant_digger.png` | **Escavadora** | 45 | 60 | 4 | Escava 2× mais rápido, `DiggerAnt` |
| `ant_giant.png` | **Gigante** | 120 | 320 | 40 | Elite 2.2× escala, dano em área, `GiantAnt` |
| `ant_enemy.png` | **Formiga Inimiga** | — | 44 | 7 | Inimigo do bioma `prado_fogo`/`canyon_geleia`, `EnemyBase` |

**Fluxo:** `GameManager.startRun()` → `GameScene.spawnAnt()` → `Queen.enqueue()` (fila de incubação) → `RadialMenu` `spawn:*` . Todas usam `ANT_CLASSES` em `Config.js` e `TimeController`.

---

## 3. Rainhas — `assets/sprites/queen.png` + `boss_first_queen.png`

| Arquivo | Tamanho | Frames | Papel |
|---|---|---|---|
| `queen.png` | 32×32 | 6 | **Sua Rainha**. Câmara Central (3×3 `ROOM`), HP `400×hpBuff`. Se morrer → `queenDied` → `GameManager.gameOver(false)` + tela de Derrota. |
| `boss_first_queen.png` | 64×64 | 6 | **A Primeira Rainha** (Boss final `nucleo_primordial`, stage 4). HP 1600, `BOSS_TYPES.first_queen`. Vitória ao matar → `GameManager.gameOver(true)` + 300 geleia. |

---

## 4. Inimigos Comuns — `assets/sprites/enemy_*.png`

Cada um tem `ENEMY_TYPES` em `Config.js` (hp/speed/damage/biomass). São spawnados por `BiomeManager.enemies` + `GameScene._spawnWave()`.

| Arquivo | Tamanho | Biomassa | Biomas onde aparece | Comportamento |
|---|---|---|---|---|
| `enemy_centipede.png` | 24×24 4f | 8 | `bosque_umido`, `pantano_toxico`, `abismo` | Centopeia rápida, 40hp |
| `enemy_beetle.png` | 20×20 4f | 7 | `bosque_umido`, `prado_fogo`, `cemiterio`, `vale_ossos` | Tanque 60hp armor 8 |
| `enemy_scorpion.png` | 20×20 4f | 9 | `deserto`, `tundra`, `vale_ossos` | 50hp, 44 speed |
| `enemy_fly.png` | 16×16 2f | 5 | `pantano`, `floresta_fungos`, `jardim` | Voador 70 speed, fraco |
| `enemy_spiderling.png` | 12×12 2f | 3 | `cavernas`, `abismo`, `fosso` | Enxame, 16hp |
| `enemy_moth.png` | 20×20 2f | 5 | `tundra`, `jardim` | Voador lento |
| `enemy_termite.png` | 18×18 4f | 5 | `deserto`, `cemiterio`, `vale` | 34hp, 48 speed |
| `enemy_plant.png` | 20×20 2f | 9 | `oasis_carnivoro`, flora effect | Planta carnívora 55hp, projétil |
| `enemy_centipede` já listado | — | — | — | — |

**Dica pra novos inimigos:** adicione o PNG em `assets/sprites/`, registre em `manifest.json` (`frameWidth/Height/frames`) e em `Config.js` `ENEMY_TYPES`, depois liste o id em `BiomeManager.BIOMES[<bioma>].enemies`.

---

## 5. Chefes — `assets/sprites/boss_*.png` (48-64px, 4-6 frames)

| Arquivo | Chefe | HP | Geleia | Biomas (stage) | Habilidade |
|---|---|---|---|---|---|
| `boss_wolf_spider.png` | **Aranha-Lobo Matriarca** | 500 | 60 | `bosque_umido`, `cemiterio`, `tundra`, `jardim`, `fosso` (1-3) | Spawn de aranhinhas |
| `boss_bombardier.png` | **Besouro Bombardeiro Piroclástico** | 650 | 70 | `prado_fogo`, `deserto`, `cavernas`, `canyon`, `prisao` | Explosão ácida `aoe` |
| `boss_putrid_centipede.png` | **Centopeia Pútrida** | 750 | 80 | `pantano`, `floresta_fungos`, `oasis`, `abismo`, `vale` | Zumbi (floresta) |
| `boss_first_queen.png` | **A Primeira Rainha** | 1600 | 300 | `nucleo_primordial` (4) | Arena final, vitória |

Registrados em `BOSS_TYPES` e `BiomeManager.boss`.

---

## 6. Chão dos Biomas — `assets/tilesets/tiles_*.png` (16×16, 8 frames cada)

Cada bioma tem **1 tileset** de 128×16 (8 tiles). O `manifest` define o mapeamento:

```
dirt=0, dirt_alt=1, tunnel=2, rock=3, surface=4, surface_alt=5, hazard=6, hazard_alt=7
```

`GameScene._drawTile()` escolhe o frame pelo `TILE_KIND`:

- `SOLID` → `dirt / dirt_alt` (terra fechada)
- `WALK` / `ROOM` → `tunnel` (túnel escavado)
- `ROCK` → `rock` (pedra indestrutível)
- `SURFACE` → `surface / surface_alt` (grama/terra da superfície)
- `hazard` overlay se `map.hazards` contém a coordenada

| Tileset | Bioma (stage) | Tema visual atual | Efeito de jogo (`BiomeManager.effect`) | Cor luz / névoa |
|---|---|---|---|---|
| `tiles_bosque_umido.png` | **Bosque Úmido** (1) — **PRIMEIRO MAPA** | **NOVO gramado recortado do seu sheet** (5×8 grama + terra + flores + pedras, foliage border) — ver seção 6.1 | `none` (sem perigo) | `#7ad26a` / `#0d1408` |
| `tiles_prado_fogo.png` | Prado de Fogo (1) | Terra avermelhada, queimada | `burn` (dano fogo sem cristal) | `#ff7a2a` |
| `tiles_deserto_escaldante.png` | Deserto Escaldante (1) | Areia clara, rochas | `sand` | `#ffd07a` |
| `tiles_pantano_toxico.png` | Pântano Tóxico (1) | Lama verde, poças | `poison` (veneno) | `#9dff3c` |
| `tiles_cemiterio_troncos.png` | Cemitério de Troncos (1) | Troncos, terra escura | `hardrock` (escavar 1.6s) | `#c8a05a` |
| `tiles_floresta_fungos.png` | Floresta de Fungos (2) | Cogumelos roxos | `zombie` (40% respawna spiderling) | `#b44ad2` |
| `tiles_cavernas_cristal.png` | Cavernas de Cristal (2) | Cristal azul, rocha 22% | `hardrock` | `#7ad2ff` |
| `tiles_tundra_congelada.png` | Tundra Congelada (2) | Neve, gelo | `slow` (slow 0.5) | `#dff2ff` |
| `tiles_oasis_carnivoro.png` | Oásis Carnívoro (2) | Vegetação densa | `flora` (planta extra) | `#c82a5a` |
| `tiles_jardim_flutuante.png` | Jardim Flutuante (2) | Água 50% | `none` + água bloqueante | `#2a7ad2` |
| `tiles_abismo_bioluminescente.png` | Abismo Bioluminescente (3) | Escuro neon | `dark` | `#4affe0` |
| `tiles_vale_ossos.png` | Vale de Ossos (3) | Ossos, terra clara | `hoard` | `#d8d2b8` |
| `tiles_fosso_teias.png` | Fosso das Teias (3) | Teias, rocha | `slow` | `#e8e8f0` |
| `tiles_canyon_geleia.png` | Cânion de Geleia Real (3) | Âmbar dourado | `mutation` (0.1% mutação/tick) | `#ffc832` |
| `tiles_prisao_ambar.png` | Prisão de Âmbar (3) | Âmbar laranja | `slow` | `#ffae1e` |
| `tiles_nucleo_primordial.png` | Núcleo Primordial (4) | Arena clara | `arena` | `#fff3b0` |

### 6.1 Caso especial — Seu gramado (chão campo.jpeg)

Você enviou um sheet **5×8 = 40 tiles de chão** + **13 props** embaixo. O recorte solicitado foi feito assim:

- **Corte:** detecção de bordas pretas 4px → fatia cada tile nativo → `resize 16×16 NEAREST`
- **Destino:** `tiles_bosque_umido.png` (8 tiles). Os 40 foram amostrados nos 8 mais representativos (grama limpa, grama com pedras, grama com flores, mancha de terra, caminho, etc.). Se quiser usar os **40 como variação**, basta trocar o manifest para `frames:40` e o `GameScene._drawTile()` para `Phaser.Math.Between(0,39)` em `surface` — já deixei o script `tools/slice_gramado.py` pronto pra isso.
- **Props de baixo:** vão para `props.png` (moitas, flores, pedras, toco) — ver seção 8.

Para **novos tilesets**, siga o mesmo padrão: 1 PNG por bioma, 128×16, 8 frames, nome `tiles_<id>.png` e entrada no `manifest.json` + `BiomeManager.BIOMES`.

---

## 7. Fundos / Parallax — `assets/sprites/bg_*.png`

São `image` estáticos (1 frame), usados como camadas distantes.

| Arquivo | Tamanho | Onde entra |
|---|---|---|
| `bg_castle.png` | 128×96 | Castelo ao fundo (MainMenu / Apresentação) |
| `bg_water.png` | 128×32 | Água do jardim flutuante |
| `bg_boat.png` | 24×16 | Barco no fosso |
| `bg_clouds.png` | 64×32 | Nuvens parallax |
| `bg_moon.png` | 64×64 | Lua (Tela de Apresentação) |
| `bg_birds.png` | 32×12 | Pássaros animados |
| `bg_window.png` | 64×64 | Janela do menu / vitral |

Carregados via `manifest` como `image` e desenhados em `MainMenuScene` / `ApresentacaoScene`.

---

## 8. Props de Sala — `assets/sprites/props.png` (16×16, 16 frames)

Tiles 16×16 que decoram as salas construídas pelo `RoomBuilder`.

Mapeamento atual (`manifest.props.tiles`):

- `nursery` (berçário), `pantry` (dispensa), `defense` (defesa), `fungus` (fungo) etc. — 16 variações.

`GameScene._drawProp()` desenha o prop no `propLayer` conforme `ROOM_DEFS[roomId].prop`.

**Seus props do sheet (moitas, flores, pedras, toco, círculos de grama/terra):** basta adicioná-los aqui. O `slice_gramado.py` já corta os 13 do rodapé e anexa ao `props.png` sem sobrescrever os existentes.

---

## 9. Retratos — `assets/sprites/portraits/*.png` (64×64)

Versão “volumétrica” das mesmas sprites, com ramp 4 tons + halo 88α, usada em UI grande.

- 10 formigas (`ant_worker` … `ant_giant`) + 1 inimiga + 1 rainha + 7 inimigos + 4 chefes = **23**
- Usados em: `UIScene` (cartas de mutação), `MutationSystem` (thumbs), `RadialMenu`, barra da Rainha, `MainMenu` DLC.

**Novos retratos:** exporte em 64×64, fundo transparente, nome igual ao sprite base dentro de `portraits/`, e adicione entrada no manifest se quiser animação.

---

## 10. Projéteis & Efeitos — `assets/sprites/projectile_acid.png` + `particle/glow/fogbrush.png`

| Arquivo | Tamanho | Uso |
|---|---|---|
| `projectile_acid.png` | 8×8 4f | Tiro da Sniper/Planta, `GameScene.spawnProjectile()` → `aoe` |
| `particle.png` | 3×3 | Explosões, `GameScene._burst()` |
| `glow.png` | 8×8 | Brilho da Rainha / mutação |
| `fogbrush.png` | 32×32 | Pincel da névoa de guerra, `GameScene.revealFog()` |

---

## 11. UI — `assets/ui/*`

| Arquivo | Tamanho | Uso |
|---|---|---|
| `icons.png` | 16×16 27 frames | Ícones do HUD: folha (biomassa), geleia, coração, pá, etc. `ui_icons` |
| `panel.png` | 48×48 9-slice | Painel 9-slice do HUD / cartas / menu radial |
| `mutation_cards.png` | 96×128 8 frames | Cartas de mutação (comum/incomum/rara/épica), `MutationSystem` |
| `favicon.svg` | — | Ícone da aba |

Carregados em `PreloadScene` como `spritesheet` / `image`.

---

## 12. Fonte — `assets/fonts/fumiga.png` + `fumiga.xml`

BitmapFont `fumiga` (8×8), usada em **todo texto** do jogo. Gerada via `tools/generate-sprites.mjs` `font` + `pixlib`. Fallback para `monospace` se falhar no headless.

---

## 13. Áudio & Dados — `assets/audio/` + `assets/data/`

Não são sprites, mas completam o mapeamento:

- `bgm_*.wav` (underground/surface/boss) → `AudioManager.playBgm()`
- `sfx_*.wav` (bite, acid, dig, build, spawn, hurt, death, pheromone, card, jelly, boss, gameover, win, click) → `AudioManager.play()`
- `mutations.json`, `skills.json`, `tips.json` → `PreloadScene` → `MutationSystem` / `SkillTreeScene`

---

## 14. Como adicionar SEUS novos sprites organizados

Você disse que organizou pastas que já dizem o que cada sprite é. Use esta convenção (igual à atual) e o jogo já vai entender:

**1. Nomeie a pasta pelo tipo:**
- `formigas/` → `ant_<classe>.png`
- `inimigos/` → `enemy_<nome>.png`
- `chefes/` → `boss_<nome>.png`
- `chao/<bioma>/` → `tiles_<bioma>.png`
- `fundos/` → `bg_<nome>.png`
- `retratos/` → `portraits/<mesmo_nome>.png`
- `props/` → `props.png` (adicione frames)
- `ui/` → `icons.png` / `panel.png` / `mutation_cards.png`
- `efeitos/` → `particle.png` etc.

**2. Coloque o PNG na pasta correta:**
- `assets/sprites/` para entidades 16-32px
- `assets/tilesets/` para chão 128×16
- `assets/sprites/portraits/` para retratos 64×64
- `assets/ui/` para UI

**3. Registre no `assets/sprites/manifest.json`:**
```json
"meu_novo_inimigo": {
  "file": "assets/sprites/enemy_meu_novo.png",
  "frameWidth": 20, "frameHeight": 20, "frames": 4,
  "anims": { "walk": [0,1,2,3] }
}
```

**4. Ligue na lógica:**
- Novo inimigo → `Config.js` `ENEMY_TYPES` + `BiomeManager.BIOMES[].enemies`
- Novo bioma → `BiomeManager.BIOMES` + tileset + `GameManager.startRun(bioma)`
- Nova formiga → `Config.js` `ANT_CLASSES` + `EliteClasses.js`

**5. Gere o bundle:**
```bash
node tools/generate-sprites.mjs   # se usou pixlib
python3 tools/build_dist.py       # 1402KB gz356K
npm test                          # 14/14 deve passar
```

> **Seu gramado já está integrado como exemplo:** `tiles_bosque_umido.png` foi recortado do seu sheet (respeitando “só recortar, não criar”). Para usar os 40 tiles em vez de 8, me diga e eu troco o `frames:40` e o sorteio em `GameScene`.

---

## 15. Lista completa de arquivos atuais (para conferir)

```
assets/sprites/ant_collector.png (20×20 8f) → Coletor
assets/sprites/ant_digger.png → Escavadora
assets/sprites/ant_enemy.png → Formiga inimiga
assets/sprites/ant_giant.png (16×16 8f) → Gigante
assets/sprites/ant_guardian.png → Guardiã
assets/sprites/ant_healer.png → Curandeira
assets/sprites/ant_scout.png → Exploradora
assets/sprites/ant_sniper.png → Franco-Atiradora
assets/sprites/ant_soldier.png → Soldada
assets/sprites/ant_spy.png → Espião
assets/sprites/ant_worker.png → Operária
assets/sprites/queen.png (32×32 6f) → Rainha
assets/sprites/enemy_beetle.png → Besouro
assets/sprites/enemy_centipede.png (24×24 4f) → Centopeia
assets/sprites/enemy_fly.png (16×16 2f) → Mosca
assets/sprites/enemy_moth.png → Mariposa
assets/sprites/enemy_plant.png → Planta carnívora
assets/sprites/enemy_scorpion.png → Escorpião
assets/sprites/enemy_spiderling.png (12×12 2f) → Aranhinha
assets/sprites/enemy_termite.png (18×18 4f) → Cupim
assets/sprites/boss_bombardier.png (48×48 4f) → Bombardeiro
assets/sprites/boss_putrid_centipede.png (64×64 4f) → Centopeia Pútrida
assets/sprites/boss_wolf_spider.png (64×64 4f) → Aranha-Lobo
assets/sprites/boss_first_queen.png (64×64 6f) → Primeira Rainha
assets/sprites/bg_birds.png / bg_boat.png / bg_castle.png / bg_clouds.png / bg_moon.png / bg_water.png / bg_window.png → Fundos
assets/sprites/fogbrush.png / glow.png / particle.png → Efeitos
assets/sprites/projectile_acid.png (8×8 4f) → Projétil
assets/sprites/props.png (16×16 16f) → Props de sala
assets/sprites/portraits/*.png (64×64) → Retratos 23
assets/tilesets/tiles_*.png (16×16 8f) → 16 biomas
assets/ui/icons.png (16×16 27f) / panel.png (48×48) / mutation_cards.png (96×128 8f) → UI
assets/fonts/fumiga.png → Fonte
```

Pronto para você apontar quais pastas novas você criou — me diga os nomes das pastas e eu já gero a linha exata de integração no `manifest.json` + `Config.js` + `BiomeManager` para cada sprite, sem precisar recriar nada.
