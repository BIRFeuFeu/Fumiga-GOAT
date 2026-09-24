# PROGRESSO — AMPLIAÇÃO: SETE FRUTOS / 70 NOVOS PODERES (2026-09-24)

**Entrega posterior ao registro de Fase 3 abaixo.** Escolhas confirmadas pelo
usuário: poderes novos **globais**, combináveis entre mapas; preparar a sétima
árvore sem implementar agora o Topo/Pálida. Branch mantida:
`arena/01a0d3f5-fumiga-goat`; nenhuma mudança de branch, commit ou push solicitado.

- Sete portas na copa da árvore literal; cada uma abre sua própria miniárvore
  com dez melhorias distintas, três caminhos e um ápice. Seleção mostra detalhes;
  só EVOLUIR gasta essência. Voltar/Escape permitem retornar à árvore principal.
- 49 nós base + 18 legados preservados + 70 novos = **137 definições**.
  As 18 compras antigas ficam na aba LEGADO, com IDs, preços e efeitos locais
  preservados. As 60 novas melhorias dos seis mapas existentes são obtíveis.
- A morte do chefe correto na campanha libera só o fruto correspondente.
  Chefe errado, sobrevivência e vitória no Pico não liberam a Pálida.
  O sétimo fruto oferece prévia de dez poderes, mas permanece incomprável,
  inclusive se `clearedMaps.topo` vier marcado em um save alterado.
- Consumidores reais de dano, projéteis, coleta/depósito, nascimento/morte,
  vida/barreiras/resgates, cura, visão, experiência e cristais. Contadores por
  expedição/unidade; limites de frequência e explosões secundárias não recursivas.
- Catálogo completo das 70 habilidades, custos e temas em `MEGA_ARQUIVO.md`.
- Testes: **23/23** na bateria completa; 70 efeitos individualmente, seis mortes
  reais de chefes, coleta/depósito/nascimento/projéteis reais e simulação com 60
  poderes combinados. Navegador: 548 inspeções de detalhes (137 × duas fontes ×
  PC/mobile), sete entradas e abas por plataforma; 78 compras persistidas por
  perfil, com recarga e Era sem duplicação. Inspeção geral: 30 cenas sem erro JS,
  HTTP ou glifo ausente. HUD isolado: **58,38 FPS**, 1800 frames, limiar 55.
- Revisão encontrou e corrigiu um multiplicador invertido no intervalo de coleta,
  preservou dano fracionário quando não há redução plana e ampliou áreas dos
  cartões/confirmação para 44 px lógicos. Sem substituir a fonte pixel.
- Limitação: sétimo mapa/Pálida ainda não jogáveis. Balanceamento de longo prazo
  das novas combinações requer playtest humano; os testes não o substituem.
- Próxima etapa: validação do usuário e, futuramente, Fase 8 para ligar a vitória
  legítima da Pálida à árvore preparada. Não declarar essa vitória implementada.

---

# PROGRESSO — FASE 3: ÁRVORE GENEALÓGICA FINALIZADA NO ESCOPO ATUAL (2026-09-24)

**Branch:** `arena/01a0d3f5-fumiga-goat`. **Pedido:** finalizar a Fase 3.
**Decisões confirmadas nesta sessão:** árvore literal com frutos, substituindo os
anéis orbitais; cumprir as descrições dos bônus, preservando preços/valores existentes;
dependências da Pálida explicitamente futuras. Isto substitui a antiga escolha visual
“anéis ao redor da raiz”, sem apagar o histórico.

## Auditoria antes da implementação

O código já possuía `FRUIT_TREES`, compra com essência, requisitos, save de nós e
`clearedMaps` por vitória de campanha. Não foi preciso recriar a persistência.
Porém, vários efeitos não correspondiam às descrições: bônus locais eram globais,
visão da batedora aumentava alcance de ataque, velocidade da Tecelã alterava chocagem,
velocidade da Prata alterava frequência de arrancada, +1 essência por cristal virava
+10%, e o bônus contra chefes estava no handler de inimigos comuns.

## Entrega

- **Árvore literal em Canvas:** tronco Real, galhos Guerra/Coleta/Criação, copa de
  seis frutos, raízes da Colônia Ancestral com névoa, folhagem que muda com compras,
  seiva dourada nas conexões compradas e chime nos lendários. Desenho determinístico
  em código, sem PNGs pesados ou novas dependências de produção.
- `tree_layout.js` separa coordenadas visuais de dados de progressão: **49 nós
  originais + 18 de frutos = 67**. IDs, pré-requisitos, custos e saves existentes
  preservados. Teste geométrico cobre os raios dos 67 nós, não apenas o HUD.
- Panorama VER TUDO inclui copa e raízes. Indicadores de ramos/frutos aproximam suas
  regiões; arrasto, roda e pinça mantidos. Detalhes fixos com fonte normal/grande.
- **Compra explícita:** selecionar abre detalhes sem gastar essência; botão EVOLUIR
  mostra disponibilidade/custo e confirma a compra. Bloqueio por mapa, saldo,
  pré-requisito e nível máximo continuam no estado, não apenas no desenho.
- Contagem de progresso inclui os 67 nós. Brilho/contadores dos frutos distinguem
  desbloqueio e compra. Partículas e animações da árvore respeitam efeitos reduzidos.
- **Bônus locais corrigidos:** velocidade da Planície (inclusive operárias), resistência
  ao THUMP, comida; visão das batedoras/velocidade das Tecelãs/cura na Floresta;
  velocidade da Prata, resistência à inversão e +1 por unidade de cristal no Pântano;
  dano/população/essência no Deserto; comida/vida dos tanques/cura no Outono;
  dano contra chefes no Gelo. Removidos vínculos globais incorretos e extras não descritos.
- Veteranas têm atributos recalculados ao migrar de mapa, preservando proporção de
  vida. Bônus de cura do Outono também alcança cura da rainha e recuperação de migração.
- `Névoa Revelada`: efeito antes vago quantificado em **+25% no contraste do feromônio**
  no Gelo; custo de 80 mantido. **Ver Pálida no minimapa continua futuro (Fase 8)**,
  indicado na descrição; não foi inventado um chefe para declarar esse efeito pronto.
- `Topo do Mundo` mantém +1 Era imediata, apenas na primeira compra, custo 120 e
  requisitos preservados. Recarregar o save não concede Era novamente.
- **Mobile:** no painel expandido (+) há OLFATO ligado/desligado, equivalente ao H,
  para que o efeito de Névoa Revelada também possa ser usado por toque. Sem duplicar
  gameplay nem reintroduzir os seis atalhos redundantes removidos na entrega anterior.
- Consultas de frutos usam índice `Map` imutável, evitando buscas repetidas por nó.

**Referência:** crescimento visual de progressão permanente em Rogue Legacy 2,
adaptado à colônia e sem copiar arte:
[2](https://arstechnica.com/gaming/2022/05/rogue-legacy-2-review-a-perfect-sequel-to-a-great-game/).

## Verificação

- `npm test`: **20/20 passaram**, agora incluindo `fruits.mjs`.
- `fruits.mjs`: geometria de 67 nós; 18 compras, saldo, requisitos, limites, reload e
  save antigo; isolamento dos bônus nos seis mapas; atributos reais de unidades;
  coleta de orbes; THUMP/inversão pelos handlers reais; dano de chefe versus inimigo
  comum; seis desbloqueios por campanha e ausência de desbloqueio em sobrevivência;
  recalcular veteranas e +1 Era sem recompra.
- `npm run inspect:tree`: **268 inspeções de detalhes** (67 × PC/mobile × fonte
  normal/grande), sem achados de layout nem compra ao apenas selecionar; 18 compras
  por clique/toque em cada perfil persistiram após reload. Replay do teste também
  valida OLFATO ligado/desligado por toque. Capturas em `/tmp/fumiga-tree`.
- Auditoria focada de layout: **16 estados** de Árvore, Ajuda, Opções/Controles e
  HUD expandido PC/mobile, incluindo fonte grande onde configurada, sem achados.
- `npm run inspect`: 30 cenas PC/mobile, seis mapas por seleção controlada,
  nenhum erro JS, HTTP ou glifo faltando.
- `HUD_MIN_FPS=55 npm run inspect:hud`: seis biomas, H, acessibilidade, vida baixa,
  zoom, viewports mobile e ninho/onda; **56,70 FPS médios em 1.800 frames**, maior
  intervalo 50,1 ms. A primeira medição concorrente com outro Chromium deu 46,94 FPS;
  foi repetida isoladamente. Isso não garante desempenho em todo celular.
- Detectada falha intermitente anterior no teste mobile: dependia de encontrar uma
  formiga aleatória ainda na viewport após a introdução. O cenário agora cria um
  alvo controlado fora do HUD e continua verificando a seleção pelo toque real do motor.

**Limites:** não foi vencida uma campanha completa nem usado celular físico.
A indicação futura da Pálida não está implementada. Não foram geradas camadas de
cutscene nem alterado o chefe final. Layout e arte continuam sujeitos à aprovação
visual do usuário no preview; testes não substituem essa aprovação.

**Próximos passos:** validar o visual com o usuário; depois conferir a Fase 4
(arenas, chefes/fase 2 e frases) contra o código. Retomar cutscenes da Fase 5 somente
com confirmação, respeitando a decisão de mantê-las intactas nesta entrega.

---

# PROGRESSO — FECHAMENTO DAS CORREÇÕES DE INTERFACE (2026-09-24)

**Branch:** `arena/01a0d3f5-fumiga-goat`. **Pedido:** concluir as correções de
interface. **Escolhas confirmadas:** reorganizar mantendo a arte, com texto legível;
no mobile excluir botões duplicados e ações já atendidas por toque/gestos.

## Estado encontrado e correção do histórico

A consulta anterior se baseou no registro de ferramentas abaixo. Contudo, o checkout
inicial desta sessão já continha correções em MODO, AJUDA, ÁRVORE, PROFECIAS,
MEMÓRIAS, fim de expedição, HUD e analisador (sombras/recortes). A auditoria ANTES de
editar código passou nos **88 estados PC/mobile**. Portanto, os **750 achados** do
registro antigo não descrevem este checkout. Não atribuir essas correções anteriores
à implementação desta sessão. Este registro substitui a pendência genérica de
“correções de UI vêm a seguir”, preservando o histórico.

## Implementado nesta entrega

- **Memórias:** dois cartões por linha, quatro por página; duas páginas cobrem as
  oito memórias. Títulos e descrições quebram linhas sem redução automática para
  caber nos cartões. Fonte grande mantém seu aumento. Navegação Anterior/Próxima,
  contador de página, retorno à árvore e replay preservados.
- **Profecias:** quatro cartões por página e quatro páginas cobrem os 16 vaticínios,
  com descrições completas, recompensas separadas e fonte grande sem encolhimento
  automático nos cartões. Nenhuma alteração de recompensas ou progressão.
- **Mobile:** removidos seis botões DOM redundantes: Zoom +/− (pinça), Onda
  (Invocar no canvas), Ninho (Entrar no canvas), Chamar/Soltar (rodapé do ninho).
  Permanecem Centro, Rali e Pausa. Dentro do ninho a camada extra fica oculta:
  Escape ali significa sair, não pausar. Comandos de sair/chamar/soltar permanecem
  nos botões do próprio jogo.
- **Entrada do ninho no mobile reativada no canvas:** antes era ocultada por
  `!isTouchUI()` em favor do atalho DOM. Sua reativação impede perda de acesso
  após remover a duplicata. Validada por toque real, não apenas presença visual.
- **Legibilidade mobile:** rótulos dos três atalhos visíveis também na faixa lateral,
  ícones em texto sem dependência de glifos emoji, nomes acessíveis; dicas de toque
  no ninho e remoção da dica de teclado H no painel expandido mobile.
- **Enquadramento:** mantida proporção 16:9; no mobile paisagem sem letterbox suficiente,
  reserva mínima lateral impede os atalhos de cobrirem o canvas. Retrato continua
  com orientação recomendada para paisagem; não é um redesign vertical do jogo.
- **Testes:** `mobile.mjs` verifica apenas três atalhos e preserva cobertura de pinça;
  `layout-browser.mjs` cobre páginas adicionais e aceita `--extra` (960×540 e
  390×844). Novo `npm run inspect:ui` exercita cliques/toques reais e verifica que
  todos os títulos das oito memórias e 16 profecias continuam acessíveis.

**Referência pesquisada:** acessibilidade de Dead Cells (tamanho de HUD/textos),
adaptada à arte existente do FUMIGA, sem gerar novos assets:
[2](https://dead-cells.com/patchnotes/29).

## Verificação e limites

- `npm test`: **19/19 passaram**, incluindo boot, layout, mobile, assets, simulação,
  árvore, profecias, UI e sobrevivência.
- Auditoria ampliada `node game/test/layout-browser.mjs --extra`: **208 estados
  sem achados**, PC 1280×720, mobile 844×390, mobile 960×540 e retrato 390×844,
  com os estados de fonte grande configurados na suíte. Após os últimos ajustes
  no ninho/HUD/dicas, reexecutados os **57 estados RUN/NINHO nos três perfis mobile**:
  também sem achados. A suíte não cobre toda combinação possível de opções.
- `npm run inspect:ui`: navegação em todas as páginas, ida/volta, fonte normal/grande,
  replay da segunda página, ninho (entrar/comandos/sair), pausa/retomada e invocação
  de onda por toque no canvas. Sem erros JS/rede.
- `npm run inspect`: **30 cenas PC/mobile**, seis mapas por seleção controlada,
  sem erros JS, HTTP ou glifos ausentes. Última execução mobile: 60 FPS médios por
  mapa no ambiente headless; não é garantia para todo aparelho.
- Capturas de Memórias/Profecias com fonte grande, RUN 16:9/retrato e NINHO
  inspecionadas visualmente. Relatórios/capturas em `/tmp/layout-final`,
  `/tmp/layout-touch-final` e `/tmp/fumiga-inspect`, fora do Git.
- Não foi jogada uma campanha completa nem testado um celular físico. Nenhuma arte
  de cutscene, boss, balanceamento ou lógica dos frutos foi alterada.

**Próximo passo:** retomar a Fase 3 (compra/desbloqueio/persistência dos frutos e
polimento da árvore), após conferir as pendências contra o código e confirmar a direção.
MEGA ARQUIVO atualizado nesta mesma entrega conforme a Regra 12.

---

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

