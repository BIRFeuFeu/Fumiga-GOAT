# FUMIGA — Colônia Eterna

**Roguelite de colônia de formigas em pixel art.** Canvas 2D + JavaScript puro (módulos ES),
sem build e sem dependências — todo o texto do jogo está em português.

## ▶️ Jogar agora

### **https://feufeup.github.io/Fumiga-GOAT/**

O endereço acima detecta o aparelho: **PC cai na versão de teclado+mouse** ([`game/`](game/)) e
**celular cai na versão mobile de toque** ([`game/mobile/`](game/mobile/)) — duas versões
paralelas sobre o mesmo motor, atualizadas juntas, cada uma com seu save independente.
Para jogar no seu computador, veja [Rodar localmente](#-rodar-localmente) abaixo.

## 🐜 O jogo

A Rainha vive dentro do formigueiro e a colônia migra por **6 biomas**, estilo *Dead Cells*:
ao fim de cada mapa há um **chefão**, e derrotá-lo abre a passagem para o próximo. Entre as
ondas, **drafts de mutações** (escolha 1 de 3) moldam a build, e a essência coletada alimenta
a **Árvore da Evolução** — arte ancestral no estilo da TITLE, inicialmente cinza e
restaurada em cores pelas compras. São **sete patamares**, com 49 melhorias principais
(143 níveis) e sete frutos com miniárvores, totalizando 137 definições. Os galhos sobem
em preço e potência conforme as vitórias; os quatro ofícios continuam identificados por
cor (Guerra, Coleta, Criação e Real). O fruto do mundo 7/Pálida é uma prévia futura;
os seis mapas jogáveis e os saves anteriores são preservados.

| # | Mapa | Chefão |
|---|------|--------|
| 1 | Planície do Amanhecer | O Tamborilador |
| 2 | Floresta de Musgo | A Caçadora Astuta |
| 3 | Pântano Pútrido | A Sombra Alada |
| 4 | Deserto Calcinado | A Matriarca Rival |
| 5 | Bosque Dourado | O Galhada Real |
| 6 | Pico Congelado | O Devastador |

Por trás dos seis degraus espera o sétimo: **A PÁLIDA**, a Névoa-Mãe — a história
completa, do prólogo (a Noite Branca) à derrota final, está em
[`LORE.md`](LORE.md).

📚 **Planejamento consolidado:** [`MEGA_ARQUIVO.md`](MEGA_ARQUIVO.md) reúne integralmente
os quatro documentos de atualização, a lore e as regras de trabalho, com índice e
verificação de integridade. Os seis arquivos originais foram mantidos intactos.

**Depois do final** o jogo não acaba: cada vitória abre uma nova **ERA** do
Formigueiro Eterno, destrava um nível da **ASCENSÃO DA NÉVOA** (até 20, estilo
Hades/Slay the Spire — inimigos e chefes mais fortes, essência em dobro) e paga
as **PROFECIAS** (16 conquistas permanentes com essência).

São **11 classes de formigas**, todas baseadas em **espécies reais** e separadas em
3 grupos: **⚔️ Combate/Defesa** (Formiga-Bala, Queixo-de-Arpão, Formiga-Acrobata,
Formiga-de-Fogo, Cefalote), **🍃 Coleta/Exploração** (Formiga-Cortadeira, Formiga-Pote-de-Mel,
Formiga-Prata), **🏥 Construção/Cura/Criação** (Formiga-Matabele, Formiga-Tecelã) — mais a
**DINOPONERA**, a maior formiga operária real, 20× uma soldado, uma por expedição
e uma cena viva **dentro do formigueiro**, no espírito do *Ant Colony*: as formigas escavam,
entregam comida, cuidam das larvas e a Rainha põe ovos.

📖 Detalhes completos em [`game/README.md`](game/README.md).

## 🎮 Controles essenciais

| Ação | Como |
|------|------|
| Mover a câmera | arrastar com o **botão esquerdo** (ou `WASD` / setas) |
| Ordenar (atacar / coletar / mover) | **clique esquerdo** nas formigas selecionadas |
| Selecionar | **botão direito**: clique = 1 formiga, arrastar = caixa, duplo clique = todas do tipo |
| Chocar formigas | `Q` abre as 11 classes · `1`–`0` chocam · a Dinoponera é só no card |
| Entrar no formigueiro | `B` |
| Defender / chamar onda | `F` (guarda) · `G` (próxima onda, bônus de essência) |
| Pausa · Som · Tutorial | `Esc` · `M` · `T` |

## 🧪 Testes

A bateria headless do projeto roda sem navegador e sem dependências:

```bash
npm test              # os 19 testes EM PARALELO, com resumo e tempos (~45 s)
npm run test:quick    # só os rápidos, para iterar (~10 s)
node game/test/run-all.mjs --only=sim,tree   # só alguns

FORCE=3 node game/test/sim.mjs   # simulação indo direto ao chefe do mapa 3
```

**No navegador de verdade** (Chromium headless, só para desenvolvimento):

```bash
bash tools/setup-dev.sh   # instala Playwright + Chromium (uma vez por máquina/sessão)
npm run inspect           # PC + mobile: todas as telas e os 6 mapas — erros de JS, 404,
                          # glifos que viram "?", FPS e capturas em /tmp/fumiga-inspect
npm run inspect:layout    # auditoria de layout: todas as telas, com e sem FONTE GRANDE —
                          # texto fora da tela, colidindo, vazando da caixa, botões sobrepostos
```

O **CI** (GitHub Actions) está pronto em [`tools/ci/testes.yml`](tools/ci/testes.yml): copiado para
`.github/workflows/`, ele roda as duas coisas em todo push e guarda as capturas como artefato.
Para depurar, abra o jogo com **`?debug`** (ex.: `game/?debug&tela=RUN&mapa=3&seed=42&invencivel`):
save separado, atalhos direto para qualquer tela e overlay de FPS (F3). Detalhes em
[`AGENTS.md`](AGENTS.md).

> A simulação completa (sem `FORCE`) joga os 6 mapas de uma vez e pode **empatar** por azar do
> autopiloto — por isso a verificação usa os chefes 1, 3 e 6, que são rápidos e determinísticos.
>
> `test/attack.mjs` mede o dano real de uma formiga de cada casta e garante que **só** soldado,
> cuspidora, bombeira, guarda de ébano e formiga gigante atacam — operária, coletora, batedora e
> curandeira causam dano zero (elas trabalham e fogem).
>
> `test/endless.mjs` joga o modo **SOBREVIVÊNCIA** de ponta a ponta pelo fluxo real do jogo:
> derruba o chefão, confere que o ciclo vira (sem travar em "mapa limpo"), o bônus de essência,
> o draft de recompensa e o orçamento das ondas escalando (+30% por ciclo).

## 🗂 Onde está o quê

| Caminho | O que é |
|---------|---------|
| [`index.html`](index.html) | Página inicial do site: leva para `game/` (é o endereço do Pages) |
| [`AGENTS.md`](AGENTS.md) | **Mapa rápido para desenvolver**: comandos, modo debug, arquitetura, receitas e armadilhas |
| [`game/`](game/) | **O jogo** — HTML, CSS, módulos ES e sprites |
| [`game/js/nest.js`](game/js/nest.js) | A cena de dentro do formigueiro (câmaras, túneis, IA das formigas) |
| [`game/js/brain.js`](game/js/brain.js) | **Cérebro da colônia**: cada formiga decide sozinha (IA de utilidade) sob necessidades da colônia, cotas por tarefa e feromônio (estigmergia) |
| [`game/test/`](game/test/) | Auditorias de assets, layout, árvore, travamentos e simulação · `run-all.mjs` (paralelo) · `inspect.mjs` (navegador) |
| [`game/js/debug.js`](game/js/debug.js) | Modo debug (`?debug`): só carrega com o parâmetro na URL |
| [`tools/setup-dev.sh`](tools/setup-dev.sh) | Prepara Playwright + Chromium para os testes de navegador |
| [`tools/prepare_assets.sh`](tools/prepare_assets.sh) | Regenera os sprites a partir das artes-fonte |
| [`tools/fix_title_parallax.py`](tools/fix_title_parallax.py) | Repara as 4 camadas de parallax do TITLE (matte do recorte, paleta) e as deixa no tamanho exato de desenho |
| `animais/`, `arvores/`, `arbustos/`, `pedras/`, `cristais/`, `cenarios/`, `icones/` | Artes-fonte |

## 💻 Rodar localmente

```bash
npm run serve        # servidor sem cache em http://localhost:8000 — abra /game/
# (ou, sem Node: cd game && python3 -m http.server 8080)
```

(Módulos ES exigem um servidor HTTP — abrir o `index.html` direto pelo disco não funciona.)

## 📄 Licença

MIT — veja [LICENSE](LICENSE).
