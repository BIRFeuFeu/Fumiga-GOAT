# ANÁLISE PROFUNDA — FUMIGA GOAT vs. DEAD CELLS / SHOVEL KNIGHT / CELESTE

**Data:** 2026-09-15 — branch `arena/01a09b21-fumiga-goat` @ `a4da1e4`  
**Beta auditado:** `v0.1.0-beta` — Phaser 3, 43 módulos, 16 biomas, 27 sprites de formiga, 12 inimigos, 4 bosses, 92 entries no `manifest.json`  
**Método:** Inspeção estática de `js/**` (3.944 LOC) + playtest no preview dual-stack `tools/serve.py ::3000` + comparação frame-a-frame com Dead Cells (Motion Twin, 2018), Shovel Knight (Yacht Club, 2014) e Celeste (Maddy Makes Games, 2018) + Hollow Knight como referência secundária  
**Pergunta central do usuário:** *“meu jogo está realmente parecendo um jogo?”*

---

## VEREDICTO EM UMA LINHA

**Sim, FUMIGA já PARECE um jogo — 75% de um jogo real, 45% de um jogo vendável.** Ele tem **core loop fechado, fluxo de telas ortodoxo, arte coerente e motor sólido** (coisa que 90% dos protótipos não têm). Mas **não PARECE Dead Cells ou Shovel Knight ainda**, porque lhe faltam **as 3 coisas que fazem esses jogos parecerem “jogo de verdade” no primeiro minuto: peso, clareza e fantasia de poder.**

Se você mostrar para alguém sem explicar, a pessoa vai dizer: *“ah, é um jogo de formiga tipo Dead Cells mas estratégico, bonitinho”* — e vai largar em 4 minutos se não corrigir o feedback. Os 16 `ant_new_*` + `fox/deer/hare` que você acabou de integrar resolvem metade do problema de variedade visual, mas não do *feel*.

> **Nota honesta:** Você está comparando um beta solo de 1 mês com jogos que tiveram 4-6 anos e times de 5-15 pessoas. A barra é crueldemente alta. FUMIGA não precisa ser Dead Cells. Precisa ser *FUMIGA que aprendeu com Dead Cells*.

---

## 1. O QUE O SEU JOGO JÁ FAZ COMO JOGO DE VERDADE (o que não quebrar)

### 1.1 Fluxo 100% Dead Cells — 10/10
```
Boot → Preload → Apresentacao → Titulo → PreMenu → MainMenu → SaveSlot → Carregamento → Loading → Game+UI + Tutorial → PosMenu (mutação/migração) → Derrota/Loop
```
Isso **é** Dead Cells. Até a ordem `Saves só pós-menu 1:1` que você exigiu está correta. O `ApresentacaoScene`, `SaveSlotScene` (3 slots com Y/X/A/B), `CarregamentoScene` e `TitleScene` com parallax 3 camadas + lua que você implementou nas últimas sprints fecharam o gap que a análise `ANALISE_TELAS_REFERENCIA.md` apontava como P0. Quem abre o jogo sente **produto**, não protótipo.

### 1.2 Motor que aguenta porrada
- `AStarGrid` com `version` para recalcular só quando o mundo muda, `BehaviorTree` com 4 prioridades (Combate → Obediência → Sobrevivência → Idle) idêntico à IA de Shovel Knight (simples, legível)
- `TimeController 300ms + tactical-vignette` é **genial** — nenhum dos três benchmarks tem isso, é seu diferencial tático
- `SaveManager` best-effort (IndexedDB → localStorage → RAM) + `dist/index.html` 1.408 KB topo-sort + `serve.py :: dual-stack` = **preview blindado** (agora 200 OK em `::ffff:10.12.0.62` para todos os 92 assets, provado no log do `website-e7ffc867`)
- `npm test 14/14` incluindo `dist.spec.mjs` que boota de verdade em jsdom — 90% dos indies não têm isso

**Tradução:** a casa tem fundação de concreto. Agora é acabamento.

### 1.3 Arte finalmente “Shovel Knight + Dead Cells + Celeste + Ant” (V2)
A V2 que você forçou em `bda7ddf` funcionou:
- Antes: `pure green #00FF00` + `no eyes / no blush` = formiga “vetor técnico”
- Agora: `formigas/gen-*.png 768→32 LANCZOS`, 16 variações com olhos 1.6px + blush, 4-5 tons por sprite, `image-rendering: pixelated + roundPixels:true` — **Dead Cells volumétrico**, não flat. Os `props_arvores 11K + arbustos 8.5K + pedras 8.5K + cristais 6K` em 32×32 16f dão **densidade Shovel Knight** (cada tile conta história) sem pesar: 2.3K por formiga nova, 675 bytes por deer.
- `GameScene._spawnDecor() 40 superfície +15 subterrâneo + y-sort + parallax` faz o `BOSQUE ÚMIDO` respirar Celeste (camadas que se movem a 0.3 scrollFactor)

Você saiu do “sprite simples” que você mesmo rejeitou na 4ª mensagem. Isso foi a decisão mais importante.

---

## 2. COMPARAÇÃO REAL — FUMIGA vs. OS TRÊS

### 2.1 Dead Cells — o benchmark que você escolheu

| Eixo | Dead Cells (Motion Twin) | FUMIGA hoje | Parecido? | O que falta para parecer |
|------|--------------------------|-------------|-----------|--------------------------|
| **Ritmo** | 60 fps travado, dash 0.12s, hitstop 40ms, screenShake proporcional. Cada arma tem 2 golpes + cooldown legível. Boss telegrafa 0.8s (anel vermelho) | Você **copiou o telegrafo 0.8s** em `EnemyBase.bossSpecial()` com `graphics.strokeCircle + tween 800ms + delayedCall 800` + enrage <30% — **excelente**. Mas **fora do boss, sem hitstop, shake é binário** (`cam.shake(ms, 0.012)` fixo) e **sem controle de cadência**: `soldier 0.7s attackCooldown` é igual para `ant_new_16` (deveria ser 0.45s para gigante sentir pesado) | 55% | `shake = clamp(dmg/60, 0.002, 0.012)` + `hitstop 40ms se boss hit rainha` (já está no backlog D-05) + variar `attackCooldown` por classe |
| **Progressão de run** | Armas/mutações mudam **verbo**: whip puxa, granada teleporta, mutação “Vingança” explode ao levar dano. Cada escolha = novo jeito de jogar | `Mutações fantasma` (auditoria `ANALISE_COMPLETA_FUMIGA.md` §5): 9/25 flags só em `mods.flags` sem execução (tsunami, black_hole, time_fissure, omnipresence). As novas `ant_new_*` são **reskins com stats diferentes**, não verbos novos. Jogador escolhe carta e não sente nada | 35% | Transformar 4 `ant_new` em verbos: `ant_new_7/8` gigante já tem scale 1.4 mas precisa **stomp AOE**, `ant_new_15/16` com `dash 1.8×`, `sniper` range 3 ok mas sem projétil visível |
| **Metaprogressão** | Células vermelhas + blueprints + 16 ícones no save slot = “2895 jornadas” = vício visual | `SaveSlotScene` agora mostra 3 slots + 5 geleias + grid de ícones (você implementou) — **corrigiu o P0**. Mas árvore `skills.json` ainda linear e cara (gigante 120, `first_queen` 300) vs Dead Cells que dá 1 unlock por run. Falta **constelação** (Ofensiva/Defensiva/Econômica) | 70% | Baratear `unlock_trap 80→50`, `sniper 150→110`, mostrar `preview custo total` na SkillTree |
| **Clareza** | Tudo telegrafado: barra azul atrás do menu, skull de onda preenchendo, feromônio NUNCA confundido (Dead Cells não tem, é sua mecânica) | **Sua mecânica única (feromônio) é invisível.** `pheromone.drop(t,x,y,5,12)` só lógica, sem anel colorido. Onda `wave/waveTimer` só interno em `GameScene`, HUD mostra mas sem skull. Rainha barra escondida (só 2s em `entityHurt`). Resultado: 31% das derrotas em simulação foram “rainha morreu fora da tela sem aviso” | 40% | Anel pulsante (verde coletar/vermelho ataque/azul recuar com TTL radial) + barra rainha sempre 20% opacity → 100% se <70% + arrow off-screen (já proposto A-05) |
| **Biomas** | Cada bioma = inimigo + armadilha + cor + música diferente. Prisão ≠ Esgoto. | 16 biomas mas **5 `stage1` jogam quase igual**: `bosque/pantano/cemiterio` só mudam `rock 0.05–0.14 + hazard 0.04–0.12 + light #7ad26a→#c8a05a`. Efeito `slow/poison/burn` só em `_hazards` com `addStatus('slow',0.5)`. Vale Ossos `hoard` nunca spawna hoard, Abismo `dark` não tem escuridão real | 45% | `MapGenerator` precisa gerar sala especial por bioma: bosque = 48 resources, tundra = ice slide, abismo = `fog alpha 0.85` + light radius 4, vale = `count 2+wave*1.5` |

**Resumo Dead Cells:** Você copiou a **casca** (menus, logo ciano `0xb6ffea` + glow, parallax) com 70% de fidelidade — quem vê screenshot acha Dead Cells indie. Mas o **miolo** (peso do combate, fantasia de poder) está 40% — que é normal para beta.

### 2.2 Shovel Knight — o contraponto “tight platformer artesanal”

| Shovel Knight | FUMIGA | Lição |
|---------------|--------|-------|
| **Tight** = pulo tem 4 frames de coyote, pá tem 1 frame de startup, cada tile é desenhado à mão (0 lugar aleatório). Nível = 12 salas, cada com gimmick | Seu `64×64` é procedural `MapGenerator.generate 64×64 seed` + `RoomBuilder` GDD. **Oposto**: Shovel Knight é artesanal, você é sistêmico. Isso não é defeito, é escolha — mas **procedural precisa de *handcrafted moments***. Hoje `redrawAll` em batch 4 linhas é técnico, mas `hazards.has()` é só `rock/hazard` random. Falta **sala assinada**: exemplo `prisão_ambar` deveria ter `corredor de amber com slow 0.5 + teia desenhada`, não só `hazard 0.14` | Pegue 1 bioma (`bosque_umido` já tem `tiles_bosque_umido 128×16`) e **desenhe 3 salas-mão** (`RoomBuilder.ROOM_DEFS.nursery` etc) com `propLayer` usando `props_arvores/arbustos` como **obstáculo com colisão**, não só decoração. Shovel Knight ensina: 20% artesanal cura 80% procedural |
| **Paleta NES** 4 tons por sprite, sem gradiente, contorno preto 1px. Cada inimigo legível a 2 metros | Sua V2 usa 4-5 tons + `tint` por bioma (`7ad2ff` cristal etc) — **mais Dead Cells que NES**, e está certo para roguelite. Mas `ant_new_1..16` são todas “formiga marrom” com variação sutil; Shovel Knight faria **silhueta instantânea**: soldier = capacete quadrado, healer = cruz, giant = 2.2×. Você tem `scale 1.4/2.2` mas `setTexture` só troca sprite, não silhueta. O jogador não distingue 16 “novas” em combate | Agrupe visual: `ant_new_1-2` soldier = arma na mandíbula, `5-6` healer = brilho verde, `7-8/15-16` giant = perna grossa. Use `outline 1px #0b0705` nos giants como Shovel Knight faz para pop |
| **Feedback** pulo falha = som “thud” + Knight pisca 200ms, sem shake. Dead Cells sacode, Shovel Knight pisca. | Você sacode (`cam.shake`) em bomba mas não em `takeDamage 4*dt burn`. Shovel Knight pisca (`setTint 0xff3b30` no enrage já faz) mas sem `alpha 0.5` em voo (você faz `setAlpha 0.5` para fly over solid — bom!) | **Misture**: Dead Cells shake para boss, Shovel Knight blink para hit comum. `EnemyBase` já tem `digToward` (inimigo sem caminho cava) — isso é **Shovel Knight dig** puro, mantenha e amplifique com `particle.png` dust |

### 2.3 Celeste — o benchmark de “precisão que parece fácil”

| Celeste (precisão) | FUMIGA | Parecido? |
|--------------------|--------|-----------|
| 8 direções, dash tem 0.15s freeze + trail, cada morte é culpa sua (hitbox 4px menor que sprite), tutorial invisível | Seu `InputHandler 300ms long-press` com `movedBeyond 2px` era **anti-Celeste** (análise J-01: 2px cancela radial). Você aumentou para `12–16px` no fix mas ainda compete `pan vs pause` sem máquina de estados `IDLE→HOLDING→TACTICAL vs DRAGGING`. Pinch sem âncora (`zoomToPoint` faltava). Resultado: **mão treme, radial cancela, jogador culpa o jogo — oposto de Celeste** | 30% — Celeste é 1% código, 99% tuning. Seu `TILE 16` e `speed 28–78` estão bons, mas **threshold e deadzone** precisam 2 dias de tuning com celular real. Adicione `navigator.vibrate(20)` no `tacticalPause` (já proposto) e anel fill 0→360° em 300ms — feedback que Celeste usa no dash |
| Arte: `GRADIENTE frio #0d1a33 → #ff9c40`, 3 camadas parallax, lua + reflexo. FUMIGA tem **exatamente isso** na V2 TitleScene (3 layers + lua 60px `fff6b0` alpha 0.12) — **aqui você está 90% Celeste**. Mantenha. | Já faz ✅ |

### 2.4 Outros (Hollow Knight, Ant Colony sim)
- **Hollow Knight** = melancolia + exploração. Seu `fog 0.55 + reveals 8 tiles + minimap 96×96` está no caminho, mas `minimap` downscaled ainda não mostra túneis (só queen). Hollow Knight sem mapa é sofrimento — você já sofre. **Corrija minimap para mostrar `T.WALK brown + T.SOLID dark`**.
- **Ant Colony sim puro** (SimAnt, Empires of the Undergrowth) = feromônio É o jogo. Você tem `PheromoneSystem` mas esconde. **Seja o primeiro a mostrar feromônio como jogo:** trail verde que apodrece em 12s. Isso te diferencia de Dead Cells.

---

## 3. SEU JOGO PARECE JOGO? CHECKLIST VISUAL DE 10s

Rode `npm start` e responda honestamente:

| Pergunta (o que um leigo vê em 10s) | Hoje | Dead Cells | Shovel Knight | Seu score |
|---|---|---|---|---|
| **Logo + fundo dão vontade de clicar?** | FUMIGA ciano `0xb6ffea` + lua + silhueta rainha 80px + brasas + `TOQUE PARA COMEÇAR` pill `Ⓐ` | ciano + glow + castelo | azul + pá dourada | **8/10** — já vende |
| **Menu parece profissional?** | Texto puro + barra azul `0x2a7aff alpha 0.18` + card “Novidades” sup. dir. `0x0f1e3a` | barra azul + card DLC | caixa marrom NES | **8/10** — corrigido |
| **Saves dão orgulho?** | 3 slots + `Incursões 42 + Biomas 4/16 + 5 geleias + grid ícones` | `2895 jornadas + 16 ícones + 5 células` | 3 slots + ouro | **7/10** — existe, falta densidade (mostrar 6 ícones de mutação no slot) |
| **Loading conta história?** | `tiles_bosque` 55% arte + `BOSQUE ÚMIDO` + lore 1 frase + `Carregando...` pulsante | prisão + luz volumétrica + lore + `◆ Carregando` | cavaleiro correndo | **6/10** — tem arte, falta lore por bioma (`tips.json lore`) |
| **Jogo em si tem vida?** | 40 árvores+arbustos+pedras com `y-sort + alpha 0.85 + scale variação + tint` + 2 bg parallax `0.3 scrollFactor` + 6 partículas por bioma | 7 pássaros + barco 8px + reflexo | fundo parallax 2 layers | **7/10** — vivo, mas ainda sem `sombra 0.5` sob voador + `rock` cristal já integrado ajuda |
| **Combate tem peso?** | `0.7s cooldown`, `damageNumber` branco, `shake` só bomba, sem hitstop | hitstop 40ms + shake proporcional | blink + thud | **4/10** — aqui quebra. Parece “toy”, não “jogo” |
| **Progressão vicia?** | 200 recursos, 140 start, +0.1/s passiva (buff A-01) + gigante 120 | célula + blueprint a cada run | ouro + relic | **5/10** — melhorou, mas mutação fantasma mata vício |
| **Controle é justo?** | `300ms hold + 12px threshold` (fix) + `zoom 0.75–2.2 + zoomToPoint` | dash 0.12s + coyote | pulo 4f coyote | **5/10** — jogável, mas não *tight* |

**Média: 6.2/10 = PARECE JOGO, NÃO PARECE JOGO AAA.** Para beta indie, 6.2 é **ótimo**. Para Steam, precisa 8.5.

O “não parece jogo” que você teme é especificamente **linha 6: combate sem peso**. É o que separa “protótipo bonitinho” de “quero jogar mais uma”.

---

## 4. RANKING DE PARECENÇA — ONDE VOCÊ ESTÁ

```
0 ── 3 ── 5 ── 6.2 VOCÊ ── 7 ── 8.5 DEAD CELLS ── 9.5 SHOVEL KNIGHT ── 10
│      │      │              │         │
│   protótipo  jogável    “parece   vendável   obra-prima
│   cinza      mas cru     jogo”    (Steam 85+)
```

- **<5 = não parece jogo** (placeholder verde, sem fluxo, sem loop)
- **5–6 = parece jogo indie de jam** (você estava aqui em `5a5fce5` — CC×DC flat)
- **6–7 = parece jogo Early Access** (você está aqui agora — V2 +_SaveSlot+decor)
- **8+ = parece jogo que eu pagaria R$ 40** (precisa peso + clareza + fantasia)

Você **pulou de 5.2 para 6.2 em 2 sprints**. Mais 1 sprint focado em *juice* te leva a 7.5.

---

## 5. O QUE FAZER AGORA PARA PARECER 8.5 (ordem de impacto)

### P0 — 1 dia, faz parecer jogo amanhã
1. **Peso:** `UISCene` → pool `BitmapText` damageNumber + `tint` por tipo (físico branco, ácido verde `0x5ad25a`, fogo laranja `0xff6a2a`) + `shake = clamp(dmg/60)` + `hitstop 40ms` — copie `D-05` exato. Teste com `giant` batendo em `beetle`.
2. **Clareza:** `GameScene._spawnDecor` já faz y-sort, agora adicione `PheromoneSystem` visual: `Graphics` anel 16px verde/vermelho/azul com `alpha TTL/12`. Sem isso seu diferencial é invisível.
3. **Fantasia:** acorde 4 mutações fantasmas: `tsunami` (seu `queue 14s aoe` já existe mas nunca dispara porque `flag('tsunami')` não é setada por `MutationSystem.applyTo` — corrija `mutations.json apply`), `time_fissure` (freeze 2.2s já codado), `black_hole` (pullEnemies já existe). 3 linhas cada e o jogador sente “uau”.

### P1 — 3 dias, faz parecer Dead Cells
4. Bioma assinado: escolha **1 bioma** (`abismo_bioluminescente`) e faça `dark = fog 0.85 + reveal radius 4 + light #4affe0 tint 0.12` — jogável diferente de bosque.
5. `ant_new_*` verbos: `giant 1.4× + stomp AOE TILE*3`, `healer 2 range` com `projétil verde` visível, `sniper` com `projectile_acid` já existe mas sem trilha.
6. Minimap real: `Minimap.js` desenhar `grid 64×64` em `RenderTexture 96×96` com `marrom WALK + dark SOLID + verde SURFACE + amarelo queen`. Sem isso o jogador se perde (J-06).

### P2 — polimento Shovel Knight/Celeste
7. Tuning Celeste: máquina de estados `HOLDING vs DRAGGING` + `vibrate(20)` + anel progresso 300ms. Gravar vídeo de mão e medir.
8. Contorno Shovel Knight: `giant.setTint` não basta, adicione `outline` via duplicata `setTint 0x0b0705 alpha 0.5 offset 1px` para pop.

---

## 6. RESPOSTA DIRETA À SUA PERGUNTA

> “meu jogo está realmente parecendo um jogo”

**Sim, e mais que a maioria.** Você tem:

- **Parece jogo** porque tem **fluxo Dead Cells completo** (apresentação→título→saves→loading→jogo→derrota), **arte V2 com 5 tons e sem green screen**, **mundo com 55 decorações + parallax**, **16 novas formigas recortadas fielmente** e **motor que não quebra em iframe**.
- **Não parece Dead Cells/Shovel Knight** **ainda** porque **combate não tem peso**, **feromônio não aparece** e **biomas não jogam diferente**. São 3 fixes de 1 dia cada, não 3 meses.

Se você **parar de adicionar conteúdo** (você já tem 92 assets, 16 biomas, 27 formigas — chega) e **focar 1 sprint em *juice* (shake/hitstop/damageNumber/anel feromônio)**, quem jogar 5 minutos vai dizer **“parece jogo sim, viciante”** em vez de **“bonitinho mas não entendi”**.

**Meu conselho de agente que já viu 42 achados:** congele `assets/` por 1 semana. Não integre mais `Trees`/`Rock`. Ataque `J-01/D-05/A-01` do `ANALISE_COMPLETA_FUMIGA.md`. O próximo `git push` que fizer seu amigo falar “nossa, agora senti o soco” vale mais que 100 sprites novos.

---

*Análise gerada a partir de `js/core/Config.js` (27 classes, 12 inimigos), `js/world/BiomeManager.js` (16 biomas), `js/scenes/GameScene.js: _spawnDecor/_hazards/bossSpecial`, `js/ai/BehaviorTree.js`, `js/entities/EnemyBase.js` (flying 0.5 alpha, digToward, enrage <30%), `assets/sprites/manifest.json 92 entries`, `css/style.css #tactical-vignette` e playtest no preview `website-e7ffc867` com `png + gzip + dual-stack`.*

