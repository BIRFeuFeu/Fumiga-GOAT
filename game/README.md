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

### Árvore da Evolução — 39 nós em 4 ramos

| Ramo | Cor | Foco |
|------|-----|------|
| **TRABALHO** | âmbar | comida, essência, carga, ritmo de coleta e estoque inicial |
| **GUERRA** | vermelho | dano, vida, cadência, alcance, bombas, armadura, esquiva e espinhos |
| **REAL** | roxo | a rainha: vida, regeneração, alimentação, XP e renascimento |
| **NINHO** | verde | o que acontece dentro do formigueiro: escavação, berçário, despensa, fungário |

São **113 níveis compráveis** (contra 46 do começo). Todo nó tem efeito de verdade — quem garante
é o `test/tree.mjs`. A tela abre enquadrando a árvore, tem **VER TUDO** para ver os 39 nós de
uma vez, legenda com o progresso de cada ramo e roda do mouse para o zoom (30%–220%).

### As 9 classes da colônia (teclas 1–9)

1. **Operária** — colhe comida e essência, linha de vida da economia.
2. **Coletora** — variante jade da operária: mais rápida e carrega mais.
3. **Soldado** — linha de frente de confiança.
4. **Cuspidora** — artilharia de longo alcance.
5. **Guarda de Ébano** — tanque que provoca os ataques.
6. **Batedora** — rápida e faro largo, pega o que escapa.
7. **Curandeira** — cura os feridos em combate, frágil.
8. **Bombeira** — joga bombas em arco: explosão em área (56px) + queimadura contínua.
   O que faz o projétil virar bomba é a flag `bomb: true` na definição (`js/config.js`) —
   antes o teste era pelo `role`, que é `"ranged"`, e a bomba saía sem efeito nenhum.
9. **Formiga Gigante** — o colosso: **20 soldados de ponta a ponta**
   (`GIANT_SCALE` em `js/config.js`), 3000 de vida, atrai a horda para si,
   derruba uma árvore em cada passo e mata com um golpe só. Custa 320 de comida,
   demora 7s para chocar e **só cabe uma por expedição**.

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
| `B` | **entra no formigueiro** (a cena viva de dentro) |
| `1`–`9` | choca a classe selecionada (9 = gigante) — só com a fileira **FORMIGAS** aberta |
| `Q` | abre/fecha a fileira das 9 classes de formigas |
| `F` | convoca a guarda para defender |
| `G` | invoca a próxima onda (bônus de essência) |
| `T` | pula o tutorial |
| `M` | liga/desliga som |
| `Esc` | **pausa** (Continuar / Como jogar / Reiniciar / Sair) |

### Dentro do formigueiro (tecla `B`)

O botão **FORMIGUEIRO**, no canto inferior-direito, entra na colônia — um corte transversal vivo,
no espírito do *Ant Colony* (pasta `inspiração/`): túneis de terra, câmaras e as formigas
trabalhando em tempo real.

- **Carregadoras** (operárias e coletoras) pegam comida na **ENTRADA** e levam para a **DESPENSA** —
  cada entrega rende comida de verdade para a expedição.
- **Escavadoras**: quando você clica numa câmara, as operárias largam a coleta, vão para a obra e
  o nível sobe ao fim da escavação (custo pago no início, barra de progresso na câmara).
- **Curandeiras** cuidam das larvas no **BERÇÁRIO**, que de tempos em tempos gera uma operária
  nova (mais rápido com o berçário melhorado).
- A **RAINHA** bota ovos na **CÂMARA REAL**; os ovos viram larvas e as larvas viram formigas.
- No **QUARTEL** fica a FORMIGA GIGANTE de folga; **FUNGÁRIO** e **REFINARIA** enchem a sala de
  fungos e cristais conforme o nível.
- O mundo lá fora **congela** enquanto você está dentro; o cabeçalho mostra comida, essência,
  população e quanto as formigas já entregaram. `B` ou `Esc` volta para a colônia.

### HUD da expedição

- O rodapé tem só dois botões: **FORMIGAS** (esquerda, abre a fileira das 9 classes — tecla `Q`) e
  **FORMIGUEIRO** (canto inferior-direito). Nove cartões fixos na tela eram ruído demais.
- O **minimapa** fica no canto **superior-direito**, livre do rodapé.

### Tutorial dinâmico

Na primeira expedição, cartões contextuais aparecem **durante o jogo** e se completam quando
você realiza cada ação (mover a câmera, selecionar, ordenar coleta, chocar, formar a guarda,
defender a onda, coletar essência). `T` pula, e a preferência fica salva.

## Desenvolvimento

- `js/` — módulos ES (game, units, enemies, waves, world, render, combat, particles,
  tutorial, meta, nest, audio, config, state, ui, font, input, camera, utils)
- `js/nest.js` — a cena de dentro do formigueiro (salas, túneis, IA das formigas: carregar,
  escavar, cuidar das larvas). Os bônus do ramo **NINHO** da árvore entram aqui: escavação,
  berçário, despensa, postura da rainha, custo das câmaras.
- `assets/` — sprites e fontes bitmap processados
- `tools/prepare_assets.sh` — regenera os sprites a partir das fontes
- `test/sim.mjs` — simulação headless da expedição inteira:
  - `node test/sim.mjs` — roda uma expedição desde o começo
  - `FORCE=N node test/sim.mjs` — pula direto para o chefão do mapa `N` (1–6) com um exército
    coerente, validando o spawn e a IA de cada chefe
- `test/uitest.mjs` — boot → título → expedição → câmaras → pausa → troca de mapa (DOM simulado)
- `test/assets.mjs` — integridade de sprites e de texto: todo nome de imagem usado pelo jogo
  (props de cada bioma, unidades, inimigos, chefes, ícones) precisa estar no `MANIFEST`, e todo
  caractere dos textos precisa existir no atlas da fonte (senão o jogo desenha `?`). Também
  confere que a lista/ordem de glifos do `js/font.js` bate com o array `CHS` de
  `tools/prepare_assets.sh` — se divergirem, o índice da célula pinta o glifo errado. Rode depois
  de mexer em `js/config.js`, `js/assets.js`, `js/font.js` ou de regerar as fontes.
- `test/tree.mjs` — auditor da ÁRVORE DA EVOLUÇÃO: confere que todo nó tem pré-requisito
  existente, caminho até a raiz e um bônus de verdade em `metaBonus()` (nó decorativo = erro),
  além de comprar **todos** os níveis de **todos** os nós e conferir que os bônus chegam nas
  fichas das formigas (vida, alcance, cadência, área da bomba, armadura, esquiva, coleta) e no
  formigueiro (escavação, berçário, entrega, custo da câmara). Rode depois de mexer em
  `META_NODES`, em `metaBonus()` ou em `js/meta.js`.
- `test/stuck.mjs` — regressão dos bugfixes: nenhuma pilha/nó de recurso nasce na área do
  formigueiro, nenhuma operária fica presa no `goto` com alvo inalcançável, e a **bombeira
  explode de verdade** (área + queimadura em vários inimigos de uma vez).
- `test/layout.mjs` — auditor de layout headless: roda o jogo com um canvas de mentira que grava
  todas as operações de desenho, reconstrói o texto desenhado (glifo a glifo, a partir do atlas) e
  acusa texto fora do canvas, texto encoberto por painel pintado depois, textos colidindo e botões
  sobrepostos em todas as telas (título, ajuda, árvore, HUD, tutorial, chefe, draft, câmara, pausa,
  transição, fim, mapa 6). Imprime quantos textos auditou em cada cenário: um verde com cobertura
  baixa não vale nada.

Cheque tudo antes de subir (é o que o CI local usa):

```bash
node test/assets.mjs && node test/sim.mjs && node test/uitest.mjs && \
node test/layout.mjs && node test/tree.mjs && node test/stuck.mjs
```

Para inspeção visual do layout das telas internas (gera PNG fora do repo):

```bash
node test/nestmap.mjs    # -> /home/user/formigueiro-layout.png
node test/treemap.mjs    # -> /home/user/arvore-layout.png (39 nós, 4 ramos, zoom de enquadramento)
```

Chegue na porta, defenda a Rainha. A colônia é eterna.
