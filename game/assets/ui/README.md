# Fundação Lore — atlas originais

Arte pixel art feita por código, não extraída de outros jogos. Referência de paleta:
`sprites/ants/queen.png` (quitina violeta, âmbar, contorno escuro). Sem figuras humanas.

| PNG | Dimensão | Recortes (origem no canto superior esquerdo) |
| --- | --- | --- |
| `lore_panels.png` | 192×32 | 6 células 32×32; margens 9-slice de 8px |
| `lore_icons.png` | 192×16 | 12 células 16×16 |
| `lore_gaster.png` | 192×24 | 3 células 64×24: vazio, âmbar, ferido |

Painéis e comidas na ordem: Planície (trevo), Floresta (cogumelo), Pântano
(alga), Deserto (semente), Bosque (folha de outono), Pico (líquen).
Ícones 6/7: cristais âmbar/violeta; 8–11: quatro passos de formiga (8 fps).
Cantos dos painéis nunca esticam. Gaster: coroa de fungo/seda na parte superior;
a máscara de vida recorta só o abdômen. Renderização nearest-neighbor.

## Reproduzir

Com Python e Pillow disponíveis: `python tools/make_lore_hud.py`.
O gerador pinta um master 4× na grade e reduz com nearest, sem blur. Para exportar
as fontes de alta resolução fora do jogo: `--master /caminho/externo`.
Só os três PNGs otimizados são carregados pelo jogo (menos de 4 KiB no total).
Pillow não é dependência de execução; o jogo continua JS puro, sem build.
