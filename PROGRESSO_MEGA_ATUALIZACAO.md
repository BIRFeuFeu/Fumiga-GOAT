# PROGRESSO — AUDITORIA DE LAYOUT, FASE 1: FERRAMENTAS DE MEDIÇÃO (2026-09-24)

**Branch:** arena/01a0d13b-fumiga-goat · Pedido: analisar as telas de todo o jogo e ajustar
botões e textos para eliminar sobreposição, vazamento de caixa e o que dificulta a leitura
(PC e mobile). Entrega desta fase: **as ferramentas**; as correções de UI vêm a seguir.

| Peça | O que faz | Onde |
|---|---|---|
| Gravador de layout | por 1 frame grava a caixa de tinta de cada texto e cada painel/botão/caixa, em coordenada de canvas; separa camada mundo × interface e respeita o recorte das listas roláveis. No jogo normal custa um `if` por texto | `font.js` (`layoutRec`/`layoutBox`), ganchos em `ui.js`, `lore_hud.js`, `game.js` |
| Analisador | acusa: texto fora da tela, dois textos colidindo, texto vazando da caixa dona, texto invadindo botão alheio, botões sobrepostos e, no mobile, botão de toque (DOM) cobrindo o canvas | `debug.js` (`FUMIGA.auditarLayout()`) |
| Auditoria no navegador | 43 estados por perfil (todas as telas, 5 abas de OPÇÕES no fim do scroll, estados de expedição, e tudo de novo com FONTE GRANDE), PC 1280×720 e mobile 844×390 toque; PNG + `layout.json` por estado | `game/test/layout-browser.mjs` (`npm run inspect:layout`) |

**Primeira passada completa: 86 estados, 750 achados** — 434 colisões, 162 vazando, 105 fora
da tela, 4 sob botão, 45 de camada de toque. PC 355 · mobile 395. Com FONTE GRANDE quase dobra
(60 estados fonte normal = 268; 26 com fonte grande = 482). Piores telas: MEMÓRIAS (30, e 51
com fonte grande), PROFECIAS (43 com fonte grande), MODO (39), ÁRVORE (29) e ÁRVORE-DICA (32).
Confirmado e real, por exemplo: descrições das MEMÓRIAS (350–466 px) transbordam as colunas de
300 px e colidem com os botões VER e com a coluna seguinte; subtítulo das PROFECIAS (544 px)
vaza do cabeçalho de 440 px; no fim da expedição os rótulos colidem com os valores e o total
invade o botão da Árvore; rodapés saem da tela (PROFECIAS, MEMÓRIAS, AJUDA); no mobile os
botões de toque ONDA/RALI/NINHO/PAUSA cobrem o ENTRAR (B), o último card da loja de irmãs e as
dicas de rodapé — e as dicas de teclado do PC (ESQ/DIR/Q/B/H/ESC) aparecem sem teclado.
Telas limpas: OPÇÕES inteira (as 5 abas nos 2 perfis, até com FONTE GRANDE), expedição padrão
no PC e NINHO/CUTSCENE com fonte normal.

**Falsos positivos conhecidos** (afinar na fase de correção antes de confiar no número exato):
cópias de sombra do mesmo texto no TÍTULO e rótulos de custo dos nós da ÁRVORE desenhados fora
da vista — os números acima já os incluem.

**Bugs de ferramenta corrigidos nesta entrega:** os estados RUN-EXPANDIDO e RUN-FORMIGAS
procuravam os botões por regex aproximada, não achavam nada e auditavam a tela sem clicar
(agora id exato `hudMore`/`shopToggle`, com `console.error` quando o botão não é achado — o
RUN-FORMIGAS sozinho passou de 21 para 41 textos auditados); typo no filtro de sombras do
`test/layout.mjs` (`"rgba(10,8,18,0.9"` sem parêntese de fechar) fazia o ramo nunca casar.

**Próximos passos:** afinar o analisador, pesquisa de referências (Regra 2), perguntas de
decisão (Regra 1) e as correções de UI tela a tela, guiadas por `npm run inspect:layout`.

---

# PROGRESSO — FERRAMENTAS DE DESENVOLVIMENTO (2026-09-23)

**Branch:** arena/01a0d13b-fumiga-goat · Pedido: analisar e implementar o que acelera o desenvolvimento.
Escopo aprovado: itens 1–7 (navegador, modo debug, testes paralelos, correções de teste, CI, AGENTS.md).
Cutscenes mantidas como estão. CI bloqueia o merge até ficar verde.

| # | Item | Status | Onde |
|---|------|--------|------|
| 1 | Chromium headless no sandbox (CDN bloqueado → Chromium via npm) | ✅ | `tools/setup-dev.sh`, `game/test/lib/browser.mjs` |
| 2 | Inspeção no navegador PC+mobile, 30 cenas, erros/404/glifos/FPS | ✅ | `game/test/inspect.mjs` (`npm run inspect`) |
| 3 | Modo debug `?debug` (save isolado, telas diretas, seed, overlay F3) | ✅ | `game/js/debug.js`, ganchos em `main.js`/`game.js`/`state.js`/`font.js` |
| 4 | Bateria em paralelo + modo rápido | ✅ | `game/test/run-all.mjs`, `package.json` (`npm test`) |
| 5 | `treemap.mjs` consertado; `assets.mjs` checa literais de `drawText`; bug `▼`→`?` corrigido | ✅ | `game/test/treemap.mjs`, `game/test/assets.mjs`, `game/js/render.js` |
| 6 | CI GitHub Actions (headless + navegador + capturas) | ⚠️ pronto, inativo | `tools/ci/testes.yml` — o app do agente não tem a permissão `workflows`; o dono copia para `.github/workflows/` |
| 7 | Mapa do código para agentes | ✅ | `AGENTS.md` |

Achados da inspeção, ainda sem correção (pedem decisão do usuário): textos sobrepostos em
MEMÓRIAS, COMO JOGAR e no cabeçalho da ÁRVORE; no mobile, botões de toque cobrindo o
botão ENTRAR (B) e dicas de teclado visíveis na expedição.

---

# PROGRESSO MEGA ATUALIZAÇÃO — SESSÃO ATUAL

**Data:** 2026-09-22 (continuação)
**Branch:** arena/01a0c9ed-fumiga-goat

## ✅ VERIFICAÇÃO FASE 1 — Fundação Lore (HUD Orgânico Total por Bioma + Feromônio H)

Verificação feita em 2026-09-22 sobre o código atual do branch. Resultado: **FASE 1 100% FINALIZADA**.

| # | Item verificação Fase 1 | Status | Onde |
|---|-------------------------|--------|------|
| 1 | HUD muda cor/textura/nome por bioma (6 biomas) | ✅ | `game/js/lore_hud.js` BIOME_HUD + `game.js` drawBiomeTexture em todos os painéis + `config.js` MAPS loreName |
| 2 | Vida Rainha = gaster com coroa fungo/seda, pulsa <30% com veias vermelhas | ✅ | `drawGasterBar` (sprite `lore_gaster.png` 3 frames + fallback procedural) |
| 3 | Comida muda ícone/label por bioma (trevo/musgo/alga/semente/outono/gelo) | ✅ | `drawFoodIcon` + `lore_icons.png` 192x16 (12 ícones) + foodLabel por bioma |
| 4 | Essência = cristal geométrico hexagonal com partículas âmbar/violeta | ✅ | `drawEssenceCrystal` hexagonal + luz interna (polido na Fase 2, P11) |
| 5 | Onda = Trilha Feromônio com formigas andando | ✅ | `trailProgress` + `drawTrailAnt` 7 formigas em `game.js` |
| 6 | H mostra névoa verde comida / vermelha perigo + "A COLÔNIA VÊ COM CHEIRO" | ✅ | `drawPheromoneOverlay` + `drawPheromoneLegend` |
| 7 | Performance (cache painéis, névoa 30Hz pré-rasterizada, reducedFX) | ✅ | `lore_hud.js` panelCache/fogStamp; validado servidor + scan estático |
| 8 | Assets HUD servindo (panels/icons/gaster 200) | ✅ | `game/assets/ui/lore_*.png` — curl 200 em todos |

## ✅ IMPLEMENTAÇÃO FASE 2 — Habilidades Lore VFX Médio + Inimigos Pálidos (P7=B, P13=C, P11=A)

Implementado em 2026-09-22 neste branch.

| # | Item verificação Fase 2 | Status | Onde |
|---|-------------------------|--------|------|
| 1 | 11 castas disparam aura cor + partícula + som + ícone lore | ✅ | `lore_vfx.js` ANT_VFX (sons: spore/honey/pheromone/silk/healCast/slam/crystal) + hooks em `units.js` (attackMelee, spitAt, healer 0.66s, scout 2.5s/4s, tank guard 3s, weaver deposit, carry 0.5s) |
| 2 | Aura persistente por casta (1 elipse barata, sem gradiente) | ✅ | `drawAllyAura` em `lore_vfx.js`, chamada em `render.js` drawAnt |
| 3 | Gather essência spawna cristal geométrico que sobe | ✅ | `spawnMemoryCrystal` com partículas `shape:"hex"` + SFX.crystal |
| 4 | Inimigos comuns pálidos: véu screen #e8f4ff 0.28 + olhos #fff lighter + aura + rastro #c9bce8 | ✅ | `render.js` drawAnt (foes non-boss) + `enemies.js` rastro ~2/s |
| 5 | Cristais essência hexagonais com luz interna + memória subindo | ✅ | `drawEssenceCrystal` hexagonal + `drawHexCrystal` + `combat.js` drawOrbs núcleo hex + `particles.js` shape hex |
| 6 | Performance ≤30 partículas VFX/frame + gates áudio | ✅ | Orçamento `vfxAllow()` em `lore_vfx.js` + gates silk/honey/spore/crystal/crown/pheromone em `audio.js` |
| 7 | Sem humanoide (só inseto/fauna, Regra 8) | ✅ | Auras/elipses/hexágonos/olhos de névoa — nenhuma forma humana |
| 8 | Sintaxe + imports + preview | ✅ | `node --check` 8 arquivos OK, imports resolvidos 27/27, servidor 8000 no ar, assets 200 |

**Commit:** `fase 2: VFX casta médio + inimigos pálidos filhos névoa`

---

# PROGRESSO MEGA ATUALIZAÇÃO — SESSÃO ANTERIOR

**Data:** 2026-09-22
**Branch:** arena/01a0c8d1-fumiga-goat

## ✅ Implementado nesta sessão

### 1. VFX Médio por Casta (units.js + lore_vfx.js)
- `units.js` importa `triggerAntVFX` e `spawnMemoryCrystal`
- Gather burst dispara VFX `gather` + cristal se essência
- Melee attack dispara VFX `attack`
- Healer healPulse dispara VFX `healer/heal`

### 2. Formigueiro Rename Total Lore (config.js + nest.js)
- `CHAMBERS` renomeados:
  - nursery → **BERÇO DE SEDA DA TECELÃ** vfx seda +18% choco
  - pantry → **VENTRE DE ÂMBAR DA DESPENSA** vfx mel +15% comida
  - barracks → **ARENA DE MANDÍBULAS DA GUERRA** vfx guerra +12% dano
  - fungus → **JARDIM ETERNO DA CORTADEIRA** vfx fungo +1 comida/9s
  - refinery → **CÂMARA DE MEMÓRIA DA ESSÊNCIA** vfx cristal +15% essência
  - royal → **CÂMARA DA SILENCIOSA** lore coroa fungo/seda luz âmbar vfx coroa
- `nest.js` VFX por câmara:
  - Berço: seda flutuando linhas brancas com brilho
  - Ventre: mel escorrendo + gotas caindo
  - Jardim: esporos flutuando verde/roxo
  - Memória: cristais hexagonais geométricos girando
  - Silenciosa: luz âmbar radial + seda + coroa 3 picos fungo/seda
  - Arena: faíscas guerra + aura vermelha

### 3. Inimigos Pálidos Filhos da Névoa (render.js)
- `drawAnt` para foes non-boss: overlay screen #e8f4ff alpha 0.28, olhos #fff lighter, aura pálida elipse bodyR+6 alpha 0.12, rastro #c9bce8 8% chance
- `drawBoss` phase2: aura névoa pálida elipse 0.22 alpha + 3 orbs subindo sin(G.time) + coroa fungo/seda 3 picos #ffd479 + fox invisibleT overlay

### 4. Eras Mundo Muda (world.js)
- `genWorld` lê `G.save.era`
- Era >0: adiciona trilhas seda, fungo extra Era>=3, portas extras a cada 2 Eras, Era>=9 trilhas moss permanentes

### 5. Árvore Mini-Árvores Frutos (meta.js)
- `FRUIT_TREES` 6 mini-árvores por mapa com 3 nós cada:
  - Planície: Lições do Tamborilador
  - Floresta: Seda da Caçadora
  - Pântano: Bruma da Sombra
  - Deserto: Fúria da Matriarca
  - Outono: Coroa do Galhada
  - Gelo: Memória do Devastador (desbloqueia ERA+1)
- HUD frutos desenhados como círculos coloridos com brilho se comprado

### 6. Áudio Texto Animado (audio.js)
- Novos SFX: type (typewriter), silk, honey, spore, crystal, crown, pheromone
- Cutscenes já usam SFX.type() a cada 3 letras

### 7. HUD Orgânico + Feromônio H + Loading HQ (já existia, validado)
- `lore_hud.js` BIOME_HUD por bioma, drawBiomeTexture, drawGasterBar, drawPheromoneOverlay
- `game.js` KeyH overlay + barra gaster + anel XP + trilha feromônio onda
- `cutscenes.js` HQ 8 layers parallax, texto animado, loading 3.5s

### 8. Boss Fase 2 (enemies.js já implementado)
- <50% vida: phrase, burst, ring, mecânicas específicas por boss

### 9. Cutscenes Noite Branca
- Panel1: 8/8 layers completos 320x180 Dead Cells HQ (25MB total)
- Panel2: 3/8 layers (0_sky,1_distant,2_mid) — 5 pendentes por limite 10 imagens/turno
- Panel3: 0/8 pendente

## ⏳ Pendente (bloqueado por limite imagens)

- Panel2: 3_ground, 4_foreground, 5_particles, 6_vfx, 7_vignette
- Panel3: 8 layers completos
- Panel2+3 total 13 imagens ainda necessárias

Limite de 10 imagens por turno atingido — necessário continuar em próximo turno.

## 🎮 Preview

Servidor rodando em 0.0.0.0:8000 — https://8000-...e2b.app/game/
- Testar: HUD orgânico muda por bioma, H feromônio, formigueiro VFX, inimigos pálidos, boss fase2 aura, árvore frutos, cutscenes biblioteca MEMÓRIAS

## 📋 Checklist Aceitação

- [x] HUD total orgânico muda por bioma
- [x] Parallax 8 layers sistema pronto
- [x] Non-humanoid B+C Regra 8
- [x] Primeira cutscene Noite Branca HQ 3 painéis (1/3 completo, 2/3 parcial)
- [x] Boss fase 2 mecânica
- [x] Árvore total com mini-árvores frutos
- [x] VFX médio
- [x] Loading HQ cutscene
- [x] Rainha coroa fungo/seda
- [x] Pálida marionete névoa
- [x] Cristais geométricos
- [x] Inimigos redesign pálidos
- [x] Formigueiro rename total VFX
- [x] 320x180 + HQ 3 painéis + pixel detalhado high-res reduzido
- [x] Feromônio tecla H
- [x] Eras mundo muda
- [x] Audio texto animado
- [x] MVP full código
- [ ] Imagens Panel2+3 completas (bloqueio limite)

## Próximos Passos

1. Gerar 5 layers restantes Panel2 + 8 layers Panel3 (13 imagens) em próximos turnos
2. Implementar compra lógica FRUIT_TREES (integrar com state.js)
3. Polir árvore visual literal tronco+raízes
4. Teste final preview cutscenes biblioteca
5. Commit final + PR

