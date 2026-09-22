# Fundação Lore — atlas originais

Arte pixel art feita por código, não extraída de outros jogos. Referência de paleta:
`sprites/ants/queen.png` (quitina violeta, âmbar, contorno escuro). Sem figuras humanas.

| PNG | Dimensão | Recortes (origem no canto superior esquerdo) |
| --- | --- | --- |
| `lore_panels.png` | 192×32 | 6 células 32×32; margens 9-slice de 8px |
| `lore_textbox.png` | 224×32 | 7 células 32×32 (6 biomas + colônia); margens 9-slice de 8px |
| `lore_icons.png` | 192×16 | 12 células 16×16 |
| `lore_gaster.png` | 192×24 | 3 células 64×24: vazio, âmbar, ferido |

Painéis e comidas na ordem: Planície (trevo), Floresta (cogumelo), Pântano
(alga), Deserto (semente), Bosque (folha de outono), Pico (líquen).
Ícones 6/7: cristais âmbar/violeta; 8–11: quatro passos de formiga (8 fps).

## Fase 2 — rework de slice boxes e caixas de texto

- `lore_panels.png`: quitina dupla com bisel claro/escuro, **motif do bioma nos
  4 cantos** (zona fixa do 9-slice, nunca estica), costuras de seda no meio das
  bordas e nós de cera âmbar nos pontos médios.
- `lore_textbox.png` (novo): moldura fina orgânica para caixas de texto —
  fio de seda no topo com nó de cera, pespontos na base, veias ralas laterais e
  motif do bioma nos cantos. A 7ª célula é o tema neutro **colônia**
  (violeta/âmbar, coroa de fungo) usado pelos menus fora da expedição.
- Os cantos nunca esticam; o centro é campo escuro de leitura. A troca de bioma
  faz a "muda de quitina" (dissolve ~0,6 s + fio de luz) em `js/lore_hud.js`;
  `dialogBox`/`tooltip` de `js/ui.js` usam o texto do bioma atual via
  `hudBiome()`. Renderização nearest-neighbor.

## Reproduzir

Com Python e Pillow disponíveis: `python tools/make_lore_hud.py`.
O gerador pinta um master 4× na grade e reduz com nearest, sem blur. Para exportar
as fontes de alta resolução fora do jogo: `--master /caminho/externo`.
Só os quatro PNGs otimizados são carregados pelo jogo (~6 KiB no total).
Pillow não é dependência de execução; o jogo continua JS puro, sem build.
