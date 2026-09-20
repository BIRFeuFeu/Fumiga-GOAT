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
a **Árvore da Evolução** — 39 nós e 113 níveis de progresso permanente.

| # | Mapa | Chefão |
|---|------|--------|
| 1 | Planície do Amanhecer | O Tamborilador |
| 2 | Floresta de Musgo | A Caçadora Astuta |
| 3 | Pântano Pútrido | A Sombra Alada |
| 4 | Deserto Calcinado | A Matriarca Rival |
| 5 | Bosque Dourado | O Galhada Real |
| 6 | Pico Congelado | O Devastador |

São **9 classes de formigas** (operária, coletora, soldado, cuspidora, guarda de ébano,
batedora, curandeira, bombeira e a **FORMIGA GIGANTE** — 20× uma soldado, uma por expedição)
e uma cena viva **dentro do formigueiro**, no espírito do *Ant Colony*: as formigas escavam,
entregam comida, cuidam das larvas e a Rainha põe ovos.

📖 Detalhes completos em [`game/README.md`](game/README.md).

## 🎮 Controles essenciais

| Ação | Como |
|------|------|
| Mover a câmera | arrastar com o **botão esquerdo** (ou `WASD` / setas) |
| Ordenar (atacar / coletar / mover) | **clique esquerdo** nas formigas selecionadas |
| Selecionar | **botão direito**: clique = 1 formiga, arrastar = caixa, duplo clique = todas do tipo |
| Chocar formigas | `Q` abre as 9 classes · `1`–`9` chocam (`9` = gigante) |
| Entrar no formigueiro | `B` |
| Defender / chamar onda | `F` (guarda) · `G` (próxima onda, bônus de essência) |
| Pausa · Som · Tutorial | `Esc` · `M` · `T` |

## 🧪 Testes

A bateria headless do projeto roda sem navegador:

```bash
cd game
node test/assets.mjs && node test/tree.mjs && node test/stuck.mjs && \
node test/layout.mjs && node test/uitest.mjs && node test/attack.mjs

FORCE=3 node test/sim.mjs   # simulação indo direto ao chefe do mapa 3
```

> A simulação completa (sem `FORCE`) joga os 6 mapas de uma vez e pode **empatar** por azar do
> autopiloto — por isso a verificação usa os chefes 1, 3 e 6, que são rápidos e determinísticos.
>
> `test/attack.mjs` mede o dano real de uma formiga de cada casta e garante que **só** soldado,
> cuspidora, bombeira, guarda de ébano e formiga gigante atacam — operária, coletora, batedora e
> curandeira causam dano zero (elas trabalham e fogem).

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
