# PLANO DE EXECUÇÃO AUTÔNOMO — FUMIGA GOAT (VERSÃO IA)
### Adaptação do `PLANO_EXECUCAO_FUMIGA.md` para Execução 100% por Agente de IA

> **Este documento reescreve o plano humano de 10 semanas para um agente IA que edita, testa e commita sozinho no branch `arena/01a09b21-fumiga-goat`.**  
> **Objetivo IA:** fechar os **42 achados (P0/P1/P2)** em **5 Sprints de IA (~6-8 horas corridas)**, sem intervenção humana, mantendo `npm test` verde e `dist/index.html` buildável a cada sprint.

**Base:** `docs/ANALISE_COMPLETA_FUMIGA.md` + `docs/PLANO_EXECUCAO_FUMIGA.md` v1.0  
**Data da adaptação:** 2026-09-13  
**Executor:** Arena Agent Mode (Phaser 3 + Vanilla JS, headless jsdom + @napi-rs/canvas)  
**Branch alvo:** `arena/01a09b21-fumiga-goat` (nunca trocar)  

---

## ÍNDICE
1. [O Que Muda vs. Plano Humano](#1-muda)
2. [Modelo Operacional da IA](#2-modelo)
3. [Cronograma IA — 5 Sprints em 1 Dia](#3-cronograma)
4. [Backlog Reagrupado para IA (Lotes Atômicos)](#4-lotes)
5. [Protocolo de Execução Autônoma (Loop Infinito)](#5-protocolo)
6. [Detalhamento Sprint a Sprint — Edições Exatas](#6-detalhe)
7. [Arquitetura IA — 5 Sistemas Novos Sem Gambiarra](#7-arq)
8. [Validação Automática (Sem Humano)](#8-validacao)
9. [Gestão de Risco IA + Rollback](#9-risco)
10. [Entregáveis Finais e Como Saber Que Acabou](#10-fim)
11. [Comando Único Para Disparar Tudo](#11-comando)

---

## 1. O Que Muda vs. Plano Humano <a id="1-muda"></a>

| Plano Humano (10 semanas) | Plano IA Autônomo (6–8h) | Por quê |
|---|---|---|
| 5 sprints de 2 semanas, com playtesters humanos | 5 Sprints IA de 60–90 min cada, com **agente headless** no lugar do humano | IA não precisa esperar feedback humano; valida via `tests/agent/*.mjs` + métricas sintéticas |
| Tasks separadas por dono (Gameplay vs UI) | **Lotes atômicos por arquivo** (ex: `Lote A` edita 3 arquivos de input juntos) | IA trabalha melhor editando arquivos coesos em paralelo, com um único `git commit` por lote |
| Estimativa S/M/L em dias | **S/M em minutos** (S=15 min, M=45 min, L=90 min) | IA escreve código 10× mais rápido, mas precisa testar |
| Reuniões, Gantt, D1 retenção | **Telemetria sintética** (`winrate bosque`, `bossTime`) decide se passa de sprint | Sem humanos, métricas sintéticas são o “NPS” |
| “Não fazer” lista para não reescrever `AStarGrid` | **Travas via `grep` + `git diff --stat`** — IA aborta se tocar em `vendor/` ou `AStarGrid.js` sem permissão | Evita drift |
| CI humano (GitHub Action manual) | **CI em cada `edit_file` + `bash: npm test && python3 tools/build_dist.py`** | Feedback em <20s |

**Resultado:** o mesmo backlog, mas **reordenado para paralelismo máximo e commits atômicos que nunca quebram `main`**.

---

## 2. Modelo Operacional da IA <a id="2-modelo"></a>

### 2.1 Quem é a IA aqui?
Um agente com ferramentas:
- `read_file`, `edit_file`, `write_file` (fuzzy match, com criação de pastas)
- `bash` (roda `npm test`, `python3 tools/build_dist.py`, `node --test`)
- `start_process`/`get_process_output` (serve preview se precisar)
- `git` já autenticado (`gh` disponível)

Limitações que o plano respeita:
- Não pode instalar Android SDK → `Gold-05` APK vira **smoke `cap sync` apenas**, sem `.gradle` real.
- Não pode ver o jogo com olhos humanos → usa `jsdom` + `napi-canvas` + screenshots de `RenderTexture`.
- Contexto máximo ~128 MB → nunca commita `node_modules`, `dist` (gerado), ou PNGs gigantes fora de `assets/`.

### 2.2 Princípios de Execução IA
1. **Um lote = um commit atômico verde.** Se `npm test` falhar, o lote é revertido (`git checkout -- <file>`), não empurrado.
2. **Nunca edita 2 lotes em paralelo que tocam o mesmo arquivo.** Lotes são sequenciais; dentro do lote, edições são paralelas.
3. **Todo arquivo novo tem teste.** `tests/unit/agent*.test.mjs` acompanha cada sistema novo (minimapa, tutorial, etc.).
4. **Branch único.** Todo `git push origin arena/01a09b21-fumiga-goat` — o tracker da Arena só enxerga esse branch.
5. **Sem perguntas ao humano.** Se ambiguidade (ex: cor da barra), a IA escolhe o padrão do `ANALISE` e registra em `docs/DECISIONS_IA.md`.

---

## 3. Cronograma IA — 5 Sprints em 1 Dia <a id="3-cronograma"></a>

```
Hora 0:00 ─┬─ SPRINT IA-0 — Fundação (25 min) ──────────────── v0.1.1
           ├─ SPRINT IA-1 — P0 Crítico (90 min) ─────────────── v0.2-stable  ← 10 P0 fechados
           ├─ SPRINT IA-2 — Clareza HUD (90 min) ────────────── v0.5-clear   ← HUD + minimapa + cartas
           ├─ SPRINT IA-3 — Mecânicas Reais (90 min) ────────── v0.8-deep    ← classes + bosses + 3 mutações
           ├─ SPRINT IA-4 — Vício (75 min) ──────────────────── v0.95-addict ← tutorial + constelações + share
           └─ SPRINT IA-5 — Gold (60 min) ───────────────────── v1.0-gold    ← perf + a11y + freeze
Total: ~7h corridas (com `npm test` + `build_dist` em cada commit)
```

**Se o humano pedir “faça tudo agora”, a IA executa IA-0 → IA-5 em sequência contínua**, com `bash` de verificação entre cada lote. Cada sprint termina com `git push`.

> **Por que 5 sprints e não 1 commit gigante?** Para que se algo quebrar (ex: minimapa derruba FPS), o bisect é trivial: `git log --oneline` mostra exatamente qual lote falhou.

---

## 4. Backlog Reagrupado para IA (Lotes Atômicos) <a id="4-lotes"></a>

Reordenação para **paralelismo e coesão de arquivo** (não por “épico humano”).

| Lote IA | Sprint | Achados Fechados | Arquivos Tocados (em paralelo) | Tempo IA | Teste de Saída |
|---------|--------|------------------|-------------------------------|----------|----------------|
| **IA-0.A** | 0 | F-02, F-03 | `js/core/Analytics.js` (novo), `js/core/SaveManager.js`, `tests/agent/playtest.mjs` (novo) | 25 min | `npm run test:agent` imprime winrate |
| **IA-1.A** | 1 | J-01, J-02, J-03, J-08, J-04 | `js/core/TimeController.js`, `js/core/InputHandler.js`, `js/ui/RadialMenu.js`, `css/style.css` (anel) | 30 min | 100 holds com jitter 4px → >95% sucesso |
| **IA-1.B** | 1 | D-01, G-01, A-01, M-08 | `js/scenes/UIScene.js`, `js/scenes/GameScene.js`, `js/core/GameManager.js`, `js/world/MapGenerator.js`, `js/world/RoomBuilder.js`, `js/entities/AntBase.js` | 30 min | bossTime 110s ±15, economy 140/260 |
| **IA-1.C** | 1 | M-04, M-05, G-03, M-10, M-12 | `js/world/RoomBuilder.js`, `js/entities/EliteClasses.js`, `js/core/Config.js`, `js/entities/EnemyBase.js`, `assets/data/mutations.json` | 30 min | Digger escava ROCK 2.8s; Giant scale 2.2 |
| **IA-2.A** | 2 | HUD-01, HUD-02, HUD-03, J-06a/b, D-05 | `js/scenes/UIScene.js`, `js/scenes/GameScene.js`, `js/ai/PheromoneSystem.js`, `js/entities/EntityBase.js`, `js/entities/ExplorerAnt.js` | 45 min | HUD mostra `ONDA 2/7`, feromônio visível, damage numbers |
| **IA-2.B** | 2 | D-02, D-03, D-04, D-07, G-02 | `js/scenes/UIScene.js`, `js/systems/MutationSystem.js`, `js/world/BiomeManager.js`, `js/world/MapGenerator.js`, `js/scenes/GameScene.js` | 45 min | Cartas delta + reroll, migração preview, tint bioma |
| **IA-3.A** | 3 | M-01, M-02, M-03, M-06, M-07, SoldierFix | `js/entities/CollectorAnt.js`, `js/entities/ExplorerAnt.js`, `js/entities/EliteClasses.js` (Sniper/Healer/Giant), `js/entities/GuardianAnt.js`, `js/entities/SoldierAnt.js` | 45 min | Ciclo coleta 14s, Healer 3 cargas |
| **IA-3.B** | 3 | Room-01/02, Boss-01/02, Mut-01..03 | `js/ui/RadialMenu.js`, `js/world/RoomBuilder.js`, `js/entities/EnemyBase.js`, `js/scenes/GameScene.js`, `js/systems/MutationSystem.js` | 45 min | Boss telegrafo 0.8s, tsunami/fissura/onipresença |
| **IA-4.A** | 4 | A-05, J-07, A-02, A-03 | `js/scenes/Tutorial.js` (novo), `js/scenes/GameScene.js`, `js/ui/RadialMenu.js`, `assets/data/skills.json`, `js/scenes/SkillTreeScene.js`, `js/scenes/GameScene.js` (_endRun) | 35 min | Tutorial 3 passos, constelações, bônus |
| **IA-4.B** | 4 | A-04, D-08, D-06, G-04, AquaFix | `js/scenes/UIScene.js` (_gameOver), `js/systems/AudioManager.js`, `js/core/SaveManager.js`, `tools/generate-sprites.mjs` (fonte), `js/entities/AntBase.js` (flocking), `js/world/MapGenerator.js` | 40 min | Share seed + volume persistido + acentos |
| **IA-5.A** | 5 | GOLD-01..07 | `docs/BETA_NOTES.md`, `js/scenes/GameScene.js` (culling), `tests/**/*.mjs`, `css/style.css` (a11y), `tools/build_dist.py` | 60 min | `npm test` 100%, `dist <1.6MB`, 60FPS culling |

**Total: 11 lotes, 42 achados, 0 arquivo tocado duas vezes no mesmo sprint sem necessidade.**

---

## 5. Protocolo de Execução Autônoma (Loop Infinito) <a id="5-protocolo"></a>

Cada lote segue **exatamente** este loop (a IA não avança se falhar):

```bash
# 1. Ler
read_file <arquivo> # para todos do lote

# 2. Editar (em paralelo, um edit_file por arquivo)
edit_file <arquivo> old_text -> new_text  # com fuzzy match
write_file <arquivo novo> content         # para Minimap.js, Tutorial.js etc.

# 3. Verificar sem quebrar (síncrono, 30s timeout)
bash: npm run test:unit 2>&1 | tail -20
bash: python3 tools/build_dist.py 2>&1 | tail -5
bash: node --test tests/agent/playtest.mjs 2>&1 | tail -30  # se existir

# 4. Se verde → commit atômico + push
bash: git add <arquivos do lote> && git commit -m "feat(IA-X): fecha <IDs> — <descrição curta>"
bash: git push origin arena/01a09b21-fumiga-goat

# 5. Se vermelho → reverter lote
bash: git checkout -- <arquivos do lote> && git clean -fd tests/agent/
# loga erro em docs/DECISIONS_IA.md e tenta variação
```

**Regras de commit:**
- Mensagem obrigatória: `feat(IA-<sprint>.<lote>): fecha J-01,J-02 — threshold 14px + anel`
- Corpo: lista de achados fechados + métrica antes/depois (ex: `bossTime: 64s → 112s`)
- Nunca `git push --force`.

**Live Preview:** se `start_process: python3 tools/serve.py` falhar com `port` warning, a IA corrige `bind 0.0.0.0` + CORS no mesmo turno.

---

## 6. Detalhamento Sprint a Sprint — Edições Exatas <a id="6-detalhe"></a>

Abaixo, o **passo-a-passo que a IA realmente executa** (copie e cole no terminal da IA).

### SPRINT IA-0 — Fundação (25 min)

**Objetivo:** instrumentar para que os próximos sprints tenham métricas.

**Lote IA-0.A:**
1. `write_file js/core/Analytics.js` — 40 LOC wrapper:
   ```js
   export const Analytics = {
     log(e,p){ try{ console.log('[FUMIGA]',e,p); const q=JSON.parse(localStorage.getItem('fumiga_events')||'[]'); q.push({e,p,t:Date.now()}); if(q.length>100)q.shift(); localStorage.setItem('fumiga_events',JSON.stringify(q)); }catch{} }
   };
   ```
2. `edit_file js/core/SaveManager.js` — adicionar `tutorialDone`, `volume:{bgm:0.5,sfx:0.8,mute:false}` ao `DEFAULT_SAVE`.
3. `write_file tests/agent/playtest.mjs` — harness 50 runs:
   ```js
   import {MapGenerator} from '../../js/world/MapGenerator.js';
   import {AStarGrid} from '../../js/ai/AStarGrid.js';
   // ... loop 50 seeds, assert anthill walkable, mede rockClusters
   ```
4. `edit_file package.json` — adicionar scripts:
   ```json
   "test:agent": "node --test tests/agent/*.mjs",
   "test:balance": "node tests/agent/balance.mjs"
   ```
5. `bash: npm run test:agent && python3 tools/build_dist.py`
6. `git add` + `commit feat(IA-0): instrumenta analytics + harness 50 runs`

---

### SPRINT IA-1 — P0 Crítico (90 min)

**Lote IA-1.A — Input (30 min):**
- `js/core/TimeController.js`: `movedBeyond` passa a receber `dt` e só cancela se `delta>14` e `held>80ms`; adiciona `this.heldMs`.
- `js/core/InputHandler.js`: reescreve `attach()` com máquina `state='idle'|'holding'|'tactical'|'dragging'`; `pointermove` só vira `dragging` se `state==='holding' && delta>14 && elapsed<300`; adiciona `Graphics` anel `progressRing` que preenche 0→360° em 300 ms; `vibrate(20)` em `triggerTacticalPause`.
- `js/ui/RadialMenu.js`: `open()` se `pointer.keyboard` usa `scene.gameRef.queenTilePx` não centro; adiciona `cancel` como fatia cinza `0x333333`; `resolve()` se soltar dentro de `INNER` → cancel.
- `css/style.css`: adiciona `@keyframes tacticalRing` para anel.
- **Teste:** `bash: node -e "import('./tests/agent/input.test.mjs')"` — 100 holds com jitter 4px.

**Lote IA-1.B — Sobrevivência (30 min):**
- `js/scenes/UIScene.js`: reescreve `_drawQueenBar` para sempre visível (alpha 0.22, 6px, borda 1px); `_queenHp` só aumenta para 1.0 se <70%; adiciona `BitmapText` seta `->` que `setVisible` se `queen` fora da `cam.worldView`; `flashQueenBar` não esconde se `hp<0.9`.
- `js/core/GameManager.js`: `maxWave 5→7`.
- `js/scenes/GameScene.js`: `waveTimer 8→10` inicial, `14→18` recorrente; `spawnBoss()` só se `rooms.length>=2 || biomassCollected>=80`; `economy = new EconomyManager({biomass:140, max:260})`; `passiveRate 0.1` base.
- `js/world/MapGenerator.js`: `resource value 10→12` (em `GameScene.resources`), `resourceCount 32→48`, `rockClusters 0.02→0.06` não aqui (vai em IA-2), mas já ajusta `reserve`.
- `js/world/RoomBuilder.js`: `pantry +100→+120`, `addMax(120)`.
- `js/entities/AntBase.js`: adicionar `effectiveArmor()` que soma `rooms.defenseArmor()`.
- **Teste:** `bash: npm test` + `agent` bossTime.

**Lote IA-1.C — Quebrados (30 min):**
- `js/world/RoomBuilder.js`: `requestDig(x,y,digTime, requester)` → se `grid.get===ROCK && requester?.breaksRock` então aceita, `digTime 2.8`; senão só `SOLID`.
- `js/entities/EliteClasses.js`: `DiggerAnt` passa `breaksRock:true` e `claimJob` usa `requester=this`; `GiantAnt scale 10→2.2`, `speed 14→28` (`*0.5`), `hp 900→320`, `custo 150→120` em `Config.js`, `setSize(18,18)`.
- `js/core/Config.js`: `ENEMY_TYPES termite damage 6→8`, `beetle 9→11`, `biomass 7→5`, `10→7`; `ANT_CLASSES giant` corrigido.
- `js/entities/EnemyBase.js`: `flying` → `if(isOverSolid) {alpha=0.5; speed*=0.7; tint shadow}`; `if(grid.get===ROCK) return false` (não atravessa).
- `assets/data/mutations.json`: mover 8 mutações (`tsunami, black_hole, time_fissure, omnipresence, plasma, hive_mind, invis, divine_vengeance`) para `disabled:[]` ou remover do `mutations` array, deixar comentário `// EM BREVE` (JSON não tem comentário → criar `mutations_disabled.json`).
- **Teste:** `bash: npm test` + `node tests/agent/digger.test.mjs`.

---

### SPRINT IA-2 — Clareza HUD (90 min)

**Lote IA-2.A — HUD que ensina (45 min):**
- `js/scenes/UIScene.js`: reescreve `create()` para adicionar: `bioMaxText` (`120/260` + barra `Graphics` 60×4), `eggQueue` (5 `Image` ovo com `Graphics` radial timer), `waveText` top-center (`ONDA 2/7 — 00:14` + `Graphics` skull preenchendo), `pheromoneLayer` (container). `_hud()` atualiza barra; `_wave()` tween; `damageNumber` pool 12 `BitmapText`.
- `js/scenes/GameScene.js`: `revealFog(tx,ty,r)` usa `r*8`; `findNearestAlly` filtra `stealth`; `aoe` chama `shake(clamp)`.
- `js/ai/PheromoneSystem.js`: adiciona `events.emit('dropped', zone)` já existe; novo `PheromoneRenderer` inline em `GameScene` (anel `Graphics` + `Text` TTL).
- `js/entities/EntityBase.js`: `takeDamage` emite `damageNumber` com `type`; `tickStatuses` já ok.
- `js/entities/ExplorerAnt.js`: `revealTimer` 0.25→0.2, raio 5, `markResourcesNear` cria ping.

**Lote IA-2.B — Decisões (45 min):**
- `js/scenes/UIScene.js`: reescreve `_mutationCards` para mostrar `delta` (`Dano 9→10`), `reroll` botão (`10 geleia`, 1×), `RECUSAR` 4ª carta; `_migration` com `thumb` (drawFrame), efeito, inimigos, recompensa.
- `js/systems/MutationSystem.js`: adicionar `canReroll` flag, `filterByStage` (gigantismo só stage>=2).
- `js/world/BiomeManager.js`: nada, mas `UIScene` lê `light/fog`.
- `js/scenes/GameScene.js`: `_drawTile` aplica `setTint(light,0.08)` via `mapRT`; adiciona `particles` por bioma (12 `Image` com `tween`).
- `js/world/MapGenerator.js`: `rockClusters 0.02→0.06`, `hazard 0.06→0.12`, 2 ruínas `3×3 ROOM` com `resources.push({value:10})`.

---

### SPRINT IA-3 — Mecânicas Reais (90 min)

**Lote IA-3.A — Formigas (45 min):**
- `js/entities/CollectorAnt.js`: retorna à `nearest pantry` (busca `rooms.rooms.filter(r=>r.id==='pantry')` + `queenTile`), `TTL 18`, `value 12`.
- `js/entities/ExplorerAnt.js`: `stealth` já, mas `EnemyBase` ignora se `dist>4*TILE`.
- `js/entities/EliteClasses.js`: `SniperAnt away = norm*80`, `HealerAnt` com `charges=3, recharge 4s`, `GuardianAnt findNearestWard` genérico, `SoldierAnt 16→TILE`.
- `js/entities/AntBase.js`: adicionar `separation` se `dist<12`.

**Lote IA-3.B — Salas/Bosses/Mutações (45 min):**
- `js/ui/RadialMenu.js`: labels com custo e `+0.4/s`.
- `js/world/RoomBuilder.js`: `nurseryMult min 0.4`, VFX por sala (partículas).
- `js/entities/EnemyBase.js`: `bossSpecial` com telegrafo (`Graphics` circle 0→radius em 800ms), enrage <30%, spawn `nearestWalkable`.
- `js/scenes/GameScene.js` + `js/entities/AntBase.js`: implementar `tsunami` (timer 14s `aoe TILE*6`), `time_fissure` (22s `freeze 2.2s`), `omnipresence` (`range*3`).

---

### SPRINT IA-4 — Vício (75 min)

**Lote IA-4.A — Tutorial e Progressão (35 min):**
- `write_file js/scenes/Tutorial.js` — `TutorialManager` com `STEP_DIG/PANTRY/COLLECT`, `hand Image` + `tween`, salva `tutorialDone`.
- `js/scenes/GameScene.js`: `create()` chama `new TutorialManager(this)` se `!save.tutorialDone`.
- `assets/data/skills.json`: reestruturar para `col/row/requires`, preços `trap 50, fungus 65, sniper 110`.
- `js/scenes/SkillTreeScene.js`: desenha constelações com `Graphics` linhas, gating cadeado, custo total.
- `js/scenes/GameScene.js`: `_endRun` bônus `+20` sem dano, `+50` <5min, `*0.6` derrota.

**Lote IA-4.B — Share e Polimento (40 min):**
- `js/scenes/UIScene.js`: `_gameOver` com `SEED #${seed.toString(16).padStart(4,'0')}`, botão `📸` com `game.canvas.toDataURL`, `navigator.clipboard.writeText`.
- `js/systems/AudioManager.js` + `js/core/SaveManager.js`: `volume` persistido, `MainMenu SOM` salva, `UIScene` gear modal sliders.
- `tools/generate-sprites.mjs` + `assets/fonts/fumiga.xml`: gerar codepoints 192–255, remover `clean()` em `LoadingScene.js`.
- `js/entities/AntBase.js`: flocking.
- `js/world/MapGenerator.js`: garantir `anthillPos/rivalNest` walkable, poças distância >3 do poço.

---

### SPRINT IA-5 — Gold (60 min)

- `docs/BETA_NOTES.md` + `README.md` update, freeze.
- `js/scenes/GameScene.js`: culling `if(dist>40*TILE) return`.
- `tests/agent/*.mjs` + `tests/unit/*.test.mjs` novos, `npm test` <3s.
- `css/style.css`: `prefers-reduced-motion` + `color-blind` (ícones + texto).
- `bash: python3 tools/build_dist.py && ls -lh dist/index.html` (<1.6MB) + `npx cap sync` smoke.
- `git tag v1.0.0` + `gh release create`.

---

## 7. Arquitetura IA — 5 Sistemas Novos Sem Gambiarra <a id="7-arq"></a>

A IA não “cola” código; cria arquivos coesos com 40–120 LOC e testes.

| Sistema | Arquivo Novo | LOC | Teste |
|---------|--------------|-----|-------|
| **Analytics** | `js/core/Analytics.js` | 40 | `tests/unit/analytics.test.mjs` — fila 100 |
| **Minimap** | `js/scenes/Minimap.js` | 120 | `tests/agent/minimap.test.mjs` — 96×96, queen amarela |
| **Tutorial** | `js/scenes/Tutorial.js` | 100 | `tests/agent/tutorial.test.mjs` — 3 steps |
| **PheromoneRenderer** | `js/systems/PheromoneRenderer.js` | 60 | `tests/agent/pheromone.test.mjs` — TTL radial |
| **Fonte PT-BR** | `assets/fonts/fumiga.xml` (regenerado) | — | `tests/unit/font.test.mjs` — “PRISÃO” renderiza |

Todos são `import` explícitos em `js/main.js` ou `GameScene.js` — nada de global mágico.

---

## 8. Validação Automática (Sem Humano) <a id="8-validacao"></a>

### 8.1 Portões Automáticos por Sprint

| Sprint | Comando de Portão | Deve Passar |
|--------|-------------------|-------------|
| IA-0 | `node --test tests/agent/playtest.mjs` | 50 runs sem throw, anthill walkable |
| IA-1 | `node tests/agent/input.test.mjs && npm test` | holds 95% + winrate 38%+ |
| IA-2 | `python3 tools/build_dist.py && ls -lh dist/index.html` | <1.6 MB + HUD visível em `jsdom` |
| IA-3 | `npm run test:agent` | coletora 14s, healer 3 cargas |
| IA-4 | `node tests/agent/tutorial.test.mjs` | 3 steps completam |
| IA-5 | `npm test && python3 tools/build_dist.py` | 100% + 60FPS culling |

### 8.2 Métricas Sintéticas que Substituem Humano

A IA imprime após cada sprint:

```
[IA METRICS] winrate bosque: 42% (era 32%)
[IA METRICS] bossTime: 112s (era 64s)
[IA METRICS] avg biomass: 98 (era 62)
[IA METRICS] giant picks: 12% (nerf ok)
```

Se `winrate` fora de 38–45% ou `bossTime` fora de 105–125s, a IA **reverte o último lote** e ajusta (`ENEMY_TYPES.damage ±10%`).

---

## 9. Gestão de Risco IA + Rollback <a id="9-risco"></a>

| Risco IA | Mitigação Automática |
|----------|----------------------|
| Edita `vendor/phaser.min.js` por engano | `pre-commit` grep: `if git diff --name-only | grep vendor; then git checkout -- vendor/; exit 1; fi` |
| `mutations.json` inválido (vírgula) | `bash: node -e "JSON.parse(require('fs').readFileSync('assets/data/mutations.json'))"` antes de commit |
| Fonte regenerada quebra `manifest.json` | `bash: npm run gen:art` + `git diff --stat assets/fonts/` — se >2 arquivos, aborta e mantém `clean()` |
| Minimapa derruba FPS (update por frame) | IA força `update` a cada 0.2s + `culling`; se `npm test` >3s, reverte |
| `404` no preview (host allowlist) | `start_process` com `warnings` → IA edita `tools/serve.py` `allow_origin='*'` no mesmo turno |
| Contexto estoura (128 MB) | IA nunca commita `node_modules`, `dist`, `*.wav` regenerados (usa `tools/generate-audio.mjs` offline) |

**Rollback:** todo lote é um commit. Se o próximo lote falhar, `git revert HEAD` e tenta variação (ex: `scale 2.2 → 2.0`).

---

## 10. Entregáveis Finais e Como Saber Que Acabou <a id="10-fim"></a>

**Quando IA termina IA-5, o repositório terá:**

- [ ] `dist/index.html` 1.3–1.6 MB buildável, `npm test` 100% (inclui `tests/agent/*.mjs`)
- [ ] `docs/ANALISE_COMPLETA_FUMIGA.md` + `docs/PLANO_EXECUCAO_FUMIGA.md` + `docs/PLANO_EXECUCAO_IA_AUTONOMO.md` (este) + `docs/DECISIONS_IA.md` (log de escolhas)
- [ ] Branch `arena/01a09b21-fumiga-goat` com 11 commits `feat(IA-*.): fecha ...` + tag `v1.0.0-ia`
- [ ] `README.md` atualizado com GIF radial + controles + `npm run test:agent`
- [ ] Métricas finais: `winrate 40%`, `bossTime 115s`, `avg biomass 105` (validadas por agente)

**Critério humano final (opcional):** 5 minutos de preview `npm start` sem erro no console + `SEED #ABCD` compartilhável.

---

## 11. Comando Único Para Disparar Tudo <a id="11-comando"></a>

Se você quer que a IA **execute tudo agora, sem parar**, cole este prompt no próximo turno:

```
Inicie o PLANO IA AUTÔNOMO (IA-0 → IA-5) no branch arena/01a09b21-fumiga-goat.
Execute lote a lote, com testes e commits atômicos, sem perguntar.
Ao final de cada sprint, faça git push e reporte métricas.
Se falhar, reverta e tente variação.
Quando terminar IA-5, gere tag v1.0.0-ia.
```

**Ou, para executar sprint a sprint (recomendado para acompanhar):**

```
Execute SPRINT IA-1 (Lotes A,B,C) agora.
```

A IA então começará por `IA-0.A` (Analytics + harness) e seguirá o loop do §5 até `IA-5`.

---

### Apêndice — Decisões Pré-Aprovadas para IA Não Travar

| Decisão | Escolha IA | Onde registra |
|---------|------------|---------------|
| Cor barra Rainha | `0xc8ff5a` 20% → `0xe03a3a` 100% pulsante | `docs/DECISIONS_IA.md` |
| Custo reroll | 10 geleia, 1× | `js/scenes/UIScene.js` |
| Fonte acentos | Gerar `fumiga.xml` com 192–255, remover `clean()` | `tools/pixlib.mjs` |
| Mutações removidas | `black_hole, plasma` fora até 1.1 | `assets/data/mutations_disabled.json` |
| Minimapa posição | canto inferior direito, 96×96, `x=W-108,y=H-108` | `js/scenes/Minimap.js` |

---

**Pronto para execução autônoma. Diga “execute IA-0” ou “execute tudo” e a IA assume o volante.** 🐜🤖

*Gerado a partir do plano humano de 10 semanas, reescrito para 7 horas de IA sem humanos no loop.*
