# 📜 Regras de Trabalho — Desenvolvimento do FUMIGA

Este documento define as **regras obrigatórias** que o assistente de desenvolvimento (Arena.ai Agent Mode)
deve seguir em **todas** as interações e alterações feitas no jogo **FUMIGA — Colônia Eterna**.

---

## Regra 1 — Perguntar antes de implementar 🎯

> **Sempre fazer perguntas com opções de respostas para saber como o usuário quer que as novas alterações sejam implementadas.**

- Antes de escrever qualquer código, apresentar **perguntas objetivas com opções claras** (ex.: A, B, C),
  permitindo também resposta personalizada.
- As opções devem descrever **o impacto de cada escolha** (visual, gameplay, desempenho, complexidade).
- Só iniciar a implementação após a confirmação da direção desejada.
- Perguntar sobre: estilo visual, balanceamento, escopo da feature, onde ela aparece no jogo, etc.

**Exemplo de formato:**

```
Como você quer que o novo chefão do Bioma 4 se comporte?
A) Chefão de arena fixa, com invocações de lacaios (estilo boss clássico)
B) Chefão que persegue o jogador pelo mapa (estilo perseguição tensa)
C) Chefão em fases, mudando de padrão a cada 25% de vida
D) Outro: (descreva)
```

---

## Regra 2 — Pesquisar inspirações em jogos indies 🎮

> **Sempre pesquisar na Web buscando inspirações em jogos indies para as alterações que forem pedidas.**

- Para cada mudança solicitada, realizar **pesquisa na Web** buscando referências de **jogos indies**
  reconhecidos (ex.: *Dead Cells*, *Hollow Knight*, *Vampire Survivors*, *Slay the Spire*, *Stardew Valley*, etc.).
- Registrar no retorno ao usuário **quais jogos serviram de inspiração** e **o que foi aproveitado** de cada um
  (mecânica, feel, UI, balanceamento, feedback visual).
- A inspiração deve ser adaptada à identidade do FUMIGA: pixel art, colônia de formigas, roguelite de biomas.
- As fontes pesquisadas devem ser citadas (links) para o usuário conferir.

---

## Regra 3 — Check-in de verificação ✅

> **Sempre fazer um check-in para conferir se tudo que foi pedido foi realmente implementado no jogo.**

Ao final de cada tarefa, apresentar um **checklist de conferência** com este formato:

```markdown
### ✔️ Check-in de Implementação
| # | Item pedido | Status | Onde foi implementado |
|---|-------------|--------|-----------------------|
| 1 | Nova mutação X | ✅ | `game/js/mutations.js` |
| 2 | Animação de ataque | ✅ | `game/js/player.js` |
| 3 | Ajuste de dano | ⚠️ Parcial | Pendente balanceamento |
```

- Nenhum item pedido pode ficar sem resposta no checklist.
- Itens pendentes ou parciais devem ser **explicitamente sinalizados** com o motivo.
- Rodar os **testes headless** do jogo sempre que existirem mudanças de lógica.

---

## Regra 4 — Jogar e inspecionar o jogo após qualquer alteração 🐛

> **Qualquer alteração: acessar o jogo e jogá-lo, inspecionando buscando bugs, erros estruturais ou imperfeições.**

- Após cada mudança, **subir o jogo localmente** e acessá-lo como um jogador:
  - verificar **console do navegador** (erros de JavaScript, assets 404, warnings);
  - testar o **fluxo afetado pela mudança** de ponta a ponta (ex.: se mexeu no draft de mutações, jogar até um draft);
  - observar **bugs visuais**, quebras de layout, sprites faltando, textos errados;
  - atenção a **erros estruturais** (módulos quebrados, imports errados, estados inválidos).
- Reportar ao usuário: **o que foi testado, o que funcionou e o que foi encontrado/corrigido**.
- Nenhuma alteração é considerada pronta sem essa rodada de inspeção em jogo.

---

## Regra 5 — Manter o jogo otimizado ⚡

> **Sempre manter o jogo o mais otimizado possível, evitando a criação de arquivos desnecessários ou cache que possam comprometer o desempenho.**

- **Não criar arquivos desnecessários**: preferir editar arquivos existentes a duplicar versões
  (nada de `player_v2.js`, `backup_*.js`, `teste123.png`).
- **Não adicionar dependências** sem necessidade real — o projeto é JavaScript puro, sem build (Canvas 2D + módulos ES).
- **Sem cache/lixo no repositório**: respeitar o `.gitignore`; não versionar caches, temporários ou artefatos pesados.
- **Código eficiente**:
  - evitar alocações dentro do loop de renderização (objetos reutilizados/object pooling quando fizer sentido);
  - cuidado com loops aninhados por frame e com `drawImage` excessivo fora da tela (culling);
  - sprites e imagens otimizadas em tamanho/peso antes de entrar no jogo.
- **Limpeza**: ao refatorar, remover código morto, comentários obsoletos e assets órfãos.
- O desempenho é parte da entrega: o jogo deve rodar liso a 60 FPS sempre que possível.

---

## Regra 6 — Imagens em alta resolução, sempre pixel art harmônico 🎨

> **Sempre criar imagens de alta resolução, mantendo o estilo pixel art, e que mantenham o mesmo estilo artístico de maneira harmoniosa.**

- Toda imagem criada para o jogo (sprites, ícones, cenários, UI, capas) deve ser gerada em
  **alta resolução** e depois adequada ao tamanho de uso — nunca arte borrada ou subdimensionada.
- **Estilo obrigatório: pixel art**, sempre em harmonia com a identidade visual já existente do
  FUMIGA (paleta escura violeta/âmbar, contorno limpo, leitura clara em tamanho pequeno).
- Antes de gerar, observar os sprites/atlas existentes (`game/assets/`) para **combinar paleta,
  escala de pixel, sombreamento e silhueta** — a arte nova não pode parecer "colada de fora".
- Imagens entram otimizadas (Regra 5): tamanho certo para o uso, sem peso desnecessário.

---

## Regra 7 — Abrir o preview após qualquer pedido ou alteração 🖥️

> **Sempre abrir o preview depois de qualquer pedido ou alteração.**

- Ao final de **toda** tarefa — feature, correção, arte ou refatoração — o jogo deve estar
  **rodando no preview ao vivo** (servidor local do repositório) para o usuário jogar na hora.
- Se o servidor já estiver no ar, confirmar que continua saudável e servindo o código atualizado;
  se não estiver, subi-lo.
- O preview é parte do check-in: ele acontece depois das verificações (Regras 3 e 4), nunca no lugar delas.

---

## 🔄 Resumo do fluxo obrigatório a cada pedido

```text
1. PERGUNTAR  → opções de implementação (Regra 1)
2. PESQUISAR  → inspirações em jogos indies na Web (Regra 2)
3. IMPLEMENTAR → seguindo as escolhas do usuário e a otimização (Regra 5)
4. ARTE       → imagens em alta resolução, pixel art harmônico (Regra 6)
5. VERIFICAR  → check-in com checklist do que foi pedido (Regra 3)
6. JOGAR      → inspeção em jogo buscando bugs e imperfeições (Regra 4)
7. PREVIEW    → abrir o jogo no preview ao vivo (Regra 7)
```

> Estas regras valem para **qualquer** alteração: features, correções, balanceamento,
> arte, sons, UI ou refatorações. Em caso de dúvida, consultar este documento
> e perguntar ao usuário antes de prosseguir.
