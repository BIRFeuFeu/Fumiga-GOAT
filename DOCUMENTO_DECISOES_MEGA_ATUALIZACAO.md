# ✅ DECISÕES FINAIS — MEGA ATUALIZAÇÃO LORE-TOTAL
**Data:** 2026-09-22
**Status:** TODAS AS 23 PERGUNTAS RESPONDIDAS — INICIANDO IMPLEMENTAÇÃO FULL 7 DIAS

## Respostas Consolidadas do Usuário

| # | Pergunta | Escolha | Detalhe |
|---|----------|---------|---------|
| P1 | HUD lore level | **C) Total orgânico vivo por bioma** | HUD que pulsa, respira, muda por bioma. Textura quitina/cera, não plástico. |
| P2 | Parallax layers | **C) 8 camadas cinema** | sky, distant, mid, ground, foreground, particles, VFX, vignette |
| P3 | Não-humanóide | **B+C) Estrito expressivo + fofo** | Olhos grandes tipo Hollow Knight OK, capacete fofo OK, mas nunca humano |
| P4 | Primeira cutscene | **A) Noite Branca, cena por vez estilo HQ Dead Cells** | 3 painéis por cutscene, cada painel 8 layers |
| P5 | Boss fase 2 | **C) Sim com mecânica nova** | <50% vida: Tamborilador chain 3→5, Caçadora invisível, etc |
| P6 | Árvore visual | **B custom) Árvore literal + frutos = mini árvores de habilidades liberadas por mapa** | Tronco Real, galhos Guerra/Coleta/Criação, frutos são mini-árvores que desbloqueiam conforme avança mapas |
| P7 | Habilidades VFX | **B) Médio: aura + partícula + som + ícone lore** | Equilíbrio performance/impacto |
| P8 | Loading lore | **B) Cutscene curta 3-5s HQ Dead Cells com layers + frase + dica** | HQ quadrinhos |
| P9 | Rainha design | **B) Coroa fungo/seda + luz âmbar** | Símbolo orgânico, não humano |
| P10 | Pálida design | **A) Marionete névoa forma formiga rainha ancestral** | Fiel LORE.md, terror sutil |
| P11 | Itens cristais | **A) Cristais geométricos com luz interna + partícula memória** | Âmbar = memória Colônia, violeta = Névoa |
| P12 | Ordem implementação | **A) HUD → VFX → Árvore → Bosses → Cutscenes HQ → Inimigos → Formigueiro → Pálida** | Do visível para épico |
| P13 | Inimigos visual | **C) Redesign pálido/branco filhos da Névoa** | Todos com tom pálido |
| P14 | Formigueiro lore | **B) Renomeia total com VFX seda/fungo/mel** | Ventre Âmbar, Jardim Eterno, Câmara Silenciosa |
| P15 | Resolução parallax | **C) 320x180 estilo Indie Tales upscale nearest** | Pixel gigante, Celeste style |
| P16 | HQ painéis | **A) 3 painéis por cutscene** | Intro, conflito, gancho |
| P17 | Estilo pixel cutscene | **B) Mais detalhado high-res depois reduzido** | Cutscenes mais ricas que gameplay, mesma paleta violeta/âmbar |
| P18 | Feromônio visível | **B) Tecla H — névoa verde comida, vermelha perigo** | Lore total, mostra o que formiga sente |
| P19 | Eras visual | **C) Mundo muda por Era: mais trilhas, seda, portas** | Persistente evolui |
| P20 | Áudio narração | **B) Texto animado letra por letra + SFX ambiente bioma** | Sem voz humana, mantém Rainha Silenciosa |
| P21 | MVP escopo | **C) Full 7 dias** | Tudo: HUD total + VFX + Árvore mini-árvores + 6 cutscenes + bosses fase2 + inimigos pálidos + Pálida + Eras |
| P22 | HUD bioma muda | **A) Sim, muda por bioma** | Folha verde Planície, musgo Floresta, areia Deserto, dourado Bosque, gelo Pico |
| P23 | Cutscene trigger | **C) Ambos auto primeira vez + biblioteca memórias** | Biblioteca "MEMÓRIAS DA COLÔNIA" |

## Implicações Técnicas

### HUD Orgânico Total por Bioma (P1+P22)
- Fundo: textura quitina/cera gerada procedural por bioma (cor base MAPS[].ground + overlay quitina)
- Vida Rainha: gaster desenhado com coroa fungo/seda (P9), pulsa <30% com veias vermelhas Pálida
- Comida: ícone folha cortada (Cortadeira) + gaster mel (Pote-de-Mel) — muda por bioma: Planície trevo, Floresta cogumelo, Pântano alga, Deserto semente, Bosque folha outono, Pico líquen
- Essência: cristal geométrico (P11) com partículas subindo âmbar/violeta
- Onda: Trilha Feromônio com formigas andando
- Minimapa: mapa trilha feromônio, não satélite
- XP: Anéis Árvore

### Parallax 8 Layers 320x180 (P2+P15+P16+P17)
- Resolução base 320x180 upscale 3x para 960x540 com nearest neighbor (pixel gigante respirando)
- 8 layers por painel:
  1. layer0_sky — céu + lua + estrelas
  2. layer1_distant — montanhas/árvores distantes
  3. layer2_mid — ruínas/formigueiro médio
  4. layer3_ground — chão textura solo
  5. layer4_foreground — vinhas/pedras frente (blur leve para profundidade [1])
  6. layer5_particles — vaga-lumes, essência, pollen
  7. layer6_vfx — névoa branca, bruma, luz âmbar
  8. layer7_vignette — vinheta gótica
- Velocidades: 0.01, 0.03, 0.06, 0.08, 0.15, 0.04+sway, 0.02, 0
- Estilo: pixel art detalhado high-res reduzido, paleta violeta/âmbar, contorno limpo, harmonia Fumiga
- Primeiro: Noite Branca 3 painéis HQ Dead Cells

### Não-Humanóide B+C (P3)
- Olhos grandes expressivos OK (Hollow Knight), capacete/armadura fofa OK (Bug Fables)
- Proibido: olhos frontais humanos, boca humana, mãos humanas, roupas humanas, bípede humano, rosto humano
- Rainha: formiga rainha com coroa fungo/seda orgânica (não coroa humana)
- Pálida: marionete névoa forma formiga rainha, fios névoa, olhos escorrendo memória

### Árvore Mini-Árvores por Mapa (P6)
- Tronco = Real, galhos = Guerra/Coleta/Criação
- Frutos não são rainhas mortas, são mini-árvores de habilidades que desbloqueiam conforme avança mapas
- Ex: Ao vencer Planície, libera mini-árvore "Lições do Tamborilador" com 3 nós
- Visual: árvore literal com seiva dourada correndo nas conexões compradas, raízes = Colônia Ancestral

### Boss Fase 2 Mecânica (P5)
- <50% vida: mecânica nova + VFX névoa + frase lore
- Tamborilador: chain 3→5, thump range maior
- Caçadora: invisível 1s (fog) + pounce longe
- Sombra Alada: shriek inverte controles 0,8s (proto Pálida)
- Matriarca: spit 3 direções + frenesi
- Galhada: folhas caindo curam? luta triste
- Devastador: revela Névoa subiu atrás, dropa mapa Topo

### Cutscenes HQ Dead Cells (P4+P8+P16+P20+P23)
- 3 painéis por cutscene, estilo HQ Dead Cells (bordas grossas, balões feromônio, não humanoide)
- Texto animado letra por letra com som máquina escrever
- Trigger: auto primeira vez ao entrar mapa/boss + biblioteca "MEMÓRIAS DA COLÔNIA" no menu para rever
- Loading: cutscene curta 3-5s com frase lore + dica gameplay

### Inimigos Pálidos (P13)
- Redesign sprites: tom pálido/branco, olhos névoa branca, rastro pálido
- Nomes: Rastejante da Névoa, Saúva Corrompida, Ceifadora Pálida, etc.

### Formigueiro Renomeado (P14)
- Berçário = Berço de Seda da Tecelã
- Fungário = Jardim Eterno da Cortadeira
- Despensa = Ventre de Âmbar da Despensa
- Quartel = Arena de Mandíbulas da Guerra
- Refinaria = Câmara de Memória da Essência
- Real = Câmara da Silenciosa

### Feromônio Tecla H (P18)
- Segurar H mostra campos: verde comida, vermelho perigo, com névoa
- Lore: "A COLÔNIA VÊ COM CHEIRO"

### Eras Mundo Muda (P19)
- Era 1: vale vazio
- Era 5: trilhas viram estradas musgo, chuva encontra túneis
- Era 10: colônia já é paisagem, mapa já nasce com trilhas postas
- Visual: mais seda, mais portas, mais fungo por Era

## Ordem Implementação Full 7 Dias (P21+P12)

**DIA 1-2: HUD Orgânico Total por Bioma + Feromônio H**
**DIA 3: VFX Habilidades 11 castas Médio + Inimigos Pálidos**
**DIA 4: Árvore Mini-Árvores por Mapa**
**DIA 5: Bosses Fase 2 Mecânica + Frases Lore**
**DIA 6: Cutscenes HQ Noite Branca 3 painéis x 8 layers 320x180 + Loading HQ + Biblioteca Memórias**
**DIA 7: Formigueiro Renomeado + Eras Mundo Muda + Pálida protótipo + Polimento + Preview**

## Pipeline Arte Frações (P2)

Nunca 1 imagem. Sempre 8 PNGs transparentes 320x180:

```
game/assets/cutscenes/noite_branca/
  panel1_intro/
    0_sky.png
    1_distant.png
    2_mid.png
    3_ground.png
    4_foreground.png
    5_particles.png
    6_vfx.png
    7_vignette.png
  panel2_conflito/
    ...
  panel3_gancho/
    ...
```

Cada layer: alta resolução, pixel art detalhado, paleta violeta/âmbar, sem humanoide.

## Próximo Passo Imediato

1. Implementar HUD orgânico total por bioma (Fase 1)
2. Gerar 8 layers painel 1 Noite Branca (320x180, pixel art detalhado, não-humanóide)
3. Abrir preview e validar

---
**APROVADO PARA IMPLEMENTAÇÃO**
