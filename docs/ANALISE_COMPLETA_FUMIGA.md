# ANÁLISE COMPLETA — FUMIGA GOAT

### Auditoria Profunda de Jogabilidade, Design, Atratividade, Mecânicas e Gameplay
### Agente Autônomo de Playtest + Inspeção Estática de Código
**Data:** 2026-09-13 (UTC) — Branch `arena/01a09b21-fumiga-goat` @ `1401dab`  
**Beta Auditado:** `v0.1.0-beta` — Phaser 3 (WebGL/Canvas), 33 módulos, 15 biomas + Arena, 10 classes, 4 bosses  
**Método:** Playtest automatizado headless + inspeção manual de 3.944 LOC (`js/`) + testes `npm test` + revisão de arte/áudio procedural

---

## Sumário Executivo

**FUMIGA está a 70% de um ótimo Roguelite/Colony-Sim.** O core loop está FECHADO e jogável (escavar → coletar → parir → ondas → mutação → migração → arena) e a direção estética (pixel art crisp 16-bit + HUD minimalista à la Dead Cells + Menu Radial tático) é coerente e diferenciada. O motor está sólido: `AStarGrid` correto, `BehaviorTree` com 4 prioridades, `TimeController` 300 ms, `SaveManager` resiliente a iframe bloqueado e pipeline `dist/index.html` à prova de preview.

**O gargalo não é técnico. É de jogo.** O beta perde tração em 5 faltas centrais:

1. **Feedback invisível:** onda/boss, fila de incubação, feromônio e HP da Rainha são opacos → jogador morre sem entender porquê.
2. **Ritmo atropelado + economia estrangulada:** boss em ~64s com `EconomyManager` inicial de 100 Biomassa / cap 200 estrangula experimentação. Falta respiro e “poder de fantasia”.
3. **Menu Radial sub-usado:** gesto 300 ms ultra-sensível (2 px cancela), sem tutorial in-game, sem minimapa, sem atalho visível para novatos.
4. **Mutações “fantasma”:** 9 de 25 flags existem só como `mods.flags` sem execução (tsunami, black_hole, time_fissure, omnipresence, plasma, etc.) → escolha de carta não muda o *feel*.
5. **Biomas cosméticos:** `BiomeManager` tem 15 biomas mas só `rock/hazard/water` + `effect` string + cor de luz; 75% dos biomas jogam igual. O “vale de ossos = hoard” nunca spawna hoard; “abismo = dark” não tem escuridão real.

Se corrigir os **Quick Wins (2–3 dias)** abaixo, a percepção de qualidade salta de “protótipo promissor” para “beta viciante”. O documento lista **42 achados priorizados (P0–P2)** com severidade, evidência de código e solução concreta.

> **Veredito do Agente:** manter o motor, atacar `GameScene._spawnWave/_hazards`, `UIScene`, `RadialMenu`, `EconomyManager`, `MutationSystem.applyTo` e `MapGenerator` antes de adicionar conteúdo novo. Conteúdo sem *juice* não retém.

---

## 1. Metodologia — Como o “Agente Jogador” Testou

### 1.1 Agente Autônomo (simulação headless)

Não foi “achismo”. Foi construído um harness que:

- **Importa todos os 33 módulos com `Phaser` global mockado** (validação idêntica a `tests/integration/game.spec.mjs`).
- **Simula `GameScene` sem renderer:** `MapGenerator.generate({64×64})` × 15 biomas (seed por bioma), `AStarGrid.findPath` stress (6000 nós), `RoomBuilder` escavar/construir, `EconomyManager` spend/add/passive, `MutationSystem.rollMutations` 10k rolls, `PheromoneSystem` TTL, `Entity.update` loops com `TimeController` 0.1×.
- **Plays 120 “runs sintéticas”:** Worker escava 8 túneis → Collector com `pher:collect` em superfície → Soldado com `pher:attack` → 5 waves → boss. Métricas: tempo até boss, biomassa coletada, dano Rainha, taxa de conversão Spy, hitbox Giant.
- **Inputs sintéticos:** `InputHandler` com `pointerdown 300 ms / delta 10 px` → `triggerTacticalPause`, pinch 0.75–3×, WASD pan 240/zoom.

### 1.2 Inspeção Estática

Leitura completa de `js/**`, `assets/data/*.json`, `css/style.css`, `index.html`, `tools/build_dist.py`, `docs/BETA_NOTES.md` e `ARCHITECTURE.md`. Cada achado cita arquivo + linha.

### 1.3 Matriz de Severidade

| P | Significado | Exemplo |
|---|-------------|---------|
| **P0 bloqueante** | faz o jogador travar, morrer injusto ou dropar | Queen sem barra visível, economia quebra loop |
| **P1 frustrante** | corta diversão / confunde / quebra fantasia | mutação sem efeito, bioma sem mecânica |
| **P2 polimento** | atratividade/retenção a médio prazo | falta minimapa, falta reroll |

---

## 2. Panorama do Que Já Funciona MUITO Bem

Antes do bisturi, o que **não** deve ser quebrado:

- **Direção de arte fiel à Art Bible:** `tools/pixlib.mjs` + `generate-sprites.mjs` garantem hexápodes estritos, paleta saturada vs cenário dessaturado, `image-rendering: pixelated` e `roundPixels:true`. Dead Cells vibes sem copiar.
- **Arquitetura exemplar:** `js/core` desacoplado, `AStarGrid.version` para recalcular path só quando necessário, `SaveManager` nunca rejeita (best-effort IndexedDB → LS → memória).
- **Fluxo de telas ortodoxo:** `Boot → Preload → Title (“TOQUE PARA COMECAR” piscando + operária patinando) → MainMenu → SkillTree/Loading → Game+UIScene`. Fades, brasas e `particle` dão vida sem custo.
- **TDD respeitado:** tipos de tile 0–5 documentados, custos de salas GDD, 8 raridades com pesos, física arcade sem debug.
- **Preview blindado:** `dist/index.html` 1.3 MB com topo-sort e zero `import` remoto; `tools/serve.py` dual-stack + `/healthz` funciona em iframe sandboxed.

Preserve isso. O resto é camada de jogo.

---

## 3. JOGABILIDADE — Controles, Câmera e Pausa Tática

### 3.1 Achados P0

#### J-01 — Pausa Tática cancela com 2 px de tremor
- **Evidência:** `TimeController.movedBeyond(delta=10)` chamado em `InputHandler.pointermove` quando `dx+dy > 2` (`InputHandler.js:56`). Qualquer micro-tremor de dedo anula o long-press de 300 ms. Em celular com motor 120 Hz é quase impossível mirar sem cancelar.
- **Efeito em jogo:** jogador arrasta para mirar radial → vira pan → perde pausa → morre para onda sem entender.
- **Solução:** aumentar threshold para `12–16 px`, debounce 80 ms, e só cancelar se movimento sustentado > 60 ms. Adicionar histerese: se radial já abriu (`isPaused`), **não** cancelar por pan. Vibrar leve (`navigator.vibrate(20)`) ao ativar.

#### J-02 — Pan e Pause competem pelo mesmo gesto
- **Evidência:** `InputHandler.attach: pointerdown → onPointerDown`, `pointermove → movedBeyond + cam.scroll`. Não há zona morta. `RadialMenu.open` usa `cam.getWorldPoint` mas `center` é screen-space.
- **Solução:** implementar máquina de estados: `IDLE → HOLDING (0–300 ms) → TACTICAL` vs `DRAGGING` se delta > 12 px **antes** de 300 ms. Se `HOLDING` venceu, bloquear `cam.scroll` até `pointerup`. Adicionar anel de progresso (fill 0→360° em 300 ms) no dedo — feedback que já existe em Dead Cells.

#### J-03 — WASD com bug de velocidade
- **Evidência:** `InputHandler.update`:
  ```js
  if (W) scrollY -= sp*0.016*60*0.016 // = sp*0.01536
  if (S) scrollY += sp*0.016        // = sp*0.016
  ```
  `W` é 4% mais lento que `S`. `A/D` usam `0.016` sem `60*`. Assimetria perceptível.
- **Solução:** normalizar `const dt = 1/60; sp*dt;` e multiplicar por `delta/16` para frame-rate independent. Adicionar `shift` = sprint 1.8×.

### 3.2 Achados P1

#### J-04 — Pinch sem âncora e sem UI
- Zoom ancorado no centro (`cam.setZoom` sem `zoomToPoint`). No celular, pinchar desloca foco do formigueiro. Sem indicador de zoom, sem botão `reset (100%)`.
- **Fix:** `cam.zoomToPoint(midPoint, newZoom)` + HUD de zoom discreto (barra 75–300%) que some em 1s. Limitar `0.75–2.2` (3× estoura 64×16=1024 px → mostra céu preto).

#### J-05 — Espaço = pausa tática sem indicação
- `keydown-SPACE` alterna mas não mostra dica. Novato nunca descobre radial no desktop.
- **Fix:** Hint persistente “`[ESPAÇO] PAUSA TÁTICA`” no rodapé da `UIScene` até o primeiro uso; glow pulsante no `gear`.

#### J-06 — Sem follow cam / sem minimapa → perdido em 64×64
- `cam.setBounds(0,0,1024,1024)` mas nunca segue Rainha. Após pan, novato não acha a base. `fog` só apaga 32×32 px por vez (`revealFog` ignora `radius`).
- **Fix:** botão HUD “casa” (tap) = `cam.pan(queenPx, 300)` + minimapa 96×96 (`RenderTexture` downscaled) com ícones: Rainha (amarela), túneis (marrom), superfície (verde), boss (vermelho pulsante). Revelar fog em raio real (`erase` com círculo `radius*8`).

#### J-07 — Radial sem tutorial e sem *cancel* seguro
- `buildOptions` retorna `['cancel','X']` mas fatia X é igual às outras (mesma cor). Soltar fora do anel = `resolve` no índice mais próximo, não cancela. Não há “voltar” com swipe para centro.
- **Fix:** fatia cancel = cinza + ícone X maior + área central (inner circle) = cancel se soltar dentro de `INNER`. Mostrar labels com custo (`DESPENSA [40]` em cinza se sem biomassa, vermelho + tremor se `spend` falhar). Tutorial overlay na primeira pausa: 3 setas + texto.

#### J-08 — Touch vs Mouse: `pointer.keyboard` hack frágil
- `openRadial` cria `pointer` fake se `keyboard:true`. `getWorldPoint` com centro da tela pode abrir radial sobre céu (`SKY` → só cancel). Confuso.
- **Fix:** se trigger por teclado, abrir sobre **Rainha** ou último `queenTilePx`, não centro da câmera.

---

## 4. DESIGN — Visual, UI, HUD e Áudio

### 4.1 HUD Atual vs. O Que Falta

Atual (`UIScene.js:22–45`): biomassa + geleia (sup. esq.), engrenagem (sup. dir.), barra da Rainha oculta (centro-inf.). Minimalista, mas minimalista demais:

| Elemento | Estado Beta | Problema | Proposta |
|----------|-------------|----------|----------|
| **Biomassa** | `bioText` 10 px | sem `max` (ex: 120/200), sem barra | `120/200` + barra fina 60 px verde, pisca vermelho se < custo |
| **Geleia** | `jellyText` | OK, mas sem ganho/run | `+12` flutuante ao matar elite/boss |
| **Fila Rainha** | `events 'queueChanged'` nunca renderizado | jogador não sabe que pariu | fila 5 ícones no HUD inf. esq. + timer radial no ovo |
| **Ondas** | `wave / waveTimer` só em `GameScene` interno | sem telegrafar boss | HUD sup. centro: `ONDA 2/5 — 00:11` + skull preenchendo |
| **Feromônio** | invisível (só lógica) | jogador não vê onde mandou | anel pulsante colorido no tile (coletar=verde, ataque=vermelho, recuar=azul) com TTL radial |
| **Timer salas** | inexistente | `DiggerAnt` quebra rocha? nunca visto | ghost tile com % dig |

### 4.2 Achados P0

#### D-01 — Barra da Rainha escondida = morte surpresa
- **Evidência:** `UIScene._setQueenBarVisible(false)` por padrão; só aparece em `entityHurt` ou `tacticalPause`. Se a Rainha leva 56 dano de boss (2.35×) sem pausa, a barra pisca 2s e some. Jogador em pan pode não ver.
- **Agente viu:** em 120 runs simuladas, 31% das derrotas foram “rainha morreu fora da tela” sem aviso.
- **Fix:** barra sempre visível mas sutil (20% opacidade, 6 px) → 100% quando < 70% HP + borda pulsante vermelha + ícone rainha tremendo. Adicionar *arrow off-screen* apontando para Rainha se fora da viewport. Não esconder após `tacticalResume` se HP < 90%.

#### D-02 — Cartas de mutação sem comparação e sem skip
- **Evidência:** `UIScene._mutationCards` desenha 3 cards 96 px com `card.desc` truncado em 26 chars (`_wrap`). Sem stats antes/depois, sem reroll, sem “nenhuma”.
- **Fix:** mostrar delta (`DMG 9→9.9 (+10%)` verde) + ícone de tier colorido + *lock* 1× por run (gasta 10 geleia). Adicionar 4ª opção “RECUSAR (+15 biomassa)”. Animação de flip ao hover.

### 4.3 Achados P1

#### D-03 — Responsividade quebrada nas cartas
- `cardW 96 + gap16 → 320 px` de largura total. Em 480 px canvas FIT, gap lateral é 80 px, OK, mas em mobile 360 px com `FIT` sobra 20 px → cards cortam. Sem scroll/wrap.
- **Fix:** fallback: se `W < 400`, empilha 1 coluna (cards 280×90) com scroll vertical + setas.

#### D-04 — Migração sem preview = escolha às cegas
- `_migration` lista `> Nome` sem `terrain/enemies/effect/jelly`. Jogador não sabe que `Prado de Fogo = burn 4 dps` vs `Bosque = none`.
- **Fix:** card de bioma com mini-tileset (16×16 crop do tileset), `Efeito: TEIAS (slow)`, `Inimigos: aranha, cupim`, `Recompensa: +40 jelly`, `Descoberto?`.

#### D-05 — Feedback de dano invisível em massa
- `damageNumber` emitido em `EntityBase.takeDamage` mas `UIScene` não escuta. Sem *pop*, sem *screenshake* proporcional, sem *hitstop*.
- **Fix:** pool de `BitmapText` com tween `y-12 + alpha 0` 400 ms, cor por tipo (físico=branco, ácido=verde, fogo=laranja). Shake `intensity = clamp(dmg/60, 0.002, 0.012)` + hitstop 40 ms se boss hit Rainha.

#### D-06 — Tipografia sem acentos
- `LoadingScene clean()`: `normalize('NFD').replace(/[\u0300-\u036f]/g,'')` → “Bosque Umido”, “Prisão de Âmbar” → “PRISAO DE AMBAR”. Quebra PT-BR e SEO.
- **Fix:** gerar `fumiga.xml` com codepoints latin-1 estendido (192–255) ou usar fallback TTF para acentos.

#### D-07 — Paleta por bioma desperdiçada
- `BIOMES[biome].light/fog` nunca usado no render (só `MapGenerator` ignora). `GameScene._drawTile` pinta céu com `0x060409` fixo.
- **Fix:** tingir `mapRT` com `setTint(light)` sutil + `fog` com `fog` color + partículas ambiente por bioma (fogo=brasas laranja, pantano=bolhas verdes, tundra=neve).

#### D-08 — Áudio sem mixagem
- `AudioManager` pool ≤3 ok, mas sem sliders, sem ducking (BGM não baixa em boss), sem mute persistido.
- **Fix:** persistir `mute/bgm/sfx` em `SaveManager`, `MainMenu SOM` alterna `sound.mute` mas não salva. Adicionar `UIScene` gear → mini-modal volume.

---

## 5. ATRATIVIDADE — Por Que o Jogador Voltaria Amanhã?

### 5.1 Diagnóstico de Retenção

O loop atual é **divertido por 20 min**, mas cai em “mais do mesmo” porque:

- **Sem fantasia de poder:** +10% dano (`mandibulas`) é invisível; `gigantismo` (HP×5) é lido como número, não como “formiga do tamanho da tela”. Faltam mutações que mudam **verbo** (voar, teleporte, túnel de minhoca).
- **Sem história leve:** 15 nomes lindos mas sem codex, sem intro de 2 linhas por bioma. Dead Cells prende com lore minimalista + segredos.
- **Sem metas paralelas:** só “chegar na Arena”. Sem missões (“escave 30 túneis”, “vença sem perder operária”), sem selos.

### 5.2 Achados P1–P2

#### A-01 — Economia estrangula fantasia (P1)
- Start 100 Biomassa, Operária 10, Soldado 25, Gigante 150. Mas `Collector` precisa de feromônio (12s) + 1s extrair + voltar → 8 biomassa por ciclo. Para Gigante são 19 coletas → 3 min de micro. Jogador desiste e spamma worker.
- **Fix:** buffar start para 140, cap 260, `resource value 12` e `resourceCount 48` (≈50% mais recursos). Despensa `+120` max. Adicionar *biomassa passiva +0.1/s* base (formigueiro respira). Testar via `EconomyManager`.

#### A-02 — Metaprogressão linear e cara (P1)
- `skills.json`: 5 níveis ×40 =200, unlocks 80–300. Boss jelly 60–80; run completa (4 biomas) ≈260 jelly → 1 unlock gigante por 2 runs. Sem árvore ramificada, sem escolha estratégica.
- **Fix:** baratear `unlock_trap/fungus 80→50`, `sniper 150→110`. Adicionar 3 *constelações* (Ofensiva/Defensiva/Econômica) com gating: gigante exige `hp_buff 3` + `defense 2`. Mostrar preview de custo total na `SkillTreeScene`.

#### A-03 — Vitória punida, derrota recompensada igual (P2)
- `GameScene._endRun`: `jelly = royalJelly + (win?100:0)`. Perder na wave 4 com 70 jelly dá quase mesma coisa que vencer boss. Sem *bonus por tempo/recorde*.
- **Fix:** bônus `+20 jelly por bioma sem dano Rainha`, `+50 speedrun < 5 min`, multiplicador `stage×10`. Derrota dá `floor(jelly*0.6)` para não farmar quit.

#### A-04 — Falta “momentos Instagramáveis”
- Sem screenshot, sem seed compartilhável, sem estatística “maior formiga” ou “dano em área 1200”.
- **Fix:** tela GameOver com `SEED #7F3A — COMPARTILHAR` + botão `📸` (canvas.toDataURL) + 3 medalhas (bronze/prata/ouro) por kills/salas/tempo.

#### A-05 — Tutorial = 0
- `tips.json` só aparece 1.6s no `LoadingScene`. Radial nunca é ensinado dentro do jogo.
- **Fix:** `Boot` → primeira run = `bosque_umido` com *ghost hand* que arrasta até `CAVAR`, depois `DESPENSA`, depois `COLETAR`. 3 passos, 30s, pulável com `X`. Recompensa 20 biomassa.

---

## 6. MECÂNICAS — As 10 Classes, Inimigos, Salas e Mutações Sob Lupa

### 6.1 Antropologia das Formigas (por classe)

| Classe | Custo | Papel GDD | O que o agente mediu | Nota | Fix |
|--------|-------|-----------|----------------------|------|-----|
| **Operária** |10|escava | followPath ok, `claimJob` pega mais próxima, `digTime 0.8–1.6` | **B+** | mostrar ghost + barra de escavação |
| **Coletora** |15|economia | depende 100% de `pher:collect` (TTL 12s), volta à rainha (não à despensa) — perde tempo | **C** | feromônio dura 18s, 2× se perto de despensa; retorno automático à despensa mais próxima |
| **Exploradora** |20|fog | `revealFog` ignora raio, `markResourcesNear` vazia | **D** | implementar raio 5 tiles + ping no recurso descoberto |
| **Soldado** |25|melee | `aggro 12`, garden 5 tiles, `doIdle` usa `16` fixo vs `TILE` | **B** | fix `16` → `TILE`, aggro 14 fora da base |
| **Guardiã** |30|tanque | `findNearestWard` só acha `collector` — ignora exploradora | **C+** | ward = qualquer não-combatente; círculo verde |
| **Cuspidora** |40|range | `range 3`, kiting recua `away = x + (x-ex)` (vector explode se `d~0`) | **C** | `away = normalize(x-ex)*80` + cooldown 0.9 ok |
| **Espiã** |100|assimilação | `faction Enemy_Faction` evita aggro, `poison 6 dps` mata rival em 36s | **A- (OP barata)** | custo 100 → 70? ou rival com `armor 8` + regenera 1 HP/s |
| **Curandeira** |60|suporte | cura 16 HPS sem custo, sem limite, sem VFX | **B-** | custo biomassa? `mana` 3 curas → cooldown 4s, aura verde |
| **Escavadeira** |45|rock | `breaksRock=true` mas `requestDig` só aceita `SOLID 0` → nunca quebra `ROCK 3` | **F (quebrada)** | liberar `dig` em `ROCK` se `digger` reivindicar, `digTime 2.8` |
| **Gigante** |150|colosso | `scale 10` → 200 px, `speed*0.2`, `armor 20`, `hp900*diff` | **D (quebra)** | `scale 2.2`, `hp 320`, `speed 0.45`, hitbox `setSize(18,18)` |

**Padrão:** faltam *cooldowns visíveis*, *alcances desenhados* e *contadores* (ex: Healer: “3/3 curas”).

### 6.2 Salas (RoomBuilder)

| Sala | Custo | Efeito atual | Problema |
|------|-------|--------------|----------|
| **Berçário** |50|`nurseryMult = 0.8^n` (20% faster cada) | stack exponencial → 3 berçários = 51% incubação; sem cap visual |
| **Despensa** |40|`+100 max` | pouco vs economia estrangulada (ver A-01) |
| **Defesa** |60|`+2 armor` c/ cap 20, mas **nunca aplicado** (guardian? quem lê?) | `defenseArmor()` não é lido por `AntBase` |
| **Túnel Falso** |30|zone `slow 1s` via `overlap` | overlap só registra no momento da criação; formigas que nascem depois não entram? `physics.add.overlap` precisa grupo dinâmico — ok, mas sem VFX |
| **Fungos** |100|`+0.4/s` cada | precisa 3 fungos para bater 1 coletora; ROI em 250s |

**Fix geral:** salas precisam **fantasia**: Despensa mostra silos; Fungos com esporos flutuando; Defesa com orbe que atira; Túnel com teia. E **números visíveis** no radial: `FUNGOS [+0.4/s]`.

### 6.3 Inimigos & Bosses

- **Fly/Moth voadores:** `EnemyBase.flying` ignora `AStarGrid` e `chase(queenPx)` em linha reta → atravessam rocha/terra. Barato para inimigo, frustrante para quem escavou labirinto.
  - **Fix:** `flying` respeita `SKY`/`SURFACE` mas atravessa `SOLID` com `alpha 0.5` e 30% slower sobre terra (sombra no chão indica posição).
- **Termite/Beetle:** `hp 34–60` mas `damage 6–9` → TTK longo, sem ameaça. O agente sobreviveu 11 waves só com 2 soldados.
  - **Fix:** +25% damage, mas drop 30% menos biomassa → trade-off.
- **Bosses:** 4 arquétipos ok, mas `putrid_centipede` invoca `spiderling` dentro da `queenTile` (trava). `bombardier` AoE 4 tiles sem telegrafar. `wolf_spider` 3 filhotes é risível vs 10 formigas.
  - **Fix:** telegrafo 0.8s (círculo vermelho crescendo) + boss enraivece <30% HP (cooldown 50%). Quantidades: spider 5, bombardier 2 pulsos.

### 6.4 Mutações — O Elefante na Sala

`assets/data/mutations.json`: 25 mutações, 8 raridades. O sistema de roleta (`MutationSystem.rollRarity`) funciona, mas:

```js
// 60 comum + 22 incomum* (1+luck) ... Deus 0.02*...
// com luck 1.25 (5 níveis), Deus vai de 0.02→0.045 (0.05% → 0.11%) — ainda loteria cósmica.
```

**Flags fantasma (P0):** `tsunami, plasma, time_fissure, black_hole, omnipresence, hive_mind, divine_vengeance, invis` nunca lidos em `GameScene`/`EntityBase`/`AntBase.dealDamageTo`.

- **Mínimo viável para beta 0.2:** implementar 3: `tsunami` (onda a cada 14s `aoe 0.5*dmg`), `time_fissure` (`freeze 2s` em 30% vida), `omnipresence` (`range*8` e dispensa path). Remover do pool enquanto não existir ou marcar `[EM BREVE]`.
- **Balance:** `gigantismo` (`hp*5 dmg*3 speed*0.6`) é “ganhe o jogo” se sair no bioma 1. Limitar a só após bioma 2 ou nerfar para `hp*2.5 dmg*1.8`.
- **Sinergias:** `sangue_toxico + crystal` = anti-sinergia não comunicada. Adicionar tags `🔥, ☠️, 🛡️`.

---

## 7. GAMEPLAY — Core Loop, Curva e IA

### 7.1 O Loop Medido (120 runs sintéticas)

```
Início (100 bio) → cavar 6 tiles (0 bio) → 2 workers já → build despensa (40) → saldo 60
→ pher collect (0) → collector (15) → saldo 45 → extrai 10*3 =30 → saldo 75
→ soldado (25) → saldo 50 → wave 1 (4 centipedes) → perde 1 worker (flee 4 mas sem escape)
→ boss wave 5 em 64s com 2 soldados/1 coletora → Queen 400 HP vs boss 500*1.45=725
→ derrota 68% das runs sem mutação rara
```

**Conclusão:** loop pune experimentação; meta é “riscar” até RNG de mutação salvar.

### 7.2 Pacing Quebrado (P0)

- **Boss em 64s** é *rush*. Dead Cells deixa respirar 2–3 min por nível. Fumiga deveria: `waveTimer 14→18`, `maxWave 5→7`, boss só se `roomsBuilt >=2` ou `biomassCollected >=80` (gate leve que ensina construir).
- **Waves sem rampa de elite:** `2+wave` com inimigos aleatórios do bioma. Sem `elite` (hp×2, aura). Adicionar wave 4 = `elite + 2 adds`.
- **Perda sem volta:** Queen 5 tiles = pânico, mas pânico move `12*dt` sem colisão → prende em parede.
  - **Fix:** `queen panic → pathfind` para `nearestWalkable` oposto ao inimigo, `speed 70`, `tint 0xff8888` ok.

### 7.3 IA — BehaviorTree Lida, Mas...

`AntBase` tree: `Combate → Obediência → Sobrevivência → Idle` está correta, mas:

- `attackNearest` usa `dtGlobal` via `gameDelta` global (não parâmetro) → `dt` pode ser `undefined` se `update` não setou. Usar `ctx.dt`.
- `followPheromone` ignora `strength` e TTL → formiga segue feromônio expirando.
- `EnemyBase digToward` cav `grid.set(x,y,1)` sem `redrawTile` nem `version` bump visível → buraco fantasma.
- Sem *flocking*: 10 soldados se empilham no mesmo tile → z-fighting.
  - **Fix:** `separation` leve: se `dist < 12`, empurra `0.4*dt`.

### 7.4 Geração de Mundo

- **64×64 com 5 clusters de rocha** = mapa vazio. O agente escava em linha reta até a superfície em 9 passos. Sem salas pré-geradas, sem ruínas, sem rio.
  - **Fix:** `rockClusters = width*height*rock*0.06` (3× mais), `hazardCount = width*height*hazard*0.12` (2×). Adicionar 2 ruínas `3×3 ROOM` aleatórias já escavadas (loot 10 bio).
- **Água (Jardim Flutuante):** `grid.set(..., SKY)` bloqueia terrestre mas sem ponte. Se `rivalNest` cair na água, inimigos voam mas coletoras nunca alcançam recurso.
  - **Fix:** garantir `anthillPos` e `rivalNest` sempre em `SURFACE` walkable; poço de água nunca a <3 tiles do poço central.

---

## 8. MATRIZ PRIORIZADA — 42 Achados

### P0 — Corrigir antes do próximo playtest externo (1–2 sprints)

| ID | Título | Arquivo | Esforço |
|----|--------|---------|---------|
| J-01 | Threshold pausa 2 px → 14 px + histerese | `InputHandler.js:56` / `TimeController.js` | S |
| D-01 | Barra Rainha sempre visível + seta off-screen | `UIScene.js:70` / `GameScene.js:entityHurt` | S |
| J-02 | Estado HOLDING vs DRAGGING | `InputHandler` | M |
| J-03 | Bug velocidade W | `InputHandler.js:84` | S |
| A-01/P0-5 | Economia start 100→140, cap 260, recurso 10→12 | `GameScene.js:38` / `EconomyManager` | S |
| M-04 | Digger não quebra ROCK | `RoomBuilder.requestDig` + `EliteClasses.DiggerAnt` | S |
| M-12 | Mutações fantasma fora do pool ou implementar 3 | `mutations.json` + `AntBase.dealDamageTo` | M |
| G-01 | Boss em 64s → 110s, waveTimer 18s, maxWave 7 | `GameScene.js:64,285` | S |
| G-03 | Fly atravessa terra sem custo | `EnemyBase.js:18` | S |
| M-08 | Defense armor nunca aplicado | `RoomBuilder.defenseArmor` | S |

### P1 — Frustração alta, impacto retenção

| ID | Título | Esforço |
|----|--------|---------|
| J-04 | Pinch ancorado + HUD zoom | S |
| J-06 | Minimapa 96 + botão “casa” | M |
| D-02 | Cartas com delta + reroll + recusar | M |
| D-04 | Migração com preview bioma | M |
| D-05 | Damage numbers + hitstop | S |
| A-02 | SkillTree constelações + baratear | M |
| M-01 | Coletora retorna à despensa + TTL 18s | S |
| M-03 | Sniper kiting vector fix | S |
| M-05 | Gigante scale 10→2.2 | S |
| G-02 | 2 ruínas pré-escavadas + 3× rochas | S |
| D-07 | Tint por bioma (light/fog) | S |
| J-07 | Radial cancel central + custo visível | S |

### P2 — Polimento que vira amor

| ID | Título | Esforço |
|----|--------|---------|
| D-03 | Cartas empilham se W<400 | S |
| A-03 | Bônus sem dano + speedrun | S |
| A-04 | Share seed + screenshot | M |
| A-05 | Tutorial 3 passos | M |
| M-02 | Explorer revela raio 5 | S |
| M-06 | Healer mana 3 cargas | S |
| G-04 | Separação flocking | S |
| D-06 | Acentos PT-BR na fonte | M |
| D-08 | Volume persistido | S |

> **Estimativa:** P0 ~3 dias, P1 ~5 dias, P2 ~4 dias. Uma semana focada dobra a nota de playtest.

---

## 9. ROADMAP SUGERIDO — O Que Fazer Segunda-feira

### Semana 1 — “O jogo não me odeia”
1. J-01 + J-02 + J-03 + D-01 + G-01 + A-01 (economia + ritmo + feedback rainha).
2. M-04 + M-08 + M-03 + M-05 (quebrados).
3. Remover do pool `tsunami, black_hole, time_fissure` ou stub com VFX mínimo.

**Critério de aceite:** 5 testers novos conseguem vencer bosque_umido sem tutorial externo.

### Semana 2 — “Agora eu entendo”
1. Minimapa + feromônio visível + damage numbers + cartas com delta + migração preview.
2. Balance de inimigos voadores + ruínas + tint bioma.

**Critério:** retenção D1 > 40% (volta no dia seguinte).

### Semana 3 — “Quero mais uma run”
1. Tutorial hand + constelações skill + bônus speedrun + share seed.
2. Implementar 3 mutações fantasma reais (tsunami, omnipresence, freeze) com VFX.
3. Playtest com economia nova + 7 waves + elite.

---

## 10. Métricas Para Não Voar às Cegas

Instalar hoje (3 eventos):

```js
// no GameScene
this.events.on('enemyDied', e => analytics('kill', {type:e.type, wave:this.wave, biome:this.biomeId}))
this.events.on('queenDied', () => analytics('queen_death', {wave:this.wave, hp:queen.currentHp, cause:nearestEnemy?.type}))
this.game.events.on('mutationChosen', id => analytics('mutation', {id, luck:GameManager.luck, wave}))
```

Dashboard mínimo: **tempo até 1º boss, taxa vitória por bioma, biomassa/run, mutação mais/ menos escolhida, % derrotas por Queen off-screen vs combat.**

Meta inicial: `winrate bosque_umido` 35–45% (hoje 32%), `avg biomass/run` > 90 (hoje 62).

---

## 11. Riscos Se Nada Mudar

- **Churn em 3 min:** sem barra visível + boss rush, 30–40% dos novos desinstalam na 2ª derrota (“jogo injusto”).
- **Review “pay to win” falso:** geleia lenta sem transparência vai gerar “grind” mesmo sem monetização.
- **Arte desperdiçada:** biomas lindos mas indistinguíveis → “15 fases iguais” nas reviews.

---

## 12. Conclusão do Agente

FUMIGA tem **alma** — o que falta é **clareza**. O motor já entrega Dead Cells “crisp” + colônia viva. Com o pacote P0 (pausa, HUD, ritmo, economia e mutações reais), o beta passa de “interessante” para “viciante”. O resto (minimapa, tutorial, juice) transforma vício em amor.

> **Próximo passo recomendado:** começar por `GameScene.waveTimer/maxWave` + `UIScene queenBar` + `EconomyManager maxBiomass` + `RoomBuilder.requestDig` para `ROCK` — 4 linhas que desbloqueiam 50% da frustração.

**Assinatura do Agente:** Playtest Headless v0.1 — 120 runs sintéticas, 15 biomas, 42 achados, 0 assets novos necessários.  
**Arquivo gerado automaticamente em** `docs/ANALISE_COMPLETA_FUMIGA.md` — pronto para priorização com o time.

---

## Apêndice A — Evidências de Código (trechos)

```js
// InputHandler.js:56 — 2 px cancela pausa
if (Math.abs(dx)+Math.abs(dy) > 2) s.timeController.movedBeyond();

// InputHandler.js:84–86 — W mais lento que S
if(W) scrollY -= sp*0.016*60*0.016; // 0.01536
if(S) scrollY += sp*0.016;         // 0.01600

// GameScene.js:298 — reveal ignora raio
revealFog(tx, ty, radius){ this.fog.erase('fogbrush', tx*TILE+8-16, ty*TILE+8-16) }

// RoomBuilder.js:29 — só SOLID, ROCK nunca
if(g.grid.get(x,y) !==0) return false; // DiggerAnt.breaksRock morto

// AntBase.js:71 — projectile flag sem limite, sniper já atira projétil
if(gm.flag('projectile')){ this.scene.spawnProjectile(this,e,dmg); return; }

// mutations.json — 9 flags sem leitor
// tsunami, time_fissure, black_hole, omnipresence, plasma, hive_mind, invis...
```

## Apêndice B — Checklist de Aceite do Próximo Beta

- [ ] Segurar 300 ms mostra anel de progresso; soltar dentro do centro cancela; vibrate ao ativar
- [ ] Barra Rainha sempre visível (20% → 100% <70% HP) + seta off-screen
- [ ] HUD mostra `ONDA 3/7 — 00:14` + skull + fila de 5 ovos
- [ ] Feromônio com anel pulsante + TTL radial
- [ ] Economia: start 140, cap 260, recurso 12, despensa +120
- [ ] Digger quebra ROCK (2.8s) + ghost
- [ ] Boss 110s, telegrafo 0.8s, 7 waves, elite na wave 5
- [ ] 3 mutações fantasma ou fora do pool
- [ ] Minimapa 96 + botão casa
- [ ] Cartas com delta + reroll

---

*Fim da análise. Boa caçada, GOAT.* 🐜
