# FUMIGA — Colônia Eterna

Roguelite de colônia de formigas em pixel art (2D, HTML5 Canvas + JavaScript puro, sem build).
Arte inspirada em **Dead Cells** e **Celeste**; sprites do próprio repositório, processados por
`tools/prepare_assets.sh`. Todo o texto do jogo está em **português (pt-BR)**.

## Como jogar

Sirva a pasta `game/` por HTTP (módulos ES exigem servidor; abrir o arquivo direto não funciona):

```bash
cd game
python3 -m http.server 8080
# abra http://localhost:8080
```

## O jogo

A Rainha vive dentro do formigueiro. Você comanda a colônia em uma **expedição por 6 mapas**
(estilo *Dead Cells*): ao fim de cada mapa há um **chefão**; derrotá-lo abre a passagem para o
próximo bioma — a colônia inteira migra e a Rainha recupera forças. Derrubar o chefão do
**último mapa** (O Devastador, no Pico Congelado) é a vitória da expedição.

Os 6 mapas, na ordem da expedição:

| # | Mapa | Chefão |
|---|------|--------|
| 1 | Planície do Amanhecer (gramado) | O Tamborilador (lebre) |
| 2 | Floresta de Musgo | A Caçadora Astuta (raposa) |
| 3 | Pântano Pútrido | A Sombra Alada (tetraz) |
| 4 | Deserto Calcinado | A Matriarca Rival (formiga gigante) |
| 5 | Bosque Dourado (outono) | O Galhada Real (cervo) |
| 6 | Pico Congelado | O Devastador (javali) |

Entre as ondas, **drafts de mutações** (escolha 1 de 3) moldam a build da expedição, e a
**essência** coletada alimenta a **Árvore da Evolução** permanente (meta-progressão, com preços
visíveis nos próprios nós).

### As 7 classes da colônia (teclas 1–7)

1. **Operária** — colhe comida e essência, linha de vida da economia.
2. **Soldado** — linha de frente de confiança.
3. **Cuspidora** — artilharia de longo alcance.
4. **Guarda de Ébano** — tanque que provoca os ataques.
5. **Batedora** — rápida e faro largo, pega o que escapa.
6. **Curandeira** — cura os feridos em combate, frágil.
7. **Bombeira** — cuspe brasas em arco: área de explosão + queimadura.

### Controles

| Ação | Efeito |
|------|--------|
| **Botão esquerdo (arrastar)** | move a câmera |
| **Botão esquerdo (clique)** | ordena às selecionadas (atacar / coletar / mover) |
| **Botão direito (arrastar)** | caixa de seleção |
| **Botão direito (clique)** | seleciona 1 formiga / limpa seleção |
| **Duplo clique direito** | seleciona todas do mesmo tipo na tela |
| `Shift` | seleção aditiva |
| `WASD` / setas | também movem a câmera |
| Roda do mouse | zoom |
| `Espaço` | centraliza no formigueiro |
| `1`–`7` | choca a classe selecionada |
| `F` | convoca a guarda para defender |
| `G` | invoca a próxima onda (bônus de essência) |
| `T` | pula o tutorial |
| `M` | liga/desliga som |
| `Esc` | **pausa** (Continuar / Como jogar / Reiniciar / Sair) |

### Tutorial dinâmico

Na primeira expedição, cartões contextuais aparecem **durante o jogo** e se completam quando
você realiza cada ação (mover a câmera, selecionar, ordenar coleta, chocar, formar a guarda,
defender a onda, coletar essência). `T` pula, e a preferência fica salva.

## Desenvolvimento

- `js/` — módulos ES (game, units, enemies, waves, world, render, combat, particles,
  tutorial, meta, audio, config, state, ui, font, input, camera, utils)
- `assets/` — sprites e fontes bitmap processados
- `tools/prepare_assets.sh` — regenera os sprites a partir das fontes
- `test/sim.mjs` — simulação headless da expedição inteira:
  - `node test/sim.mjs` — roda uma expedição desde o começo
  - `FORCE=N node test/sim.mjs` — pula direto para o chefão do mapa `N` (1–6) com um exército
    coerente, validando o spawn e a IA de cada chefe
- `test/uitest.mjs` — boot → título → expedição → câmaras → pausa → troca de mapa (DOM simulado)
- `test/assets.mjs` — integridade de sprites e de texto: todo nome de imagem usado pelo jogo
  (props de cada bioma, unidades, inimigos, chefes, ícones) precisa estar no `MANIFEST`, e todo
  caractere dos textos precisa existir no atlas da fonte (senão o jogo desenha `?`). Rode depois
  de mexer em `js/config.js`, `js/assets.js` ou de regerar as fontes com `tools/prepare_assets.sh`.

Chegue na porta, defenda a Rainha. A colônia é eterna.
