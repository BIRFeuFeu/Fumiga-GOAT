# ANÁLISE DAS TELAS DE REFERÊNCIA — Pasta `Images` (GitHub)

### O que você enviou vs. o que o FUMIGA tem hoje

**Data:** 2026-09-13 — Branch `arena/01a09b21-fumiga-goat`  
**Arquivos analisados (6) em `Images/` no `main` (sincronizados via `gh api`):**
- `Tela_apresentacao.jpg` (202 KB) — Splash marketing Dead Cells
- `Tela_pré-menu.jpg` (205 KB) — Title “Press A to start”
- `Tela_pós-menu.jpg` (465 KB) — Title com DLC “Return to Castlevania”
- `Tela_menu.jpg` (463 KB) — Menu principal Play/Options/Save
- `Tela_ao_clicar_em_Jogos_Saves_Atuais.jpg` (362 KB) — **JOGOS SALVOS** (3 slots)
- `Tela_de_carregamento_geral.jpg` (250 KB) — Loading “ALOJAMENTO DOS PRISIONEIROS”

> **Constatação central:** todas as 6 imagens são do **Dead Cells**, não do Fumiga. Você está usando Dead Cells como **benchmark visual absoluto** — o que é correto, já que o GDD e a Art Bible do FUMIGA definem “tributo a Dead Cells”. A análise abaixo mapeia **o que Dead Cells faz nessas telas** e **o que o FUMIGA já copia bem, o que falta e como fechar o gap com código concreto** (`TitleScene.js`, `MainMenuScene.js`, `LoadingScene.js`).

---

## 1. SÍNTESE EXECUTIVA — O Padrão Dead Cells que o Fumiga Precisa Roubar

Dead Cells não é “bonito por ser pixel art”. É **sistema**:

| Sistema Dead Cells | Onde aparece nas 6 telas | O que Fumiga já tem | Gap que mais dói hoje |
|---|---|---|---|
| **Parallax com silhueta + luz** | Todas com castelo ao fundo, horizonte com reflexo dourado, névoa laranja | `TitleScene` tenta com `fillTriangle` marrom (`soil`) + `particle` brasas, mas sem castelo, sem reflexo, sem lua | Falta **profundidade** — fundo é chapado 2 triângulos |
| **Logo com brilho frio (ciano) sobre fundo quente (laranja/vermelho)** | Logo `DEAD CELLS` branco-azulado com outer glow, 40% da largura, sobre pôr-do-sol | `FUMIGA` ciano-esverdeado `0xc8ff5a` com sombra preta 48px + tween 1.02 — **muito bom, já é o acerto nº1** | Falta **glow real** (não só sombra) + escala responsiva |
| **Menu texto puro à esquerda, sem caixas, com barra azul fina atrás da seleção** | `Play [barra azul 30%]`, `Options` branco, `DLC` amarelo | `MainMenuScene` faz texto puro + cursor `>` amarelo + `tint` — **correto na filosofia, mas sem barra** | Barra azul é **10× mais legível** que só `>` |
| **Card de novidade no canto superior direito** | `Return to Castlevania DLC is out now!` — fundo azul escuro `0x0f1a33`, borda fina, imagem + texto | **Inexistente** no Fumiga | Perde chance de “vender” `Cânion de Geleia` / `Atualização` sem poluir menu |
| **Tela de saves densa, com meta-progressão visível** | 3 slots horizontais, cada com data, nº de jornadas, grid de 16 ícones (armas, mutações, runas) + 5 células vermelhas embaixo + `Y/X/A/B` | Fumiga tem **save único invisível** (`SaveManager` em LS) — **zero UI de slots** | Jogador não sente progresso; Dead Cells mostra 2895 jornadas = vício |
| **Loading com lore + arte em cima, texto embaixo, ícone animado** | Topo 55% arte da sala (janela com luz volumétrica), bottom 45% `ALOJAMENTO...` + linha fina + parágrafo lore + `◆ Carregando...` vermelho canto inf. dir. | `LoadingScene` tem bioma nome + barra + `DICA` roxa — **funcional, mas sem arte e sem lore** | Loading é a única hora que o jogador **lê** — desperdiçada |

**Veredito:** Fumiga está a **70% do visual Dead Cells nos menus**, mas a **30% nas telas de sistema (saves/loading)**. Fechar esses 30% custa 2 dias e muda a percepção de “protótipo” para “jogo completo”.

---

## 2. ANÁLISE TELA A TELA

### 2.1 `Tela_apresentacao.jpg` — Splash Marketing (fora do jogo, mas referência de atmosfera)

**O que Dead Cells faz:**
- Personagem à esquerda ocupando 1/3 da largura, em **contra-luz** (silhueta azul-ciano, capa vermelha esvoaçante, olho laranja queimando). Fundo: castelo recortado em roxo-escuro sobre céu degradê **roxo → laranja → amarelo pálido**, com **lua grande 20%** à direita, reflexo na água, 7 pássaros em V, brilho volumétrico atrás da torre.
- Logo `DEAD CELLS` branco puro com sombra suave, ocupando 45% da largura, baseline a 75% da altura, com ícone `◆` (célula) no lugar do `O`.
- Paleta: **quente (laranja/vermelho) vs frio (ciano/azul)** — contraste complementar que faz o personagem saltar.

**O que Fumiga tem hoje (`TitleScene.js:12–35`):**
- Fundo `0x0b0705` quase preto, 2 triângulos `0x120c07` + retângulo chão `0x0e0905` + triângulo formigueiro `0x170f09` — **mesma ideia (silhueta), mas sem castelo, sem lua, sem degradê**. Partículas `particle` laranja/verde flutuando (26) — **bom, mas sem direção**.
- Logo `FUMIGA` 48px `0xc8ff5a` com sombra preta + tween scale — **já segue a lógica, mas cor é verde-limão, não ciano**.
- Sem personagem em destaque (só formiga `ant_worker` 1.5× andando no chão — charmosa, mas 12px de altura).

**Gap e tarefa:**
- **Gap P1:** falta **“castelo” temático** — para Fumiga seria **formigueiro gigante / fungo colossal / rainha ao fundo** em silhueta roxa.
- **Tarefa IA-2.C (4h):** `TitleScene.js` → trocar 2 `fillTriangle` por **3 camadas parallax** (`Graphics` com `fillStyle` 0x1a0f2a → 0x2a1a0a → 0x0e0905) + **lua `Graphics` círculo 60px** `0xfff6b0` alpha 0.12 atrás da silhueta + **reflexo** (`fillRect` com alpha 0.06). Trocar logo tint `0xc8ff5a → 0xb6ffea` (ciano Dead Cells) + `setDropShadow` (se bitmap não tem, duplicar texto 3,3 preto alpha 0.6 já faz, adicionar `glow` via `tint 0x7affff` em duplicata com alpha 0.25). Adicionar **silhueta de rainha gigante** 80px no horizonte (usar `queen.png` com `tint 0x1a0a2a` e `alpha 0.5`).

---

### 2.2 `Tela_pré-menu.jpg` — Title “Press A to start” (a tela que o jogador vê primeiro)

**Dead Cells:**
- Céu **vermelho → laranja → amarelo estourado** (overexposure), castelo centralizado, barco à vela 8px no mar, nuvem amarela densa. Logo `DEAD CELLS` ciano brilhante com **outer glow azul** (2px), centralizado topo 28%. Texto `Press A to start` branco 9px com `[A]` em pill branco/preto no meio da tela (48% altura). Rodapé `v1.0 789e…` cinza 6px esq. + nada à dir. **Zero UI além do logo e do convite** — respiro.

**Fumiga hoje:**
- `TitleScene.js:62–78` — logo `FUMIGA` + `ROGUELITE COLONY-SIM` + `TOQUE PARA COMECAR` piscando 750ms + versão + tributo. **Layout idêntico**, mas `TOQUE PARA COMECAR` está a `H-96` (muito baixo, 20% do fundo) e **sem pill de botão** (Dead Cells tem `Ⓐ` com fundo). Partículas OK, mas falta **céu degradê**.

**Gap e tarefa:**
- **Gap P1:** `TOQUE PARA COMECAR` sem pill, sem posição central, sem glow.
- **Tarefa IA-2.A (2h):** `TitleScene.js` → criar fundo degradê via `Graphics` `gradient` (3 `fillRect` com `0xff3b30 → 0xff9c40 → 0xffe066` alpha 0.35 atrás da silhueta) + mover prompt para `H*0.62` (centro), trocar para `TOQUE PARA COMEÇAR` (com acento, já que `D-06` corrige fonte) + desenhar pill `Graphics` branco `roundRect` atrás do `Ⓐ` (usar `ui_icons` `A` button se existir, senão `BitmapText` `Ⓐ`). Adicionar `v0.1.0` no mesmo lugar que Dead Cells (inf. esq. 8px).

---

### 2.3 `Tela_pós-menu.jpg` + `Tela_menu.jpg` — Menu Principal (as duas são o mesmo layout, com e sem DLC)

**Dead Cells:**
- Mesmo fundo que pré-menu, mas agora **menu à esquerda** (`Normal Mode` etc) em coluna, **sem caixa**, apenas **barra azul horizontal fina (2px) + preenchimento 12% alpha azul** atrás do item selecionado (`Normal Mode` com `fill 0x2a7aff` alpha 0.15). Itens não selecionados: `0xe8d9b5` (bege) 11px. `Streaming: Disabled` e `Daily Challenge` em cinza `0x6d5a41`. Rodapé: `v33 … - Steam)` + `B Back` vermelho/direita.
- **Card DLC** canto sup. dir.: `280×180`, fundo `0x0f1e3a` borda `0x2a4a7a`, título 10px branco, thumb 16:9, descrição 7px cinza `0xa0a8b8` 3 linhas. **Não compete com o menu** — é secundário.

**Fumiga hoje (`MainMenuScene.js:18–62`):**
- Fundo idêntico ao Title (triângulos + brasas) — **correto para manter coerência**, mas sem barco/lua. Menu 4 itens `INICIAR COLONIA` etc com cursor `>` amarelo que oscila `x 20→24` (420ms) — **charmoso, mas Dead Cells usa barra, não `>`**. Geleia `0xffc832` no topo dir. (bom), `BETA` 8px. Rodapé `V0.1.0` + `MENU RADIAL...` — ** hint útil, mas polui**.
- **Sem card DLC/novidade.**

**Gap e tarefa:**
- **Gap P0:** cursor `>` é menos acessível que barra; leitor daltônico perde.
- **Tarefa IA-2.B (6h):** `MainMenuScene.js`:
  1. Trocar cursor `>` por **barra azul**: ao `_select(i)`, desenhar `Graphics` `fillRect(12, y-2, 140, 16)` `0x2a7aff` alpha 0.18 atrás do texto + `lineStyle 2, 0x3c9aff` borda esq.; manter `>` opcional mas 30% alpha.
  2. Adicionar **card “Novidades”** sup. dir. `W-280, 60` — fundo `0x0f1e3a` + borda `0x2a4a7a`, título `ATUALIZACAO — CANYON DE GELEIA` 8px amarelo, thumb `tiles_canyon_geleia.png` 80×45, texto 7px `3 biomas novos!` + `A/B` para fechar. Reuso do layout DLC sem copiar.
  3. Trocar itens para 6: `JOGAR` (era INICIAR), `CONTINUAR` (se `save.discoveredBiomes.length>0`), `ARVORE REAL`, `OPCOES`, `CREDITOS`, `SAIR` — espelhar Dead Cells `Play/Options/Save`.

---

### 2.4 `Tela_ao_clicar_em_Jogos_Saves_Atuais.jpg` — JOGOS SALVOS (a tela mais importante que Fumiga não tem)

**Dead Cells:**
- Header `JOGOS SALVOS` branco 12px centro, fundo `0x0d1a33`. **3 slots horizontais** lado a lado, cada `~32%` largura, `~70%` altura, borda `0x2a4a7a` 1px, **selecionado com borda ciano brilhante `0x3cffb4` 2px + glow**. Dentro de cada slot:
  - Topo: `01 [ativo]` 10px ciano, `Última jogatina: 01/12/22 17:11` 8px cinza, `Número de jornadas: 2895` 8px cinza.
  - Meio: **grid 3 linhas** de ícones 14px (poção, ouro, “II”, espada, arco, barril, dado, elmo, etc) — **meta-progressão tangível**.
  - Baixo: **5 células vermelhas** (boss cells) em linha, preenchidas = dificuldade.
  - Slot 3: `Vazio` centro, borda tracejada.
- Rodapé: `Y Deletar / X Copiar / A Confirmar / B Voltar` com pills coloridos (amarelo/azul/verde/vermelho) + barra horizontal scrollbar fina embaixo.
- **Densidade alta, mas hierarquia perfeita** — o jogador vê 2895 jornadas e sente “preciso voltar”.

**Fumiga hoje:**
- **Não existe `SaveSlotScene`**. `SaveManager` salva `royalJelly + skillTree + discoveredBiomes` mas UI só mostra `0` geleia no topo. `SkillTreeScene` é a “metaprogressão”, mas sem slots. **Gap P0 de retenção.**

**Gap e tarefa:**
- **Gap P0:** sem slots, sem sensação de “minha colônia tem história”.
- **Tarefa IA-4.A (12h, a maior desta análise):** criar **`js/scenes/SaveSlotScene.js`** novo (180 LOC) **espelhando Dead Cells mas com tema formiga:**
  - Header `COLONIAS SALVAS` 14px.
  - 3 slots: `COLONIA 1 [ATIVA]` (se `save.royalJelly>0`), `Ultima incursao: 13/09/26 14:32`, `Incursões: 42`, `Biomas: 4/16`.
  - Grid de ícones: **reuso de `assets/ui/icons.png`** — mostrar `icons` de salas (`nursery/pantry/defense/fungus/trap`) + mutações (`poison, projectile…`) + classes desbloqueadas (`sniper, spy`) em 3 linhas. Slot vazio: `VAZIO` + `+ NOVA COLONIA` botão tracejado.
  - 5 **células de geleia** (substituir Boss Cell por `jelly` dourada) embaixo.
  - Rodapé `Y Deletar X Copiar A Confirmar B Voltar` com pills (usar `ui_icons` `Y/X/A/B` se existir, senão texto colorido).
  - Navegação: `setas` + `A` confirma → `LoadingScene`, `X` copia (deep clone `SaveManager`), `Y` deleta com modal `Tem certeza?`.
  - **Integração:** `MainMenuScene` → `INICIAR COLONIA` agora abre `SaveSlotScene` (não direto `LoadingScene`); se só 1 save, pula direto (atalho).

---

### 2.5 `Tela_de_carregamento_geral.jpg` — Loading “ALOJAMENTO DOS PRISIONEIROS”

**Dead Cells:**
- **Topo 58% arte da sala**: prisão com luz volumétrica amarela saindo de janela com grades, gaiola pendurada, caveira gigante à esq., prisioneiro de costas ao centro, névoa azul. **Sem barra** — a arte é o loading.
- **Base 42% fundo `0x0a0f1e` sólido**: título `ALOJAMENTO DOS PRISIONEIROS` 10px branco tracking 2px centro, linha fina `0x3c4a6a` 40% largura acima e abaixo, parágrafo lore 8px `0x8a9ab0` justificado centro 2 linhas, canto inf. dir. `◆ Carregando...` branco 9px + ícone célula vermelha pulsante.
- **Zero números** — a porcentagem é desnecessária; a lore prende.

**Fumiga hoje (`LoadingScene.js:20–75`):**
- Fundo `0x0b0705`, nome do bioma `BOSQUE UMIDO` 22px `0xc8ff5a` + `FASE 1` + barra 320px com moldura `0x4a3520` + `0%` + `DICA` roxa. **Funcional, mas sem arte, sem lore, sem ícone.** `clean()` remove acentos → `BOSQUE UMIDO` (feio). Duração 1600ms fixa.

**Gap e tarefa:**
- **Gap P1:** loading sem alma — é a tela que o jogador mais vê (a cada migração).
- **Tarefa IA-2.D (5h):** `LoadingScene.js`:
  1. Dividir layout em **2 metades**: topo `add.image(W/2, H*0.30, 'tiles_'+biomeId, 0)` com `setDisplaySize(W, H*0.55)` + `setTint(light)` + `Graphics` luz volumétrica (`fillRect` amarelo alpha 0.12 atrás da janela) — **reusa tileset já carregado**, sem novo asset.
  2. Base: título `clean(biome.name)` mas **sem `clean`** após `D-06` (fonte com acentos) → `BOSQUE ÚMIDO` 12px `0xe8d9b5`, linhas finas `Graphics` 40% largura, lore de `assets/data/tips.json` **mas agora lore por bioma** (adicionar `tips.lore[biomeId]` — ex: `bosque_umido: "O berço úmido onde a primeira rainha cavou..."`), 8px `0x8a9ab0`.
  3. Canto inf. dir.: `Image` `ui_icons` `jelly` pulsante + `Carregando...` 9px, com `tween alpha 0.3→1.0` (não barra). Manter barra fina opcional mas 60% alpha.

---

## 3. SÍNTESE TRANSVERSAL — O Que Copiar Sem Copiar

Dead Cells acerta em **4 leis** que Fumiga deve aplicar com tema formiga:

| Lei Dead Cells | Como Fumiga aplica (sem virar clone) |
|---|---|
| **1. Quente vs frio** (laranja fundo, ciano UI) | Fundo terroso `0x1a0f0a` quente + UI ciana `0x7affff` fria — já faz, só intensificar `light` por bioma (`BiomeManager.light`) |
| **2. Texto sem caixa, mas com barra de seleção** | Manter `MainMenuScene` texto puro, mas barra azul atrás (não `>`) — acessível e elegante |
| **3. Densidade com hierarquia** (saves com 16 ícones, mas com grid) | `SaveSlotScene` com grid de salas/mutações — mostra progresso sem poluir |
| **4. Arte conta história no loading** | `LoadingScene` com tileset do bioma + lore de 1 frase — usa asset já existente |

**Cores exatas para copiar (já no GDD, mas não usadas):**
- Fundo menu: `0x0b0705` (Fumiga) vs `0x0d1a33` (DC) — **manter Fumiga, mais terroso**.
- Seleção: `0x2a7aff` azul Dead Cells — **copiar exato** (já é padrão de acessibilidade).
- Card DLC: `0x0f1e3a` — **copiar** para card “Novidades”.
- Texto desabilitado: `0x6d5a41` (Fumiga já usa) = `0x5a5a5a` DC — **ok**.

---

## 4. PLANO DE IMPLEMENTAÇÃO (Tarefas Curtas, Ordem IA)

| Prioridade | Tela | Tarefa | Arquivo | Esforço IA | Critério |
|---|---|---|---|---|---|
| **P0** | Saves | Criar `SaveSlotScene` com 3 slots, grid ícones, 5 geleias, Y/X/A/B | `js/scenes/SaveSlotScene.js` (novo) + `js/main.js` (registrar) + `js/scenes/MainMenuScene.js` (abrir) | 12h | `npm test` novo `tests/unit/saveslot.test.mjs` verde; `MainMenu → Saves` navega com teclado |
| **P0** | Menu | Barra azul atrás da seleção (não `>`) + card “Novidades” sup. dir. | `js/scenes/MainMenuScene.js` | 3h | Barra `0x2a7aff` aparece atrás do item; card clicável abre `SKILLTREE` ou `BETA_NOTES` |
| **P1** | Title | Parallax 3 camadas + lua + silhueta rainha + degradê céu | `js/scenes/TitleScene.js` | 4h | Screenshot `TitleScene` com 3 camadas visíveis em `H*0.82` |
| **P1** | Title | Pill `Ⓐ` + posição central + glow logo ciano | `js/scenes/TitleScene.js` | 2h | `TOQUE PARA COMEÇAR` centralizado `H*0.62` com pill branco |
| **P1** | Loading | Arte topo com tileset + lore por bioma + `Carregando...` pulsante | `js/scenes/LoadingScene.js`, `assets/data/tips.json` (add `lore`) | 5h | `LoadingScene` mostra `tiles_bosque_umido` no topo + 1 frase lore |
| **P1** | Loading | Remover `clean()` após corrigir fonte (D-06) | `js/scenes/LoadingScene.js:line 27` | 0.5h | `PRISÃO DE ÂMBAR` renderiza com acento |
| **P2** | Saves | Ícones de mutação no slot (reuse `mutation_cards.png`) | `js/scenes/SaveSlotScene.js` | 2h | Slot mostra 6 ícones de mutações ativas |

**Ordem IA:** Saves (P0) → Menu barra+card → Title parallax → Loading arte → Polimentos. **Cada tarefa é um commit atômico** com `python3 tools/build_dist.py` verde.

---

## 5. GAPS QUE NÃO SÃO CULPA DO FUMIGA (Mas Precisa Saber)

- **Resolução:** Dead Cells roda 1920×1080, Fumiga 480×480 `FIT`. O card DLC 280×180 em 480px ocupa 58% da largura — **precisa escalar para `W-16` em `FIT`**. Usar `Math.min(280, W*0.45)` no card.
- **Fonte:** Dead Cells usa TTF `Peepo`, Fumiga bitmap `fumiga.png` 8–16px — **bitmap é mais nítido em 480px**, manter, só adicionar acentos.
- **Controller:** Dead Cells mostra `A/B` coloridos; Fumiga é touch-first — **manter `TOQUE PARA COMEÇAR` no touch, `Press A` só se `game.device.input.gamepad`**.

---

## 6. CHECKLIST VISUAL — Como Validar Sem Ser Designer

Após cada tarefa, rode `npm start` e compare lado a lado com a imagem original (abra `Images/` em outra aba):

- [ ] Title: lua visível atrás do castelo/formigueiro? (Tela_pré-menu)
- [ ] Menu: barra azul atrás do selecionado? (Tela_menu)
- [ ] Menu: card sup. dir. com thumb? (Tela_pós-menu)
- [ ] Saves: 3 slots com borda ciano no selecionado + 5 geleias? (Tela_saves)
- [ ] Loading: arte topo ocupa 55% + linhas finas + `Carregando...` vermelho pulsante? (Tela_carregamento)

Se 5/5 ✅, o Fumiga **parece** Dead Cells e **é** Fumiga.

---

## 7. CONCLUSÃO

Você acertou em usar Dead Cells como referência — as 6 telas são **aula de UI minimalista-densa**. O Fumiga já copia a filosofia (texto puro, brasas, fade), mas **falta o card, a barra, os saves e a arte no loading**. São **4 telas que separam beta 0.1 de beta 1.0**.

> **Próximo passo IA:** começar por `SaveSlotScene` (P0, 12h) — é a tela que mais aumenta retenção (Dead Cells tem 2895 jornadas por slot; Fumiga tem 0). Depois, barra azul + card (3h) já fazem o menu “respirar” como Dead Cells.

*Análise salva em `docs/ANALISE_TELAS_REFERENCIA.md`. Imagens sincronizadas em `Images/` (6 arquivos, 2.0 MB) no branch `arena/01a09b21-fumiga-goat` para referência offline.*

