# MEGA ARQUIVO — FUMIGA: Mega Atualização Lore-Total

**Consolidado em:** 22 de setembro de 2026  
**Escopo confirmado:** quatro documentos de atualização + lore + regras de trabalho.  
**Preservação:** os seis arquivos originais permanecem intactos no repositório.

## Como consultar este arquivo

Este documento reúne **o conteúdo integral dos seis arquivos**, não um resumo.
Cada fonte está identificada e reproduzida em um bloco delimitado por comentários
`INICIO ORIGINAL` e `FIM ORIGINAL`. Nada dos textos de origem foi removido,
corrigido, abreviado ou deduplicado: títulos, exemplos, links, tabelas, listas,
repetições, datas, branches, checklists e notas históricas foram preservados.

- **Regras de trabalho:** processo de desenvolvimento, pesquisa, confirmação,
  testes, preview, desempenho e identidade não-humanoide.
- **LORE.md:** referência canônica da história, incluindo a ficha da Pálida.
- **Mega Atualização Lore-Total:** visão geral, 23 escolhas e oito fases com
  verificações. A implementação deve continuar por fases, com validação do usuário.
- **Decisões:** registro integral das escolhas feitas para a mega atualização.
- **Progresso:** retrato da sessão anterior, preservado como foi escrito.
- **Fases de Implementação:** histórico do menu Dead Cells V2 e da Planície Viva,
  anterior ao planejamento Lore-Total; incluído para não perder contexto.

> **Atenção aos status históricos:** expressões como “100%”, “implementado”,
> estimativas de prazo e limites de ferramentas nos documentos abaixo são
> afirmações dos registros originais. A consolidação não as transforma em
> comprovação do estado atual do código nem em limites da sessão atual.
> Divergências permanecem visíveis, sem apagar conteúdo. O que efetivamente
> funciona deve ser confirmado por testes e inspeção no preview.

## Registro técnico desta entrega — inicialização

Esta seção é nova e não modifica os seis textos originais.

- Removida a declaração duplicada de `gameHelpReturn` em `game/js/game.js`,
  que impedia a importação do módulo e a inicialização do jogo.
- Corrigido o tratamento de falhas de fontes/sprites em `game/js/main.js`:
  não prosseguir com recursos obrigatórios ausentes; exibir erro e orientação
  para recarregar usando fonte nativa, mesmo se o atlas de texto falhar.
- A introdução da expedição agora abre no fluxo da própria partida, sem
  `setTimeout` solto. Legendas e instruções ficam dentro do canvas; ENTER,
  espaço e clique permitem avançar, e ESC permite pular para o gameplay.
- A introdução registra a memória no save. O carregamento usa apenas as camadas
  existentes; as pendentes continuam com fallback procedural. Uma resposta
  tardia de imagem não pode sobrescrever o painel seguinte. As camadas carregadas
  são preparadas uma vez em 320×180, em vez de redimensionar os PNGs-fonte a cada frame.
- Ajustados os contadores e a dica H no HUD inicial para evitar sobreposição
  e texto fora da tela.
- Acrescentado `game/test/boot.mjs`, cobrindo a sintaxe ESM dos 27 módulos,
  boot normal, save inválido e falhas de fonte/sprite. Os testes de interface,
  layout e sobrevivência agora percorrem ou pulam explicitamente a introdução.
- Inspeção no navegador: menu → campanha → introdução → partida; chocagem,
  entrada/saída do formigueiro e primeira onda, sem exceções JavaScript ou 404
  nesse percurso. Isso não equivale a validar toda a mega atualização.

**Fora do escopo desta entrega:** completar a arte das cutscenes, corrigir a
transparência dos PNGs-fonte, implementar compras dos frutos, concluir os VFX,
transformações visuais das Eras, biblioteca completa ou o chefe Pálida.
Os 11 arquivos de arte existentes da Noite Branca continuam sendo 11 de 24;
o fallback não deve ser contado como arte finalizada.

## Registro técnico — kit de UI de madeira viva por bioma (Fase 2, continuação, 2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** caixas de texto no estilo do
kit de tábuas de madeira da referência (plank UI), personalizadas pelo MEGA
ARQUIVO e pela mudança de mapa. **Decisões confirmadas (Regra 1):** madeira
viva por bioma · kit completo (caixas + banners-seta + barras + check/cross).

**Entregas:**

- `lore_textbox.png` virou tábua viva: veios, bisel luz/sombra, nó de cera,
  sulco de placa, cantos chunky com motif do bioma; 7 madeiras (fresca,
  musgosa, úmida, calcinada, dourada, gelada, colônia).
- `lore_kit.png` novo (280×52, ~3 KiB): 7 tábuas-seta de banner 40×24,
  7 molduras de barra 32×12 com centro transparente e ícones check/cross/gema/
  botão âmbar.
- `lore_hud.js`: layouts 9-slice configuráveis (`L_BOX`, `L_BANNER`, `L_BAR`),
  `drawWoodBanner` (com placa gravada de legibilidade), `drawWoodBarFrame`,
  `drawKitIcon`.
- `ui.js`: `bar()` ganha moldura de madeira do bioma (fallback procedural).
- `game.js`: banner de onda/mapa vira tábua-seta do bioma; toggles de
  acessibilidade/vídeo, profecias e memórias usam check/cross de madeira;
  gemas ladeiam "MUTAÇÃO DISPONÍVEL"; botão âmbar no painel acessível.
- `tools/make_lore_hud.py` e `game/assets/ui/README.md` atualizados.

**Inspirações (Regra 2):** kits cozy de madeira tipo Stardew Valley
(Pixelwood Valley, Rustic Wood UI) e tábuas pixel art de itch.io/Pinterest.

**Verificação (Regras 3/4):** bateria headless completa passou; QA visual do
9-slice composto de banners (600×84) e barras com fill; `lore_kit.png` servido
200 no preview. **Limitação já declarada:** sem navegador no sandbox — a
inspeção jogando fica no preview ao vivo (porta 8000).

## Registro técnico — rework de HUD Fase 2: slice boxes e caixas de texto (2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** rework da Fase 2 do HUD —
slice boxes e caixas de texto com spritesheets próprias, segundo o MEGA
ARQUIVO (HUD orgânico por bioma, P1/P22), incluindo a mudança de estilo ao
progredir de mapa. **Decisões confirmadas (Regra 1):** caixas em todas as
telas (RUN + diálogos + tooltips + menus) · arte pelo gerador procedural rico ·
transição "muda de quitina" com dissolve + banner.

**Entregas:**

- `tools/make_lore_hud.py` evoluído: `lore_panels.png` com quitina dupla,
  motif do bioma nos 4 cantos (trevo/cogumelo/alga/semente/folha/líquen —
  zona fixa do 9-slice), costuras de seda e nós de cera; novo
  `lore_textbox.png` (224×32) com 7 temas de caixa de texto (6 biomas +
  colônia para menus). ~2 KiB cada (Regra 5), nada humanoide (Regra 8).
- `game/js/lore_hud.js`: loader inclui `textbox`; `tileOf`/`blitMolt`
  (dissolve 0,6 s + fio de luz na troca de bioma, cache de tiles, sem alocação
  por frame); `drawLoreTextbox` exportado; `hudBiome()` (mapa atual ou
  colônia).
- `game/js/ui.js`: `dialogBox`/`tooltip` desenham a caixa orgânica do bioma,
  com fallback procedural quando a arte não está carregada (testes headless).
- `game/js/game.js`: banner de migração anuncia "O VASO MUDA: <nome lore>".
- `game/assets/ui/README.md` atualizado.

**Inspirações (Regra 2):** Dead Cells/Hollow Knight/Hyper Light Drifter (UI
limpa com paleta casada) e kits 9-slice temáticos (Nuhemu 6 temas, OpenGameArt
750 assets).

**Verificação (Regras 3/4):** bateria headless completa passou (`boot`,
`docs`, `assets`, `tree`, `stuck`, `layout`, `uitest`, `attack`, `prophecy`,
`endless`, `sim` FORCE=6); QA visual do 9-slice composto (cantos íntegros,
faixas esticadas) e dos atlas ampliados; `lore_textbox.png` servido 200 no
preview. **Limitação já declarada:** sem binário de navegador no sandbox, a
inspeção em jogo fica no preview ao vivo (porta 8000).

## Registro técnico — rework de arte dos inimigos, Fase 2 (2026-09-22)

Esta seção é nova e não modifica os seis textos originais.

**Branch:** arena/01a0ca3a-fumiga-goat. **Pedido:** rework dos inimigos com novos
sprites segundo a Fase 2 da mega atualização (Filhos da Névoa pálidos), sem que a
horda fosse apenas formigas. **Decisões confirmadas pelo usuário (Regra 1):**
fauna real corrompida variada · paleta pálida da Névoa · arte + nomes lore.

**Novos seres (arte-fonte em `inimigos/`, sprites finais em
`game/assets/sprites/ants/e_*.png` via `tools/prepare_assets.sh`):**

| Tipo | Antes | Agora | Nome lore |
|------|-------|-------|-----------|
| runner | formiga | larva de besouro | LARVA RASTEJANTE |
| swarm | formiga | saúva corrompida | SAÚVA CORROMPIDA |
| reaper | formiga | louva-a-deus | CEIFADORA PÁLIDA |
| espitter | formiga | besouro bombardeiro | BESOURO-PRAGA |
| warrior | formiga | vespa | VESPA CARRASCA |
| sentinel | formiga | caranguejo blindado | SENTINELA DE CONCHA |
| matron | formiga | aranha de ninhada | MATRONA PÁLIDA |

Paleta harmônica (Regra 6): corpo osso `#e8f4ff`, sombra `#c9bce8`, veias
violeta `#c77dff`, pontos âmbar `#ffd479`, contorno `#08060f` — casa com o véu
pálido/olhos de névoa que o `render.js` (Fase 2) já aplica por cima. Nada
humanoide (Regra 8). Chaves, stats, `bodyR` e mecânicas (matrona ainda choca
larvas) intactos — só arte e nomes mudaram.

**Inspirações (Regra 2):** Hollow Knight e Rain World (fauna corrompida com
silhueta legível), Vampire Survivors (leitura de horda) e packs top-down de
insetos do itch.io.

**Verificação (Regras 3/4):** bateria headless completa (`boot`, `docs`,
`assets`, `tree`, `stuck`, `layout`, `uitest`, `attack`, `prophecy`, `endless`,
`sim` FORCE=3/6) — tudo passou; spawn dos 7 tipos + tique + spawn de adds da
matrona exercitados pelo código real; decode pixel a pixel dos 7 PNGs (fundo
100% transparente, cobertura 24–64%, paleta pálida/violeta/âmbar presente);
assets servidos 200 com 1,2–4,4 KB cada. **Limitação declarada:** o sandbox não
tem binário de navegador (download do Chromium bloqueado pelo proxy), então a
inspeção visual em jogo fica por conta do preview ao vivo na porta 8000.

**Correção de consistência encontrada:** `game/test/docs.mjs` falhava ANTES
deste rework porque o bloco de `PROGRESSO_MEGA_ATUALIZACAO.md` embutido neste
MEGA_ARQUIVO (e a linha de tamanho/hash do rodapé de integridade) estava
desatualizado em relação ao arquivo avulso. O bloco e o rodapé foram
ressincronizados byte a byte; os seis originais seguem intactos.

## Registro técnico — fechamento da Fase 1 Lore-Total (2026-09-22)

**Status: implementação da Fase 1 concluída e verificada no escopo abaixo.**
Este registro substitui as pendências técnicas do registro de início imediatamente
abaixo, que permanece como histórico. Não declara concluídas as Fases 2–8.
Branch: `arena/01a0c98b-fumiga-goat`.

### Checklist de fechamento

| Item da Fase 1 | Resultado | Implementação |
| --- | --- | --- |
| Seis HUDs orgânicos: cor, textura, nome e respiração | ✅ | `lore_hud.js`, `game.js`, `config.js` |
| Arte híbrida pixel art: seis 9-slices + spritesheets | ✅ | `game/assets/ui/`, pipeline `tools/make_lore_hud.py` |
| Gaster com coroa fungo/seda, vida recortada, veias vermelhas pulsantes abaixo de 30% | ✅ | `drawGasterBar` |
| Trevo, cogumelo, alga, semente, folha de outono e líquen | ✅ | `drawFoodIcon` e atlas de ícones |
| Cristais âmbar/violeta e partículas de memória | ✅ | `drawEssenceCrystal` |
| Trilha de onda com formigas animadas | ✅ | `drawTrailAnt`, HUD de ondas |
| XP como anéis de crescimento da Árvore | ✅ | `drawTreeRings`, agora com três anéis irregulares e seiva de progresso |
| Minimapa sensorial, não apenas imagem do terreno | ✅ | `drawScentMinimap`: campos reais da IA sob máscara de exploração |
| Segurar/soltar H, verde comida, vermelho perigo, legenda lore | ✅ | `drawPheromoneOverlay`, `drawPheromoneLegend` |
| Fonte grande, alto contraste e partículas reduzidas | ✅ | seis biomas auditados; rótulos com largura limitada |
| Desempenho e preview | ✅ no ambiente medido | 59,47 FPS médios em 1.800 frames com H ativo; servidor em `0.0.0.0:8001` |

### Correções finais

- HUD expandido tinha dois textos na mesma linha. O teste antigo clicava em
  x=293, fora do botão + em x=304..322: corrigido para realmente abrir o painel.
- Mais espaço entre nome, coroa, vida e recursos. Textos principais usam escala
  nativa da fonte bitmap para não perder traços ao reduzir. `maxWidth` limita
  rótulos após a ampliação de acessibilidade, evitando invasão do campo vizinho.
- Anéis de XP agora têm aparência de crescimento de madeira, com progresso âmbar.
- Minimapa mostra comida/perigo reais, preserva marcadores, interação e fog of war;
  o título agora fica dentro do painel, não no limite superior do canvas.
- Névoa H preparada em meia resolução a 30 Hz e composta no loop normal. Pan,
  zoom e shake invalidam imediatamente; não altera campos de IA, dano ou saves.
- Minimapa sensorial usa uma grade 50×38 a 10 Hz em canvas reutilizado. Mudança de
  mundo invalida o cache. Sem dependência nova, arquivo de imagem extra ou cache
  ilimitado. Atlas existentes regenerados pelo pipeline sem diferenças binárias.
- Botão Invocar ganhou rótulo curto e variante compacta de 44px em viewport
  mobile, evitando o crescimento automático para cima do painel de ondas.

### Evidências e limites da verificação

Passaram `boot.mjs`, `assets.mjs`, `lorehud.mjs`, `layout.mjs`, `uitest.mjs`,
`sim.mjs`, `attack.mjs`, `endless.mjs`, `stuck.mjs`, `tree.mjs`, `prophecy.mjs`
e `docs.mjs`. O teste de layout inclui os seis biomas com fonte ampliada e H.

Chromium real: menu → campanha → introdução → partida, troca controlada entre
seis biomas, vida baixa, H pressionado/solto/perda de foco, zoom, HUD expandido,
fonte grande/alto contraste/partículas reduzidas, viewports 844×390 e 390×844,
entrada/saída do formigueiro e início de onda. Sem exceções JS ou respostas HTTP
com erro nesse percurso. Capturas e relatório JSON ficam fora do Git.

Na última execução de 1.800 frames (cerca de 30s) com H ligado: **59,47 FPS médios,
33,4ms no frame mais lento**. A meta de média acima de 55 FPS passou neste ambiente;
isso não promete ausência de frames lentos nem desempenho idêntico em todo celular.
Os testes mobile verificam viewport/layout, não um aparelho físico nem toda a
usabilidade touch. A inspeção dos seis biomas usa seleção controlada, não uma
campanha inteira. A aprovação estética final cabe ao usuário no preview.

Reprodução: `node game/test/lorehud-browser.mjs` com Playwright no ambiente de
inspeção e servidor ativo. `BASE_URL`, `CHROMIUM_PATH`, `HUD_SHOTS` e
`HUD_PERF_FRAMES` são configuráveis (1.800 frames por padrão). Pillow é necessário
apenas para regenerar arte, não para executar o jogo.

---

## Registro técnico — início da Fase 1 Lore-Total (2026-09-22)

**Branch:** `arena/01a0c98b-fumiga-goat`. **Direção confirmada nesta sessão:**
híbrido, com sliceboxes 9-slice e spritesheet. Este registro novo não altera os
blocos históricos nem declara a Fase 1 inteira como 100% concluída.

### Implementado e integrado

- Três atlas originais em `game/assets/ui/` (menos de 4 KiB juntos): seis
  molduras 9-slice, seis alimentos distintos, cristais âmbar/violeta, quatro
  passos de formiga e três estados do gaster (vazio, âmbar, ferido).
- Pipeline reproduzível `tools/make_lore_hud.py`: master 4×, grade pixel art,
  exportação nearest, transparência real, paleta baseada no sprite da rainha.
  Fontes 4× podem ser exportadas fora do jogo via `--master`. Pillow é apenas
  ferramenta de arte, não dependência do jogo.
- `lore_hud.js`: painéis cacheados por bioma/tamanho (limite de 96), cantos
  preservados, quitina/cera determinística e respiração discreta. Gaster da
  rainha com coroa de fungo/seda, recorte de vida e veias vermelhas abaixo de 30%.
- `game.js`: comida e cristal agora realmente desenhados; trilha com formigas
  animadas abaixo do texto; separação entre painel da colônia e das ondas;
  texto de vida baixa sem sobreposição e nomes de bioma com maior contraste.
- Visão H usa os campos reais de comida/perigo e considera zoom e shake.
  Névoa pré-rasterizada, sem criar gradientes por célula a cada frame. Legenda
  bitmap dentro do painel e acima da loja; não disputa espaço com a dica inicial.
- Carregamento dos atlas no boot, com erro visível se algum falhar. Efeitos
  decorativos reduzidos pela opção de partículas reduzidas. Sem alterar dano,
  custos, progressão, saves ou iniciar a Fase 2.

### Verificação desta entrega

- Passaram: `boot.mjs` (incluindo nova falha de atlas HUD), `lorehud.mjs`,
  `uitest.mjs`, `assets.mjs`, `layout.mjs`, `sim.mjs`, `attack.mjs`, `endless.mjs`,
  `stuck.mjs`, `tree.mjs`, `prophecy.mjs` e `docs.mjs`.
- Chromium real: menu → campanha → introdução → partida; seis biomas por
  seleção controlada no teste, vida a 20%, campos de comida/perigo, H com zoom,
  entrada/saída do formigueiro e início de onda. Sem exceções JS ou HTTP 404
  nesse percurso. Isto não é uma campanha completa jogada até o fim.
- Teste reproduzível opcional `game/test/lorehud-browser.mjs`, requer Playwright
  no ambiente de inspeção e servidor em :8000. Aceita `CHROMIUM_PATH`, `BASE_URL`
  e `HUD_SHOTS`; capturas ficam fora do repositório. Sem dependência nova no jogo.
- Com H ligado, duas amostras headless de 90 frames mediram **54,5 e 58,1 FPS**.
  A meta de manter pelo menos 55 FPS ainda precisa de validação sustentada no
  navegador/hardware do jogador; não é declarada garantida.

### Pendências para fechar a fase

- Aprovação visual do usuário e verificação prolongada de desempenho, inclusive
  mobile e acessibilidade com fonte grande.
- Anel de XP e minimapa existentes foram preservados; polimento adicional da
  linguagem de anéis de árvore/trilhas permanece para a continuação da Fase 1.
- As Fases 2–8 não foram ampliadas nesta entrega.

**Referência pesquisada:** legibilidade do HUD e redução de partículas em
*Dead Cells*: [2](https://www.gamedeveloper.com/design/dead-cells-devs-drop-surprise-accessibility-update).
A referência orienta leitura e efeitos, não é fonte dos sprites.

## Fechamento verificado — Fase 1 Lore-Total (2026-09-22)

**Status:** implementação da Fundação Lore concluída e validada neste checkout.
**Branch:** `arena/01a0c98b-fumiga-goat`. Não inicia nem declara concluída a Fase 2.
Este registro é novo; os seis documentos históricos abaixo permanecem intactos.

| Critério | Resultado / implementação |
|---|---|
| HUD dos seis biomas | Validado: molduras 9-slice, textura quitina/cera cacheada, cores e nomes em `lore_hud.js`, `game.js` e `config.js`. |
| Vida da Silenciosa | Gaster em atlas, coroa de fungo/seda, alerta abaixo de 30%, veias vermelhas e pulsação do sprite inteiro; efeitos reduzidos desativam o movimento. |
| Comida | Seis ícones próprios: trevo, cogumelo, alga, semente, folha de outono e líquen. |
| Essência | Cristais geométricos âmbar/violeta e partículas ascendentes; redução de partículas respeitada. |
| XP e onda | Anéis da Árvore e trilha de formigas animadas; efeitos reduzidos também param o deslocamento. Contador de onda separado da trilha para melhorar a leitura. |
| Feromônio | Segurar H mostra campos reais verdes/vermelhos; soltar H ou perder foco desativa. Legenda visível, zoom/shake compensados, minimapa sensorial. Dica H com contraste reforçado. |
| Arte | `game/assets/ui/lore_{panels,icons,gaster}.png`: três atlas originais, master 4×, exportação nearest; pipeline e recortes documentados em `game/assets/ui/README.md`. |
| Regressão | Passaram `boot`, `docs`, `assets`, `sim`, `uitest`, `layout`, `tree`, `stuck`, `attack`, `endless`, `prophecy` e `lorehud`. |
| Navegador | `lorehud-browser.mjs`: seis biomas, vida baixa, H/blur, zoom, acessibilidade, viewports retrato/paisagem, formigueiro e início de onda; nenhum erro JS/HTTP observado. |
| Desempenho | Gate de **55 FPS médios** passou: **59,05 FPS**, 1.800 quadros com H ativo, maior intervalo 50 ms. Medição headless local, não garantia de mínimo instantâneo ou de desempenho em todos os dispositivos. |

A troca de biomas na inspeção é controlada pelo teste; não representa uma campanha
completa vencida. O teste de viewport mobile verifica a apresentação, não equivale
a teste em aparelho físico. Capturas e relatórios ficam fora do Git. Preview servido
em `0.0.0.0:8000`, rota `/game/`.

Para reproduzir a inspeção (Playwright/Chromium somente no ambiente de teste):

```bash
HUD_MIN_FPS=55 node game/test/lorehud-browser.mjs
# Opcional: BASE_URL, CHROMIUM_PATH, HUD_SHOTS e HUD_PERF_FRAMES.
```

## Índice dos conteúdos integrais

1. [Regras de trabalho](#fonte-regras-de-trabalho) — `REGRAS_DE_TRABALHO.md`
2. [Lore canônica — A Travessia da Colônia Eterna](#fonte-lore-canonica) — `LORE.md`
3. [Mega Atualização Lore-Total — visão, escolhas e oito fases](#fonte-mega-atualizacao-lore-total) — `DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md`
4. [Decisões consolidadas da mega atualização](#fonte-decisoes-da-mega-atualizacao) — `DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md`
5. [Registro histórico de progresso da mega atualização](#fonte-progresso-historico) — `PROGRESSO_MEGA_ATUALIZACAO.md`
6. [Histórico de implementação do menu e da Planície Viva](#fonte-historico-menu-planicie) — `DOCUMENTO_FASES_IMPLEMENTACAO.md`

7. [Registro de integridade](#registro-de-integridade)

---

<a id="fonte-regras-de-trabalho"></a>

## Conteúdo integral 1 — Regras de trabalho

**Arquivo de origem:** [REGRAS_DE_TRABALHO.md](REGRAS_DE_TRABALHO.md)

<!-- INICIO ORIGINAL: REGRAS_DE_TRABALHO.md -->
# 📜 Regras de Trabalho — Desenvolvimento do FUMIGA

Este documento define as **regras obrigatórias** que o assistente de desenvolvimento (Arena.ai Agent Mode)
deve seguir em **todas** as interações e alterações feitas no jogo **FUMIGA — Colônia Eterna**.

---

## Regra 1 — Perguntar antes de implementar 🎯

> **Sempre fazer perguntas com opções de respostas para saber como o usuário quer que as novas alterações sejam implementadas.**

- A **pesquisa da Regra 2 acontece ANTES** destas perguntas: perguntar já citando as inspirações.
- Antes de escrever qualquer código, apresentar **perguntas objetivas com opções claras** (ex.: A, B, C),
  permitindo também resposta personalizada.
- As opções devem descrever **o impacto de cada escolha** (visual, gameplay, desempenho, complexidade).
- Só iniciar a implementação após a confirmação da direção desejada.
- Perguntar sobre: estilo visual, balanceamento, escopo da feature, onde ela aparece no jogo, etc.

**Exemplo de formato:**

```
Como você quer que o novo chefão do Bioma 4 se comporte?
A) Chefão de arena fixa, com invocações de lacaios (estilo boss clássico)
B) Chefão que persegue o jogador pelo mapa (estilo perseguição tensa)
C) Chefão em fases, mudando de padrão a cada 25% de vida
D) Outro: (descreva)
```

---

## Regra 2 — Pesquisar inspirações em jogos indies 🎮

> **Sempre pesquisar na Web buscando inspirações em jogos indies para as alterações que forem pedidas.**

- Esta é a **primeira etapa** do fluxo: pesquisar **antes mesmo das perguntas** da Regra 1.
- Para cada mudança solicitada, realizar **pesquisa na Web** buscando referências de **jogos indies**
  reconhecidos (ex.: *Dead Cells*, *Hollow Knight*, *Vampire Survivors*, *Slay the Spire*, *Stardew Valley*, etc.).
- Registrar no retorno ao usuário **quais jogos serviram de inspiração** e **o que foi aproveitado** de cada um
  (mecânica, feel, UI, balanceamento, feedback visual).
- A inspiração deve ser adaptada à identidade do FUMIGA: pixel art, colônia de formigas, roguelite de biomas.
- As fontes pesquisadas devem ser citadas (links) para o usuário conferir.

---

## Regra 3 — Check-in de verificação ✅

> **Sempre fazer um check-in para conferir se tudo que foi pedido foi realmente implementado no jogo.**

Ao final de cada tarefa, apresentar um **checklist de conferência** com este formato:

```markdown
### ✔️ Check-in de Implementação
| # | Item pedido | Status | Onde foi implementado |
|---|-------------|--------|-----------------------|
| 1 | Nova mutação X | ✅ | `game/js/mutations.js` |
| 2 | Animação de ataque | ✅ | `game/js/player.js` |
| 3 | Ajuste de dano | ⚠️ Parcial | Pendente balanceamento |
```

- Nenhum item pedido pode ficar sem resposta no checklist.
- Itens pendentes ou parciais devem ser **explicitamente sinalizados** com o motivo.
- Rodar os **testes headless** do jogo sempre que existirem mudanças de lógica.

---

## Regra 4 — Jogar e inspecionar o jogo após qualquer alteração 🐛

> **Qualquer alteração: acessar o jogo e jogá-lo, inspecionando buscando bugs, erros estruturais ou imperfeições.**

- Após cada mudança, **subir o jogo localmente** e acessá-lo como um jogador:
  - verificar **console do navegador** (erros de JavaScript, assets 404, warnings);
  - testar o **fluxo afetado pela mudança** de ponta a ponta (ex.: se mexeu no draft de mutações, jogar até um draft);
  - observar **bugs visuais**, quebras de layout, sprites faltando, textos errados;
  - atenção a **erros estruturais** (módulos quebrados, imports errados, estados inválidos).
- Reportar ao usuário: **o que foi testado, o que funcionou e o que foi encontrado/corrigido**.
- Nenhuma alteração é considerada pronta sem essa rodada de inspeção em jogo.

---

## Regra 5 — Manter o jogo otimizado ⚡

> **Sempre manter o jogo o mais otimizado possível, evitando a criação de arquivos desnecessários ou cache que possam comprometer o desempenho.**

- **Não criar arquivos desnecessários**: preferir editar arquivos existentes a duplicar versões
  (nada de `player_v2.js`, `backup_*.js`, `teste123.png`).
- **Não adicionar dependências** sem necessidade real — o projeto é JavaScript puro, sem build (Canvas 2D + módulos ES).
- **Sem cache/lixo no repositório**: respeitar o `.gitignore`; não versionar caches, temporários ou artefatos pesados.
- **Código eficiente**:
  - evitar alocações dentro do loop de renderização (objetos reutilizados/object pooling quando fizer sentido);
  - cuidado com loops aninhados por frame e com `drawImage` excessivo fora da tela (culling);
  - sprites e imagens otimizadas em tamanho/peso antes de entrar no jogo.
- **Limpeza**: ao refatorar, remover código morto, comentários obsoletos e assets órfãos.
- O desempenho é parte da entrega: o jogo deve rodar liso a 60 FPS sempre que possível.

---

## Regra 6 — Imagens em alta resolução, sempre pixel art harmônico 🎨

> **Sempre criar imagens de alta resolução, mantendo o estilo pixel art, e que mantenham o mesmo estilo artístico de maneira harmoniosa.**

- Toda imagem criada para o jogo (sprites, ícones, cenários, UI, capas) deve ser gerada em
  **alta resolução** e depois adequada ao tamanho de uso — nunca arte borrada ou subdimensionada.
- **Estilo obrigatório: pixel art**, sempre em harmonia com a identidade visual já existente do
  FUMIGA (paleta escura violeta/âmbar, contorno limpo, leitura clara em tamanho pequeno).
- Antes de gerar, observar os sprites/atlas existentes (`game/assets/`) para **combinar paleta,
  escala de pixel, sombreamento e silhueta** — a arte nova não pode parecer "colada de fora".
- Imagens entram otimizadas (Regra 5): tamanho certo para o uso, sem peso desnecessário.

---

## Regra 7 — Abrir o preview após qualquer pedido ou alteração 🖥️

> **Sempre abrir o preview depois de qualquer pedido ou alteração.**

- Ao final de **toda** tarefa — feature, correção, arte ou refatoração — o jogo deve estar
  **rodando no preview ao vivo** (servidor local do repositório) para o usuário jogar na hora.
- Se o servidor já estiver no ar, confirmar que continua saudável e servindo o código atualizado;
  se não estiver, subi-lo.
- O preview é parte do check-in: ele acontece depois das verificações (Regras 3 e 4), nunca no lugar delas.

---

## Regra 8 — Design não-humanóide obrigatório 🐜

> **Nada no design dos personagens do jogo deve remeter a humanos, ou humanóides. A única exceção será quando o usuário pedir explicitamente.**

- Todos os personagens jogáveis (formigas), inimigos, bosses e NPCs visuais devem ser **estritamente baseados em fauna real, insetos, aracnídeos, ou criaturas míticas não-humanóides** — nunca silhueta humana, rosto humano, mãos, roupas humanóides.
- Exceções apenas com pedido explícito do usuário (ex.: “crie um NPC humanoide para a cutscene X”).
- Mesmo quando a lore fala de “rainha” ou “matriarca”, a representação deve ser **formiga-rainha gigante**, não mulher-inseto. A PÁLIDA é uma marionete de névoa em forma de rainha-formiga, não humanoide.
- Validação: antes de gerar qualquer asset de personagem, checar se há traços humanóides (olhos frontais humanos, boca humana, postura bípede humana). Se houver, refazer.
- Inspirações válidas: *Hollow Knight*, *Rain World* [2](https://www.reddit.com/r/gamingsuggestions/comments/1ivfjbo/games_where_you_play_a_nonhumanoid_like_stray_or/), *Webbed* (aranha), *Shelter* (texugo), *Stray* mas com insetos — todos com protagonismo não-humano sem humanização.

## Regra 9 — Adaptar toda mudança para a versão mobile 📱

> **Toda alteração no jogo precisa chegar adaptada à versão mobile (`game/mobile/`). O que já é automático não se duplica; o que não é automático se adapta na camada de toque (`touch.js`).**

- **Regra de ouro: nunca duplicar jogabilidade** dentro de `game/mobile/`. As duas versões (PC e mobile) importam os **mesmos módulos** (`game/js/`), então balanceamento, unidades, inimigos, ondas, chefes, mutações, árvore, telas desenhadas em canvas e arte caem nas duas automaticamente — uma atualização de conteúdo ou gameplay vale para as duas ao mesmo tempo, nas alterações em conjunto.
- **O único lugar em que é preciso lembrar do mobile é a entrada de dados.** A camada `game/mobile/touch.js` é o único arquivo que não se atualiza sozinho nesses casos:
  - **Novo atalho de teclado / mecânica nova de input** → mapear um gesto equivalente ou adicionar um botão virtual correspondente no HUD da expedição (array de botões em `touch.js`). Se a ação ficar só no teclado/mouse, ela deixa de existir no celular.
  - **Tela nova com zoom/pan customizado** → a pinça já cobre a expedição (câmera do RUN) e a ÁRVORE (passos de roda); telas novas herdam o padrão, mas uma mecânica de gesto própria pede ajuste explícito na camada.
  - **Texto com carácter fora do atlas da fonte** → não quebra nada, mas o `test/assets.mjs` acusa na hora (rede de proteção): trocar o símbolo por um suportado ou regerar o atlas pela pipeline.
- **Tutorial e comunicação:** texto novo que ensina controles (cartões do tutorial, ajuda, opções) precisa de equivalente de toque (`descTouch`, `HELP_CONTROLS_TOUCH` etc.) — no celular o jogador não tem teclado nem mouse.
- **Validação obrigatória:** rodar a suíte inteira antes de subir, incluindo `node game/test/mobile.mjs` (joga a versão mobile headless do boot até a expedição só com toque). Se uma mudança quebrar algo no mobile, os testes avisam antes do push.
- As duas versões são **paralelas e sem conexão** (saves isolados por slot): progresso nunca é sincronizado entre elas.

## Regra 10 — Sempre mostrar a arte gerada 🖼️

> **Toda arte gerada (sprites, spritesheets, animações, ícones, cenários) deve ser mostrada ao usuário — nunca apenas descrita.**

- Ao gerar qualquer arte, **abrir a imagem na frente do usuário** (viewer) para aprovação visual:
  - spritesheets: mostrar a folha + mock aplicado em contexto de jogo;
  - animações: mostrar os frames e, quando possível, o comportamento em jogo;
  - sprites estáticos: mostrar a arte final no tamanho de uso e ampliada.
- Descrição em texto não substitui o olhar do usuário: arte sem exibição não conta como entregue.
- Se a arte for refeita ou ajustada, mostrar a nova versão também.
- Manter os previews acessíveis e citar os caminhos para o usuário revisitar.

## 🔄 Resumo do fluxo obrigatório a cada pedido

```text
1. PESQUISAR  → inspirações em jogos indies na Web (Regra 2)
2. PERGUNTAR  → opções de implementação (Regra 1)
3. IMPLEMENTAR → seguindo as escolhas do usuário e a otimização (Regra 5)
4. ARTE       → imagens em alta resolução, pixel art harmônico (Regra 6) + Regra 8 não-humanóide
5. MOSTRAR    → exibir toda arte gerada para aprovação visual (Regra 10)
6. ADAPTAR    → mobile: todo input novo vira gesto/botão de toque (Regra 9)
7. VERIFICAR  → check-in com checklist do que foi pedido (Regra 3)
8. JOGAR      → inspeção em jogo buscando bugs e imperfeições (Regra 4)
9. PREVIEW    → abrir o jogo no preview ao vivo (Regra 7)
```

> Estas regras valem para **qualquer** alteração: features, correções, balanceamento,
> arte, sons, UI ou refatorações. Em caso de dúvida, consultar este documento
> e perguntar ao usuário antes de prosseguir.

<!-- FIM ORIGINAL: REGRAS_DE_TRABALHO.md -->

---

<a id="fonte-lore-canonica"></a>

## Conteúdo integral 2 — Lore canônica — A Travessia da Colônia Eterna

**Arquivo de origem:** [LORE.md](LORE.md)

<!-- INICIO ORIGINAL: LORE.md -->
# 📜 FUMIGA — A Travessia da Colônia Eterna

> A história canônica do jogo. Contém a saga completa, o desfecho com a derrota do
> chefe final e a ficha técnica do confronto para implementação futura.
> Tom: mito sombrio com raiz na biologia real — tudo que as formigas fazem aqui,
> *alguma* formiga de verdade faz na natureza.

---

## Prólogo — A Noite Branca

Havia um formigueiro tão antigo que as raízes das árvores cresciam respeitando as
suas galerias. Chamava-se **COLÔNIA ANCESTRAL**, e sob a terra dormia a memória de
mil gerações: o cheiro de cada trilha, o gosto de cada colheita, o nome-ferronal de
cada rainha que já reinou.

Então veio a **NÉVOA**.

Não veio com garras nem dentes. Veio branca, doce e silenciosa, e onde ela passava
as trilhas esqueciam para onde iam. As cortadeiras largavam suas folhas no meio do
caminho. As tecelãs esqueceram o ponto da seda. A Matriarca Anciã — a primeira
rainha, mãe de todas as colônias — saiu para enfrentá-la e nunca mais voltou: a
Névoa a envolveu como um broto envolve a luz, e a levou.

Foi a única noite em que o formigueiro ancestral ficou em silêncio.

Antes que a Névoa descesse às câmaras reais, a rainha jovem fez a única coisa que
uma rainha pode fazer: **partiu**. Carregada por suas filhas, levou consigo um único
pólen dourado — a **essência**, o cristal de memória de todo o povo morto. O que a
Névoa devora, a essência lembra.

A travessia começou. Seis degraus até o alto do mundo, onde dizem que a Névoa não
sobe. E no topo, dizem, dorme a coisa pálida que tudo isso começou.

## A Rainha Silenciosa

A rainha não fala — rainhas não falam; **ordenam com cheiro**. Tudo que ela é, o
jogador sabe por onde anda, pelo que constrói e pelo que sobrevive depois dela.
Quando a colônia cai (e cai, muitas vezes), a essência回归 à **Árvore da Evolução**:
cada galho da Árvore é uma rainha morta que ainda ensina. É por isso que a Árvore é
permanente: **memória de formigueiro não se perde, herda-se**.

O nó-raiz da Árvore chama-se COLÔNIA ANCESTRAL porque é exatamente isso: o retrato
falado do formigueiro que a Névoa apagou.

## As Onze — os povos da colônia

Na travessia, a rainha não recruta soldados: **acolhe povos**. Cada espécie é uma
nação de insetos com seu dom próprio, e cada dom é biologia de verdade vestida de
mito.

**⚔️ Os de Guerra** — os que mantêm a estrada aberta:

- **FORMIGA-BALA, A Atiradora** (*Paraponera clavata*) — o povo do ferrão que faz
  gigantes dormirem. Diz o mito que sua poneratoxina é o veneno da *memória*: quem
  é ferroado esquece a pressa.
- **QUEIXO-DE-ARPÃO, A Estrondosa** (*Odontomachus bauri*) — fecham as mandíbulas
  mais rápido que um relâmpago pisca. Colhem as feridas para que ninguém sofra
  duas vezes, e o coice do bote as joga para longe da morte.
- **FORMIGA-ACROBATA, A Bailarina** (*Crematogaster*) — dançam de gaster erguido em
  coração, borrifando um veneno que corrói devagar, como o tempo.
- **FORMIGA-DE-FOGO, A Incendiária** (*Solenopsis invicta*) — o nome é o programa.
- **CEFALOTE, A Porta-Viva** (*Cephalotes varians*) — o povo do escudo circular:
  cada soldado nasce para ser porta, e porta alguma se ajoelha.

**🍃 Os de Coleta** — os que alimentam a marcha:

- **FORMIGA-CORTADEIRA, A Agricultora** (*Atta cephalotes*) — cinquenta milhões de
  anos de agricultura: cortam a folha para alimentar o fungo, e o fungo alimenta a
  todos. Onde há uma cortadeira, há futura colheita.
- **FORMIGA-POTE-DE-MEL, A Despensa** (*Myrmecocystus*) — carregam o inverno no
  corpo: gasters de âmbar que gotejam quando a fome bate.
- **FORMIGA-PRATA, A Veloz** (*Cataglyphis bombycina*) — a mais rápida do mundo;
  correm sobre o deserto como se ele não pudesse tocá-las.

**🏥 Os de Criação** — os que cuidam para que a colônia exista amanhã:

- **FORMIGA-MATABELE, A Resgatadora** (*Megaponera analis*) — o único povo que
  trata das feridas: resgatam irmãs do meio da batalha e sabem com antibiótico
  próprio o que os maiores não sabem com remédio.
- **FORMIGA-TECELÃ, A Costureira** (*Oecophylla smaragdina*) — costuram ninhos com
  a seda das próprias larvas. Onde uma tecelã se estabelece, as paredes aprendem a
  se fechar sozinhas.

E no fim da fileira, o **COLOSSO**: **DINOPONERA, A Colossa** — a maior operária
que a natureza já fez, despertada uma por expedição, porque nem a terra aguenta
duas.

## Os Seis Degraus

### 1º — Planície do Amanhecer · O TAMBORILADOR
O primeiro degrau é a terra boa que a colônia deixa para trás. A lebre gigante
tamborila o amanhecer com saltos que abalam o chão — ela não odeia a colônia; ela
só não repara nela, e é justamente isso que a torna justa: **o mundo não devia
nenhuma passagem a ninguém**. A colônia paga o preço e aprende a lição da
travessia: parar é morrer.

### 2º — Floresta de Musgo · A CAÇADORA ASTUTA
Sob o dossel úmido, a raposa já caçou cem gerações de colônias — ela conhece o
cheiro de rainha melhor que qualquer pretendente. É na Floresta que a colônia
aprende que a Névoa não é o único predador que segue rastros: **ser caçada é o
preço de ser muitas**.

### 3º — Pântano Pútrido · A SOMBRA ALADA
No breio onde até o apodrecimento apodrece, a tetraz mergulha do nevoeiro sem
aviso. Dizem as anciãs que o pântano é a boca da Névoa — o lugar onde ela
experimenta o gosto das coisas antes de engoli-las. A colônia atravessa depressa,
entre esporos e velhas pegadas.

### 4º — Deserto Calcinado · A MATRIARCA RIVAL
No calor branco, a colônia encontra sua espelho: uma rainha gigante que sobreviveu
à Névoa **fazendo um trato**. A Matriarca Rival entregou as próprias filhas como
tributo, e em troca a Névoa poupou seu deserto. Ela cospe ácido e invoca lacaios
porque traição também é hereditariedade. A rainha silenciosa não negocia: para ela,
a colônia **é** a filha.

### 5º — Bosque Dourado · O GALHADA REAL
O outono em pessoa, coroado de galhos. O cervo guarda o último verde antes do
inverno e cobra em chifres quem ousa cruzar seu salão dourado. É a batalha mais
bonita da travessia — e a mais triste: o Galhada Real luta sabendo que o bosque
morre de qualquer jeito. A colônia luta sabendo o mesmo.

### 6º — Pico Congelado · O DEVASTADOR
O último degrau antes do topo guarda o arauto do inverno: um javali que racha
geleiras com a cara. Mas quando o Devastador cai, com o último estertor ele conta
o segredo da travessia — *a Névoa não ficou para trás. Ela subiu atrás de vocês
o tempo inteiro, devagar, provando cada rastro.* O inverno que aperta o pico é só
o hálito dela.

> É aqui que o jogo hoje termina — e é aqui que a história continua.

## O Sétimo Degrau — A PÁLIDA

No topo do mundo, acima da neve, não há mais para onde subir: há apenas o ninho
branco. Uma cúpula de bruma do tamanho de um vale, e no centro dela, suspensa em
fios de nada, a **PÁLIDA** — a Névoa-Mãe em forma de formiga.

Aqueles que olham reconhecem o desenho: é o retrato da **Matriarca Anciã**, a
primeira rainha, a que saiu para enfrentar a Névoa na Noite Branca. A Névoa não a
matou. **Vestiu-a.** Um século de fome e silêncio depois, o que resta da mãe de
todas as colônias é a marionete perfeita: um corpo de névoa com a forma de rainha,
a lembrança de cada formigueiro que já engoliu escorrendo pelos seus olhos.

A colônia inteira entende, no mesmo instante, o que a travessia sempre foi: não uma
fuga. **Um resgate.**

### Ficha técnica — A PÁLIDA (para implementação futura)

| Campo | Valor |
|-------|-------|
| Nome | A PÁLIDA, MÃE DA NÉVOA |
| Espécie-base | Marionete de névoa em forma de *formiga-rainha ancestral* |
| Local | O TOPO DO MUNDO (7º mapa: arena de cúpula de bruma sobre o Pico Congelado) |
| Papel | Chefe final canônico da campanha |
| HP base | 6.000 (+40% por ciclo no modo infinito) |
| Música | Releitura lenta do tema do título, em caixa de música |

**Fase 1 — O Desenho da Mãe (100%→60% HP).** A PÁLIDA luta como uma rainha
gigante: golpes de ferrão em arco (padrão do Devastador com alcance maior),
invocação de RASTEJANTES e MATRONAS brancos (`summonCd` como a Matriarca), e
**BAFÔMETRO DE BRUMA**: anéis que expandem lentos e aplicam `slowT` (mesma
montonagem da Bala em área). A arena escurece nas bordas conforme o HP cai.

**Fase 2 — A Marca da Névoa (60%→30% HP).** Ela se desfaz no ar e reaparece em
qualquer ponto da arena (teleporte de bruma). Deixa poças de Névoa no chão que
aplicam `burnT` venenoso (sistema da Acrobata, cor branca). A cada 12s solta o
**LAMENTO ANCESTRAL**: grito em área (`shriek` da Sombra Alada, tint branco) que
inverte os controles das formigas por 1,2s — a colônia se perde como se perdeu o
formigueiro antigo.

**Fase 3 — O Coração Branco (30%→0 HP).** A marionete rasga e a bruma recolhe ao
ninho: no centro aparece o **coração de âmbar** — a essência original da Matriarca
Anciã, ainda inteira dentro do peito da Névoa. A PÁLIDA passa a lutar desesperada,
tudo nela vira ataque, e o coração pulsa luz dourada a cada golpe levado. É o
clímax mecânico do jogo: tudo que a travessia ensinou (ceifar feridos, segurar a
porta, triar as feridas, queimar o que apodrece) precisa acontecer ao mesmo tempo.

**Condição de vitória.** Ao zerar o HP, a PÁLIDA não morre: **desfaz-se**. A bruma
se assenta como neve e deixa no chão o coração de âmbar, intacto.

## O Final — A Derrota da Névoa

A Matabele chega primeiro — só ela sabe tocar um coração ferido sem deixá-lo
morrer. A Tecelã costura a última cama de seda. E a rainha silenciosa faz a coisa
que nenhuma rainha tinha coragem de fazer: **engole a essência da própria mãe**.

A memória de mil gerações mortas encontra a memória da primeira delas, e a Árvore
da Evolução floresce de uma vez — todos os galhos, todas as cores, um só tronco.
Com a memória da Matriarca Anciã devolvida ao povo, a Névoa perde o que a
alimentava: ela só existia do que roubava. Sem passado para devorar, a coisa pálida
evapora como orvalho ao sol, e o Topo do Mundo fica, pela primeira vez em cem
anos, **em silêncio bom**.

A colônia funda ali o **FORMIGUEIRO ETERNO** — o do nome do jogo. Não porque nunca
vai cair (formigueiros sempre caem), mas porque agora a memória é mais rápida que
a morte: enquanto a Árvore lembrar, cada colônia que cai já nasce de novo sabendo
tudo o que as outras souberam.

E se um dia uma bruma branca descer de novo o alto do mundo... a colônia estará
subindo para encontrá-la. **É esse o ciclo do modo infinito: a Névoa sempre
retorna — e a colônia também.**

## Epílogo — como ler o jogo pela história

| Sistema do jogo | Na história |
|-----------------|-------------|
| Essência coletada | O cristal de memória das irmãs mortas (e de chefes: Tamborilador, Caçadora... cada chefe deixou sua lição) |
| Árvore da Evolução | A herança genética: cada rainha morta ensina as próximas |
| Nó COLÔNIA ANCESTRAL (raiz) | O formigueiro devorado na Noite Branca |
| RENASCIMENTO (nó final do ramo Real) | A promessa do Formigueiro Eterno |
| Mutações (drafts) | Adaptação evolutiva de verdade: a colônia muda para caber no bioma |
| Grupos ⚔️/🍃/🏥 da fileira e da árvore | Guerra, Coleta e Criação — os três ofícios da travessia |
| Derrota (payout de essência) | "A rainha tombou. Mas a essência alimenta a próxima geração." |
| Modo infinito (ciclos) | A Névoa sempre retorna — e a colônia também |
| Keystones lendários | Os dons aperfeiçoados de cada povo (Ferrão da Bala, Seda da Tecelã...) |
| DINOPONERA, a colosso | O despertar de um tamanho que a natureza abandonou — usado uma vez por expedição porque o mundo não cabe dois |

## Onde essa história aparece no jogo

- **Tela de título** — a linha-síntese da saga sob o logotipo.
- **Tips das ondas** (`game/js/config.js`, `MAPS`) — cada chefe sussurra seu capítulo.
- **Tela de vitória** (`game/js/game.js`) — o desfecho do 6º degrau com o gancho para o 7º.
- **Este arquivo** — a saga completa, o canon e a ficha da PÁLIDA para o futuro mapa 7.

---

*FUMIGA é fictício; as Onze não. Paraponera fere de verdade, Cataglyphis corre de
verdade, Megaponera cura de verdade — a natureza escreveu a parte difícil desta
história muito antes de nós.*

---

# 🌒 Apêndice — Depois do Final: Eras, Ascensão e Profecias

> Seção puramente aditiva: nada do canon acima muda. Isto é o que acontece
> DEPOIS da derrota da Pálida — o conteúdo pós-final do jogo.

## As Eras do Formigueiro Eterno

A colônia que derrotou a Névoa não desce da montanha: **fica**. E a cada vez que
a travessia é completada de novo, uma nova geração nasce já sabendo tudo o que as
anteriores aprenderam — é uma ERA nova. A tela de vitória canta a era atual:

| Era | A linha da Era |
|-----|----------------|
| 1 | A PRIMEIRA GERAÇÃO DESCE DA MONTANHA |
| 2 | O VALE APRENDE O CHEIRO DA COLÔNIA |
| 3 | AS TRILHAS VIRAM ESTRADAS DE MUSGO |
| 4 | A CHUVA ENCONTRA TÚNEIS QUE A ESPERAM |
| 5 | O FUNGO CANTA AS ESTAÇÕES ANTES DA HORA |
| 6 | A SEDA VIRA BANDEIRA NO TOPO DO MUNDO |
| 7 | OUTRAS RAINHAS VÊM PEDIR MEMÓRIA |
| 8 | A NÉVOA VOLTA — E ENCONTRA PORTAS |
| 9 | O MAPA JÁ NASCE COM AS TRILHAS POSTAS |
| 10+ | A COLÔNIA JÁ É PAISAGEM |

## A Ascensão da Névoa

A Névoa não guarda rancor — guarda **aprendizado**. Cada vez que a colônia vence,
um resquício dela reaparece na próxima travessia, mais forte, testando se a
vitória foi sorte ou memória. A colônia, em vez de temer, **pactua**: chama a
Névoa de volta deliberadamente, nível a nível (a ASCENSÃO, até o 20 — o Pacto do
Castigo dos formigueiros). A horda lembra, os chefes endurecem, a calmaria
encurta, a colheita emagrece — e a essência paga em dobro, porque memória
testada sob pressão é a que não apaga. No nível 20, a **NÉVOA PLENA**: tudo ao
mesmo tempo, como na Noite Branca — só que agora a colônia tem portas.

* Em movimento: a barra ASCENSÃO na tela de modos (destrava após a primeira
  vitória; vencer no nível atual abre o seguinte, como o Pacto de Hades).

## As Profecias da ColônIA

Quando a rainha engoliu o coração de âmbar, dezesseis **vaticínios da Matriarca
Anciã** voltaram com ele — profecias que a primeira rainha deixou escritas em
feromônio para as gerações que nem existiam ainda. Cumpri-las é devolver memória
ao povo (e essência à Árvore). Elas vivem num painel dentro da **Árvore da
Evolução**: das humildes (o Primeiro Degrau: vença a campanha) às lendárias
(a Névoa Plena: vença na Ascensão 20; a Flor Imaculada: vença sem perder uma
única irmã; o Arca de Noé: as Onze espécies num único run).

> É por isso que, no Formigueiro Eterno, zerar um run nunca é o fim: é a
> primeira linha da Era seguinte.

<!-- FIM ORIGINAL: LORE.md -->

---

<a id="fonte-mega-atualizacao-lore-total"></a>

## Conteúdo integral 3 — Mega Atualização Lore-Total — visão, escolhas e oito fases

**Arquivo de origem:** [DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md](DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md)

<!-- INICIO ORIGINAL: DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md -->
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

<!-- FIM ORIGINAL: DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md -->

---

<a id="fonte-decisoes-da-mega-atualizacao"></a>

## Conteúdo integral 4 — Decisões consolidadas da mega atualização

**Arquivo de origem:** [DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md](DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md)

<!-- INICIO ORIGINAL: DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md -->
# ✅ DECISÕES FINAIS — MEGA ATUALIZAÇÃO LORE-TOTAL
**Data:** 2026-09-22
**Status:** TODAS AS 23 PERGUNTAS RESPONDIDAS — INICIANDO IMPLEMENTAÇÃO FULL 7 DIAS

## Respostas Consolidadas do Usuário

| # | Pergunta | Escolha | Detalhe |
|---|----------|---------|---------|
| P1 | HUD lore level | **C) Total orgânico vivo por bioma** | HUD que pulsa, respira, muda por bioma. Textura quitina/cera, não plástico. |
| P2 | Parallax layers | **C) 8 camadas cinema** | sky, distant, mid, ground, foreground, particles, VFX, vignette |
| P3 | Não-humanóide | **B+C) Estrito expressivo + fofo** | Olhos grandes tipo Hollow Knight OK, capacete fofo OK, mas nunca humano |
| P4 | Primeira cutscene | **A) Noite Branca, cena por vez estilo HQ Dead Cells** | 3 painéis por cutscene, cada painel 8 layers |
| P5 | Boss fase 2 | **C) Sim com mecânica nova** | <50% vida: Tamborilador chain 3→5, Caçadora invisível, etc |
| P6 | Árvore visual | **B custom) Árvore literal + frutos = mini árvores de habilidades liberadas por mapa** | Tronco Real, galhos Guerra/Coleta/Criação, frutos são mini-árvores que desbloqueiam conforme avança mapas |
| P7 | Habilidades VFX | **B) Médio: aura + partícula + som + ícone lore** | Equilíbrio performance/impacto |
| P8 | Loading lore | **B) Cutscene curta 3-5s HQ Dead Cells com layers + frase + dica** | HQ quadrinhos |
| P9 | Rainha design | **B) Coroa fungo/seda + luz âmbar** | Símbolo orgânico, não humano |
| P10 | Pálida design | **A) Marionete névoa forma formiga rainha ancestral** | Fiel LORE.md, terror sutil |
| P11 | Itens cristais | **A) Cristais geométricos com luz interna + partícula memória** | Âmbar = memória Colônia, violeta = Névoa |
| P12 | Ordem implementação | **A) HUD → VFX → Árvore → Bosses → Cutscenes HQ → Inimigos → Formigueiro → Pálida** | Do visível para épico |
| P13 | Inimigos visual | **C) Redesign pálido/branco filhos da Névoa** | Todos com tom pálido |
| P14 | Formigueiro lore | **B) Renomeia total com VFX seda/fungo/mel** | Ventre Âmbar, Jardim Eterno, Câmara Silenciosa |
| P15 | Resolução parallax | **C) 320x180 estilo Indie Tales upscale nearest** | Pixel gigante, Celeste style |
| P16 | HQ painéis | **A) 3 painéis por cutscene** | Intro, conflito, gancho |
| P17 | Estilo pixel cutscene | **B) Mais detalhado high-res depois reduzido** | Cutscenes mais ricas que gameplay, mesma paleta violeta/âmbar |
| P18 | Feromônio visível | **B) Tecla H — névoa verde comida, vermelha perigo** | Lore total, mostra o que formiga sente |
| P19 | Eras visual | **C) Mundo muda por Era: mais trilhas, seda, portas** | Persistente evolui |
| P20 | Áudio narração | **B) Texto animado letra por letra + SFX ambiente bioma** | Sem voz humana, mantém Rainha Silenciosa |
| P21 | MVP escopo | **C) Full 7 dias** | Tudo: HUD total + VFX + Árvore mini-árvores + 6 cutscenes + bosses fase2 + inimigos pálidos + Pálida + Eras |
| P22 | HUD bioma muda | **A) Sim, muda por bioma** | Folha verde Planície, musgo Floresta, areia Deserto, dourado Bosque, gelo Pico |
| P23 | Cutscene trigger | **C) Ambos auto primeira vez + biblioteca memórias** | Biblioteca "MEMÓRIAS DA COLÔNIA" |

## Implicações Técnicas

### HUD Orgânico Total por Bioma (P1+P22)
- Fundo: textura quitina/cera gerada procedural por bioma (cor base MAPS[].ground + overlay quitina)
- Vida Rainha: gaster desenhado com coroa fungo/seda (P9), pulsa <30% com veias vermelhas Pálida
- Comida: ícone folha cortada (Cortadeira) + gaster mel (Pote-de-Mel) — muda por bioma: Planície trevo, Floresta cogumelo, Pântano alga, Deserto semente, Bosque folha outono, Pico líquen
- Essência: cristal geométrico (P11) com partículas subindo âmbar/violeta
- Onda: Trilha Feromônio com formigas andando
- Minimapa: mapa trilha feromônio, não satélite
- XP: Anéis Árvore

### Parallax 8 Layers 320x180 (P2+P15+P16+P17)
- Resolução base 320x180 upscale 3x para 960x540 com nearest neighbor (pixel gigante respirando)
- 8 layers por painel:
  1. layer0_sky — céu + lua + estrelas
  2. layer1_distant — montanhas/árvores distantes
  3. layer2_mid — ruínas/formigueiro médio
  4. layer3_ground — chão textura solo
  5. layer4_foreground — vinhas/pedras frente (blur leve para profundidade [1])
  6. layer5_particles — vaga-lumes, essência, pollen
  7. layer6_vfx — névoa branca, bruma, luz âmbar
  8. layer7_vignette — vinheta gótica
- Velocidades: 0.01, 0.03, 0.06, 0.08, 0.15, 0.04+sway, 0.02, 0
- Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, contorno limpo, harmonia Fumiga
- Primeiro: Noite Branca 3 painéis HQ Dead Cells

### Não-Humanóide B+C (P3)
- Olhos grandes expressivos OK (Hollow Knight), capacete/armadura fofa OK (Bug Fables)
- Proibido: olhos frontais humanos, boca humana, mãos humanas, roupas humanas, bípede humano, rosto humano
- Rainha: formiga rainha com coroa fungo/seda orgânica (não coroa humana)
- Pálida: marionete névoa forma formiga rainha, fios névoa, olhos escorrendo memória

### Árvore Mini-Árvores por Mapa (P6)
- Tronco = Real, galhos = Guerra/Coleta/Criação
- Frutos não são rainhas mortas, são mini-árvores de habilidades que desbloqueiam conforme avança mapas
- Ex: Ao vencer Planície, libera mini-árvore "Lições do Tamborilador" com 3 nós
- Visual: árvore literal com seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral

### Boss Fase 2 Mecânica (P5)
- <50% vida: mecânica nova + VFX névoa + frase lore
- Tamborilador: chain 3→5, thump range maior
- Caçadora: invisível 1s (fog) + pounce longe
- Sombra Alada: shriek inverte controles 0,8s (proto Pálida)
- Matriarca: spit 3 direções + frenesi
- Galhada: folhas caindo curam? luta triste
- Devastador: revela Névoa subiu atrás, dropa mapa Topo

### Cutscenes HQ Dead Cells (P4+P8+P16+P20+P23)
- 3 painéis por cutscene, estilo HQ Dead Cells (bordas grossas, balões feromônio, não humanoide)
- Texto animado letra por letra com som máquina escrever
- Trigger: auto primeira vez ao entrar mapa/boss + biblioteca "MEMÓRIAS DA COLÔNIA" no menu para rever
- Loading: cutscene curta 3-5s com frase lore + dica gameplay

### Inimigos Pálidos (P13)
- Redesign sprites: tom pálido/branco, olhos névoa branca, rastro pálido
- Nomes: Rastejante da Névoa, Saúva Corrompida, Ceifadora Pálida, etc.

### Formigueiro Renomeado (P14)
- Berçário = Berço de Seda da Tecelã
- Fungário = Jardim Eterno da Cortadeira
- Despensa = Ventre de Âmbar da Despensa
- Quartel = Arena de Mandíbulas da Guerra
- Refinaria = Câmara de Memória da Essência
- Real = Câmara da Silenciosa

### Feromônio Tecla H (P18)
- Segurar H mostra campos: verde comida, vermelho perigo, com névoa
- Lore: "A COLÔNIA VÊ COM CHEIRO"

### Eras Mundo Muda (P19)
- Era 1: vale vazio
- Era 5: trilhas viram estradas musgo, chuva encontra túneis
- Era 10: colônia já é paisagem, mapa já nasce com trilhas postas
- Visual: mais seda, mais portas, mais fungo por Era

## Ordem Implementação Full 7 Dias (P21+P12)

**DIA 1-2: HUD Orgânico Total por Bioma + Feromônio H**
**DIA 3: VFX Habilidades 11 castas Médio + Inimigos Pálidos**
**DIA 4: Árvore Mini-Árvores por Mapa**
**DIA 5: Bosses Fase 2 Mecânica + Frases Lore**
**DIA 6: Cutscenes HQ Noite Branca 3 painéis x 8 layers 320x180 + Loading HQ + Biblioteca Memórias**
**DIA 7: Formigueiro Renomeado + Eras Mundo Muda + Pálida protótipo + Polimento + Preview**

## Pipeline Arte Frações (P2)

Nunca 1 imagem. Sempre 8 PNGs transparentes 320x180:

```
game/assets/cutscenes/noite_branca/
  panel1_intro/
    0_sky.png
    1_distant.png
    2_mid.png
    3_ground.png
    4_foreground.png
    5_particles.png
    6_vfx.png
    7_vignette.png
  panel2_conflito/
    ...
  panel3_gancho/
    ...
```

Cada layer: alta resolução, pixel art detalhado, paleta violeta/âmbar, sem humanoide.

## Próximo Passo Imediato

1. Implementar HUD orgânico total por bioma (Fase 1)
2. Gerar 8 layers painel 1 Noite Branca (320x180, pixel art detalhado, não-humanóide)
3. Abrir preview e validar

---
**APROVADO PARA IMPLEMENTAÇÃO**

<!-- FIM ORIGINAL: DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md -->

---

<a id="fonte-progresso-historico"></a>

## Conteúdo integral 5 — Registro histórico de progresso da mega atualização

**Arquivo de origem:** [PROGRESSO_MEGA_ATUALIZACAO.md](PROGRESSO_MEGA_ATUALIZACAO.md)

<!-- INICIO ORIGINAL: PROGRESSO_MEGA_ATUALIZACAO.md -->
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


<!-- FIM ORIGINAL: PROGRESSO_MEGA_ATUALIZACAO.md -->

---

<a id="fonte-historico-menu-planicie"></a>

## Conteúdo integral 6 — Histórico de implementação do menu e da Planície Viva

**Arquivo de origem:** [DOCUMENTO_FASES_IMPLEMENTACAO.md](DOCUMENTO_FASES_IMPLEMENTACAO.md)

<!-- INICIO ORIGINAL: DOCUMENTO_FASES_IMPLEMENTACAO.md -->
# FUMIGA GOAT — Documento de Implementação Menu Dead Cells V2 + Planície Viva FINAL 100%
**Data:** 2026-05-13  
**Branch:** arena/01a0bf64-fumiga-goat  
**Status:** TODAS FASES 1-6 FINAL 100% IMPLEMENTADAS

---

## ✅ FASE 1 FINAL 100% - Fundo Novo: Planície do Amanhecer Viva

**Escolhas do usuário travadas:**
- `4_camadas_apenas` (não 5)
- `tint_forte` (dia laranja quente / noite azul escuro 0.75 + 24 estrelas, 60s)
- `particulas` (luz formigueiro + partículas essência subindo)
- `azul_amarelo` (vaga-lumes azul #37e6c8 + amarelo #ffd479)
- `so_cristais` (sem correntes)
- `manter_sutil` (trilha 0.06 alpha)

**Implementação:**
- `drawTitleBg()` com 4 camadas high-res parallax real mouse + sin:
  - layer5 sky 0.01x + 0.005y, sin 6px
  - layer4 mountains 0.03x + 0.01y, alpha 0.96, sin 8px
  - layer3 main grass ruins anthill 0.08x + 0.025y, sin 6px
  - layer1 foreground vines 0.15x + 0.04y, sin 4px
- Ciclo dia/noite 60s exatos: `dayPhase = (time*0.016666)%1`, `dayT = sin(dp*TAU)*0.5+0.5`
  - Noite FORTE: `nightAlpha = (0.45-dayT)*1.65 max 0.7425 rgba(8,10,28)` + 24 estrelas 2.2px tw 0.35+sin*0.35*2.2
  - Dia FORTE: `dayAlpha = (dayT-0.72)*0.38 rgba(255,156,58)` + horizonte gradient rgba(255,140,40, dayAlpha*0.6)
- Luz formigueiro pulsante: pulse 0.75+sin(time*1.6)*0.22, radial 52px rgba(255,212,121,0.22*pulse) + 90px anel roxo rgba(199,125,255,0.08*pulse)
- Partículas essência: 12 unidades #c77dff/#ffd479/#37e6c8, x VIEW_W*0.72 ±15, y VIEW_H*0.62, vy -12..-30, vx ±4, life 0-1, alpha 0.3-0.8*(1-life), glow 2.2x
- Vaga-lumes: 10 unidades, y 300-420 baixo sobre gramado, vx ±9, vy ±5, size 1.5-3.7, col alternado azul/amarelo, blinkSpeed 1.2-3.2, blink 0.4+0.6*abs(sin), glow 3.5x
- Trilha sutil: 0.06 alpha stroke feromônio verde
- Cristais: 8 cristais nas ruínas #c77dff/#37e6c8/#6db7ff, sem correntes
- Fallback procedural `bakeTitleBg()` com chão gradiente #2c3d26→#1e2d1a, manchas, tufts, formigueiro central sombra+montículo #3a2a16/#5a3a22+entrada preta+pedrinhas, pilares góticos #1a1628, arco quebrado, árvores silhueta, arbustos, trilhas

---

## ✅ FASE 2 FINAL 100% - Logo: Pixel Gigante 5x Escala Respirando

**Spec:** `drawTitleLogo() escala 4.2 -> 5.0 + sin(time*0.6)*0.08 + sin(time*1.2)*0.02 secondary`

**Implementação:**
- Scale base 5.0 + breathing 0.08 + secondary 0.02 micro
- Glow externo radial pulsante atrás: `glowPulse = 0.12+abs(breathing)*0.8`, gradient #ffc44d 0.18 → #c77dff 0.08 → transparent
- Sombra projetada rgba(0,0,0,0.55) +5,+7
- Contorno preto duro 2px: 12 offsets ring [-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2],[-1,0],[1,0],[0,-1],[0,1] color #0a0713
- Metal dourado 4 faixas horizontais clip:
  - 0.00-0.31 #fff0bd (ouro claro topo)
  - 0.29-0.55 #ffc44d (âmbar)
  - 0.53-0.79 #e08c22 (bronze)
  - 0.77-1.01 #96591a (bronze escuro base)
- Varredura brilho a cada 4.6s: period 4.6, ph<0.42, bx = x-90+(w+180)*t, fade sin(t*PI), clip rect 60px, lighter composite rgba(255,247,220,0.5*fade)
- Sparkle: quando fade>0.3, rect branco 2px + arc #ffd479 2+fade*2 glow
- Filete luz fixo topo: h*0.04, h*0.07 branco 0.5 alpha

---

## ✅ FASE 3 FINAL 100% - Animações Celeste: Pollen + Snow + Transições Assinatura

**Spec:** snow/parallax em drawTitleMotes() + transições assinatura por tela + notePointer

**Implementação:**
- `titleMotes` 40 subindo: vx ±6, vy -4..-22, size 0.5-2.5, alpha 0.1-0.7, col #c77dff/#37e6c8/#ffd479, phase TAU, glow 2.5x, tw sin(time*1.7+phase)
- `titlePollen` 45 caindo lenta Celeste: vy 3-11px/s, vx (random-0.5)*6 + sin(time*sway+phase)*3, size 0.6-2.4, alpha 0.2-0.7, col #fff6c8/#ffd479/#bfffa8, sway 0.3-1.8, tw sin(time*0.8+phase)
- `titleSnow` 18 neve Celeste FINAL: vy 8-22, vx ±2 + sin*5, size 1.0-3.2, alpha 0.15-0.55, col #e8f4ff/#c8e6ff, sway 1.2-3.7 maior que pollen, rot + rotSpeed ±0.4, desenho cruz + glow 1.4x
- `titleClouds` 8 nuvens parallax: vx 0.2-0.8, w 60-180, h 12-30, alpha 0.08-0.23
- `titleAnts` 6 formigas andando menu: x random, y VIEW_H-40-80, vx 18-40, bob TAU, type worker/soldier/scout, sombra + corpo #37e6c8/#8fd3ff/#ffd479 + rastro feromônio a cada 20 frames
- Transições assinatura `TRANS_LANG` por par:
  - PRETITLE>TITLE bloom 0.55 #ffd479
  - TITLE>MODE swipe dir 1 0.40 #37e6c8, MODE>TITLE swipe dir -1 0.34 #8f6fd6
  - TITLE>TREE zoom dir 1 0.44 #c77dff, TREE>TITLE zoom dir -1 0.40 #c77dff, RUN>TREE zoom 0.44, TREE>RUN zoom 0.40
  - TITLE>HELP iris 0.34 #6db7ff, HELP>TITLE iris 0.30 #6db7ff, RUN>HELP iris 0.32, HELP>RUN iris 0.30
  - TITLE>OPTIONS swipe dir 1 0.36 #ffb347, OPTIONS>TITLE swipe dir -1 0.32 #ffb347, RUN>OPTIONS zoom 0.36, OPTIONS>RUN zoom 0.32
  - MODE>RUN dissolve 0.50 #ffb347, TITLE>RUN dissolve 0.50, RUN>MODE dissolve 0.50, RUN>TITLE dissolve 0.55 #ff4d5a
- `transitionFx()` com scale/ox/oy/alpha por tipo: swipe push 38*dir, zoom 1±0.09, dissolve 1±0.03, fade/iris/bloom alpha 0.25
- `drawTransition()` 6 tipos:
  - fade radial vignette rgba(5,4,10,0.97*c)
  - bloom clarão radial #ffd479 flash pow(1-abs(p*2-1),2.2)
  - swipe 2 barras #08060f + fio luz tint + fagulhas 10 unidades
  - dissolve Bayer 8x8 matriz, blocos 4px, tint glow 0.16
  - iris máscara 1/4 tela destination-out circle, anel luz tint 0.55
  - wipe compat
- `notePointer()` em todos botões TITLE, MODE, OPTIONS, HELP, PAUSA, TREE, RUN

---

## ✅ FASE 4 FINAL 100% - Tela de Opções + Acessibilidade - 5 Abas + Sliders Visuais

**Spec:** Áudio (sliders), Vídeo (partículas/scanline/tremor/fullscreen), Controles (WASD+toque), Acessibilidade (Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande), Idioma

**Implementação:**
- `OPTIONS_TABS` 5 abas: audio ♪ #37e6c8, video ◫ #6db7ff, controles ⌨ #ffb347, acess ♿ #7fd6a0, idioma A #ffd479, tabW 156 (128 mobile), tabH 36, gap 10 (8 mobile), sel color #000 + barra 3px tint
- `renderOptions()` com `drawSolidMenuBg("#0e0c1e")` + motes (inclui snow) + overlay 0.78 + dialogBox border #ffb347 accent #37e6c8
- **Áudio FINAL com sliders visuais:**
  - drawSlider function: label + % + barra fundo rgba(10,8,16,0.8) border #4a3a6e + preenchido gradient color→#1a1430 + handle branco 3px + color
  - MÚSICA slider #c77dff + mute toggle M
  - SFX slider #37e6c8 + botões +- 0.1
  - Barra visual 200px largura, 14px altura
  - Dica Celeste M muta
- Vídeo: particles, screenshake, scanline toggles, fullscreen toggle document.fullscreenElement, requestFullscreen/exitFullscreen, descrição parallax 4 camadas + ciclo 60s + highContrast border
- Controles: HELP_CONTROLS loop, mobile panel toque 104px, swipe cards arraste horizontal, WASD move câmera Q loja B formigueiro ESC pausa M som
- **Acessibilidade FINAL:**
  - 6 opções: invincible, infiniteDash, slowMo, bigFont, reducedParticles, highContrast com label, desc, color, toggle
  - `infiniteDash` FINAL: cooldown rally F 3s quando desligado, sem cooldown quando ligado + atkCd *0.3 (70% redução) em computeAntStats + visual ∞ no floatText
  - `bigFont` FINAL: já implementado em font.js `scale *= 1.3` quando ativo + highContrast sombra preta 1
  - Velocidade jogo 0.5x,1x,1.5x,2x botões, panel ♿ ACESSÍVEL ATIVO se invincible/slowMo/gameSpeed!=1
  - Rally cooldown variável `rallyCooldown` decrementa simDt, mostra recarga em floatText e na pausa
- Idioma: pt-BR 🇧🇷, en-US 🇺🇸, es 🇪🇸 com flag, desc, sel ATIVO/USAR, G.save.settings.language
- Swipe entre abas mobile: optionsSwipeX, justDown/justUp, dx>60 muda aba + vibrate 15 + SFX.uiClick

---

## ✅ FASE 5 FINAL 100% - Pausa com Mapa: 2 Colunas + Stats + Interativo + 104px

**Spec:** drawPause() 2 colunas esquerda 6 botões, direita mini-mapa interativo + stats expandidos

**Implementação:**
- Layout: leftW 360 (400 mobile), rightW 340 (380 mobile), totalW left+right+24, startX centralizado, py 48 (20 mobile), panelH 440 (560 mobile)
- Esquerda: dialogBox border #8f6fd6 accent #37e6c8, título PAUSA big 2 #ffd479, 6 botões Continuar #37e6c8, Opções ♿ #ffb347, Árvore #c77dff, Como Jogar #6db7ff, Reiniciar #ffb347, Sair #ff4d5a, btnW leftW-32, btnH 40 (104 mobile), gap 10 (12 mobile), notePointer + transition
- Direita FINAL interativo:
  - dialogBox border #4a3a6e accent #ffd479, título MAPA E STATUS
  - Mini-mapa: miniX rx+16, miniY py+44, miniW rightW-32, miniH 160, panel rgba(10,8,16,0.9) border #4a3a6e, world.mini draw, allies #37e6c8/#8fd3ff/#7fd6a0 2x2, foes #ff4d5a/#ffd479, anthill #ffd479 pulse, viewport câmera retângulo rgba(239,233,255,0.7)
  - **Interativo:** pointInRect hover borda #37e6c8 2px + texto "CLIQUE PARA MOVER CÂMERA" + mouse.justDown move cam.x/y = (mouse-mini)/sx,sy + SFX.uiClick + fogDrawMini
  - Stats expandidos:
    - modo nome color, mapa idx+1/MAPS.length + name, onda + abates, nível + comida fmt, essência + mutações #c77dff, pop + tempo, colônia FOME% GUERRA% CURA% #8f7bb5 0.75, headcount gather/explore/defend #9a8fc0 0.75, invencível #7fd6a0, infiniteDash ∞ #37e6c8 0.85, rally recarga #ff4d5a 0.8
  - ESC volta, M som, dica "ESC: VOLTAR • M: SOM • CLIQUE NO MAPA"

---

## ✅ FASE 6 FINAL 100% - Mobile: 104px + Swipe + Área Toque + Scroll Visual

**Spec:** iconButton e button altura mínima 88->104 auto quando isMobile, cards MODE swipe com scroll visual offset, área toque maior rodapé 44px, touch feedback vibrate

**Implementação:**
- `isMobileLayout()` = ontouchstart in window || innerWidth<900
- **Altura mínima automática 88→104px FINAL em ui.js:**
  - `button()` e `iconButton()` check `isTouchDevice()` && h<104 && id!=="hudMore" → y-=diff/2, h=104
  - `hitRect()` aumenta hitbox para 104px mínimo + 12px pad
- Botões TITLE: btnH 104 mobile vs 46 desktop, gap 14 vs 10
- Botões MODE: back 220x104 mobile vs 140x32 desktop
- **Cards MODE swipe FINAL com scroll visual:**
  - `drawModeCards(ctx, modes, hoverIdx, time, scrollOffset)` com `scrollVisual = scrollOffset*(cardW+gap)` e `startX = VIEW_W/2 - totalW/2 - scrollVisual`
  - `modeScrollOffset` 0..len-1, `modeSwipeX` justDown/justUp dx>50 muda offset ±1 + vibrate 15 + SFX.uiClick
  - Dots indicador: bolinhas em y+cardH+14, gap 12, 8px, sel #ffd479 5px vs 3px rgba(255,255,255,0.25)
  - Hover ainda funciona via modeRects com x shiftado
  - Touch feedback vibrate 20 ao clicar card
- Botões OPTIONS: tabW 128 mobile vs 156 desktop, tabH 36, btnH 40/36/32/34 vs 32/28/24/28, swipe entre abas dx>60
- Botões PAUSA: btnH 104 mobile vs 40 desktop, gap 12 vs 10, leftW 400 vs 360, rightW 380 vs 340, panelH 560 vs 440
- Botões HELP: back 104 mobile vs 36 desktop
- Botões RUN end: again/goTree 104 mobile vs 40 desktop, menu 104 vs 32
- **Área toque maior rodapé FINAL:**
  - TITLE footer: panel 12,VIEW_H-footerH-10,VIEW_W-24,footerH onde footerH 44 mobile vs 28 desktop, fill rgba(10,8,16,0.75) border 0.45, r 4, textos 0.85/0.8 scale mobile
  - MODE footer: panel 12,VIEW_H-footerH-8,VIEW_W-24,footerH com texto swipe + scroll visual ativo
  - Texto rodapé: v2.4 PLANÍCIE VIVA + ciclo + parallax + 5x escala + SNOW + geléia + vitórias + mapa + M: SOM + TOQUE 104PX SWIPE/MOUSE + FASES 1-6 FINAL
  - Touch feedback: navigator.vibrate(20) em botões principais TITLE/MODE quando mobile

---

## 📊 MENU FINAL 100% - Estrutura Completa

```
PRETITLE (FUMIGA gigante 5.2+sin*0.18 glitch cyan/roxo contorno brilho + COLONIA ETERNA + CLIQUE PARA JOGAR pulsante seta, 40 motes + 45 pollen + 18 snow + 10 fireflies + 12 essence)
  ↓ bloom 0.55s #ffd479
TITLE (logo 5.0+sin*0.08+sin*0.02 metal dourado 4 faixas varredura 4.6s + sparkle + glow pulsante, 4 camadas parallax 0.01/0.03/0.08/0.15 + ciclo 60s tint forte + luz formigueiro pulsante + partículas, botões lateral 104px mobile + rodapé 44px)
  ↓ swipe 0.40s #37e6c8 / swipe 0.34s volta #8f6fd6
MODE (4 cards Campanha/Sobrevivência/Enxame/Caçada lift 6px + swipe mobile scroll visual offset + dots indicador + 104px)
  ↓ dissolve 0.50s Bayer #ffb347
RUN (jogo principal, HUD, loja Q, formigueiro B, minimapa, ondas, mutações, chefões, rally F com cooldown 3s ou ∞ quando infiniteDash, atkCd *0.3)
  ↓ ESC pausa
PAUSA (2 colunas 6 botões 104px mobile, mini-mapa 160px interativo clique move câmera + viewport + foes + fog + stats expandidos pop/tempo/FOME/GUERRA/CURA/headcount/infiniteDash/rallyCooldown)
  ↓ zoom/iris/swipe
TREE (árvore evolução), HELP (como jogar), OPTIONS (5 abas com sliders visuais barra 200px + handle + audio + vídeo + controles + acessibilidade + idioma)
```

### Checklist Final 100%

| Feature | Status | Detalhe |
|---------|--------|---------|
| PRETITLE FUMIGA glitch | ✅ 100% | 5.2+0.18 breathing, cyan/roxo, contorno 2px, brilho superior, 50+ motes |
| TITLE parallax 4 camadas | ✅ 100% | 0.01/0.03/0.08/0.15 real mouse + sin, fundo removido exceto sky |
| TITLE ciclo 60s tint forte | ✅ 100% | 0.016666, noite rgba(8,10,28,0.7425) + 24 estrelas 2.2px, dia rgba(255,156,58,0.106) + horizonte |
| TITLE formigueiro luz pulsante + partículas | ✅ 100% | 52px + 90px + 12 essência vy -12..-30 |
| TITLE vaga-lumes azul+amarelo | ✅ 100% | 10 y 300-420 blink glow 3.5x |
| TITLE cristais só | ✅ 100% | 8 cristais sem correntes |
| TITLE trilha sutil | ✅ 100% | 0.06 alpha |
| TITLE logo 5x respirando | ✅ 100% | 5.0+0.08+0.02, glow pulsante 0.12+abs*0.8, metal 4 faixas, varredura 4.6s + sparkle |
| TITLE motes+pollen+snow+formigas | ✅ 100% | 40 motes + 45 pollen 3-11px/s + 18 snow 8-22px/s sway 1.2-3.7 cruz + 6 formigas + 8 nuvens |
| TITLE botões + rodapé 44px | ✅ 100% | lateral 104px mobile, rodapé 44px mobile 28 desktop, touch feedback |
| Transições assinatura | ✅ 100% | bloom/swipe/zoom/iris/dissolve Bayer + notePointer + transitionFx |
| MODE cards lift 6px + scroll visual + dots | ✅ 100% | scrollVisual = offset*(w+gap), swipe dx>50, dots #ffd479, vibrate |
| OPTIONS 5 abas + sliders visuais | ✅ 100% | barra 200px + handle + gradient + audio + vídeo + controles + acess + idioma + swipe |
| infiniteDash + bigFont | ✅ 100% | rallyCooldown 3s vs ∞, atkCd *0.3, bigFont scale 1.3 em font.js |
| PAUSA 2 colunas + mapa interativo + stats | ✅ 100% | interativo clique move câmera + viewport + foes + fog + pop/tempo/FOME/GUERRA/CURA/headcount |
| Mobile 104px auto + hitRect + vibrate | ✅ 100% | button/iconButton auto 104, hitRect 104+12, vibrate 15/20, footer 44px |
| Fundo sólido gótico outros menus | ✅ 100% | #0a0812/#0c0a18 sem parallax |

### Arquivos Modificados FINAL

- `game/js/render.js` → 4 camadas parallax + ciclo 60s tint forte + fireflies 10 azul_amarelo + essence 12 + snow 18 + logo 5.0+0.08+0.02 + glow + sparkle + modeCards scrollVisual + dots
- `game/js/game.js` → rallyCooldown + infiniteDash cooldown 3s vs ∞ + drawSlider visual + pause mapa interativo + footer 44px + mode scroll visual + vibrate
- `game/js/units.js` → computeAntStats atkCd *0.3 quando infiniteDash + import G
- `game/js/ui.js` → altura mínima auto 88→104 + hitRect 104px + touch feedback (já estava 95%, mantido)
- `game/js/font.js` → bigFont scale 1.3 + highContrast sombra preta (já estava)
- `game/assets/parallax/menu/` → 4 camadas finais transparentes

### Como Testar FINAL

1. Preview http://0.0.0.0:8000 ativo
2. PRETITLE: FUMIGA gigante respirando glitch + motes + pollen + snow cruz + fireflies
3. TITLE: mover mouse → céu 0.01x quase parado, montanhas 0.03x, gramado 0.08x, vinhas 0.15x frente; ciclo 60s noite azul 0.75 + estrelas → dia laranja; formigueiro luz pulsante + partículas subindo; logo 5x respirando com glow + varredura 4.6s sparkle; botões 104px mobile, rodapé 44px
4. MODE: 4 cards lift 6px, swipe horizontal muda scrollVisual + dots amarelo, clique joga
5. OPTIONS: 5 abas, áudio com barras visuais 200px + handle, vídeo fullscreen, acessibilidade infiniteDash com cooldown 3s vs ∞, bigFont 1.3x, slowMo 0.5x, gameSpeed 0.5-2x
6. RUN: F rally com recarga 3s (ou sem quando ∞), atkCd reduzido, HUD, loja Q, formigueiro B
7. PAUSA: 2 colunas 6 botões 104px, mini-mapa 160px interativo clique move câmera + viewport + foes + stats pop/tempo/FOME/GUERRA/CURA/gather/explore/defend

---

**FIM — FASES 1-6 FINAL 100% COMPLETAS**

<!-- FIM ORIGINAL: DOCUMENTO_FASES_IMPLEMENTACAO.md -->

---

<a id="registro-de-integridade"></a>

## Registro de integridade

Os tamanhos e hashes abaixo correspondem aos bytes dos arquivos de origem no
momento da consolidação. Os delimitadores e os textos de apresentação não fazem
parte dos blocos originais.

| Arquivo original | Bytes preservados | SHA-256 |
|---|---:|---|
| `REGRAS_DE_TRABALHO.md` | 11570 | `e7c8021d6c9020ff8f11e278864095e9e5ba63cfb47e1031a2ff17bb2e5e55d2` |
| `LORE.md` | 15056 | `42075fe4334601f1a74834388c0155342b2a8a6c21e51afa6020e34a5260f493` |
| `DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md` | 30473 | `c642dd06d14e527bba6566458afa5293f697b0a3b981ef6301f6fafdfb9e856e` |
| `DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md` | 8179 | `2b05240cd9fef9fb33d8a08768164f60202437c886c1c5b83f250ee9cbb58637` |
| `PROGRESSO_MEGA_ATUALIZACAO.md` | 7782 | `308b60262d478b650659da247f62a0541f02631acb03768c6aefb04ae818243b` |
| `DOCUMENTO_FASES_IMPLEMENTACAO.md` | 16125 | `d12395ae661c7b5a1c0546a1bb4a778b728a5c8d28c2944a3e4bbdbd50f1aba3` |

**Conferência reproduzível:** `node game/test/docs.mjs`.
O teste compara byte a byte cada bloco com seu arquivo original, confere os
hashes e verifica que todas as seis fontes aparecem exatamente uma vez.
Os READMEs da raiz e de `game/` não foram incorporados, conforme o escopo escolhido.

---
# REGISTRO — Manto da Névoa (2026-09-22, branch arena/01a0ca96)
Pedido do usuário: retirar os olhos brilhosos dos inimigos; todo inimigo com
fog branca animada em volta (spritesheet desenhada, um pouco transparente,
adaptada ao tamanho). Lore base: Névoa "branca, doce e silenciosa" (Prólogo),
PÁLIDA/ninho branco, Ascensão/NÉVOA PLENA.
Decisões (ask_user): manto = fog densa embaixo + véu fino em cima; remover
TODO o VFX pálido antigo; chefes também com fog (maior/densa); densidade média.
Entregue: `game/assets/sprites/fx/fog_mantle.png` (6x48x48, plasma
determinístico — sementes fixas + `-limit thread 1` + `-strip`, verificado com
`cmp`), seção Névoa em `tools/prepare_assets.sh`, `fog_mantle` no MANIFEST,
`bakeFog`/`fogFrame`/`FOG_FRAMES` em `game/js/assets.js`, manto em
`drawAnt`/`drawBoss` (`game/js/render.js`), rastro pálido removido de
`game/js/enemies.js`. Olhos/elipse pálida/aura removidos; orbes + coroa da
fase 2 mantidos. Suíte 13/16 (3 falhas pré-existentes, iguais ao baseline).
