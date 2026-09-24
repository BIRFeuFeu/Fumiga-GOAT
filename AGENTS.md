# AGENTS.md — mapa rápido para quem desenvolve o FUMIGA

Leia isto **antes** de mexer no código. É o resumo operacional; as regras obrigatórias
continuam em [`REGRAS_DE_TRABALHO.md`](REGRAS_DE_TRABALHO.md) (fluxo: pesquisar →
perguntar → implementar → mostrar arte → mobile → check-in → jogar → preview → salvar).
Lore e planejamento: [`LORE.md`](LORE.md) e [`MEGA_ARQUIVO.md`](MEGA_ARQUIVO.md). **Não leia
o MEGA_ARQUIVO inteiro** (120 KB); abra só a seção que interessa.

## 1. Começo de sessão (sempre)

```bash
bash tools/setup-dev.sh     # ~10 s: Playwright + Chromium headless (não persiste entre sessões)
npm run test:quick          # ~10 s: confirma que a base está verde
```

| Comando | Para quê | Tempo |
|---|---|---|
| `npm run test:quick` | enquanto implementa (sem uitest/endless/mobile) | ~10 s |
| `npm test` | bateria completa em paralelo (a mesma do CI) | ~45 s |
| `node game/test/run-all.mjs --only=sim,tree` | só alguns testes | — |
| `npm run inspect` | **joga no navegador**: PC + mobile, todas as telas, 6 mapas; erros JS, 404, glifos “?”, FPS | ~100 s |
| `node game/test/inspect.mjs --pc --telas=TREE,RUN-MAPA3` | inspeção focada | ~10 s |
| `npm run inspect:hud` | HUD orgânico nos 6 biomas, tecla H, acessibilidade | ~40 s |
| `npm run serve` | servidor do preview **sem cache**, 0.0.0.0:8000 (use com `start_process`) | — |

As capturas do `inspect` vão para `/tmp/fumiga-inspect/*.png` (fora do Git): **abra-as com
`read_file`** para cumprir a Regra 4 de verdade. Dica: `montage` (ImageMagick) junta várias
numa folha só.

## 2. Modo debug (`?debug`)

Carregado só com `?debug` na URL (import dinâmico; o jogador normal nunca baixa `js/debug.js`).
Usa um save **separado** (`…_debug`), então pode abusar à vontade.

```
/game/?debug&tela=RUN&mapa=3&seed=42&invencivel      expedição direta no mapa 3, mapa fixo
/game/?debug&tela=TREE&essencia=5000                 árvore com essência para comprar
/game/mobile/?debug&tela=NINHO                       dentro do formigueiro, versão mobile
parâmetros: tela=TITLE|MODE|TREE|OPTIONS|HELP|PROPHECY|MEMORY|RUN|NINHO · mapa=1..6 ·
            modo=campanha|sobrevivencia|enxame|cacada · seed=N · invencivel · essencia=N ·
            velocidade=N · cutscene (não pular) · limpo (zera o save debug) · hud=0
```
Overlay (F3): FPS, pior frame, ms de CPU por frame, tela/mapa/onda, entidades, seed, glifos
faltando e o último erro. No console: `FUMIGA.ajuda()`, `FUMIGA.go('RUN', {mapa: 2, seed: 7})`,
`FUMIGA.estado()`, `FUMIGA.essencia(n)`, `FUMIGA.invencivel()`.

## 3. Arquitetura (JS puro, módulos ES, Canvas 2D 960×540, sem build)

`game/index.html` (PC) e `game/mobile/index.html` (toque) carregam **o mesmo** `game/js/main.js`.

| Módulo | Responsabilidade |
|---|---|
| `main.js` | boot (fontes → sprites → assado), loop `update/render`, tela de carregamento, liga o modo debug |
| `state.js` | `G` (singleton global: `G.screen`, `G.save`, `G.run`), save/load em localStorage, profecias |
| `config.js` | **todos os dados**: `UNITS` (11 castas), `ENEMIES`, `BOSSES`, `MUTATIONS`, `META_NODES` (árvore), `CHAMBERS`, `MAPS` (6 biomas), `PROPHECIES`, textos de ajuda. Sem imports |
| `game.js` | orquestrador: telas (PRETITLE→TITLE→MODE→RUN, TREE, OPTIONS, HELP, PROPHECY, MEMORY), `newRun`, HUD, draft, pausa, fim de run, `__debug` |
| `render.js` | desenho do mundo, formigas, chefes (sheets direcionais), menus/título |
| `units.js` | formigas aliadas, rainha, ovos, compra (`buyUnit`), IA de papéis, entrar/sair do ninho |
| `brain.js` | IA de utilidade da colônia: necessidades, cotas, feromônio (estigmergia) |
| `enemies.js` | inimigos e os 6 chefes (fase 2 abaixo de 50%) |
| `waves.js` | diretor: calmaria → ondas → chefe → próximo mapa (`director`) |
| `world.js` | geração procedural por bioma (`genWorld(seed, mapIdx)`), props, recursos, colisão |
| `nest.js` | cena de dentro do formigueiro (câmaras, túneis, “olho lá fora”) |
| `meta.js` | tela da Árvore da Evolução (layout, zoom, compra) |
| `mutations.js` | draft 1-de-3 |
| `combat.js` · `particles.js` · `lore_vfx.js` | projéteis/orbes · partículas com pooling · VFX por casta (orçamento `vfxAllow`) |
| `lore_hud.js` | HUD orgânico por bioma, barra-gaster da rainha, visão de feromônio (H) |
| `cutscenes.js` | cutscenes em camadas (Noite Branca etc.), biblioteca MEMÓRIAS |
| `tutorial.js` · `ui.js` · `font.js` | tutorial em cartões · primitivos de UI em canvas · fonte bitmap (atlas) |
| `camera.js` · `input.js` · `fog.js` · `audio.js` · `utils.js` | câmera/zoom/shake · teclado+mouse em coords 960×540 · névoa de guerra · áudio procedural WebAudio · RNG/matemática |
| `debug.js` | modo debug (seção 2) — ferramenta, não é jogo |
| `mobile/touch.js` | **única** camada exclusiva do mobile: gestos e botões virtuais → teclas/mouse do motor |

## 4. Receitas (onde mexer)

- **Nova casta / inimigo / chefe / mutação / nó da árvore / câmara / mapa** → dados em
  `config.js`; comportamento em `units.js` / `enemies.js` / `mutations.js`; sprite novo no
  `MANIFEST` de `assets.js` (o `test/assets.mjs` acusa se faltar).
- **Novo atalho de teclado** → trate em `game.js` **e** crie o botão/gesto em `mobile/touch.js`
  (Regra 9) + texto em `HELP_CONTROLS_TOUCH`.
- **Tela nova** → `update*`/`render*` em `game.js` (switch de `G.screen`), entrada por
  `startTransition`; acrescente em `__debug.openScreen` e na lista `SCENES` do `test/inspect.mjs`.
- **Balanceamento** → `config.js`; valide com `FORCE=3 node game/test/sim.mjs` e `npm test`.

## 5. Armadilhas conhecidas

- **Fonte bitmap**: só existem os glifos de `FONT_CHARS` (`font.js`). Qualquer outro caractere
  vira “?”. `test/assets.mjs` checa os literais e o modo debug/`inspect` checa em tempo real.
  Para símbolos (setas, ícones), desenhe com `fillRect` ou use um sprite.
- **Cache de assets**: as imagens são pedidas com `?v=ASSET_V` (`assets.js`). Trocou um PNG
  que já existia? Suba `ASSET_V`, senão celulares continuam com o antigo.
- **Preview velho**: `python3 -m http.server` deixa o navegador guardar módulos ES em cache. Use
  `npm run serve` (sem cache).
- **Save**: PC `fumiga_goat_save_v1`, mobile `fumiga_goat_mobile_save_v1`, debug `…_debug`.
- **Testes headless** simulam DOM/canvas com Proxy: código novo que usa uma API de DOM
  diferente pode precisar de guarda (`typeof document !== "undefined"`).
- **Capturas no sandbox**: não há fonte de emoji, então os ícones emoji dos botões de toque
  (🏠 🎯 ⏸) saem vazios nas capturas. No celular aparecem normalmente.
- `docs.mjs` exige que os 6 documentos originais estejam **byte a byte** dentro do
  `MEGA_ARQUIVO.md`: editou um deles, atualize o bloco e o hash no registro de integridade.
- Cutscene Noite Branca: as camadas são PNGs grandes (~25 MB), reduzidas para 320×180 no
  carregamento. Ficam assim por decisão do usuário (2026-09-23).

## 6. Salvar no GitHub (Regra 11 + CI)

**O merge só acontece com os testes verdes** (decisão do usuário, 2026-09-23).

O workflow está pronto em `tools/ci/testes.yml` (bateria headless + inspeção no Chromium, com
capturas como artefato). Ele **só liga** quando estiver em `.github/workflows/testes.yml`, e o app
do GitHub do agente **não pode** criar arquivos ali (falta a permissão `workflows`: o push é
recusado). Não coloque o arquivo em `.github/workflows/` pelo agente, porque isso trava todo push.

Enquanto o CI não estiver ativo, a trava é local:
```bash
npm test && npm run inspect                # os dois precisam passar
git push origin <branch-da-sessão>
gh pr create --base main --fill && gh pr merge --merge
```
Com o CI ativo (arquivo em `.github/workflows/`), troque a última linha por:
```bash
gh pr create --base main --fill && gh pr checks --watch --fail-fast && gh pr merge --merge
```
Se algo falhar: corrija e repita. Não delete o branch.
