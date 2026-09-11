# FUMIGA — Beta Jogável 🐜

**Roguelite / Colony-Sim / Estratégia indireta** — Phaser 3 + Vanilla ES6 Modules, pronto p/ Web e APK (Capacitor).

Este beta implementa o ciclo principal definido no **GDD**, respeitando a arquitetura do **TDD**, a estética da **Art Bible** e as regras de UI do documento de **refação de HUD/Menu Radial**.

## ▶️ Como jogar (Web)

```bash
npm install        # devDeps (phaser, jsdom, @napi-rs/canvas)
npm start          # serve em http://localhost:8080 (bind 0.0.0.0)
```

Ou sirva a pasta com qualquer servidor estático (o jogo usa ES Modules + XHR de assets).

## 🎮 Controles (toque + mouse + teclado)

| Ação | Gestos |
|------|--------|
| **Pausa Tática / Menu Radial** | Segurar parado (300ms) — o tempo cai p/ 10% e o anel de fatias aparece |
| **Confirmar ação** | Arrastar até a fatia e soltar o dedo |
| **Pan de câmera** | Arrastar |
| **Zoom** | Pinch (2 dedos) ou `Q`/`E` |
| **Pausa (desktop)** | `Espaço` |
| **Pan (desktop)** | `W A S D` |

### O Menu Radial é contextual
- **Na terra (subterrâneo):** `CAVAR`
- **Num túnel vazio:** construir `BERÇÁRIO / DESPENSA / DEFESA / ARMADILHA / FUNGOS`
- **Na superfície:** `COLETAR / ATACAR / RECUAR` (feromônios)
- **Na Câmara da Rainha:** parir formigas (`OPERÁRIA, COLETORA, ...`)

## 🔁 Core Loop implementado
Início aleatório → Escavar → Coletar Biomassa na superfície → Parir/Mutar exército → Vencer ondas + Chefe do bioma → Escolher Gene (3 cartas) → Escolher rota de Migração → Arena final (`A Primeira Rainha`). **Permadeath**: HP da Rainha a zero encerra a run e credita Geleia Real no metaprogresso.

## 🧬 Conteúdo do beta
- **15 biomas + Arena** (`js/world/BiomeManager.js`) com perigos (fogo, veneno, gelo, teia, zumbis, flora, escuridão...).
- **10 classes de formiga** (Operária, Coletora, Exploradora, Soldado, Guardiã + elites Cuspidora, Espiã, Gigante, Curandeira, Escavadeira).
- **4 arquétipos de chefe** + rainha rival (assimilação via Espiã).
- **Sistema de 3 cartas** com as 8 raridades do GDD (`assets/data/mutations.json`).
- **Metaprogresso** (Árvore de Habilidades) persistido em IndexedDB/localStorage (`SaveManager`).
- **A\***, **Behavior Trees**, **Feromônios**, **Pausa Tática** e **Menu Radial** conforme o TDD.

## 🎨 Arte e Áudio (100% procedural, offline)
Sem assets externos: `npm run gen:assets` regenera **sprites, tilesets, UI, fonte bitmap e WAVs** via `tools/generate-sprites.mjs` / `tools/generate-audio.mjs` (pixel a pixel, crisp, hexápodes — regras da Art Bible). O resultado já está commitado em `assets/`.

## 🧪 Testes

```bash
npm test            # unit + integração (headless, jsdom + @napi-rs/canvas)
```

## 📱 Build Android (APK)
`npx cap add android && npm run cap:build` (Capacitor já configurado em `capacitor.config.json`).

## 📚 Docs de origem
Os `.docx` na raiz são a fonte: GDD, TDD, Art Bible, Roadmap, Estética e a refação de UI. Veja `docs/BETA_NOTES.md` para o que foi implementado vs. simplificado.
