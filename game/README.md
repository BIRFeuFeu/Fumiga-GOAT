# FUMIGA — Colônia Eterna

Roguelite de colônia de formigas em pixel art (2D, HTML5 Canvas + JavaScript puro, sem build).
Arte inspirada em **Dead Cells** e **Celeste**; sprites do próprio repositório, processados por
`tools/prepare_assets.sh`. Todo o texto do jogo está em **português (pt-BR)**.

## Como jogar

**No navegador, sem instalar nada:** <https://feufeup.github.io/Fumiga-GOAT/> — o endereço acima
cai direto no jogo.

Ou sirva a pasta `game/` por HTTP (módulos ES exigem servidor; abrir o arquivo direto não funciona):

```bash
cd game
python3 -m http.server 8080
# abra http://localhost:8080
```

## 📱 Versão mobile (paralela)

O site detecta o aparelho: **celular cai na versão mobile**, PC na versão PC. Também dá para
trocar à mão: o link na página inicial e o botão **VERSÃO MOBILE / VERSÃO PC** nas OPÇÕES do jogo.

- **Endereço:** `/game/mobile/` (serve a mesma pasta; ao testar localmente abra
  <http://localhost:8080/mobile/>).
- **Paralela, mesma engine:** a versão mobile é só um shell (`game/mobile/index.html`,
  `mobile.css`, `touch.js`) que importa **os mesmos módulos** do PC — qualquer atualização na
  lógica cai nas duas versões ao mesmo tempo. As duas **não se conectam**: slot de save próprio
  (`fumiga_goat_mobile_save_v1`), progresso independente.
- **Enquadramento:** o canvas 960×540 é escalado mantendo a proporção 16:9 (letterbox), sem
  distorcer; em pé aparece a faixa "gire o celular" (paisagem é a experiência recomendada).
- **Alvo de toque = hitbox, não tamanho de botão.** `ui.js` (`isTouchUI`, `hitRect`) amplia só a
  área sensível ao dedo (mín. 61px do canvas ≈ 44px reais no celular, o piso da Apple HIG /
  Material) e nunca o painel desenhado — assim o layout do mobile é o do PC e nada sai do canvas.
  Todo retângulo de UI passa por `clampToView`, e o `test/layout.mjs` re-audita as telas em MODO
  TOQUE: nenhum botão fora do 960×540 e nenhuma hitbox sobreposta (botão inflado a 104px fazia
  "VOLTAR", "REINICIAR", "SAIR" e "COMO JOGAR" sumirem da tela no celular).
- **Carregamento à prova de 4G.** `assets.js` (`loadAll`/`loadImage`) não manda mais as ~140
  imagens de uma vez: fila de 8 conexões, **prazo de 12s por imagem** e **duas tentativas**
  (a 2ª muda a query, furando a entrada envenenada do cache). Uma requisição presa não congela
  mais a barra para sempre — vira `ERRO: Falha ao carregar <arquivo>` com o botão
  **▶ TENTAR DE NOVO**, que também aparece se a conexão travar (o celular não tem F5).
  Coberto pelo cenário `pendurado` do `test/boot.mjs`.
- **Controles de toque:** arrastar 1 dedo move a câmera · toque dá ordem às selecionadas ·
  toque numa formiga a seleciona · toque duplo seleciona o tipo · arrastar 2 dedos faz a caixa
  de seleção · pinça dá zoom · botões virtuais cobrem pausa, ninho, rali, onda, zoom e centro.
  Nas OPÇÕES → CONTROLES dá para ativar o botão de modo **ORDENAR/SELECIONAR** como alternativa
  aos gestos inteligentes.

> 📜 **História**: a saga canônica — *A Travessia da Colônia Eterna*, da Noite Branca
> à derrota de **A PÁLIDA** no Topo do Mundo — está em [`../LORE.md`](../LORE.md).
> As tips das ondas, a tela de título e a vitória sussurram pedaços dela.

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

### Árvore da Evolução — 49 nós nos 4 grupos da colônia

O rework alinhou a árvore com a fileira de formigas: **mesmos grupos, mesmas cores**.
O fundo da tela banha a região de cada grupo com a sua cor, e a raiz é a própria RAINHA.

| Grupo | Cor | Foco |
|-------|-----|------|
| **⚔️ GUERRA** | vermelho | dano, vida, cadência, alcance, bombas, armadura, esquiva, espinhos |
| **🍃 COLETA** | verde | comida, essência, carga, ritmo de coleta, estoque, escavação do mundo |
| **🏥 CRIAÇÃO** | azul | o que acontece dentro do formigueiro: escavação, berçário, despensa, fungário |
| **👑 REAL** | dourado | a rainha: vida, regeneração, alimentação, XP, renascimento e a colosso |

#### Raridades

Quanto mais raro o nó, maior e mais rebuscado: **COMUM** (círculo, cor do grupo),
**RARO** (anel duplo ciano) e **LENDÁRIO** (hexágono dourado com o **sprite da espécie**
desenhado dentro). Trilhos para lendários são dourados e mais grossos.

#### Keystones de espécie (lendários, 10 novos)

| Keystone | Espécie | Efeito por nível (máx. 3) |
|----------|---------|---------------------------|
| FERRÃO DA BALA | Paraponera | ferroada da Bala com +0,35s de lentidão |
| CEIFA DA ARPÃO ⚠️ | Odontomachus | limiar da CEIFA +8% (22→46%), mas TODAS com −5% de vida |
| VENENO DA ACROBATA | Crematogaster | veneno +20% de duração e +25% de corrosão |
| CABEÇA DE CEFALOTE | Cephalotes | PORTA-VIVA +5% de redução e +30px de raio (45→60%) |
| PASSO DA PRATA | Cataglyphis | arrancadas 10% mais frequentes |
| ÂMBAR DA DESPENSA | Myrmecocystus | mel goteja com estoque +20 mais alto e 20% mais rápido |
| JARDIM DA CORTADEIRA | Atta | cada entrega apressa o fungário +0,3s extra |
| SEDA DA TECELÃ | Oecophylla | bônus de cada Tecelã +15% melhores |
| BÁLSAMO DA MATABELE | Megaponera | cura +8% e triagem ativa com feridas até +4% mais leves |
| FÚRIA DA DINOPONERA ⚠️ | Dinoponera | colosso +25% de vida, mas custa +40 de comida |

São **143 níveis compráveis**. Todo nó tem efeito de verdade — quem garante é o `test/tree.mjs`
(inclusive os trade-offs ⚠️ estilo *Path of Exile 2*). A tela abre enquadrando a árvore, tem
**VER TUDO**, legenda com o progresso de cada grupo e as raridades, e roda do mouse para o zoom.

### Depois do final — o fator replay (Eras, Ascensão e Profecias)

Zerar a campanha é a primeira linha do que vem depois, não a última:

- **ERAS DO FORMIGUEIRO ETERNO** — cada vitória de campanha avança uma Era
  (contador permanente no save). A tela de vitória canta a era atual.
- **ASCENSÃO DA NÉVOA** — após a 1ª vitória, a tela de modos ganha o seletor
  `< ASCENSÃO DA NÉVOA N/20 >` na CAMPANHA. Cada nível: horda +8% vida/+4% dano,
  chefes +6% vida, essência **+15%** — com marcos de rampa: nv2 ondas +10% de
  orçamento, nv5 inimigos velozes, nv8 chefes cruéis (+15% de golpe), nv11
  calmaria 30% mais curta, nv14 colheita magra, nv17 maré infinita, nv20 a
  **NÉVOA PLENA** (+25% de vida de chefe). Vencer no nível atual destrava o
  seguinte (estilo Hades/Slay the Spire).
- **PROFECIAS DA COLÔNIA** — 16 vaticínios permanentes com recompensa de
  essência (de "O PRIMEIRO DEGRAU" a "A NÉVOA PLENA", passando por "ARCA DE
  NOÉ" e "FLOR IMACULADA"). O painel fica no botão **PROFECIAS** dentro da
  Árvore da Evolução.

A leitura em história está no [apêndice do LORE.md](../LORE.md) — puramente
aditivo ao final do canon.

### As 11 classes da colônia — todas espécies reais

Cada classe é uma espécie de formiga que existe de verdade, com uma mecânica
assinatura inspirada na biologia real. A fileira `Q` separa os grupos por cor:
vermelho (combate), verde (coleta), azul (criação) e âmbar (colosso).

**⚔️ COMBATE/DEFESA**

1. **Formiga-Bala, A Atiradora** (*Paraponera clavata*) — o ferrão mais doloroso do
   mundo; corpo a corpo pesado e ferroadas que deixam o inimigo **lento**.
2. **Queixo-de-Arpão, A Estrondosa** (*Odontomachus bauri*) — mandíbulas a 200km/h
   em 0,13ms: golpes em rajada, **ceifa** inimigos feridos (dano dobrado abaixo de
   22%) e **salta** para longe quando atingida.
3. **Formiga-Acrobata, A Bailarina** (*Crematogaster*) — ergue o gaster em coração e
   borrifa **veneno que corrói** com o tempo (dano contínuo).
4. **Formiga-de-Fogo, A Incendiária** (*Solenopsis invicta*) — bombas de brasa em
   área (56px) com queimadura contínua.
5. **Cefalote, A Porta-Viva** (*Cephalotes varians*) — a cabeça em disco que tapa a
   porta do ninho: tanque que provoca os ataques e **-45% de dano** perto do
   formigueiro.

**🍃 COLETA/EXPLORAÇÃO**

6. **Formiga-Cortadeira, A Agricultora** (*Atta cephalotes*) — corta folhas para o
   fungo do ninho; cada entrega de comida **apressa o FUNGÁRIO**.
7. **Formiga-Pote-de-Mel, A Despensa** (*Myrmecocystus mexicanus*) — gaster inchado
   de mel: carrega mais e, quando a comida da colônia está baixa, **goteja mel**
   (+1 comida por ciclo perto do formigueiro).
8. **Formiga-Prata, A Veloz** (*Cataglyphis bombycina*) — a formiga mais rápida do
   mundo (855mm/s): **arrancadas relâmpago** periódicas e faro largo.

**🏥 CONSTRUÇÃO/CURA/CRIAÇÃO**

9. **Formiga-Matabele, A Resgatadora** (*Megaponera analis*) — os únicos insetos que
   tratam feridas com antibióticos: cura as irmãs em combate com **triagem** (o
   dobro de cura em feridas críticas).
10. **Formiga-Tecelã, A Costureira** (*Oecophylla smaragdina*) — costura o ninho com
    a seda das larvas: cada Tecelã viva (até 3) **acelera escavação, berçário e
    chocagem**.

**👑 COLOSSO**

11. **Dinoponera, A Colossa** (*Dinoponera australis*) — a maior formiga operária
    real: **20× uma Formiga-Bala de ponta a ponta**, 3000 de vida, atrai a horda
    para si, derruba uma árvore em cada passo e mata com um golpe só. Custa 320 de
    comida, demora 7s para chocar, **só cabe uma por expedição** e nasce apenas
    pelo card na fileira (sem atalho de teclado).

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
| `1`–`0` | choca a classe do número (0 = Tecelã) — a Dinoponera nasce só pelo card; a fileira **FORMIGAS** precisa estar aberta |
| `Q` | abre/fecha a fileira das 11 classes de formigas (grupos por cor) |
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
- No **QUARTEL** fica a DINOPONERA de folga; **FUNGÁRIO** e **REFINARIA** enchem a sala de
  fungos e cristais conforme o nível.
- O mundo lá fora **congela** enquanto você está dentro; o cabeçalho mostra comida, essência,
  população e quanto as formigas já entregaram. `B` ou `Esc` volta para a colônia.

### HUD da expedição

- O rodapé tem só dois botões: **FORMIGAS** (esquerda, abre a fileira das 11 classes — tecla `Q`) e
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
  escavar, cuidar das larvas). Os bônus do grupo **CRIAÇÃO** da árvore entram aqui: escavação,
  berçário, despensa, postura da rainha, custo das câmaras.
- `assets/` — sprites e fontes bitmap processados
- `tools/prepare_assets.sh` — regenera os sprites a partir das fontes
- TITLE: quatro PNGs com +128 px pintados por lado, desenhados em escala 1:1.
  Céu e cenário principal preservam o centro original; vegetação frontal e
  montanhas foram refeitas com aprovação visual. Principal e frente possuem
  +16 px de cobertura inferior. `test/title-parallax.mjs` valida cobertura nos
  cantos, oscilação, coordenadas zero e ausência de redimensionamento no render.
- `tools/fix_title_parallax.py` é o reparador **legado**: `--report` segue
  disponível; escrita/restauração são bloqueadas nos PNGs expandidos, para não
  destruir as novas margens com o processamento antigo.
- `test/sim.mjs` — simulação headless da expedição inteira:
  - `node test/sim.mjs` — roda uma expedição desde o começo
  - `FORCE=N node test/sim.mjs` — pula direto para o chefão do mapa `N` (1–6) com um exército
    coerente, validando o spawn e a IA de cada chefe
- `test/boot.mjs` — sintaxe ESM dos módulos, boot normal, save inválido e erros de carregamento de fontes/sprites (sem rejeições não tratadas)
- `test/mobile.mjs` — a versão mobile headless: a camada de toque (`mobile/touch.js`) traduz tap/arraste/pinça/toque-duplo/caixa nos mesmos estados de entrada do PC, o HUD virtual pressiona as teclas certas, e o slot de save fica isolado (`FUMIGA_SAVE_KEY`). Rode depois de mexer em `mobile/*` ou em `js/input.js`/`js/camera.js`.
- `test/docs.mjs` — integridade do [`MEGA_ARQUIVO.md`](../MEGA_ARQUIVO.md): seis documentos originais preservados byte a byte, com SHA-256
- `test/uitest.mjs` — boot → título → introdução → expedição → câmaras → pausa → troca de mapa (DOM simulado)
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
- `test/endless.mjs` — o modo **SOBREVIVÊNCIA** de ponta a ponta (boot → card → chefão → ciclo):
  o chefão é o marco do ciclo; ao cair, o jogo dá bônus de essência + draft e recomeça as ondas
  com orçamento +30% por ciclo (`director.cycle` em `js/waves.js`). Regressão de um bug em que a
  phase travava em `mapClear` para sempre no modo infinito (som de vitória em loop, controles
  bloqueados).

Cheque tudo antes de subir (é o que o CI local usa):

```bash
node test/boot.mjs && node test/docs.mjs && node test/lorehud.mjs && \
node test/assets.mjs && node test/sim.mjs && node test/uitest.mjs && \
node test/layout.mjs && node test/tree.mjs && node test/stuck.mjs && \
node test/attack.mjs && node test/endless.mjs && node test/prophecy.mjs && \
node test/mobile.mjs
```

Para inspeção visual do layout das telas internas (gera PNG fora do repo):

```bash
node test/nestmap.mjs    # -> /home/user/formigueiro-layout.png
node test/treemap.mjs    # -> /home/user/arvore-layout.png (49 nós, 4 grupos, raridades, zoom de enquadramento)
```

Chegue na porta, defenda a Rainha. A colônia é eterna.

## Validação da Fase 1 Lore-Total

`node test/lorehud.mjs` cobre atlas/recortes, caches, vida limitada, coordenadas
sensoriais, nomes dos seis mapas e redução de movimento do gaster/trilha.
Com o servidor local na porta 8000 e Playwright/Chromium disponíveis apenas no
ambiente de teste: `HUD_MIN_FPS=55 node test/lorehud-browser.mjs`.
O gate mede FPS médios por 1.800 quadros com H ativo; não exige 55 em cada quadro.
`CHROMIUM_PATH` seleciona um executável existente e `HUD_SHOTS` escolhe um diretório
**fora do repositório** para capturas e `resultado.json`. Não há dependência nova
no jogo. Registro de aceite: seção “Fechamento verificado” do `../MEGA_ARQUIVO.md`.
