# ARQUITETURA — FUMIGA (mapa para o TDD)

> Fonte da verdade: `📄 DOCUMENTO DE ARQUITETURA TÉCNICA (TDD)_ FUMIGA_.docx` (raiz do repo).
> Este documento mapeia como o repositório implementa o TDD e inventoria as
> linguagens usadas por camada.

## 1. Stack (TDD §1) e onde cada linguagem entra

| Camada | Linguagem | Observação |
|---|---|---|
| Lógica do jogo | **JavaScript (Vanilla ES6 Modules)** | Prescrito pelo TDD §1 ("Linguagem: JavaScript (Vanilla ES6 Modules) + HTML5 + CSS3"). Nada de frameworks/TS no core. |
| Entrada/UI DOM | **HTML5** | `index.html` — canvas + splash + overlay de erros. |
| Estilos/HUD/animações | **CSS3** | `css/style.css` — vinheta tática, flash de dano, splash. |
| Dados de gameplay | **JSON** | `assets/data/mutations.json` (8 raridades), `assets/data/skills.json` (árvore de habilidades), `assets/sprites/manifest.json` (atlas/anims). |
| Shaders | **GLSL ES** | `assets/shaders/chromakey.frag` — fonte em arquivo próprio; `js/systems/WebGLShaders.js` apenas registra o pipeline. |
| Vetor | **SVG** | `assets/ui/favicon.svg`. |
| Servidor de dev | **Python 3** (stdlib) | `tools/serve.py` — porta única (3000/`$PORT`), dual-stack IPv4+IPv6, `/healthz`, CORS, log por request, shutdown gracioso. Tooling fora do core: o TDD não prescreve a linguagem do servidor de dev. |
| Geradores de assets | **Node.js** | `tools/generate-sprites.mjs`, `tools/generate-audio.mjs` — regeneram 100% dos assets offline (`npm run gen:assets`). |
| Testes | **Node.js** (`node:test` + jsdom + @napi-rs/canvas) | `npm test` — importa todos os módulos com o Phaser global e valida mundo/economia. |
| Empacotamento mobile | **Capacitor** | `capacitor.config.json`, `npm run cap:build`. |

## 2. Estrutura de diretórios (TDD §2) — status

Implementada 1:1 conforme o organograma do TDD, com as cenas de fluxo iniciais
(ortodoxas ao estilo Dead Cells) além das 5 do organograma:

- `scenes/TitleScene.js` — tela de título ("TOQUE PARA COMECAR", brasas, operária passeando).
- `scenes/SkillTreeScene.js` — ARVORE REAL (árvore de meta-habilidades em tela própria).
- `scenes/LoadingScene.js` — loading de run (nome do bioma + barra + DICA de assets/data/tips.json).

**Ordem de telas (como em Dead Cells):**
`Boot → Preload → Title → MainMenu → (SkillTree | Loading[bioma]) → GameScene + UIScene`

- No MainMenu: `INICIAR COLONIA` / `ARVORE REAL` / `SOM` / `CREDITOS` — texto puro,
  cursor `>`, seleção amarela, teclado (setas+enter) e toque.
- `assets/shaders/` — fontes GLSL externas (TDD §7.2).
- `assets/data/skills.json`, `assets/data/tips.json` — dados data-driven.
- `docs/` — documentação. `tools/serve.py` + `tools/build_dist.py` — tooling Python.

## 3. Pipeline de entrega (preview à prova de falhas)

```
python3 tools/serve.py
   └─ 1. tools/build_dist.py  → dist/index.html (ARQUIVO ÚNICO, ~1.3MB)
   │       · topo-sort dos 33 módulos (js/main.js como entrada)
   │       · remove import/export e injeta numa IIFE estrita
   │       · inunda o HTML com CSS + Phaser (vendor) + bundle
   │       · falha alto em colisão de nomes top-level (detector embutido)
   └─ 2. serve em :3000 (porta única, dual-stack IPv4+IPv6)
           · "/"            → dist/index.html (bundle; fallback: dev)
           · "/assets/*"    → arquivos do jogo (sprites, áudio, JSON, GLSL)
           · "/healthz"     → health-check p/ proxies
```

O browser do preview faz **zero requisições de script** — só `/` + `/assets/*`.
Isso elimina da equação: ES Modules via XHR, MIME estrito de `.js`, CORS de
módulos e caches intermediários.

## 4. Testes (garantia de boot do preview)

`npm test` (12 testes) inclui `tests/integration/dist.spec.mjs`, que:
1. roda o mesmo build do servidor;
2. **boota `dist/index.html` de verdade** em jsdom (canvas real via @napi-rs/canvas,
   assets do repositório via ResourceLoader, blob:/data: URLs emulados);
3. espera o pipeline completo: `window.__FUMIGA__` → BootScene → PreloadScene
   (XHR de todos os assets) → **MainMenuScene ativa**, com zero erros de runtime.

Se esse teste passa, a página que o preview serve inicializa a engine de ponta a ponta.

## 5. Decisões de runtime do preview

- **Porta única 3000** (`$PORT` respeitado): um único preview na plataforma.
- **Bind dual-stack `::`**: proxies de preview podem chegar via IPv6 — bind só
  em `0.0.0.0` recusa essas conexões ("página indisponível").
- **`Phaser.AUTO`**: WebGL prioritário com fallback Canvas (TDD §1: "WebGL
  prioritária, fallback para Canvas"). Sem WebGL, o ChromaKey simplesmente não
  registra (nenhum asset depende dele — ver nota em WebGLShaders.js).
- **Sem `X-Frame-Options`/CSP**: necessário para o embedding em iframe do preview.
