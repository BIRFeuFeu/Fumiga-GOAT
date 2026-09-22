# Fundação Lore — atlas originais

Arte pixel art feita por código, não extraída de outros jogos. Referência de paleta:
`sprites/ants/queen.png` (quitina violeta, âmbar, contorno escuro). Sem figuras humanas.

| PNG | Dimensão | Recortes (origem no canto superior esquerdo) |
| --- | --- | --- |
| `lore_panels.png` | 192×32 | 6 células 32×32; margens 9-slice de 8px |
| `lore_textbox.png` | 224×32 | 7 células 32×32 (6 biomas + colônia); margens 9-slice de 8px |
| `lore_kit.png` | 280×52 | linha 0: 7 banners-seta 40×24 (9-slice l8/r14/t8/b8) · linha 24: 7 molduras de barra 32×12 (9-slice 4px, centro transparente) · linha 36: 4 ícones 16×16 |
| `lore_icons.png` | 192×16 | 12 células 16×16 |
| `lore_gaster.png` | 192×24 | 3 células 64×24: vazio, âmbar, ferido |

Painéis e comidas na ordem: Planície (trevo), Floresta (cogumelo), Pântano
(alga), Deserto (semente), Bosque (folha de outono), Pico (líquen).
Ícones 6/7: cristais âmbar/violeta; 8–11: quatro passos de formiga (8 fps).

## Fase 2 — rework de slice boxes, caixas de texto e kit de madeira

- `lore_panels.png`: quitina dupla com bisel claro/escuro, **motif do bioma nos
  4 cantos** (zona fixa do 9-slice, nunca estica), costuras de seda no meio das
  bordas e nós de cera âmbar nos pontos médios.
- `lore_textbox.png`: caixas de texto em **tábua viva** (kit de madeira estilo
  da referência, personalizadas por bioma): veios horizontais/verticais, bisel
  de luz/sombra, nó de madeira com cera âmbar, sulco de placa e motif do bioma
  nos cantos chunky; centro escuro de leitura. A 7ª célula é o tema neutro
  **colônia** (quitina-amadeirada violeta) usado pelos menus fora da expedição.
- `lore_kit.png`: **tábuas-seta** de banner (cap arredondado + ponta de seta com
  nó de cera), **molduras de barra** de madeira com centro transparente (o fill
  colorido vem de `bar()` em `js/ui.js`) e ícones neutros 16×16 — check, cross,
  gema e botão âmbar — usados nos toggles de opções/profecias/memórias e no
  draft.
- Madeiras por bioma: fresca (Planície), musgosa (Floresta), úmida (Pântano),
  calcinada (Deserto), dourada (Outono), gelada (Gelo) + colônia.
- Os cantos nunca esticam; a troca de bioma faz a "muda de quitina" (dissolve
  ~0,6 s + fio de luz) em `js/lore_hud.js`; `dialogBox`/`tooltip` usam a tábua
  do bioma atual via `hudBiome()`; banners usam `drawWoodBanner` e barras,
  `drawWoodBarFrame`. Renderização nearest-neighbor.

## Reproduzir

Com Python e Pillow disponíveis: `python tools/make_lore_hud.py`.
O gerador pinta um master 4× na grade e reduz com nearest, sem blur. Para exportar
as fontes de alta resolução fora do jogo: `--master /caminho/externo`.
Só os cinco PNGs otimizados são carregados pelo jogo (~9 KiB no total).
Pillow não é dependência de execução; o jogo continua JS puro, sem build.
