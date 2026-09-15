# PLANO DE EXECUÇÃO — FUMIGA GOAT
### Do Beta 0.1 ao Gold 1.0 — Fechando os 42 Pontos da Análise

> **Origem:** `docs/ANALISE_COMPLETA_FUMIGA.md` — 42 achados (P0/P1/P2) validados por agente headless (120 runs × 15 biomas).  
> **Meta deste plano:** transformar cada achado em **tarefa executável, com dono, critério de aceite e teste automatizado**, permitindo concluir o jogo sem retrabalho.

**Versão:** 1.0 — 2026-09-13  
**Branch base:** `arena/01a09b21-fumiga-goat` (beta 0.1.0, 3.944 LOC, Phaser 3)  
**Duração prevista:** **10 semanas (5 sprints de 2 semanas)** — 1 dev full-time + agente QA. Com 2 devs, 6–7 semanas.  
**Esforço total:** ~32 dias úteis (P0 6d + P1 12d + P2 8d + Gold 6d).  

---

## ÍNDICE
1. [Como Usar](#1-como-usar)
2. [Visão e Definição de Pronto 1.0](#2-visão-e-dod)
3. [Premissas e O Que NÃO Fazer](#3-premissas)
4. [Equipe e Papéis](#4-equipe)
5. [Estrutura de Fases (Gantt)](#5-fases)
6. [Backlog Detalhado por Fase (Épicos → Stories → Tasks)](#6-backlog)
7. [Mapa de Fechamento dos 42 Achados](#7-mapa-42)
8. [Arquitetura das 5 Grandes Entregas Novas](#8-arquitetura)
9. [Plano de Testes e Validação com Agente](#9-qa)
10. [Métricas e Telemetria](#10-metricas)
11. [Riscos e Mitigações](#11-riscos)
12. [Cronograma Visual e Marcos](#12-cronograma)
13. [Checklist Gold Master](#13-gold)

---

## 1. Como Usar <a id="1-como-usar"></a>

- Cada **Fase** termina com um **Marco jogável** (build `dist/index.html` + tag).
- Cada **Task** tem: `ID` (mesmo da análise, ex: `J-01`), `arquivos`, `esforço S/M/L`, `critério de aceite testável` e `teste`.
- **Ordem é sagrada:** P0 → P1 → P2. Não adicione conteúdo antes de fechar P0 (feedback invisível e ritmo).
- Ao concluir uma Task, rode `npm test` + `npm run build` + playtest do agente (seção 9). Só marque como DONE se o teste passar.

---

## 2. Visão e Definição de Pronto (DoD) — O Que É “Jogo Concluído” <a id="2-visão-e-dod"></a>

### 2.1 Visão 1.0
> **FUMIGA 1.0 é um Roguelite Colony-Sim de 15–25 min/run, onde escavar, comandar por feromônios e escolher genes muda VERBOS (não só números), cada bioma joga diferente, e o jogador sempre entende por que venceu ou perdeu.**

### 2.2 DoD — Só é 1.0 se passar nestes 10 portões

| # | Portão | Critério objetivo |
|---|--------|-------------------|
| 1 | **Sem mortes injustas** | 5 testers novos vencem `bosque_umido` sem ajuda externa; <10% das mortes são “rainha off-screen” |
| 2 | **Feedback 100%** | Barra da Rainha sempre legível, `ONDA x/7`, fila de ovos, feromônio visível, dano com números |
| 3 | **Ritmo respirável** | Boss médio em 105–125s, 7 waves, rampa elite visível, sem rush 64s |
| 4 | **Economia viável** | `avg biomass/run > 95`, gigante alcançável sem farm de 3 min, despensa com ROI < 90s |
| 5 | **Nenhuma mutação fantasma** | 25 mutações no pool têm efeito VFX + gameplay; `gigantismo` nerfado |
| 6 | **Biomas distintos** | Cada bioma tem hazard ativo + paleta + inimigo exclusivo + partícula |
| 7 | **Classes com papel** | 10 classes com cooldown/alcance visível; Digger quebra rocha; Healer com mana |
| 8 | **Tutorial in-game** | Ghost hand de 3 passos completa em 30s, pulável, sem `tips.json` como única fonte |
| 9 | **Metaprogressão com escolha** | Árvore em constelações, custo total visível, 1 unlock gigante por 1–1.5 runs |
|10 | **Gold técnico** | `npm test` 100% (inclui novos testes headless), `dist/index.html` <1.6 MB, 60 FPS em Moto G60, save nunca corrompe |

---

## 3. Premissas e O Que NÃO Fazer <a id="3-premissas"></a>

**Premissas:**
- Manter Phaser 3 + Vanilla ES6 + `vendor/phaser.min.js` (não migrar para TS/Framework).
- Arte continua procedural via `tools/pixlib.mjs` (não comprar assets).
- Um único canvas 480×480 `FIT` (não mudar resolução).

**NÃO fazer antes do P1:**
- Novos biomas, novos bosses, multiplayer, monetização, skins pagas.
- Reescrever `AStarGrid` ou `BehaviorTree` — estão corretos.
- Trocar fonte bitmap por TTF pesada antes de corrigir acentos via `xml` estendido.

---

## 4. Equipe e Papéis <a id="4-equipe"></a>

| Papel | Responsável sugerido | Foco neste plano |
|-------|----------------------|------------------|
| **Dev Gameplay** (você) | 70% | `GameScene`, `Entity*`, `RoomBuilder`, `EconomyManager` |
| **Dev UI/UX** | 20% (ou mesmo dev) | `UIScene`, `RadialMenu`, `SkillTreeScene`, `css/style.css` |
| **Agente QA Headless** | Automação | Simula 120 runs/sprint, valida `grid`, `mutations`, `save` |
| **Playtesters humanos** | 5 pessoas rotativas | 30 min/sprint, gravam tela |

Sem equipe grande: 1 dev + agente cobre 10 semanas.

---

## 5. Estrutura de Fases (Gantt Simplificado) <a id="5-fases"></a>

```
Sprint 0 — FUNDACAO (Semana 0) ............. 3 dias
Sprint 1 — P0: O JOGO NAO ME ODEIA (Sem 1-2) 10 dias  → MARCO A: Beta 0.2 jogável
Sprint 2 — P1A: AGORA EU ENTENDO (Sem 3-4) .. 10 dias  → MARCO B: Beta 0.5 claro
Sprint 3 — P1B+P2A: MECANICAS REAIS (Sem 5-6) 10 dias → MARCO C: Beta 0.8 profundo
Sprint 4 — P2B: ATRATIVIDADE (Sem 7-8) ...... 10 dias  → MARCO D: Beta 0.95 viciante
Sprint 5 — GOLD (Sem 9-10) .................. 10 dias  → MARCO E: 1.0 Gold Master
```

| Fase | Objetivo | Achados fechados | Build |
|------|----------|------------------|-------|
| **0** | Instrumentar, travar DoD, telemetria base | — | `0.1.1-instrumented` |
| **1** | Remover mortes injustas e estrangulamento | 10 P0 (J-01..M-12, G-01..) | `0.2-stable` |
| **2** | Dar clareza total (HUD, cartas, minimapa) | 7 P1 (D-01..J-06) | `0.5-clear` |
| **3** | Fazer mecânicas cumprirem promessa | 10 P1/P2 mecânicas | `0.8-deep` |
| **4** | Fazer querer voltar amanhã | 8 P2 atratividade | `0.95-addictive` |
| **5** | Polir, otimizar, lançar | Gold checklist | `1.0-gold` |

---

## 6. Backlog Detalhado por Fase <a id="6-backlog"></a>

> Legenda esforço: **S** <4h, **M** 4–12h, **L** >12h.  
> Critério no formato **Dado/Quando/Então** (Gherkin) — testável.

### SPRINT 0 — FUNDAÇÃO (3 dias) — *Semana 0*

| ID | Task | Arquivos | Esforço | Critério de aceite |
|----|------|----------|---------|-------------------|
| **F-01** | Congelar DoD e criar `docs/PLANO_EXECUCAO_FUMIGA.md` (este arquivo) | `docs/` | S | Arquivo mergeado em `main` |
| **F-02** | Instrumentar telemetria mínima (3 eventos) | `js/scenes/GameScene.js`, `js/core/GameManager.js` | S | `analytics('kill'|'queen_death'|'mutation')` loga no console + persiste em `SaveManager` (fila 100) |
| **F-03** | Criar harness de playtest reproduzível | `tests/agent/*.mjs` (novo) | M | `npm run test:agent` roda 50 runs sintéticas e imprime `winrate, avgBiomass, bossTime` |
| **F-04** | Travar `npm test` no CI (GitHub Action) | `.github/workflows/ci.yml` | S | Push falha se `npm test` falhar |

**Marco 0:** `npm test` verde + `agent` imprime métricas base (ex: winrate 32%, boss 64s, biomass 62).

---

### SPRINT 1 — P0: “O JOGO NÃO ME ODEIA” (10 dias) — *Semanas 1–2*
> **Foco:** feedback vital + ritmo + dinheiro. Se falhar aqui, P1 não importa.

#### Épico 1.1 — Controles Justos (3 dias)

| ID | Story / Task | Arquivos | Esforço | Critério |
|----|--------------|----------|---------|----------|
| **J-01** | Threshold pausa 2→14 px + histerese 80 ms + vibrar | `js/core/TimeController.js:15`, `js/core/InputHandler.js:56` | S | Dado dedo tremendo 8 px, Quando segura 300 ms, Então pausa ativa e `navigator.vibrate(20)`; pan não cancela se `isPaused` |
| **J-02** | Máquina HOLDING vs DRAGGING + anel progresso | `js/core/InputHandler.js`, `js/ui/RadialMenu.js` | M | Anel 0→360° em 300 ms no dedo; se delta>14 px antes de 300 ms → pan, senão → tactical; bloquear `cam.scroll` durante tactical |
| **J-03** | Fix WASD assimétrico + Shift sprint | `js/core/InputHandler.js:84` | S | `WASD` mesma velocidade `sp*dt`; Shift 1.8×; teste: segurar W 1s = S 1s (±2 px) |
| **J-08** | Teclado abre radial sobre Rainha | `js/ui/RadialMenu.js: open()` | S | `SPACE` abre radial em `queenTilePx`, não centro da câmera; se no céu, busca `nearestWalkable` |
| **J-04** | Pinch ancorado + HUD zoom | `js/core/InputHandler.js` | S | `cam.zoomToPoint(mid, newZoom)`; HUD “125%” aparece 1s; limites 0.75–2.2; botão reset opcional |

**Teste agente:** simular 100 holds com jitter 4 px → taxa sucesso >95% (hoje 41%).

#### Épico 1.2 — Sobrevivência Legível (3 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **D-01** | Barra Rainha sempre visível + seta off-screen | `js/scenes/UIScene.js:22–45, _drawQueenBar`, `js/scenes/GameScene.js: entityHurt` | M | Barra 20% opacidade sempre, 100% se <70% HP + borda pulsante; seta amarela aponta para Rainha se fora da viewport; não esconde se HP<90% |
| **G-01** | Ritmo respirável: waveTimer 14→18, maxWave 5→7, gate salas 2 | `js/core/GameManager.js:11`, `js/scenes/GameScene.js:64,285` | S | Boss médio 110s (±15s); gate: `roomsBuilt>=2` ou `biomassCollected>=80` antes de wave 7; teste agente bossTime |
| **A-01** | Economia desbloqueada | `js/scenes/GameScene.js:38`, `js/world/MapGenerator.js:78`, `js/world/RoomBuilder.js` | S | `biomass 100→140`, `max 200→260`, `resource value 10→12`, `resourceCount 32→48`, `pantry +100→+120`, `passive base +0.1/s`; winrate bosque sobe para 38–45% |
| **M-08** | Defesa aplica armor | `js/world/RoomBuilder.js: defenseArmor()`, `js/entities/AntBase.js` | S | `AntBase` lê `rooms.defenseArmor()` no `effectiveArmor`; 3 defesas = +6 armor visível no HUD (ícone escudo) |
| **M-04** | Digger quebra ROCK | `js/world/RoomBuilder.js: requestDig`, `js/entities/EliteClasses.js: DiggerAnt` | S | `requestDig` aceita `ROCK` se chamador tem `breaksRock`; `digTime 2.8s`; ghost tile com barra %; teste: Digger escava 3 ROcks em 10s |

#### Épico 1.3 — Mutações Honestas (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **M-12** | Auditar e stubar.flags fantasma | `assets/data/mutations.json`, `js/systems/MutationSystem.js`, `js/entities/AntBase.js: dealDamageTo` | M | Opção A (recomendado): remover do pool `tsunami, black_hole, time_fissure, omnipresence, plasma, hive_mind, invis, divine_vengeance` até implementar; Opção B: implementar 3 stubs com VFX mínimo (ver Sprint 3). **Nesta sprint, remover e marcar `[EM BREVE]` no JSON** |
| **M-05** | Nerfar Gigante | `js/core/Config.js: ANT_CLASSES.giant`, `js/entities/EliteClasses.js: GiantAnt` | S | `scale 10→2.2`, `hp 900→320`, `speed 14→28` (`*0.5` não `*0.2`), `setSize(18,18)`, custo 150→120 |

#### Épico 1.4 — Inimigos Justos (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **G-03** | Fly não atravessa terra grátis | `js/entities/EnemyBase.js: flying` | S | Flying: `alpha 0.5` sobre `SOLID`, `speed*0.7` sobre terra, sombra no chão; não atravessa `ROCK`; teste: fly leva 1.6× tempo sobre terra vs céu |
| **M-10** | Balance Termite/Beetle | `js/core/Config.js: ENEMY_TYPES` | S | `damage +25%`, `biomass -25%`; TTK vs soldado cai de 7s para 5.2s |

**Marco A (Beta 0.2):** 5 testers novos vencem bosque sem ajuda; boss 105–120s; `npm run test:agent` winrate 38%+.

---

### SPRINT 2 — P1A: “AGORA EU ENTENDO” (10 dias) — *Semanas 3–4*
> Foco: transformar HUD minimalista em **minimalista-informativo**.

#### Épico 2.1 — HUD que Ensina (5 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **HUD-01** | Biomassa com max + barra + fila de ovos | `js/scenes/UIScene.js:24`, `js/core/EconomyManager.js`, `js/entities/Queen.js` | M | HUD: `120/260` + barra 60 px verde (pisca vermelho se custo>saldo); fila 5 ícones ovo com timer radial; `queueChanged` renderiza |
| **HUD-02** | Contador de ondas + skull boss | `js/scenes/GameScene.js: wave/waveTimer`, `js/scenes/UIScene.js` | S | Top-center: `ONDA 2/7 — 00:14` + skull que preenche; 5s antes da wave: pulsa + SFX |
| **HUD-03** | Feromônio visível com TTL | `js/ai/PheromoneSystem.js`, `js/scenes/GameScene.js` | M | Anel pulsante (verde collect, vermelho attack, azul retreat) no tile + anel radial TTL 12→0; clica no anel para cancelar |
| **D-05** | Damage numbers + hitstop + shake proporcional | `js/entities/EntityBase.js: takeDamage`, `js/scenes/UIScene.js` | M | Pool 12 `BitmapText` sobe 12 px em 400 ms (branco físico, verde ácido, laranja fogo); `shake = clamp(dmg/60,0.002,0.012)`; hitstop 40 ms se Rainha hit por boss |
| **J-06a** | Minimapa 96 + botão Casa | `js/scenes/GameScene.js`, `js/scenes/UIScene.js` | M | `RenderTexture` 96×96 downscaled (túneis marrom, superfície verde, Rainha amarela pulsante, boss vermelho); botão casa `cam.pan(queen,300)`; fog no minimapa |
| **J-06b** | Reveal fog com raio real | `js/scenes/GameScene.js: revealFog` | S | `radius` usado: `erase` com `circle radius*8`; exploradora revela 5 tiles |

#### Épico 2.2 — Decisões Informadas (3 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **D-02** | Cartas com delta + reroll + recusar | `js/scenes/UIScene.js: _mutationCards`, `js/systems/MutationSystem.js` | M | Cada carta mostra `ANTES→DEPOIS` verde (ex: `DMG 9→9.9`); cor por raridade; 1× reroll por run (10 geleia); 4ª opção `RECUSAR +15 BIO`; `_wrap` removido (usa 2 linhas) |
| **D-03** | Responsivo cartas | `js/scenes/UIScene.js` | S | Se `W<400`, empilha 1 coluna 280×90 com scroll; teste em 360 px |
| **D-04** | Migração com preview | `js/scenes/UIScene.js: _migration`, `js/world/BiomeManager.js` | M | Card bioma: thumb 16×16 do tileset, `EFEITO: TEIAS (slow)`, `INIMIGOS: aranha, cupim`, `RECOMPENSA: +40 GEL`, `DESCOBERTO?`; hover mostra tooltip |

#### Épico 2.3 — Mundo com Personalidade (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **D-07** | Tint por bioma | `js/scenes/GameScene.js: _drawTile`, `js/world/BiomeManager.js` | S | `mapRT.setTint(light, 0.08)` + `fog` com `fog` color + partículas ambiente (fogo=brasas, pantano=bolhas, tundra=neve 12 partículas) |
| **G-02a** | Mapa menos vazio | `js/world/MapGenerator.js: rockClusters/hazardCount` | S | `rockClusters 0.02→0.06` (3×), `hazard 0.06→0.12` (2×); teste: caminho médio até superfície 9→14 passos |
| **G-02b** | 2 ruínas pré-escavadas | `js/world/MapGenerator.js: generate()` | S | 2 salas `3×3 ROOM` aleatórias com `value 10` loot; nunca a <4 tiles da Rainha |

**Marco B (Beta 0.5):** retenção D1 >30% (testers voltam no dia seguinte sem serem cobrados).

---

### SPRINT 3 — P1B + P2A: “MECÂNICAS REAIS” (10 dias) — *Semanas 5–6*
> Fazer cada classe/sala/biomecânica cumprir o que promete.

#### Épico 3.1 — Formigas com Papel (5 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **M-01** | Coletora retorna à despensa + TTL 18s | `js/entities/CollectorAnt.js`, `js/ai/PheromoneSystem.js` | M | `nearest('collect')` → `findResourceNear`; se `carrying>0`, `setPathTo(nearest Pantry || queen)`; TTL 12→18s (2× se <3 tiles de despensa); teste: ciclo coleta 22→14s |
| **M-02** | Exploradora revela 5 + ping | `js/entities/ExplorerAnt.js` | S | `revealTimer` revela raio 5; `markResourcesNear` cria ping amarelo 1s no recurso; `stealth` reduz aggro 50% (em `EnemyBase.findNearestAlly`, ignora scout se >4 tiles) |
| **M-03** | Sniper kiting fix | `js/entities/EliteClasses.js: SniperAnt` | S | `away = normalize(this-e)*80`; `range 3` ok; cooldown 0.9; teste: sniper não teleporta |
| **M-06** | Curandeira com mana | `js/entities/EliteClasses.js: HealerAnt` | S | 3 cargas, recarga 4s cada, cura 8→10, aura verde, contador `3/3`; sem mana, foge |
| **M-07** | Guardiã ward genérico | `js/entities/GuardianAnt.js` | S | `findNearestWard` → qualquer `fleeRadius>0` (collector/scout/healer); círculo verde 3 tiles ao redor da ward; `avoid` se `dist>15` |
| **SoldierFix** | Soldado `16→TILE` | `js/entities/SoldierAnt.js` | S | `d>5*TILE` usa `TILE`; `aggro 12→14` fora da base |

#### Épico 3.2 — Salas com Fantasia (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **Room-01** | Números no radial + VFX salas | `js/ui/RadialMenu.js`, `js/world/RoomBuilder.js` | M | Radial mostra `FUNGOS [+0.4/s]`, `DESPENSA [+120 MAX]`, `BERCARIO [-20% incub]`; cada sala com idle VFX (fungos esporos, defesa orbe girando, despensa silos, armadilha teia) |
| **Room-02** | Cap berçário + tooltip | `js/world/RoomBuilder.js: nurseryMult` | S | `min 0.4` (max 5 berçários); tooltip `INCUB 2.5s → 1.0s` |

#### Épico 3.3 — Bosses com Telegrafia (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **Boss-01** | Telegrafo 0.8s + enrage | `js/entities/EnemyBase.js: bossSpecial` | M | Círculo vermelho crescente 0.8s antes de AoE; <30% HP: cooldown 50% + tint vermelho; `wolf_spider` 3→5 filhotes, `bombardier` 2 pulsos |
| **Boss-02** | Centopeia não trava | `js/entities/EnemyBase.js` | S | Spawn `spiderling` em `nearestWalkable` ao redor do boss, não em `queenTile` |

#### Épico 3.4 — As 3 Mutações Reais (1 dia) — *Fecha M-12*

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **Mut-01** | Tsunami (lendário) | `js/scenes/GameScene.js: _updateProjectiles`, `js/entities/AntBase.js` | M | A cada 14s, onda `aoe TILE*6` dano `0.6*avgDmg`, VFX onda azul; flag `tsunami` |
| **Mut-02** | Fissura Temporal (cósmica) | `js/entities/EntityBase.js: addStatus('freeze')` | M | A cada 22s, congela inimigos em `TILE*5` por 2.2s; `time_fissure` |
| **Mut-03** | Onipresença (cósmica) | `js/entities/AntBase.js: attackNearest` | S | Se `omnipresence`, `range*3` e dispensa `findPath` (ataque à distância); balance: `damage*0.75` |

**Remover do pool até aqui:** manter `black_hole` e `plasma` fora (L). Nerfar `gigantismo` para `hp*2.5 dmg*1.8 speed*0.75` e só após stage 2 (`MutationSystem.rollMutations` filtra por `GameManager.biome().stage`).

**Marco C (Beta 0.8):** agente vence com 4 composições diferentes (rush soldado, eco fungus, sniper+guardian).

---

### SPRINT 4 — P2B: “QUERO MAIS UMA RUN” (10 dias) — *Semanas 7–8*
> Transformar “jogo bom” em “jogo viciante”.

#### Épico 4.1 — Tutorial que Não Irrita (3 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **A-05** | Ghost hand 3 passos | `js/scenes/GameScene.js`, `js/scenes/UIScene.js`, `assets/data/tips.json` | M | Primeira run em `bosque_umido` se `save.discoveredBiomes.length==0`: mão fantasma arrasta → `CAVAR` (recompensa ghost tile), → `DESPENSA`, → `COLETAR`; pulável `X` + `20 bio`; nunca repete |
| **J-07** | Radial cancel central + custo | `js/ui/RadialMenu.js` | S | Inner circle = cancel; fatia `X` cinza maior; custo em label `DESPENSA [40]` cinza se sem bio, tremor vermelho se fail |

#### Épico 4.2 — Metaprogressão com Escolha (3 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **A-02** | Constelações + baratear | `assets/data/skills.json`, `js/scenes/SkillTreeScene.js` | M | 3 colunas: Ofensiva (hp/speed/dano), Eco (pantry/incubation/fungus), Elite (sniper/spy/giant). `unlock_trap 80→50`, `fungus 120→65`, `sniper 150→110`; gating: giant exige `hp 3 + unlock_healer`; mostra custo total “FALTAM 210 GEL” |
| **A-03** | Bônus vitória/derrota | `js/scenes/GameScene.js: _endRun` | S | `+20` sem dano Rainha/bioma, `+50` speedrun <5 min, `stage*10`; derrota `*0.6` (anti-farm quit) |

#### Épico 4.3 — Momentos Compartilháveis (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **A-04** | Share seed + medalhas | `js/scenes/UIScene.js: _gameOver`, `js/world/MapGenerator.js` | M | `SEED #7F3A` (hex 4 chars do seed) + botão `📸` (`canvas.toDataURL`); 3 medalhas bronze/prata/ouro por `kills>30, salas>5, tempo<6min`; copy `navigator.clipboard.writeText` |
| **D-08** | Áudio persistido | `js/systems/AudioManager.js`, `js/core/SaveManager.js`, `js/scenes/MainMenuScene.js` | S | `mute/bgm/sfx 0.5→1.0` em `SaveManager`; `MainMenu SOM` salva; `UIScene` gear abre modal volume (2 sliders) |

#### Épico 4.4 — Polimentos de Mundo (2 dias)

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **D-06** | Acentos PT-BR | `tools/generate-sprites.mjs`, `assets/fonts/fumiga.xml` | M | Gerar `fumiga.xml` com 192–255 (á, ã, ç, é, í, ó, ú); remover `clean()` em `LoadingScene`; teste: “PRISÃO” renderiza |
| **G-04** | Flocking leve | `js/entities/AntBase.js: update` | S | Se `dist<12` entre aliados, `separation += normalize*0.4*dt`; não afeta combate |
| **AquaFix** | Água sem softlock | `js/world/MapGenerator.js: water` | S | Garantir `anthillPos` e `rivalNest` em `SURFACE` walkable; poças nunca a <3 tiles do poço central; teste 100 seeds sem softlock |

**Marco D (Beta 0.95):** D1 35%+, sessão média 22 min (3 runs), NPS >7/10 em 10 testers.

---

### SPRINT 5 — GOLD MASTER (10 dias) — *Semanas 9–10*
> Congelar conteúdo, só polir, otimizar e preparar lançamento.

| ID | Task | Arquivos | Esforço | Critério |
|----|------|----------|---------|----------|
| **GOLD-01** | Conteúdo freeze + changelog | `docs/BETA_NOTES.md`, `README.md` | S | Nenhuma mutação/bioma novo; só bugfix |
| **GOLD-02** | Performance pass | `js/scenes/GameScene.js: update`, `js/world/MapGenerator.js` | M | `for...of getChildren()` com `culling` (só update se `dist< 40*TILE` da câmera); `AStar maxNodes 6000→4000`; 60 FPS em Moto G60 (Chrome remote debug) |
| **GOLD-03** | Testes 100% | `tests/unit/*.test.mjs`, `tests/integration/*.spec.mjs`, `tests/agent/*.mjs` | M | Cobrir `RoomBuilder trap`, `Digger ROCK`, `Pheromone TTL`, `Giant hitbox`; `npm test` <3s |
| **GOLD-04** | Acessibilidade | `css/style.css`, `js/scenes/UIScene.js` | S | `prefers-reduced-motion` já ok + modo daltônico (ícones + texto, não só cor) + `font-size +2` opcional no menu |
| **GOLD-05** | Build final + APK smoke | `tools/build_dist.py`, `capacitor.config.json` | M | `dist/index.html` <1.6 MB; `npx cap sync` + APK instala e roda `bosque_umido` até boss sem crash; `serve.py` sobe em `0.0.0.0` + `/healthz` 200 |
| **GOLD-06** | Trailer + store page | `assets/` (screenshot agent) | M | 5 screenshots 16:9 + GIF 10s do radial + descrição 80 chars |
| **GOLD-07** | Playtest final cego | — | S | 5 novos jogadores sem dev por perto; gravar churn point |

**Marco E (1.0):** Gold tag `v1.0.0`, `dist/index.html` assinado, APK no Drive, checklist abaixo 100%.

---

## 7. Mapa de Fechamento dos 42 Achados <a id="7-mapa-42"></a>

| ID | Título (análise) | Sprint | Task(s) | Status alvo |
|----|------------------|--------|---------|-------------|
| **J-01** | Threshold 2 px | 1 | J-01 | ✅ Beta 0.2 |
| **J-02** | HOLDING vs DRAGGING | 1 | J-02 | ✅ |
| **J-03** | WASD bug | 1 | J-03 | ✅ |
| **J-04** | Pinch ancorado | 1 | J-04 | ✅ |
| **J-05** | SPACE hint | 1 | J-05 (HUD) | ✅ 0.5 |
| **J-06** | Minimapa + Casa | 2 | J-06a/b | ✅ 0.5 |
| **J-07** | Radial cancel + custo | 2/4 | J-07 | ✅ 0.95 |
| **J-08** | Teclado sobre Rainha | 1 | J-08 | ✅ 0.2 |
| **D-01** | Barra Rainha off-screen | 1 | D-01 | ✅ 0.2 |
| **D-02** | Cartas delta/reroll | 2 | D-02 | ✅ 0.5 |
| **D-03** | Cartas responsivas | 2 | D-03 | ✅ 0.5 |
| **D-04** | Migração preview | 2 | D-04 | ✅ 0.5 |
| **D-05** | Damage numbers | 2 | D-05 | ✅ 0.5 |
| **D-06** | Acentos PT-BR | 4 | D-06 | ✅ 0.95 |
| **D-07** | Tint bioma | 2 | D-07 | ✅ 0.5 |
| **D-08** | Áudio persistido | 4 | D-08 | ✅ 0.95 |
| **A-01** | Economia estrangulada | 1 | A-01 | ✅ 0.2 |
| **A-02** | Metaprogressão linear | 4 | A-02 | ✅ 0.95 |
| **A-03** | Vitória punida | 4 | A-03 | ✅ 0.95 |
| **A-04** | Share/seed | 4 | A-04 | ✅ 0.95 |
| **A-05** | Tutorial 0 | 4 | A-05 | ✅ 0.95 |
| **M-01** | Coletora despensa | 3 | M-01 | ✅ 0.8 |
| **M-02** | Exploradora raio 5 | 3 | M-02 | ✅ 0.8 |
| **M-03** | Sniper vector | 3 | M-03 | ✅ 0.8 |
| **M-04** | Digger ROCK | 1 | M-04 | ✅ 0.2 |
| **M-05** | Gigante scale | 1 | M-05 | ✅ 0.2 |
| **M-06** | Healer mana | 3 | M-06 | ✅ 0.8 |
| **M-07** | Guardiã ward genérico | 3 | M-07 | ✅ 0.8 |
| **M-08** | Defense armor | 1 | M-08 | ✅ 0.2 |
| **M-09** | Fungos ROI | 3 | Room-01 | ✅ 0.8 |
| **M-12** | Mutações fantasma | 1/3 | M-12 + Mut-01..03 | ✅ 0.8 |
| **G-01** | Boss 64s rush | 1 | G-01 | ✅ 0.2 |
| **G-02** | Mapa vazio/ruínas | 2 | G-02a/b | ✅ 0.5 |
| **G-03** | Fly atravessa | 1 | G-03 | ✅ 0.2 |
| **G-04** | Flocking | 4 | G-04 | ✅ 0.95 |
| **Boss-01/02** | Telegrafia bosses | 3 | Boss-01/02 | ✅ 0.8 |
| **HUD-01..03** | HUD ensino | 2 | HUD-* | ✅ 0.5 |

> **42/42 fechados até Beta 0.95.** Sprint 5 só valida.

---

## 8. Arquitetura das 5 Grandes Entregas Novas <a id="8-arquitetura"></a>

Para não virar “gambiarra”, estas entregas têm design fechado:

### 8.1 Minimapa (`js/scenes/Minimap.js` novo, 120 LOC)
- `RenderTexture` 96×96, escala `1/ (64/96) = 1.5` px/tile.
- Cores: `SOLID #1a0f0a`, `WALK/ROOM #4a3520`, `SURFACE #7ad26a` tint por bioma, `ROCK #2a2a2a`, `hazard` ponto piscante.
- Ícones: Rainha `2×2 amarelo`, Boss `3×3 vermelho pulsante (tween alpha)`, Ants `1 px branco`.
- Atualiza a cada `0.2s`, não por frame.

### 8.2 Tutorial Ghost (`js/scenes/Tutorial.js` novo)
- State machine `STEP_DIG → STEP_PANTRY → STEP_COLLECT → DONE`, salvo em `SaveManager.tutorialDone`.
- Mão SVG com tween `x+10`, seta + texto `“SEGURE AQUI → CAVAR”`. Avança quando `rooms.pendingJobs` ou `pheromone.hasActive`.
- Recompensa `economy.add(20)` ao final.

### 8.3 Feromônio Visível (`js/systems/PheromoneRenderer.js`)
- Ao `pheromone.drop`, cria `Graphics` anel + `BitmapText` TTL, `tween` scale `1→1.2` loop, destrói em `ttl<=0`.

### 8.4 Árvore em Constelações (`assets/data/skills.json` v2)
```json
[
  { "key":"hp_buff", "col":0, "row":0, "requires":[] },
  { "key":"unlock_giant", "col":1, "row":2, "requires":["hp_buff:3","unlock_healer"] }
]
```
- `SkillTreeScene` desenha linhas `Graphics` entre nós, gating cinza + cadeado.

### 8.5 Telemetria (`js/core/Analytics.js` novo, 40 LOC)
- Wrapper `Analytics.log(event, payload)` → `SaveManager` fila 100 + `console.log` + `fetch` opcional. Sem bloquear `update`.

---

## 9. Plano de Testes e Validação com Agente <a id="9-qa"></a>

### 9.1 Testes Automáticos (rodam em `npm test`)

| Suite | O que cobre | Comando |
|-------|-------------|---------|
| `unit/core.test.mjs` | AStar, Economy, Mutations, MapGenerator | `npm run test:unit` |
| `integration/game.spec.mjs` | Import de 33 módulos + RoomBuilder | `npm run test:integration` |
| `agent/playtest.mjs` **NOVO** | 50 runs sintéticas: winrate, bossTime, softlock água, Digger ROCK | `npm run test:agent` |
| `agent/balance.mjs` **NOVO** | 10k rolls de mutação: distribuição raridades | `npm run test:balance` |

**Exemplo `agent/playtest.mjs` (pseudo):**
```js
for (let seed=0; seed<50; seed++) {
  const map = MapGenerator.generate({seed, biome:{rock:0.06,hazard:0.06}});
  assert(map.grid.isWalkable(map.anthillPos.x, map.anthillPos.y));
  // simula loop econômico
}
console.log(`winrate bosque: ${wins/50*100}%`);
```

### 9.2 Playtest Humano (por sprint)

- **Sprint 1:** 5 dev-friends, cronômetro até vencer bosque, anotar “morri sem entender”.
- **Sprint 2:** 5 novos (nunca jogaram), sem instruções, medir tempo até entender radial.
- **Sprint 4:** 10 pessoas, D1 (mandar APK, ver quem volta no dia seguinte).
- **Gold:** 5 cegos, gravar tela, sem dev na sala.

---

## 10. Métricas e Telemetria <a id="10-metricas"></a>

**3 eventos Sprint 0, +2 no Sprint 4:**

```js
Analytics.log('run_start', {biome, seed});
Analytics.log('run_end', {win, wave, biomass, rooms, duration, jelly});
Analytics.log('mutation_pick', {id, rarity, luck});
Analytics.log('tutorial_step', {step}); // sprint4
Analytics.log('share', {seed}); // sprint4
```

**Dashboard (planilha simples):**

| Métrica | Hoje | Meta Beta 0.5 | Meta 1.0 | Ação se falhar |
|---------|------|---------------|----------|----------------|
| winrate bosque | 32% | 42% | 38–45% | ajustar `ENEMY_TYPES.damage` |
| bossTime médio | 64s | 110s | 115s | ajustar `waveTimer` |
| avg biomass/run | 62 | 95 | 110 | buffar `resource value` |
| mutação fantasma pick | 18% | 0% | 0% | remover do pool |
| D1 retenção | — | 30% | 40% | priorizar tutorial |

---

## 11. Riscos e Mitigações <a id="11-riscos"></a>

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Escopo creep (adicionar bioma novo) | Alta | Gold atrasa 2 sem | **Travar escopo Sprint 0;** todo “novo conteúdo” vai para `1.1` |
| Performance em 96×96 minimapa + fog | Média | FPS cai | Atualizar minimapa a cada 0.2s, fog só em dirty tiles |
| Fonte com acentos quebra `generate-sprites` | Média | Título sem acento | Gerar xml fallback: se falhar, manter `clean()` mas com aviso |
| APK não builda (SDK) | Média | Sem mobile | Sprint 5 Gold-05: testar `npx cap sync` cedo (Sprint 2) em CI com Docker |
| Gigante ainda quebra hitbox | Baixa | Colisão | `setSize` + `body.setOffset` + teste `agent/giant.spec` |

---

## 12. Cronograma Visual e Marcos <a id="12-cronograma"></a>

```
Sem 0   Sem 1-2      Sem 3-4      Sem 5-6      Sem 7-8      Sem 9-10
[F]    [P0########] [P1A#######] [P1B#######] [P2 ########] [GOLD#####]
 |          |            |            |            |           |
v0.1.1  v0.2-stable  v0.5-clear   v0.8-deep    v0.95-addict  v1.0-gold
instrument  barra      minimapa     coletora     tutorial     60fps
            ritmo      cartas       healer mana  constelação  APK
            economia   fog raio     bosses       share        trailer
            Digger     tint         mutações     acentos      freeze
```

**Entregas por marco (o que o jogador sente):**

- **v0.2 (Sprint 1):** “não morro sem aviso e consigo juntar dinheiro”.
- **v0.5 (Sprint 2):** “entendo onde estou e o que a carta faz”.
- **v0.8 (Sprint 3):** “cada formiga tem motivo e mutação muda o jogo”.
- **v0.95 (Sprint 4):** “quero mostrar pro amigo”.
- **v1.0 (Sprint 5):** “roda liso no celular da minha mãe”.

**Capacidade:** 10 dias/sprint × 5 = 50 dias corridos (~36 úteis). Com 1 dev, 10 semanas; com 2 devs em paralelo (UI + Gameplay), 6 semanas (Sprint 2 e 3 paralelizam).

---

## 13. Checklist Gold Master <a id="13-gold"></a>

Copie este checklist para a issue de release `v1.0.0`:

```md
- [ ] Sprint 0: Analytics + agent green
- [ ] Sprint 1: 42 P0 fechados, winrate 38%+ em agent, 5/5 testers vencem bosque
- [ ] Sprint 2: HUD completo, minimapa, cartas delta, fog raio, tint bioma
- [ ] Sprint 3: 10 classes com papel, 3 mutações novas, bosses telegrafados
- [ ] Sprint 4: Tutorial 3 passos, constelações, share seed, áudio persistido, acentos
- [ ] Sprint 5: npm test 100%, dist <1.6MB, 60 FPS Moto G60, APK smoke, freeze de conteúdo
- [ ] Docs: BETA_NOTES atualizado, README com controles + GIF radial, ANALISE arquivada
- [ ] Tag v1.0.0 + release notes + 5 screenshots + trailer GIF
```

---

## Apêndice — Como Começar Amanhã (3 comandos)

```bash
# 1. Crie a branch de execução
git checkout -b feat/fumiga-1.0 arena/01a09b21-fumiga-goat

# 2. Rode o agente base (vai falhar nos P0 — é esperado)
npm install
npm run test:agent   # após criar tests/agent/playtest.mjs

# 3. Comece pelo arquivo que mais dói
code js/core/InputHandler.js  # J-01: threshold 2 → 14
code js/scenes/UIScene.js      # D-01: barra Rainha
code js/core/GameManager.js    # G-01: maxWave 7
```

**Primeiro commit sugerido:** `fix(P0): InputHandler threshold 14px + WASD + queen bar sempre visível (fecha J-01,J-03,D-01)`

---

### Assinatura

**Plano gerado a partir da Análise 42 pontos** — cada linha mapeia para código existente. Não é “ideias soltas”; é **backlog executável**.  
**Próximo passo:** aprovar este plano (merge em `main`) e abrir as 5 issues `Sprint 1 — P0` com labels `P0`, `gameplay`, `ui`.

*Boa execução, GOAT. De beta promissor a Gold viciante são 10 semanas de foco.* 🐜
