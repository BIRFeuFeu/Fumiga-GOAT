# FUMIGA — Colônia Eterna

**Roguelite de colônia de formigas em pixel art.** Canvas 2D + JavaScript puro (módulos ES),
sem build e sem dependências — todo o texto do jogo está em português.

## ▶️ Jogar agora

### **https://feufeup.github.io/Fumiga-GOAT/**

O endereço acima cai direto no jogo (a página inicial só leva você para [`game/`](game/)).
É o mesmo código que roda no seu computador — o GitHub Pages publica a pasta `game/` como
um site estático, sem passo de build.

<details open>
<summary><b>O link ainda não abre? Ligar o GitHub Pages — uma única vez, ~30 segundos</b></summary>

1. Abra **Settings** → **Pages** (nas configurações deste repositório)
2. Em *Build and deployment* → **Source**, escolha **Deploy from a branch**
3. **Branch:** `main` · **pasta:** `/ (root)` → clique em **Save**
4. Espere ~1 minuto e recarregue o link

A partir daí **todo merge na `main` republica o jogo automaticamente** — o site é o próprio
repositório, então não existe build, servidor, ferramenta externa nem IA no caminho.
</details>

<details>
<summary><b>Opcional — publicar só o jogo (site mais enxuto, com os testes como porteiro)</b></summary>

O arquivo [`deploy/github-pages.yml`](deploy/github-pages.yml) é um workflow pronto que
(a) roda a bateria de testes headless do jogo e (b) publica **apenas** a pasta `game/`,
deixando as artes-fonte fora do site.

Para usar:

1. No GitHub, crie o arquivo `.github/workflows/pages.yml` com o conteúdo de
   [`deploy/github-pages.yml`](deploy/github-pages.yml)
   (*Add file* → *Create new file*, colando o conteúdo);
2. Em **Settings → Pages → Source**, troque para **GitHub Actions**.

Os dois modos não funcionam ao mesmo tempo: o Source é um ou outro.
</details>

## 🐜 O jogo

A Rainha vive dentro do formigueiro e a colônia migra por **6 biomas**, estilo *Dead Cells*:
ao fim de cada mapa há um **chefão**, e derrotá-lo abre a passagem para o próximo. Entre as
ondas, **drafts de mutações** (escolha 1 de 3) moldam a build, e a essência coletada alimenta
a **Árvore da Evolução** — 49 nós e 143 níveis de progresso permanente, organizada nos
mesmos grupos das formigas (⚔️ Guerra, 🍃 Coleta, 🏥 Criação e 👑 Real), com nós **lendários**
por espécie e keystones com trade-off.

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

A bateria headless do projeto roda sem navegador:

```bash
cd game
node test/assets.mjs && node test/tree.mjs && node test/stuck.mjs && \
node test/layout.mjs && node test/uitest.mjs && node test/attack.mjs && \
node test/endless.mjs && node test/prophecy.mjs

FORCE=3 node test/sim.mjs   # simulação indo direto ao chefe do mapa 3
```

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
| [`game/`](game/) | **O jogo** — HTML, CSS, 24 módulos ES e sprites |
| [`game/js/nest.js`](game/js/nest.js) | A cena de dentro do formigueiro (câmaras, túneis, IA das formigas) |
| [`game/js/brain.js`](game/js/brain.js) | **Cérebro da colônia**: cada formiga decide sozinha (IA de utilidade) sob necessidades da colônia, cotas por tarefa e feromônio (estigmergia) |
| [`game/test/`](game/test/) | Auditorias de assets, layout, árvore, travamentos e simulação |
| [`deploy/github-pages.yml`](deploy/github-pages.yml) | Workflow opcional (testes + Pages enxuto) |
| [`tools/prepare_assets.sh`](tools/prepare_assets.sh) | Regenera os sprites a partir das artes-fonte |
| `animais/`, `arvores/`, `arbustos/`, `pedras/`, `cristais/`, `cenarios/`, `icones/` | Artes-fonte |

## 💻 Rodar localmente

```bash
cd game
python3 -m http.server 8080
# abra http://localhost:8080
```

(Módulos ES exigem um servidor HTTP — abrir o `index.html` direto pelo disco não funciona.)

## 📄 Licença

MIT — veja [LICENSE](LICENSE).
