# 🌿📜 FUMIGA GOAT — MEGA ATUALIZAÇÃO LORE-TOTAL
### "Tudo respira LORE. Tudo é formiga. Tudo é memória."

**Data:** 2026-09-22 (atualizado com respostas do usuário)
**Branch:** arena/01a0c8d1-fumiga-goat
**Status:** ✅ 23 PERGUNTAS RESPONDIDAS — IMPLEMENTAÇÃO EM FASES (NÃO TUDO DE UMA VEZ)

> **AVISO CRÍTICO DE IMPLEMENTAÇÃO:** Esta Mega Atualização **NÃO DEVE SER IMPLEMENTADA TODA DE UMA VEZ**. Cada fase deve ser concluída, testada em preview, verificada com checklist e validada pelo usuário antes de avançar para a próxima. Implementar tudo de uma vez gera regressão, quebra de performance e perda de coerência lore. Respeitar a ordem das fases é regra de trabalho.

---

## 1. Resumo Executivo

Esta Mega Atualização propõe que **NENHUM sistema do jogo exista sem lastro na LORE oficial** (`LORE.md`). Hoje o jogo tem 6 mapas, 6 chefões, 11 castas, Árvore da Evolução (49 nós), mutações, formigueiro interno, modo infinito, ascensão e profecias. Mas HUDs, habilidades, telas de carregamento e menus ainda falam "gameplay" — não falam "travessia da Colônia Eterna".

**Objetivo:** Cada pixel, cada número, cada transição deve contar a história da Noite Branca → Travessia dos Seis Degraus → Pálida → Formigueiro Eterno.

**Nova Regra 8 (não-humanóide):** Nenhum personagem terá traços humanos/humanóides. Rainhas são rainhas-formiga. Inimigos são fauna real distorcida pela Névoa. A PÁLIDA é marionete de névoa em forma de formiga ancestral, não humanoide.

**Pipeline de arte:** Nunca mais uma imagem única para cutscene. Cada cutscene será 8 camadas PNG separadas (sky, distant, mid, ground, foreground, partículas, VFX, vignette) para parallax excelente [1](https://moxica.com/parallax-game-background-for-indiegames/) [2](https://cleanassets.itch.io/free-parallax-background-pack).

---

## 2. Pesquisa de Inspirações Indies (Regra 2)

### 2.1 Lore integrada ao HUD / Habilidades
- **Hollow Knight** — Lore tablets dão poderes por zona [3](https://github.com/Korzer420/LoreMaster). Inspiração: mutações como "feromônios de memória" — cada mutação é lembrança de rainha morta.
- **Dead Cells** — Salas de lore + transições com peso. Já usado em `render.js`. Expandir: cada transição terá cor e nome da Era.
- **Vampire Survivors** — Skill tree web [4](https://www.reddit.com/r/Games/comments/wihgyu/soulstone_survivors_game_smithing_action/). Inspiração: Árvore Genealógica com raízes visíveis e seiva/âmbar pulsando.

### 2.2 Parallax Cutscene em camadas
- **Moxica / CleanAssets** — 4-6 camadas PNG separadas [1][2]
- **Indie Tales** — 6 layers 320x180 com z-position automático [5](https://uppon-hill.itch.io/indie-tales-parallax)

### 2.3 Design não-humanóide
- **Rain World, Webbed, Shelter, Carrion, Stray** — lista non-humanoid [6](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/)

---

## 3. Análise Completa da LORE Oficial (LORE.md)

**Prólogo — Noite Branca:** Colônia Ancestral devorada pela Névoa branca doce e silenciosa. Matriarca Anciã sai e não volta. Rainha jovem foge com pólen dourado = essência/cristal de memória.

**Rainha Silenciosa:** Não fala, ordena com cheiro. Árvore da Evolução = memória de rainhas mortas. Nó-raiz = Colônia Ancestral.

**As Onze Povos:**
- Guerra: Bala (poneratoxina = lentidão), Queixo-de-Arpão (mandíbula 200km/h, executa feridos, salto), Acrobata (gaster coração, veneno corrosivo), Fogo (brasa área), Cefalote (cabeça disco porta-viva).
- Coleta: Cortadeira (agricultura fungo), Pote-de-Mel (gaster âmbar despensa), Prata (855mm/s mais rápida).
- Criação: Matabele (única que cura com antibiótico, triagem), Tecelã (costura ninho com seda larva).
- Colosso: Dinoponera (maior operária real, 20x soldado, uma por expedição).

**Seis Degraus + Sétimo:**
1. Planície Amanhecer — Tamborilador (lebre)
2. Floresta Musgo — Caçadora Astuta (raposa)
3. Pântano Pútrido — Sombra Alada (tetraz)
4. Deserto Calcinado — Matriarca Rival (rainha traidora)
5. Bosque Dourado — Galhada Real (cervo)
6. Pico Congelado — Devastador (javali arauto)
7. Topo — PÁLIDA, Mãe da Névoa: marionete de névoa vestida de Matriarca Anciã. 3 fases.

**Final:** Matabele toca coração, Tecelã costura cama, Rainha engole essência da mãe. Árvore floresce. Névoa evapora. Forma Formigueiro Eterno. Modo infinito = Névoa sempre retorna.

**Pós-final:** Eras (10+ linhas), Ascensão da Névoa (20 níveis), Profecias (16 vaticínios).

---

## 4. Análise Completa do Jogo Atual (game/js/*)

**Core loop:** Calmaria (24s) → Horda (budget) → Draft mutação → Boss → Transição mapa → Repete. Sobrevivência = ciclo infinito +30% budget por ciclo.

**HUD atual:** Painel slim 300px com vida rainha, nível/XP, comida, essência, pop, mutações, minimapa, barra onda, barra boss. Genérico — não fala LORE.

**Árvore:** 49 nós, 143 níveis, 4 ramos (Guerra vermelho, Coleta verde, Criação azul, Real âmbar). Tier 0/1/2.

**Formigas:** Cada uma tem biologia real no tip, mas HUD loja só "BALA, ARPÃO..." sem lore visual.

**Bosses:** Mecânicas boas (hare dash, fox orbit, grouse dive, matriarch spit, deer charge, boar slam). Faltam fases lore.

**Inimigos:** runner, swarm, reaper, spitter, warrior, sentinel, matron.

**Cérebro colônia (brain.js):** Sistema utilidade com necessidades, estigmergia (foodField/dangerField), personalidade. É PURA LORE (feromônio), mas invisível.

**Formigueiro interno (nest.js):** 7 câmaras vivas.

**Menus:** PRETITLE → TITLE (parallax 4 camadas + ciclo dia/noite 60s) → MODE → RUN → PAUSA.

---

## 5. Visão da Mega Atualização Lore-Total

### Princípio: "Se não tem nome na LORE, não existe no jogo"

| Sistema Atual | Como fica 100% LORE |
|---------------|---------------------|
| Essência | **Pólen de Memória** da Matriarca Anciã. Âmbar #ffd479 = memória Colônia, violeta #c77dff = Névoa |
| HUD vida rainha | **Vaso de Âmbar da Rainha Silenciosa** — gaster inchado, pulsa <30% |
| Barra XP | **Anéis de crescimento da Árvore** — "A ÁRVORE LEMBROU: NÍVEL X" |
| Comida | **Folhas para o Fungo** + **Mel**. Ícone muda por bioma |
| População | **Irmãs na Trilha** |
| Mutações | **Adaptações Evolutivas** — nome de rainha morta |
| Draft | **Câmara de Memória** — 3 cristais flutuando |
| Árvore | **Árvore Genealógica Real** — raiz COLÔNIA ANCESTRAL, galhos rainhas mortas, frutos = mini-árvores |
| Mapa | **Mural da Travessia** — parallax cutscene 8 layers |
| Bosses | **Arena Lore** + **Fase 2** + **Linha de diálogo feromônio** |
| Inimigos | **Filhos da Névoa** — larvas pálidas |
| Loading | "A COLÔNIA SEGUE... A NÉVOA RESPIRA ATRÁS" + dicas lore |
| Formigueiro | Câmaras com nome lore + VFX |
| Cérebro | HUD feromônio tecla H |

---

## 6. ✅ RESPOSTAS CONSOLIDADAS DO USUÁRIO — 23 PERGUNTAS

> Todas as respostas abaixo foram dadas pelo usuário em 2026-09-22 e são a fonte da verdade para implementação. Qualquer implementação deve seguir exatamente estas escolhas.

### P1. Qual nível de agressividade na loreficação do HUD?
**Resposta: C) Total orgânico vivo por bioma**
- HUD que pulsa, respira, muda por bioma. Textura quitina/cera, não plástico. Gaster desenhado, anéis da árvore, trilha feromônio.

### P2. Quantas camadas por cutscene parallax?
**Resposta: C) 8 camadas cinema**
- sky, distant, mid, ground, foreground, particles, VFX, vignette. Velocidades: 0.01, 0.03, 0.06, 0.08, 0.15, 0.04+sway, 0.02, 0

### P3. Quão estrito no não-humanóide?
**Resposta: B+C) Estrito expressivo + fofo**
- Olhos grandes tipo Hollow Knight OK, capacete fofo OK, mas nunca humano. Proibido: olhos frontais humanos, boca humana, mãos, roupas humanas, bípede humano.

### P4. Primeira cutscene a gerar (piloto)?
**Resposta: A) Noite Branca, cena por vez estilo HQ Dead Cells**
- 3 painéis por cutscene, cada painel 8 layers, bordas grossas Dead Cells, balões feromônio.

### P5. Boss Fase 2 (<50% vida)?
**Resposta: C) Sim com mecânica nova**
- <50% vida: Tamborilador chain 3→5 thump range maior, Caçadora invisível 1s + pounce longe, Sombra Alada shriek inverte controles 0,8s, Matriarca spit 3 direções + frenesi, Galhada folhas curam luta triste, Devastador revela Névoa subiu atrás.

### P6. Árvore da Evolução — visual genealógico?
**Resposta: B custom) Árvore literal + frutos = mini árvores de habilidades liberadas por mapa**
- Tronco Real, galhos Guerra/Coleta/Criação, frutos são mini-árvores que desbloqueiam conforme avança mapas. Ex: vencer Planície libera "Lições do Tamborilador" com 3 nós. Seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral.

### P7. VFX das habilidades das formigas?
**Resposta: B) Médio: aura + partícula + som + ícone lore**
- Equilíbrio performance/impacto. Cada casta com aura cor, partícula específica, som ambiente bioma.

### P8. Como você quer as telas de carregamento/transição?
**Resposta: B) Cutscene curta 3-5s HQ Dead Cells com layers + frase + dica**
- HQ quadrinhos, 1 painel, frase lore + dica gameplay, texto animado letra por letra.

### P9. Rainha Silenciosa — design?
**Resposta: B) Coroa fungo/seda + luz âmbar**
- Símbolo orgânico, não humano. Coroa feita de fungo e seda da Tecelã, luz âmbar pulsando. Gaster grande, sem rosto humano.

### P10. Pálida — como evitar humanoide?
**Resposta: A) Marionete névoa forma formiga rainha ancestral**
- Fiel LORE.md, terror sutil. Forma de rainha-formiga ancestral, fios de névoa segurando braços, olhos escorrendo memória, sem traços humanos. Não é humanoide.

### P11. Itens e cristais — design?
**Resposta: A) Cristais geométricos com luz interna + partícula memória**
- Âmbar = memória Colônia Ancestral, violeta = Névoa. Hexágono geométrico, luz interna, partícula subindo.

### P12. Ordem de implementação?
**Resposta: A) HUD → VFX → Árvore → Bosses → Cutscenes HQ → Inimigos → Formigueiro → Pálida**
- Do visível para épico. HUD primeiro porque jogador vê 100% do tempo.

### P13. Inimigos comuns — origem lore visível?
**Resposta: C) Redesign pálido/branco filhos da Névoa**
- Todos com tom pálido/branco, olhos névoa branca, rastro pálido. Nomes: Rastejante da Névoa, Saúva Corrompida, Ceifadora Pálida, etc.

### P14. Formigueiro Interno — Coração da Colônia?
**Resposta: B) Renomeia total com VFX seda/fungo/mel**
- Berçário = Berço de Seda da Tecelã (seda flutuando)
- Fungário = Jardim Eterno da Cortadeira (esporos)
- Despensa = Ventre de Âmbar da Despensa (mel escorrendo)
- Quartel = Arena de Mandíbulas da Guerra (faíscas guerra)
- Refinaria = Câmara de Memória da Essência (cristal geométrico)
- Real = Câmara da Silenciosa (luz âmbar coroa fungo/seda)

### P15. Resolução das camadas parallax?
**Resposta: C) 320x180 estilo Indie Tales upscale nearest**
- Pixel gigante, Celeste style. Base 320x180 upscale 3x para 960x540 com nearest neighbor respirando. Mais detalhado high-res depois reduzido.

### P16. Quantos painéis por cutscene HQ?
**Resposta: A) 3 painéis por cutscene**
- Intro, conflito, gancho. Ex: Noite Branca Panel1 intro, Panel2 conflito, Panel3 gancho Pálida.

### P17. Estilo pixel art das cutscenes?
**Resposta: B) Mais detalhado high-res depois reduzido**
- Cutscenes mais ricas que gameplay, mesma paleta violeta/âmbar, contorno limpo, harmonia Fumiga, estilo Dead Cells.

### P18. Feromônio visível?
**Resposta: B) Tecla H — névoa verde comida, vermelha perigo**
- Lore total, mostra o que formiga sente. Segurar H mostra campos foodTrail verde, danger vermelho. Texto "A COLÔNIA VÊ COM CHEIRO".

### P19. Eras — mundo muda por Era?
**Resposta: C) Mundo muda por Era: mais trilhas, seda, portas**
- Era 1 vale vazio, Era 5 trilhas viram estradas musgo, Era 10 colônia já é paisagem, mapa já nasce com trilhas postas. Mais seda, mais portas, mais fungo por Era.

### P20. Áudio narração?
**Resposta: B) Texto animado letra por letra + SFX ambiente bioma**
- Sem voz humana, mantém Rainha Silenciosa. Typewriter 30 chars/s + SFX ambiente bioma + SFX type.

### P21. Escopo da primeira entrega (MVP lore-total)?
**Resposta: C) Full 7 dias**
- Tudo: HUD total + VFX + Árvore mini-árvores + 6 cutscenes + bosses fase2 + inimigos pálidos + Pálida + Eras. Mas em fases, não tudo de uma vez.

### P22. HUD muda por bioma?
**Resposta: A) Sim, muda por bioma**
- Folha verde Planície, musgo Floresta, areia Deserto, dourado Bosque, gelo Pico. BIOME_HUD com border, accent, texture, foodLabel, essenceLabel, loreName, waveLabel por bioma.

### P23. Cutscene trigger?
**Resposta: C) Ambos auto primeira vez + biblioteca memórias**
- Auto primeira vez ao entrar mapa/boss + biblioteca "MEMÓRIAS DA COLÔNIA" no menu para rever. G.save.cutscenes marca vistas.

---

## 7. Pipeline de Criação de Imagens Parallax — Frações

**REGRA DE OURO:** Nunca gerar "uma imagem de floresta". Gerar 8 imagens separadas com transparência 320x180.

```
game/assets/cutscenes/noite_branca/
  panel1_intro/
    0_sky.png          — céu gradiente laranja pôr-do-sol + lua minguante
    1_distant.png      — silhueta montanhas distantes
    2_mid.png          — ruínas/formigueiro médio
    3_ground.png       — gramado textura solo + formigueiro 72% X, 62% Y
    4_foreground.png   — vinhas inferior, pedras, arbustos frente
    5_particles.png    — vaga-lumes, essência subindo
    6_vfx.png          — névoa branca, bruma, luz âmbar
    7_vignette.png     — vinheta gótica
  panel2_conflito/
    ... 8 layers
  panel3_gancho/
    ... 8 layers
```

Velocidades: sky 0.01x, distant 0.03x, mid 0.06x, ground 0.08x, foreground 0.15x, particles 0.04x+sway, vfx 0.02x, vignette 0x

Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, sem humanoide, 320x180 base upscale 3x nearest.

---

## 8. Nova Regra 8 — Não-Humanóide

Ver `REGRAS_DE_TRABALHO.md` — Regra 8: Nada no design personagens deve remeter a humanos/humanóides, única exceção quando pedir explicitamente.

- Estrito expressivo + fofo OK (olhos grandes Hollow Knight, capacete fofo Bug Fables)
- Proibido: olhos frontais humanos, boca humana, mãos humanas, roupas humanas, postura bípede humana, rosto humano
- Rainha: coroa fungo/seda orgânica
- Pálida: marionete névoa forma formiga rainha ancestral

---

## 9. ⚠️ PRINCÍPIO DE IMPLEMENTAÇÃO EM FASES

> **ESTA ATUALIZAÇÃO NÃO DEVE SER IMPLEMENTADA TODA DE UMA VEZ.**

Motivos:
1. **Regressão:** Mudar HUD + VFX + Árvore + Bosses + Cutscenes simultaneamente quebra 80% dos testes e torna impossível saber o que quebrou.
2. **Performance:** 8 layers parallax + VFX + áudio + Eras = 25MB+ por cutscene. Carregar tudo de uma vez estoura memória e gera lag no preview.
3. **Validação Lore:** Cada fase precisa ser jogada pelo usuário para validar se "respira LORE". Se implementar tudo, feedback vem tarde e retrabalho é 7 dias.
4. **Limite Técnico:** Geração de imagens limitada a 10 por turno. Cutscenes HQ exigem 8 layers x 3 painéis x 7 biomas = 168 imagens. Impossível em 1 turno.
5. **Regra 1 e 2:** Pesquisar inspirações + perguntar antes de implementar é regra. Implementar tudo de uma vez viola Regra 1.

**Fluxo obrigatório por fase:**
1. Implementar código/arte da fase
2. Abrir preview ao vivo (Regra 7)
3. Rodar checklist de verificação da fase (ver seção 10)
4. Commit com mensagem clara `fase X: descrição`
5. Aguardar validação do usuário antes de avançar
6. Só então iniciar próxima fase

---

## 10. ✅ FASES DA MEGA ATUALIZAÇÃO COM VERIFICAÇÕES

### FASE 1 — Fundação Lore (HUD Orgânico Total por Bioma + Feromônio H)
**Escopo:** Baseado em P1=C, P22=A, P18=B, P9=B
- Implementar `lore_hud.js`: BIOME_HUD por bioma (border, accent, texture, foodLabel, essenceLabel, loreName, waveLabel)
- `drawBiomeTexture`, `drawGasterBar` (gaster rainha com coroa fungo/seda), `drawPheromoneOverlay` (verde comida, vermelho perigo)
- `game.js`: HUD orgânico que pulsa, respira, muda por bioma + tecla H overlay + anel XP + trilha feromônio onda
- Textura quitina/cera procedural por bioma
- **Arquivos:** `game/js/lore_hud.js`, `game/js/game.js`, `game/js/config.js` (MAPS loreName)

**✅ Verificação Fase 1:**
- [ ] Abrir preview em cada bioma (Planície, Floresta, Pântano, Deserto, Outono, Gelo) — HUD muda cor/textura/nome?
- [ ] Vida Rainha mostra gaster com coroa fungo/seda? Pulsa <30% com veias vermelhas?
- [ ] Comida muda ícone por bioma (trevo, cogumelo, alga, semente, folha outono, líquen)?
- [ ] Essência é cristal geométrico com partículas subindo âmbar/violeta?
- [ ] Onda virou Trilha Feromônio com formigas andando?
- [ ] Segurar H mostra névoa verde comida e vermelha perigo? Texto "A COLÔNIA VÊ COM CHEIRO"?
- [ ] Performance: HUD não derruba FPS abaixo de 55?
- [ ] Commit: `fase 1: HUD orgânico total por bioma + feromônio H`

---

### FASE 2 — Habilidades Lore VFX Médio + Inimigos Pálidos
**Escopo:** P7=B, P13=C, P11=A
- `lore_vfx.js`: 11 castas ANT_VFX com aura, partícula, som, ícone lore
- `units.js`: import triggerAntVFX, spawnMemoryCrystal — gather burst VFX, melee attack VFX, healer heal VFX
- `render.js`: foes non-boss overlay screen #e8f4ff 0.28 + olhos brancos lighter + aura pálida + rastro #c9bce8
- Cristais geométricos hexagonais com luz interna
- **Arquivos:** `game/js/lore_vfx.js`, `game/js/units.js`, `game/js/render.js`, `game/js/audio.js` (novos SFX)

**✅ Verificação Fase 2:**
- [ ] Cada casta ao usar habilidade dispara aura cor específica + partícula + som? (Bala roxo slow, Arpão relâmpago, Acrobata verde burn, etc)
- [ ] Gather essência spawna cristal geométrico que sobe?
- [ ] Inimigos comuns estão pálidos/brancos com olhos névoa branca? Rastro pálido?
- [ ] Cristais essência são hexagonais com luz interna + partícula memória?
- [ ] Performance: VFX não gera mais de 30 partículas simultâneas por frame?
- [ ] Sem humanoide nos VFX? Tudo inseto/fauna?
- [ ] Commit: `fase 2: VFX casta médio + inimigos pálidos filhos névoa`

---

### FASE 3 — Árvore Genealógica com Mini-Árvores Frutos
**Escopo:** P6=B custom, P22, P19
- `meta.js`: FRUIT_TREES 6 mini-árvores por mapa, cada uma 3 nós, liberadas ao vencer mapa
- Tronco Real, galhos Guerra/Coleta/Criação, frutos = mini-árvores
- Seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral
- `state.js`: G.save.nodes para frutos, integração com cutscenes vistas
- Visual: árvore literal com partículas, caixa música nos lendários
- **Arquivos:** `game/js/meta.js`, `game/js/config.js` (META_NODES), `game/js/state.js`

**✅ Verificação Fase 3:**
- [ ] Árvore mostra tronco Real e galhos Guerra/Coleta/Criação?
- [ ] Frutos aparecem como círculos coloridos no topo HUD árvore? Brilham quando comprado?
- [ ] Ao vencer Planície, libera "Lições do Tamborilador" com 3 nós? Cada mapa libera seu fruto?
- [ ] Conexões têm seiva dourada correndo quando compradas?
- [ ] Raiz mostra Colônia Ancestral devorada com névoa?
- [ ] Keystones lendários têm aura dourada + som caixa música?
- [ ] Compra de fruto funciona e persiste em G.save?
- [ ] Commit: `fase 3: árvore mini-árvores frutos por mapa`

---

### FASE 4 — Boss Arenas Lore + Fase 2 Mecânica + Frases
**Escopo:** P5=C, P10=A, P9=B
- `enemies.js`: phase2 <50% vida com burst, ring, frase lore, mecânica nova por boss
  - Hare: dashChain 3→5, thumpRange maior, speed maior
  - Fox: invisibleT 1.2s + pounce longe + rastro
  - Grouse: invertT controles 0.85s + shriek slow
  - Matriarch: spit 5 direções + summonCount + frenesi
  - Deer: folhas douradas curam + luta triste
  - Boar: névoa atrás + dropa mapa Topo
- `render.js`: boss phase2 aura névoa pálida elipse + 3 orbs subindo + coroa fungo/seda 3 picos
- Frases ao morrer: "A PLANÍCIE COBRA PASSAGEM, MAS NÃO GUARDA RANCOR" etc
- **Arquivos:** `game/js/enemies.js`, `game/js/render.js`, `game/js/config.js` (BOSSES phase2)

**✅ Verificação Fase 4:**
- [ ] Cada boss <50% vida dispara VFX névoa + frase lore + burst?
- [ ] Tamborilador chain 3→5 visível? Thump range maior?
- [ ] Caçadora fica invisível 1.2s com rastro? Pounce longe?
- [ ] Sombra Alada inverte controles 0.85s? Mensagem "CONTROLES INVERTIDOS!"?
- [ ] Matriarca cospe 5 direções? Não agrupa?
- [ ] Galhada luta triste com folhas douradas curando?
- [ ] Devastador revela névoa atrás com partículas?
- [ ] Boss HUD mostra "FASE 2: NÉVOA DESPERTA" + coroa fungo/seda?
- [ ] Balanceamento: fase2 não impossível (testar com 3 runs)?
- [ ] Commit: `fase 4: bosses fase2 mecânica + frases lore`

---

### FASE 5 — Parallax Cutscenes HQ Noite Branca 3 Painéis x 8 Layers
**Escopo:** P2=C, P4=A, P15=C, P16=A, P17=B, P8=B, P20=B, P23=C
- `cutscenes.js`: CUTSCENE_DEFS 8 biomas, 3 painéis por cutscene, 8 layers parallax, texto animado letra por letra 30 chars/s + SFX.type, loading HQ 3.5s, biblioteca memórias
- Pipeline arte: 320x180 base upscale 3x nearest, 8 PNGs por painel, velocidades 0.01/0.03/0.06/0.08/0.15/0.04+sway/0.02/0
- Noite Branca piloto: panel1_intro 8/8 completo, panel2_conflito 3/8, panel3_gancho 0/8
- Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, Dead Cells HQ bordas grossas
- Trigger: auto primeira vez + biblioteca "MEMÓRIAS DA COLÔNIA" no menu
- **Arquivos:** `game/js/cutscenes.js`, `game/assets/cutscenes/noite_branca/*/*.png`, `game/js/game.js` (integração), `game/js/state.js` (G.save.cutscenes)

**✅ Verificação Fase 5:**
- [ ] Cutscene Noite Branca tem 3 painéis com 8 layers cada? Parallax com velocidades diferentes + sway partículas?
- [ ] Texto animado letra por letra com som typewriter? Skip com Enter mostra texto completo?
- [ ] Borda HQ Dead Cells grossa #ffd479 + #4a3a6e?
- [ ] Vinheta gótica por cima se layer 7 não existir?
- [ ] Loading é cutscene curta 3.5s com frase lore + dica gameplay + 1 painel?
- [ ] Trigger auto primeira vez ao entrar mapa/boss? Marca G.save.cutscenes?
- [ ] Biblioteca "MEMÓRIAS DA COLÔNIA" no menu lista cutscenes vistas e permite rever?
- [ ] Resolução 320x180 upscale nearest sem blur? Pixel gigante?
- [ ] Sem humanoide nas imagens? Tudo fauna/inseto?
- [ ] Performance: 8 layers 320x180 não estoura memória? <50MB por cutscene?
- [ ] Commit por painel: `fase 5: cutscene noite_branca panel1 8 layers`, `panel2`, `panel3`

---

### FASE 6 — Inimigos Filhos da Névoa + Cristais + Áudio Ambiente
**Escopo:** P13=C, P11=A, P20=B
- Já parcialmente feito em Fase 2, aqui polimento final + nomes lore + áudio ambiente bioma
- `config.js`: ENEMIES renomear para Rastejante da Névoa, Saúva Corrompida, etc (se ainda não)
- `audio.js`: SFX ambiente bioma por mapa (vento Planície, grilos Floresta, água Pântano, vento areia Deserto, folhas Outono, vento gelo Pico)
- Cristais geométricos com partícula memória subindo por bioma
- **Arquivos:** `game/js/config.js`, `game/js/audio.js`, `game/js/render.js`

**✅ Verificação Fase 6:**
- [ ] Todos inimigos com nome lore "da Névoa" / "Corrompida" / "Pálida"?
- [ ] VFX névoa nos olhos + rastro pálido consistente em todos tipos?
- [ ] Cristais âmbar/violeta com luz interna + partícula memória?
- [ ] Áudio ambiente bioma toca durante cutscene + gameplay? Não conflita com música?
- [ ] Commit: `fase 6: inimigos filhos névoa final + cristais + audio ambiente`

---

### FASE 7 — Formigueiro Interno Renomeado Total + VFX + Eras Mundo Muda
**Escopo:** P14=B, P19=C, P9=B
- `config.js`: CHAMBERS renomeados lore com lore/tip/per/vfx
  - nursery → BERÇO DE SEDA DA TECELÃ
  - pantry → VENTRE DE ÂMBAR DA DESPENSA
  - barracks → ARENA DE MANDÍBULAS DA GUERRA
  - fungus → JARDIM ETERNO DA CORTADEIRA
  - refinery → CÂMARA DE MEMÓRIA DA ESSÊNCIA
  - royal → CÂMARA DA SILENCIOSA (coroa fungo/seda luz âmbar)
- `nest.js`: VFX por câmara (seda flutuando, mel escorrendo gotas, esporos, cristal hexagonal, luz âmbar, faíscas guerra)
- `world.js`: Eras — G.save.era, trilhas seda, fungo extra Era≥3, portas extras a cada 2 Eras, Era≥9 estradas musgo permanentes
- **Arquivos:** `game/js/config.js`, `game/js/nest.js`, `game/js/world.js`

**✅ Verificação Fase 7:**
- [ ] Câmaras com nomes lore completos no HUD formigueiro?
- [ ] VFX seda flutuando no Berço? Mel escorrendo + gotas no Ventre? Esporos no Jardim? Cristal hexagonal na Memória? Luz âmbar + coroa na Silenciosa? Faíscas + aura vermelha na Arena?
- [ ] Tooltip de cada câmara mostra lore + tip + per + vfx?
- [ ] Mundo muda por Era: Era 1 vale vazio, Era 5 estradas musgo, Era 10 trilhas postas? Testar G.save.era=0,5,10
- [ ] Mais seda, portas, fungo por Era visível no mapa?
- [ ] Performance: VFX formigueiro não derruba FPS?
- [ ] Commit: `fase 7: formigueiro rename total VFX + eras mundo muda`

---

### FASE 8 — Final Pálida Protótipo + Profecias + Polimento + Preview Final
**Escopo:** P10=A, P5, P21=C
- `cutscenes.js`: Pálida 3 painéis HQ (marionete névoa forma formiga rainha ancestral, fios névoa, olhos escorrendo memória)
- `enemies.js`/`config.js`: Pálida como boss final 6000 HP 3 fases (ficha técnica LORE.md) — protótipo
- `meta.js`: Profecias 16 vaticínios da Matriarca com cristais que acendem ao cumprir
- `game.js`: Tela vitória Era + linha Era + coração âmbar, derrota "RAINHA TOMBOU. MAS ESSÊNCIA ALIMENTA PRÓXIMA GERAÇÃO" + semente
- Polimento geral, teste preview completo 6 mapas + Pálida
- **Arquivos:** todos

**✅ Verificação Fase 8 (Final):**
- [ ] Pálida desenhada como marionete névoa forma formiga rainha ancestral, sem humanoide? Fios névoa visíveis?
- [ ] 3 fases Pálida funcionam? Fase1 ferrão arco + invocação, Fase2 teleporte + poças burn + Lamento inverte controles, Fase3 coração âmbar pulsa tudo ao mesmo tempo?
- [ ] Profecias 16 vaticínios com cristais que acendem?
- [ ] Tela vitória mostra Era atual + linha Era + coração âmbar? Derrota mostra semente caindo na Árvore?
- [ ] Preview completo: jogar do início ao fim 6 mapas + Pálida sem crash? 60 FPS?
- [ ] Checklist Lore-Total completo (ver seção 11) 100%?
- [ ] Documentação final atualizada?
- [ ] Commit final: `fase 8: pálida protótipo + profecias + polimento final`
- [ ] PR aberto de `arena/...` para `main` com descrição das 8 fases?

---

## 11. Checklist Lore-Total Final

| Sistema | Conectado à LORE? | Como? | Fase | Status |
|---------|-------------------|-------|------|--------|
| HUD vida rainha | ✅ | Vaso âmbar + coroa fungo/seda + pulso Pálida | 1 | Implementado |
| HUD comida | ✅ | Folhas fungo + mel, muda por bioma | 1 | Implementado |
| HUD essência | ✅ | Cristal geométrico + partículas âmbar/violeta | 1 | Implementado |
| Habilidades 11 castas | ✅ | VFX aura+partícula+som lore | 2 | Implementado |
| Árvore Evolução | ✅ | Genealógica + frutos mini-árvores por mapa | 3 | Parcial (lógica compra pendente) |
| Progressão 6 mapas | ✅ | 6 degraus + mural cutscene 8 layers | 5 | Parcial (Panel1 8/8, Panel2 3/8, Panel3 0/8) |
| Bosses 6 + Pálida | ✅ | Arena lore + fase2 + lição | 4 | Implementado (Pálida protótipo pendente fase 8) |
| Inimigos 7 tipos | ✅ | Filhos Névoa pálidos + rastro | 2/6 | Implementado |
| Gameplay cérebro | ✅ | Feromônio visível tecla H | 1 | Implementado |
| Loading / Transição | ✅ | Frases Noite Branca + cutscene HQ 3.5s | 5 | Implementado |
| Cutscenes | ⏳ | 8 layers parallax 320x180 HQ 3 painéis | 5 | Parcial 11/24 layers Noite Branca |
| Formigueiro | ✅ | Câmaras nome lore + VFX seda/fungo/mel/cristal/coroa/guerra | 7 | Implementado |
| Eras / Ascensão / Profecias | ✅ | Eras mundo muda + profecias 16 | 7/8 | Eras implementado, profecias pendente fase 8 |
| Personagens não-humanóides | ✅ | Regra 8 B+C | 2 | Implementado |

---

## 12. Progresso Atual (2026-09-22)

**Implementado até agora (commit 37b3e4d):**
- Fase 1: 100% (HUD orgânico + feromônio H)
- Fase 2: 100% (VFX casta + inimigos pálidos + cristais)
- Fase 3: 70% (FRUIT_TREES + HUD frutos, falta lógica compra integrada state.js)
- Fase 4: 100% (bosses fase2 + frases lore + render phase2)
- Fase 5: 35% (cutscenes.js sistema 100%, Panel1 8/8, Panel2 3/8, Panel3 0/8 — bloqueado limite 10 imagens/turno)
- Fase 6: 90% (inimigos + cristais + audio typewriter, falta áudio ambiente bioma)
- Fase 7: 100% (formigueiro rename total + VFX + eras mundo)
- Fase 8: 10% (estrutura Pálida em LORE.md e cutscenes.js def, falta implementação boss final)

**Próximo passo imediato:**
1. Gerar 5 layers restantes Panel2 + 8 layers Panel3 (13 imagens) em próximos turnos (limite 10/turno)
2. Implementar compra lógica FRUIT_TREES em state.js
3. Áudio ambiente bioma
4. Pálida protótipo Fase 8

---

## 13. Regras de Trabalho Aplicadas

- **Regra 1:** Perguntas A/B/C/D antes de implementar — 23 perguntas respondidas
- **Regra 2:** Pesquisar inspirações indies na web antes das perguntas — 6 fontes citadas [1]-[6]
- **Regra 6:** Alta resolução pixel art harmônico — cutscenes 320x180 high-res reduzido
- **Regra 7:** Preview ao vivo a cada fase — servidor 0.0.0.0:8000
- **Regra 8:** Nada humanoide — implementada em REGRAS_DE_TRABALHO.md
- **Nova Regra Fases:** Nunca implementar tudo de uma vez — 8 fases com verificação obrigatória

---

*FUMIGA é fictício; as Onze não. Paraponera fere de verdade, Cataglyphis corre de verdade, Megaponera cura de verdade — a natureza escreveu a parte difícil desta história muito antes de nós.* — LORE.md

**Inspirações citadas:**
- Parallax 4-6 layers [1](https://moxica.com/parallax-game-background-for-indiegames/) [2](https://cleanassets.itch.io/free-parallax-background-pack)
- Hollow Knight lore tablets [3](https://github.com/Korzer420/LoreMaster)
- Vampire Survivors skill tree [4](https://www.reddit.com/r/Games/comments/wihgyu/soulstone_survivors_game_smithing_action/)
- Indie Tales 6 layers [5](https://uppon-hill.itch.io/indie-tales-parallax)
- Non-humanoid list [6](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/)

---
**FIM DO DOCUMENTO — 23 RESPOSTAS SALVAS, 8 FASES COM VERIFICAÇÃO, IMPLEMENTAÇÃO EM FASES OBRIGATÓRIA**
