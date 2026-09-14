# 🎨 NOVOS SPRITES — MAPEAMENTO COMPLETO PARA O JOGO

**Gerado:** 2026-09-14 — leitura de **TODAS as pastas organizadas** que você adicionou via `Add files via upload` (commit `d5e13e5`)  
**Total de novos arquivos:** **~860 arquivos** em **14 pastas raiz** + 16 subpastas  
**Estilo:** Pixel art crisp 16-bit, paleta saturada, com e sem sombra (você já separou certo)

> Este documento responde ao pedido: *“Leia todos e descreva onde cada um deles se encaixaria dentro do jogo”*. Cada pasta tem: **o que contém, quantos, estilo visual, onde entra no FUMIGA, e como ligar no código**.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [FAUNA — `animais/`](#2-fauna--animais)
3. [FLORA BAIXA — `arbustos/` + `arbustos2/`](#3-flora-baixa--arbustos)
4. [ÁRVORES — `arvores/` + `arvores2/`](#4-árvores--arvores)
5. [CENÁRIOS / CHÃO — `cenarios/`](#5-cenários--chão--cenarios)
6. [CRISTAIS — `cristais/` + `cristais1/`](#6-cristais--cristais)
7. [PEDRAS — `pedras/` + `pedras2/`](#7-pedras--pedras)
8. [FORMIGAS NOVAS — `formigas/`](#8-formigas-novas--formigas)
9. [ÍCONES — `icones/` `icones2/` `icones3/`](#9-ícones--icones)
10. [FONTE — `fonte/`](#10-fonte--fonte)
11. [Guia de Integração Rápida](#11-guia-de-integração-rápida)
12. [Lista Completa de Arquivos](#12-lista-completa)

---

## 1. Visão Geral

Você organizou **perfeitamente**: o nome da pasta já diz o tipo. O jogo já tem um sistema equivalente em `assets/` — a integração é só mover/copiar para `assets/` e registrar no `manifest.json` + `Config.js`/`BiomeManager`.

| Pasta nova | Conteúdo | Qtd | Já existe em `assets`? | Encaixe principal |
|---|---|---|---|---|
| `animais/` | 13 animais de fazenda, 5 animações cada, com/sombra | 82 | `enemy_*` / `ant_*` | **Novos inimigos neutros / fauna ambiente / mini-bosses** |
| `arbustos/` `arbustos2/` | Bushes floridos, árvores queimadas/quebradas | 85+81=166 | `props.png` / `bg_*` | **Props de superfície, vegetação destrutível** |
| `arvores/` `arvores2/` | Árvores grandes (Outono, queimada, fruta, Natal) | 85+81=166 | `props.png` / tiles | **Obstáculos grandes, biomassa** |
| `cenarios/` | 3 sheets de chão + 8 cenários gerados + terra | 15 | `tiles_*.png` | **Tilesets dos biomas (gramado/deserto/pântano)** |
| `cristais/` `cristais1/` | Cristais preto/azul/vermelho escuro | 85+81=166 | `tiles_cavernas_cristal` | **Recurso / hazard de caverna** |
| `pedras/` `pedras2/` | Rochas 1/2/3/5/6 com 5 vars + sombra/grama | 101+61=162 | `tiles_*.png` rock | **Tiles `ROCK` e props de pedra** |
| `formigas/` | 16 formigas geradas (gen-*.png) | 17 | `ant_*.png` | **Novas classes elite / skins** |
| `icones/` `icones2/` `icones3/` | Ícones 1-119, 2 vars cada | 84+83+93=260 | `ui/icons.png` (27) | **Loja, skill tree, mutações** |
| `fonte/` | `fonte foda.jpg` | 2 | `fonts/fumiga.png` | **Nova bitmap font** |

**Duplicação notada:** `animais/animais/` e `Assets_shadow` duplicados — é o pack original com e sem sombra. Use `With_Shadow` para superfície (dia) e `Without_shadow` para subterrâneo/estilizado.

---

## 2. FAUNA — `animais/` (82 arquivos)

**Estrutura:**
```
animais/
 └─ animais/
     ├─ With_Shadow/      ← com sombra projetada (dia)
     │   ├─ Black_grouse/ (5: Death, Flight, Hurt, Idle, Walk)
     │   ├─ Boar/ (6: Attack, Death, Hurt, Idle, Run, Walk)  ← único com Attack
     │   ├─ Deer/ (5), Fox/ (5), Hare/ (5)
     │   └─ Bull, Calf, Chick, Lamb, Piglet, Rooster, Sheep, Turkey (1 anim .png cada, 8 frames)
     └─ Without_shadow/   ← sem sombra + pasta Shadows/ separada
         ├─ Black_grouse/, Boar/, Deer/, Fox/, Hare/ (5-6 cada)
         ├─ + Shadows/ (8 sombras isoladas)
         └─ Bull, Calf, Chick... (mesmos)
     └─ a (1) ← arquivo vazio, ignorar
```

**Estilo visual:** Top-down ou 3/4, 12-24px, 5-8 frames, paleta terrosa, outline suave, já no estilo do jogo.

**Onde se encaixa no FUMIGA:**

| Animal | Tipo sugerido | Bioma ideal | Mecânica | Código |
|---|---|---|---|---|
| **Boar** (único com Attack) | **Mini-boss / inimigo forte** | `bosque_umido`, `cemiterio_troncos`, `prado_fogo` | Carga `Run` → `Attack` 11 dmg, 60hp | Novo `ENEMY_TYPES.boar`  → `BiomeManager.enemies` |
| **Fox, Black_grouse, Hare** | **Predador rápido / voador** | `tundra_congelada`, `bosque`, `vale_ossos` | 70 speed, 22-40hp, foge quando ferido | `fox`, `hare` |
| **Deer** | **Neutro arisco** (não ataca, foge) | `bosque_umido`, `oasis_carnivoro` | Ao se aproximar, `Run` e dropa 3 biomassa se morto | `deer` com `damage:0` |
| **Bull, Calf, Sheep, Lamb, Piglet, Chick, Rooster, Turkey** | **Fauna ambiente decorativa** | `deserto_escaldante` (Bull), `jardim_flutuante` (Chick/Rooster), `prado_fogo` (Sheep) | Não colidem, andam `Walk` aleatório, `Hurt`/`Death` só visual | `GameScene` `propLayer` ou `EnemyBase` com `faction:'Neutral'` |
| **Sombras isoladas** (`Shadows/*.png`) | **Decoração** | Todos | Sombra projetada sob props | `fogbrush` alternativo |

**Como ligar:**
1. Copie `animais/animais/Without_shadow/Boar/*.png` → `assets/sprites/enemy_boar.png` (slices 6 animações)
2. Registre no `manifest.json`: `"enemy_boar": { "file":"assets/sprites/enemy_boar.png", "frameWidth":20, "frameHeight":20, "frames":6, "anims":{"walk":[0,1],"run":[2,3],"attack":[4,5]} }`
3. Adicione em `Config.js`: `boar:{hp:60,speed:30,damage:11,armor:8, sprite:'enemy_boar', biomass:7 }`
4. Liste em `BiomeManager`: `bosque_umido: { enemies:['boar','beetle'] }`

> **Dica:** Use `With_Shadow` para inimigos de superfície e `Without_shadow` para subterrâneo (já combina com o `light` de cada bioma).

---

## 3. FLORA BAIXA — `arbustos/` + `arbustos2/` (166 arquivos)

**`arbustos/Assets/` (40):** `Autumn_bush1-3`, `Broken_tree1-2`, `Burned_tree1-2`, `Bush_blue/orange/pink_flowers1-3` (cada com 3 vars), etc.  
**`arbustos/Assets_shadow/` (40):** mesmos com sombra.  
**`arbustos2/Assets_texture_shadow/` (40) + `Assets_texture_shadow_dark/` (40):** variações texturizadas.

**Estilo:** Arbustos 16-32px, flores pixeladas, troncos queimados, moitas outonais — perfeito para `bosque_umido` e `prado_fogo`.

**Encaixe:**

- **Props de superfície:** `GameScene.propLayer` → `RoomBuilder` / `MapGenerator.resources`. Cada bush é um recurso visual que pode dar 2-5 biomassa quando coletado (se destruir).
- **Obstáculo leve:** `TILE_KIND.SOLID` decorativo (não bloqueia, só visual).
- **Hazard visual:** `Burned_tree` combina com `prado_fogo` `burn` effect.

**Como ligar:** Copie 16 mais variados para `assets/sprites/props_arbustos.png` (16×16 16f) e registre como `props_arbustos` em `manifest.json` (`tiles: { bush1:0, ... }`). Ou use direto como `image` em `manifest` para `GameScene._drawProp`.

---

## 4. ÁRVORES — `arvores/` + `arvores2/` (166 arquivos)

**`arvores/Trees/` (40):** `Autumn_tree1-3`, `Broken_tree1-7`, `Burned_tree1-3`, `Christmas_tree1-3`, `Flower_tree1-3`, `Fruit_tree1-3`, etc.  
**`arvores/Trees_shadow/` (40) + `arvores2/` variações dark.

**Estilo:** Árvores 32-64px, copa densa, já com e sem sombra.

**Encaixe:**

- **Obstáculo grande:** `ROCK` alternativo para `cemiterio_troncos` e `floresta_fungos`. Pode substituir `tiles_cemiterio_troncos.png` `rock` = tronco queimado.
- **Recurso de biomassa grande:** `Fruit_tree` dropa 12 biomassa (como `resources`).
- **Fundo parallax:** `Broken_tree` ao longe em `MainMenuScene` / `ApresentacaoScene` (como `bg_castle.png`).

**Como ligar:** 8 mais icônicas → `assets/tilesets/tiles_cemiterio_troncos.png` frame `rock`/`hazard`, ou `assets/sprites/prop_trees.png` 32×32.

---

## 5. CENÁRIOS / CHÃO — `cenarios/` (15 arquivos)

| Arquivo | Descrição | Encaixe ideal |
|---|---|---|
| `chão campo.jpeg` | **5×8=40 tiles de grama** + 13 props (igual ao que você pediu para o 1º mapa) | **Já integrado em `tiles_bosque_umido.png`** (8 tiles recortados NEAREST 16×16). Para usar os 40, troque `manifest` para `frames:40` |
| `chão deserto.jpeg` | Areia, dunas, cactos | `tiles_deserto_escaldante.png` |
| `chão pantano.jpeg` | Lama verde, poças, raízes | `tiles_pantano_toxico.png` |
| `gen-*.png` (8) | Cenários gerados por IA (campo, ruínas, cavernas) | **Backgrounds** `bg_*.png` ou **LoadingScene** thumbs |
| `terra.png` | Terra pura | `dirt` alternativo |
| `slicebox.jpeg` | Caixa de fatiamento (referência) | Ignorar (tool) |

**Encaixe:** Cada `chão *.jpeg` deve ser fatiado como fizemos com `chão campo`: remover grid preta 4px → `16×16` → `128×16` (8) ou `640×16` (40). O script `tools/slice_gramado.py` já faz isso — basta trocar o input.

**Como ligar (ex. deserto):**
```bash
python3 tools/slice_gramado.py cenarios/"chão deserto.jpeg" --out assets/tilesets/tiles_deserto_escaldante.png --frames 8
```

---

## 6. CRISTAIS — `cristais/` + `cristais1/` (166 arquivos)

**`cristais/Assets/` (40):** `Black_crystal1-4`, `Blue_crystal1-4`, `Dark_red_crystal1-2`, etc. (cada 2-4 cristais agrupados).  
**`cristais/Assets_shadow/` (40) + `cristais1/` texturas.

**Estilo:** Cristais facetados, brilho central, paleta escura/azul/vermelha.

**Encaixe:**

- **Recurso raro:** `cavernas_cristal` e `abismo_bioluminescente` — cristal dá 10 geleia real ao coletar (como `resources` especial).
- **Hazard:** `Blue_crystal` emite `slow`/`poison` se pisar.
- **Decoração de sala:** `RoomBuilder` `fungus`/`crystal` room.

**Como ligar:** `assets/sprites/props_cristais.png` ou substituir `tiles_cavernas_cristal.png` `rock`/`hazard` por cristais.

---

## 7. PEDRAS — `pedras/` + `pedras2/` (162 arquivos)

**`pedras/` (101):** `Rock3_1-5`, `Rock5_1-5`, `Rock6_1-5` (cada 5 vars) + `*_no_shadow` (sem sombra) + `Rock*_grass_shadow1-5` e `Rock*_grass_shadow_dark1-5` (pedra sobre grama).  
**`pedras2/` (61):** `Rock1_1-5`, `Rock2_1-5` mesma estrutura.

**Estilo:** Rochas 16-24px, 3-5 pedras por cluster, sombra suave, versão grama integrada.

**Encaixe:**

- **Tile `ROCK` perfeito:** Substitui `tiles_*.png` frame `rock` (indestrutível) em TODOS os biomas. `pedras/` já tem sombra e sem sombra — use `no_shadow` para subterrâneo e `grass_shadow` para superfície.
- **Props:** Espalhe `Rock3_1` como `hazard` decorativo.
- **Variação:** 5 vars por tipo → use `Phaser.Math.Between(0,4)` para não repetir.

**Como ligar:** Copie 8 melhores (ex. `Rock3_1`, `Rock5_3`, `Rock1_2`...) → `assets/sprites/props_rocks.png` ou direto no tileset. O cortador pode montar `tiles_bosque_umido.png` `rock` = `Rock5_1`.

---

## 8. FORMIGAS NOVAS — `formigas/` (17 arquivos)

**Arquivos:** `gen-1573e56b...png` até `gen-f0b8f676...png` (16) + `nada`.

**Estilo visual (amostrada `gen-1573e56b`):** Formiga vermelha top-down, 64-96px, volumétrica, abdômen listrado, brilho no tórax, outline 1.8px — já no estilo V2 Híbrido, mais detalhada que as atuais 20×20.

**Encaixe:**

- **Novas classes elite:** `ant_tank`, `ant_queen_guard`, `ant_bomber` — use 1 por classe. Ex.: `gen-1573e56b` (vermelha grande) → `ant_giant` v2, `gen-1e856e81` (laranja) → `ant_sniper` reskin.
- **Skins da Rainha:** variações de `queen.png` (32×32) para `nucleo_primordial` fases.
- **Inimiga:** `ant_enemy.png` já existe, mas pode ter var `ant_enemy_red`.

**Como ligar:**
1. Renomeie `gen-1573e56b.png` → `assets/sprites/ant_tank.png`
2. `manifest.json`: `"ant_tank":{"file":"assets/sprites/ant_tank.png","frameWidth":32,"frameHeight":32,"frames":8}`
3. `Config.js`: `tank:{cost:80,hp:120,speed:40,damage:15,armor:10,sprite:'ant_tank'}`
4. `EliteClasses.js` → nova classe.

> **Dica:** Estão em fundo preto — precisam de `chromakey` ou recorte alfa. O `WebGLShaders.js` já tem `chromakey.frag` para fundo preto → transparente.

---

## 9. ÍCONES — `icones/` `icones2/` `icones3/` (260 arquivos)

**Contagem:** `icones/` 84 + `icones2/` 83 + `icones3/` 93 = **260 ícones** (`Icon1_1` → `Icon119_1_2`, cada com var `_1` e `_1_2`).

**Amostra `Icon1_1.png`:** 16×16, borda vermelha, símbolo central — estilo loja.

**Encaixe:**

- **Expansão de `ui/icons.png`:** Atualmente 27 ícones (leaf, jelly, heart, dig...). Seus 260 cobrem **loja**, **skill tree**, **mutações**, **recursos**.
- **Mutações:** Cada `mutation_cards.png` pode ter ícone único do pack (ex. `Icon10` = escudo, `Icon51` = cristal).
- **Skill Tree:** `SkillTreeScene.js` usa `icons.png` — pode mapear `Icon1` = `hp_buff`, `Icon2` = `speed_buff`, etc.
- **HUD:** `UISCene` biomassa/jelly já usa `icons.png` frame 0/1.

**Como ligar:**
- Junte os 260 em uma spritesheet `assets/ui/icons_big.png` 16×16, 260 frames (ex. 20×13 grid = 320×208).
- Atualize `manifest.json`: `"ui_icons":{"file":"assets/ui/icons_big.png","frameWidth":16,"frameHeight":16,"frames":260}`
- `docs` já tem `mutations.json` e `skills.json` com `icon` field — só apontar.

**Estrutura dos packs:** `Big_icons_for_Shop/` e `Gui_icons2.png` dentro de `icones/` são packs já montados — use como referência de grid.

---

## 10. FONTE — `fonte/` (2 arquivos)

**`fonte foda.jpg`** — imagem de referência de bitmap font (provavelmente estilo gótico Dead Cells, como `fumiga.png`).

**Encaixe:**

- **Nova fonte:** Gere `assets/fonts/fumiga_new.png` + `fumiga.xml` via `tools/generate-sprites.mjs` `font` ou manualmente com `bmfont`.
- **Uso:** `PreloadScene` carrega `this.load.bitmapFont('fumiga', 'assets/fonts/fumiga.png', 'assets/fonts/fumiga.xml')` — troque o path.

---

## 11. Guia de Integração Rápida (o que fazer agora)

### Passo 1 — Decida o que entra primeiro (recomendado)

| Prioridade | Pasta | Por quê | Tempo |
|---|---|---|---|
| **P0** | `cenarios/chão *.jpeg` | Troca chão dos 3 biomas iniciais (bosque/deserto/pântano) — impacto visual imediato | 30min (slice) |
| **P0** | `pedras/` | Troca `ROCK` de todos os biomas — já pronto | 20min |
| **P1** | `icones/` | Expande loja/skill de 27 → 260 — retenção | 1h |
| **P1** | `formigas/` | 1 nova formiga elite (ex. tank) — gameplay | 40min |
| **P2** | `animais/Boar+Fox` | 2 novos inimigos — diversidade de ondas | 1h |
| **P2** | `arbustos/` `cristais/` | Props de bioma — polimento | 30min |

### Passo 2 — Comandos

```bash
# Exemplo: integrar Boar como inimigo
cp "animais/animais/Without_shadow/Boar/Boar_Idle.png" assets/sprites/enemy_boar.png
# + slice se for spritesheet: python3 tools/slice_gramado.py --in ... --out ...

# Pedras como ROCK
python3 tools/slice_gramado.py "pedras/Rock5_1.png" --as-rock

# Chão deserto
python3 tools/slice_gramado.py "cenarios/chão deserto.jpeg" --out assets/tilesets/tiles_deserto_escaldante.png

# Ícones
montage icones/Icon*.png icones2/Icon*.png icones3/Icon*.png -tile 20x13 -geometry 16x16+0+0 assets/ui/icons_big.png
```

Depois:

```bash
node tools/generate-sprites.mjs  # se usou pixlib
python3 tools/build_dist.py
npm test  # 14/14
```

### Passo 3 — Registre

- `manifest.json` → novo `file` + `frameWidth/Height` + `anims`
- `Config.js` → `ENEMY_TYPES` / `ANT_CLASSES`
- `BiomeManager.js` → `enemies` / `effect`
- `GameScene.js` → `spawnEnemy` / `_drawTile` se for tileset

---

## 12. Lista Completa de Arquivos (resumo por pasta)

```
animais/ (82)
 ├─ Without_shadow/Black_grouse/* (6), Boar/* (6), Deer/* (5), Fox/* (5), Hare/* (5)
 ├─ With_Shadow/Black_grouse/* (5), Boar/* (6), Deer/* (5), Fox/* (5), Hare/* (5)
 └─ Bull, Calf, Chick, Lamb, Piglet, Rooster, Sheep, Turkey (1 each, 8f)
arbustos/ (85)  → Autumn_bush1-3, Broken_tree1-2, Burned_tree1-2, Bush_*_flowers1-3 (+ shadow)
arbustos2/ (81) → Assets_texture_shadow* (dark)
arvores/ (85)   → Trees/* (40: Autumn_tree1-3, Broken_tree1-7, Burned_tree1-3, Christmas_tree1-3, Flower_tree1-3, Fruit_tree1-3...)
arvores2/ (81)  → Trees_texture_shadow*
cenarios/ (15)  → chão campo/deserto/pantano.jpeg, gen-*.png (8), terra.png, slicebox.jpeg
cristais/ (85)  → Black_crystal1-4, Blue_crystal1-4, Dark_red_crystal1-2... (+ shadow)
cristais1/ (81) → texture_shadow*
fonte/ (2)      → fonte foda.jpg
formigas/ (17)  → gen-*.png (16 formigas detalhadas)
icones/ (84)    → Icon1_1.png → Icon30_1_2.png + Big_icons_for_Shop/ + Gui_icons2.png
icones2/ (83)   → Icon51_1.png → Icon75_1_2.png
icones3/ (93)   → Icon100_1.png → Icon119_1_2.png
pedras/ (101)   → Rock3_1-5, Rock5_1-5, Rock6_1-5 + _no_shadow + _grass_shadow*
pedras2/ (61)   → Rock1_1-5, Rock2_1-5 + _no_shadow + _grass_shadow*
```

**Todos já estão no workspace** em `/home/user/Fumiga-GOAT/<pasta>/`. O `git` ainda não os versionou (eram `Add files via upload` não mergeado) — agora estão via `git checkout d5e13e5`.

---

## Próximos passos sugeridos

1. Você me diz: **quais 3 pastas quer integrar primeiro?** (ex. `formigas` + `pedras` + `icones`)
2. Eu **recorto sem criar** (como pediu para o gramado) e já deixo jogável no `dist/index.html`
3. Atualizo o `docs/MAPA_SPRITES_FUMIGA.md` com os novos mapeamentos

Me fala o prioritário que eu já começo o slice.
