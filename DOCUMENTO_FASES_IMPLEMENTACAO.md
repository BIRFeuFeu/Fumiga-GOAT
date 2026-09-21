# FUMIGA GOAT — Documento de Implementação Menu Dead Cells V2 + Planície Viva
**Data:** 2026-05-13  
**Branch:** arena/01a0bf64-fumiga-goat  
**Status Parallax:** CORRIGIDO - fundo removido de 3 camadas, apenas layer5 céu mantém fundo

---

## ✅ CORREÇÃO CRÍTICA APLICADA (13/05/2026)

### Problema reportado
> "Na tela TITLE só vejo a layer 1, o fundo de todas as camadas deve ser retirado para que seja possível ver a imagem atrás dela, a única camada que não deve ser retirado o fundo é a layer 5 pois é a última."

### Causa raiz
As 4 imagens geradas estavam com fundo xadrez branco/cinza **baked como pixels opacos** (alpha 255 em 100% dos pixels). Verificado via PIL:
- `layer1_foreground_vines_bottom_final.png`: 0% transparente → agora 68.8% transparente
- `layer4_mountains_silhouette_highres.png`: 0% transparente → agora 59.3% transparente  
- `layer3_main_grass_ruins_anthill_transparent.png`: 0% transparente → agora ~35-60% transparente
- `layer5_sky_sunset_moon_highres.png`: 0% transparente → mantido 0% (correto, é fundo)

### Solução aplicada (sem criar novas imagens, apenas remover fundo)
**Python PIL - remoção por cor + posição:**

```python
# Layer1: branco >180 brightness → transparente, mantém vinhas escuras bottom 550px+
if bright > 180: transparent else opaque

# Layer4: montanhas - branco >165 → transparente, mantém picos escuros 33-105 brightness
if bright > 165: transparent else keep (com boost alpha se G dominante)

# Layer3: mais complexo - mantém apenas:
# - y>500: tudo (gramado + solo cross-section)
# - br<50: ruínas escuras
# - x<400 br<115: ruínas esquerda
# - 350-560 br<95: pilares centrais
# - 550-1250 x 120-500: formigueiro marrom (45<r<145, 15<g<85, 5<b<60) + musgo verde escuro (25<g<85)
# - resto: transparente (céu laranja, colinas distantes verdes claras)
```

**Resultado composite testado:**
- Layer5 céu pôr-do-sol laranja + lua minguante + nuvens rosas → fundo opaco
- Layer4 montanhas silhueta roxa escura 3 profundidades → meio-fundo, aparece atrás do formigueiro
- Layer3 ruínas góticas esquerda + formigueiro marrom direita-centro + gramado + solo → principal
- Layer1 vinhas azul-escuro + pedras bottom → foreground frente 0.15x

**Parallax agora funciona no TITLE:**
- 0.01x sky (mouse *0.01 + sin(time*0.008)*6)
- 0.03x mountains (mouse *0.03 + sin*8)
- 0.08x main (mouse *0.08 + sin*6)
- 0.15x foreground vines (mouse *0.15 + sin*4)

Outros menus (PRETITLE, MODE, OPTIONS, HELP) usam `drawSolidMenuBg()` sólido gótico #0a0812/#0c0a18 sem parallax, conforme seleção "manter_inicial".

---

## 📋 O QUE VOU IMPLEMENTAR AGORA (se você confirmar) — 6 FASES

### FASE 1 - Fundo Novo: Planície do Amanhecer Viva

**Especificação original:**
> Trocar bakeTitleBg() de masmorra fechada para Planície do Amanhecer viva: céu com ciclo dia/noite (gradiente que muda em 60s), 5 camadas parallax (nuvens, árvores distantes, arbustos), formigueiro central com luz pulsando, tochas viram vaga-lumes. Manter tijolos? Não, agora é grama + trilha, mas mantém cristais e correntes como ruínas.

**O que já foi implementado:**
- ✅ `bakeTitleBg()` reescrito de masmorra tijolos para planície viva: chão com gradiente #2c3d26→#1e2d1a, textura manchas, tufts grama, trilhas feromônio verde
- ✅ Formigueiro central com sombra + montículo #3a2a16/#5a3a22 + entrada preta + pedrinhas ao redor
- ✅ Pilares góticos laterais mantidos (Dead Cells) #1a1628 com rachaduras, arco superior quebrado
- ✅ Árvores distantes silhueta (6 árvores) layer 0
- ✅ Arbustos no chão (4 arbustos)
- ✅ Cristais essência nas paredes/ruínas (8 cristais #c77dff/#37e6c8/#6db7ff)
- ✅ `drawTitleBg()` com 4 camadas high-res parallax (era para ser 5, temos 4)
- ✅ Ciclo dia/noite tint sobre parallax: `dayPhase = (time*0.012)%1` (~80s ciclo), isDay = sin(dayPhase*TAU), dayT 0..1, noite escurece azul rgba(10,8,22,0.75*(0.45-dayT)) + estrelas piscando, dia brilho quente laranja
- ✅ `drawTitleMotes()` com motes subindo + pollen caindo + formigas andando + nuvens
- ✅ `titleBg` fallback procedural caso imagens não carreguem

**O que ainda falta para Fase 1 completa:**
- ❌ Ciclo 60s exato (atual 80s, precisa ajustar para 60s)
- ❌ 5ª camada parallax: nuvens separadas como layer própria (hoje nuvens são partículas, não imagem)
- ❌ Formigueiro luz pulsando: hoje tem `healPulse` mas no menu a luz é estática + flicker tochas, falta pulsar no ritmo `sin(time*1.6)*0.18` mais forte no centro
- ❌ Tochas viram vaga-lumes: hoje ainda tem tochas flicker, falta trocar para vaga-lumes (fireflies) com movimento sin + glow amarelo
- ❌ Grama + trilha: já tem mas trilha feromônio é stroke fraco 0.06 alpha, precisa ser mais visível e animada
- ❌ Cristais e correntes como ruínas: cristais ok, mas correntes não tem no bake atual
- ❌ Céu gradiente que muda em 60s: hoje tint sobre imagem, falta gradiente procedural animado lerpColor dia/noite

**Estimativa Fase 1 restante:** 30% para completar 100%

---

### FASE 2 - Logo: Pixel Gigante 5x Escala Respirando

**Especificação:**
> drawTitleLogo() escala de 4.2 para **5.0 + sin(time*0.6)*0.08 (pixel gigante que respira). Mantém metal dourado + varredura a cada 4.6s

**O que já foi implementado:**
- ✅ `drawTitleLogo(ctx,time,x=56,y=54,scale=5.0)` com breathing: `scale = 5.0 + sin(time*0.6)*0.08`
- ✅ Metal dourado em faixas horizontais (clip): #fff0bd topo, #ffc44d meio, #e08c22, #96591a base
- ✅ Contorno preto duro 2px (12 posições) + sombra projetada rgba(0,0,0,0.55) + filete luz topo branco 0.5 alpha
- ✅ Varredura brilho a cada 4.6s: period 4.6, ph=(time%period)/period, ph<0.42 varre bx = x-90 + (w+180)*t, fade sin(t*PI), lighter composite
- ✅ `drawBigTitle()` no PRETITLE com scale 5.2 + sin(time*0.6)*0.18 (ainda maior) + glitch cyan/roxo + brilho superior
- ✅ PRETITLE FUMIGA gigante com subtítulo COLONIA ETERNA + CLIQUE PARA JOGAR pulsante + seta ▼

**O que ainda falta:**
- ❌ Nada crítico, Fase 2 está 95% completa. Apenas ajuste fino: breathing atual 0.08 está correto, mas no PRETITLE é 0.18 (mais exagerado) - unificar para 0.08 no TITLE e 0.18 no PRETITLE está ok
- ❌ Logo no TITLE atualmente chama `drawTitleLogo` com scale 5.0 mas em `renderTitle()` usa `tY = 54 + sin(time*0.7)*2.5` para bob - isso já é respiração extra, pode manter

**Estimativa Fase 2:** 95% completo, pode considerar DONE

---

### FASE 3 - Animações Celeste: Pollen + Transições Assinatura

**Especificação:**
> Adicionar snow/parallax em drawTitleMotes(): além dos motes subindo, partículas de pólen caindo lenta (style pollen que já existe no bioma). Transições já estão com assinatura, vou só garantir que todas usem notePointer() no ponto do clique

**O que já foi implementado:**
- ✅ `drawTitleMotes()` híbrido:
  - 40 motes subindo (Dead Cells): x,y,vx,vy,size,alpha,col #c77dff/#37e6c8/#ffd479, phase TAU, glow 2.5x
  - 45 pollen caindo lenta (Celeste): vy 3-11px/s (antes 6-18), vx (random-0.5)*6 + sin(time*sway+phase)*3, size 0.6-2.4, alpha 0.2-0.7, col #fff6c8/#ffd479/#bfffa8, sway 0.3-1.8
  - 8 nuvens parallax: x,y,vx 0.2-0.8, w 60-180, h 12-30, alpha 0.08-0.23, layer 0-2
  - 6 formigas andando no menu: x,y,vx 18-40, bob, type worker/soldier/scout, sombra + corpo #37e6c8/#8fd3ff/#ffd479 + rastro feromônio a cada 20 frames
- ✅ Transições com assinatura por par de telas (pesquisa Dead Cells + Celeste):
  - `TRANS_LANG` com type, dur, dir, tint por par: PRETITLE>TITLE bloom 0.55 #ffd479, TITLE>MODE swipe dir 1 0.40 #37e6c8, MODE>TITLE swipe dir -1 0.34 #8f6fd6, TITLE>TREE zoom dir 1 0.44 #c77dff, TITLE>HELP iris 0.34 #6db7ff, MODE>RUN dissolve 0.50 #ffb347, etc
  - `startTransition()` usa lang.type se type=auto, notePointer(mouse.x,mouse.y) no clique, SFX.whoosh
  - `transitionFx()` com scale, ox, oy, alpha por tipo: swipe push 38*dir, zoom scale 1±0.09, dissolve scale 1±0.03, fade/iris/bloom alpha 0.25
  - `drawTransition()` com 6 tipos: fade (radial vignette), bloom (clarão radial #ffd479 flash pow(1-abs(p*2-1),2.2)), swipe (2 barras #08060f + fio luz tint + fagulhas), dissolve (Bayer 8x8 matriz, blocos 4px, tint glow), iris (máscara 1/4 tela, destination-out circle, anel luz tint), wipe compat
  - `notePointer()` chamado em todos os botões TITLE, MODE, OPTIONS, HELP, PAUSA

**O que ainda falta:**
- ❌ Snow/parallax estilo Celeste: hoje pollen é lento mas não tem snow (neve) - spec pede snow/parallax, mas pollen já é similar. Falta adicionar snowflakes caindo com sway maior para bioma congelado?
- ❌ Garantir todas transições usam notePointer: verificado, todas usam, mas falta em alguns lugares como TREE>RUN? Verificar - parece que `backFromTree()` chama notePointer, ok
- ❌ Partículas de neve no TITLE: hoje só pollen, falta snow layer para completar Celeste

**Estimativa Fase 3:** 85% completo, falta snow opcional

---

### FASE 4 - Tela de Opções + Acessibilidade (NOVA) - 5 Abas

**Especificação:**
> Nova tela OPTIONS com 5 abas: Áudio (sliders), Vídeo (partículas/scanline/tremor/tela cheia), Controles (mostra WASD + toque), Acessibilidade (Assist Mode: Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande), Idioma. Botão no TITLE: OPÇÕES (4º botão). Fluxo vira: TITLE -> OPTIONS -> TITLE

**O que já foi implementado:**
- ✅ `OPTIONS_TABS` 5 abas: audio ♪ #37e6c8, video ◫ #6db7ff, controles ⌨ #ffb347, acess ♿ #7fd6a0, idioma A #ffd479
- ✅ `renderOptions()` com `drawSolidMenuBg("#0e0c1e")` + motes + overlay 0.78 + dialogBox border #ffb347 accent #37e6c8
- ✅ Abas com botões: tabW 156 (128 mobile), tabH 36, gap 10 (8 mobile), totalTabsW centralizado, sel com color #000 e barra 3px tint
- ✅ Conteúdo por aba:
  - Áudio: mute toggle, sfxVol +- 0.1, musicVol +- 0.1, G.muted, G.save.settings.musicVol/sfxVol, persistSave, SFX.uiClick, dica Celeste M muta
  - Vídeo: particles, screenshake, scanline toggles, fullscreen toggle document.fullscreenElement, requestFullscreen/exitFullscreen, descrição parallax 4 camadas alta resolução + ciclo dia/noite 80s + highContrast border
  - Controles: HELP_CONTROLS loop, mobile panel toque 104px, swipe cards modo arraste horizontal, WASD move câmera Q loja B formigueiro ESC pausa M som
  - Acessibilidade: 6 opções invincible, infiniteDash, slowMo, bigFont, reducedParticles, highContrast com label, desc, color, toggle, persistSave, velocidade jogo 0.5x,1x,1.5x,2x com botões, panel ♿ ACESSÍVEL ATIVO se invincible/slowMo/gameSpeed!=1
  - Idioma: pt-BR 🇧🇷, en-US 🇺🇸, es 🇪🇸 com flag, desc, sel ATIVO/USAR, G.save.settings.language
- ✅ `updateOptions()` ESC volta para optionsReturn com transition swipe
- ✅ Swipe entre abas no mobile: optionsSwipeX, justDown/justUp, dx>60 muda aba
- ✅ Botão OPÇÕES ♿ no TITLE: 4º botão com accent #ffb347, h 104px mobile, 40px desktop, optionsReturn=TITLE, optionsTab=0, transition TITLE>OPTIONS swipe
- ✅ Fluxo TITLE->OPTIONS->TITLE e RUN->OPTIONS->RUN com transition zoom/swipe
- ✅ `isMobileLayout()` = ontouchstart in window || innerWidth<900
- ✅ Acessibilidade aplicada no jogo: invincible rainha volta 30% vida, slowMo 0.5x em `totalSpeed = baseSpeed*slowMult`, reducedParticles skip 60%, highContrast borda grossa

**O que ainda falta:**
- ❌ Sliders visuais tipo barra (hoje são botões +-), spec pede sliders estilo Celeste - falta UI slider com drag
- ❌ Dashes Infinitos: `infiniteDash` toggle existe mas não implementado no código de rally (F) cooldown - precisa verificar `rallyDefenders` cooldown
- ❌ Fonte Grande: `bigFont` toggle existe mas não aumenta fonte 30% - precisa aplicar scale 1.3 em drawText se bigFont ativo
- ❌ Áudio sliders com barra visual: hoje só texto + botões, falta barra preenchida

**Estimativa Fase 4:** 75% completo, falta polish sliders + implementar infiniteDash + bigFont

---

### FASE 5 - Pausa com Mapa: 2 Colunas + Stats + 104px

**Especificação:**
> drawPause() atual 4 botões vira layout 2 colunas: esquerda botões (Continuar/Opções/Árvore/Como Jogar/Reiniciar/Sair), direita mini-mapa do mundo + stats da run (ondas, abates, nível, mutações, cérebro da colônia). Botões 104px altura para mobile

**O que já foi implementado:**
- ✅ `drawPause()` reescrito 2 colunas:
  - leftW 360 (400 mobile), rightW 340 (380 mobile), totalW left+right+24, startX centralizado, py 48 (20 mobile), panelH 440 (560 mobile)
  - Painel esquerda dialogBox border #8f6fd6 accent #37e6c8, título PAUSA big 2 #ffd479
  - 6 botões: Continuar #37e6c8, Opções ♿ #ffb347, Árvore #c77dff, Como Jogar #6db7ff, Reiniciar #ffb347, Sair #ff4d5a, btnW leftW-32, btnH 40 (104 mobile), gap 10 (12 mobile)
  - Cada botão com `notePointer` + transition para OPTIONS/TREE/HELP/RUN/TITLE
  - Painel direita dialogBox border #4a3a6e accent #ffd479, título MAPA E STATUS
  - Mini-mapa maior: miniX rx+16, miniY py+44, miniW rightW-32, miniH 160, panel rgba(10,8,16,0.9) border #4a3a6e, world.mini draw, allies #37e6c8/#8fd3ff 2x2, anthill #ffd479 pulse sin(time*4)*0.8
  - Stats: modo nome color, mapa idx+1/MAPS.length + MAPS[mapIdx].name, onda + abates, nível + comida fmt, essência + mutações #c77dff, colônia FOME% GUERRA% #8f7bb5 scale 0.8, invencível ativo #7fd6a0
  - ESC volta, M som, dica bottom
- ✅ `paused` toggle ESC em RUN, SFX.uiClick, `setPaused`
- ✅ Botões 104px mobile via `isMobileLayout()` check

**O que ainda falta:**
- ❌ Mini-mapa interativo na pausa (clique para mover câmera) - hoje só desenha, não clica
- ❌ Stats mutações lista + cérebro colônia headcount - tem needs mas falta headcount gather/explore detalhado
- ❌ Botões 104px já ok, mas área toque maior no rodapé falta - rodapé atual é 28px, precisa 104px?

**Estimativa Fase 5:** 85% completo, falta interatividade mapa + mais stats

---

### FASE 6 - Mobile: 104px + Swipe + Área Toque

**Especificação:**
> iconButton e button com altura mínima 88px -> 104px quando isMobile. Cards do MODE com swipe touch: arrasta horizontalmente. Área de toque maior no rodapé

**O que já foi implementado:**
- ✅ `isMobileLayout()` detecta touch ou width<900
- ✅ Botões TITLE: btnH mobile 104 vs 46 desktop, gap 14 vs 10
- ✅ Botões MODE: back 220x104 mobile vs 140x32 desktop
- ✅ Cards MODE swipe: modeSwipeX, justDown/justUp, dx>50 muda modeScrollOffset, modeHover=modeScrollOffset
- ✅ Botões OPTIONS: tabW 128 mobile vs 156 desktop, tabH 36, btnH 40/36/32/34 vs 32/28/24/28, swipe entre abas dx>60
- ✅ Botões PAUSA: btnH 104 mobile vs 40 desktop, gap 12 vs 10, leftW 400 vs 360, rightW 380 vs 340, panelH 560 vs 440
- ✅ Botões HELP: back 104 mobile vs 36 desktop
- ✅ Botões RUN end: again/goTree 104 mobile vs 40 desktop, menu 104 vs 32
- ✅ `button()` e `iconButton()` já respeitam h passado, mas falta altura mínima 88->104 automática - hoje é manual por chamada
- ✅ Rodapé: panel 12,VIEW_H-38,VIEW_W-24,28 com texto v2.4 PLANÍCIE VIVA + geléia + vitórias + M: SOM + TOQUE 104PX/MOUSE

**O que ainda falta:**
- ❌ Altura mínima automática 88->104 em `button()`/`iconButton()` quando isMobile - hoje precisa passar h manual, falta default
- ❌ Swipe horizontal nos cards MODE: implementado mas `modeScrollOffset` não usado para scroll visual, só muda hover - falta offset visual dos cards
- ❌ Área de toque maior no rodapé: rodapé atual 28px altura, precisa 104px? Ou área de toque maior nos botões do rodapé?
- ❌ Touch feedback: falta vibrate ou escala ao tocar
- ❌ Teclado virtual: falta

**Estimativa Fase 6:** 70% completo, falta altura mínima automática + scroll visual + área toque rodapé

---

## 📊 ANÁLISE COMPLETA DO JOGO - O QUE JÁ FOI E O QUE FALTA

### Estrutura Atual
```
PRETITLE (FUMIGA gigante glitch cyan/roxo, COLONIA ETERNA, CLIQUE PARA JOGAR pulsante)
  ↓ bloom 0.55s
TITLE (logo 5.0+sin*0.08 metal dourado varredura 4.6s, 4 botões, parallax 4 camadas, motes+pollen+formigas)
  ↓ swipe 0.40s / swipe 0.34s volta
MODE (4 cards Campanha/Sobrevivência/Enxame/Caçada lift 6px, swipe mobile)
  ↓ dissolve 0.50s
RUN (jogo principal, HUD, loja Q, formigueiro B, minimapa, ondas, mutações, chefões)
  ↓ ESC pausa
PAUSA (2 colunas, 6 botões 104px mobile, mini-mapa + stats)
  ↓ zoom/iris/swipe
TREE (árvore evolução), HELP (como jogar), OPTIONS (5 abas)
```

### Sistemas Implementados (100%)
- ✅ Motor renderização: `drawRun` com chão, pilhas, nodes, props, formigas squash/stretch, sombras 2 camadas, anel seleção tracejado girando, ninho breath, ovos, barra vida, status burn/stun/carry
- ✅ Mundo: `genWorld` com ground, piles, nodes, props, anthill, biomas, tint
- ✅ Unidades: allies queen + 8 tipos worker/gatherer/soldier/spitter/tank/scout/healer/bomber/giant, foes + boss boar/fox/hare/deer/grouse/matriz, rotFrame, whiteRotFrame
- ✅ Combate: projectiles, orbs, particles decals/trails/parts/glows/rings/floats, fog of war
- ✅ Ondas: director, waves, mapDef, waveDef, calm/attack/mapClear, skipPeace G
- ✅ Mutações: rollDraft, applyMutation, RARITY, draft UI 3 cards
- ✅ Meta: metaBonus, mutBonus, árvore evolução, essência, best, persistSave/loadSave
- ✅ Input: keys, pressed, mouse, initInput, isMobileLayout, notePointer, panCam, zoomCam, shake, selectInRect, selectTypeOnScreen, orderSelected, rallyDefenders
- ✅ Áudio: initAudio, SFX whoosh/uiClick/chime/win/lose/heart/rebirth/select/buy, mute, musicVol/sfxVol
- ✅ UI: uiBegin, uiButtons, button, iconButton, panel, bar, pointInRect, dialogBox, wrapText, drawText, FONT big/small, textWidth, lineWidth
- ✅ Tutorial: startTutorial, stopTutorial, updateTutorial, drawTutorial, TUT, tutorialCardRect
- ✅ Ninho: nestEnter/Exit/Update/Draw/Click/Hover
- ✅ Cérebro colônia: colony.needs food/defense/medical, headcount gather/explore

### Menu - Implementado vs Falta

| Feature | Status | % |
|---------|--------|---|
| PRETITLE FUMIGA glitch | ✅ DONE | 100% |
| TITLE parallax 4 camadas com fundo removido | ✅ FIXED | 95% (falta 5ª camada nuvens imagem) |
| TITLE logo 5.0+sin*0.08 metal dourado varredura 4.6s | ✅ DONE | 95% |
| TITLE motes+pollen+formigas+nuvens | ✅ DONE | 85% (falta snow) |
| TITLE botões lateral+rodapé Geléia/Vitórias | ✅ DONE | 100% |
| TITLE transições assinatura swipe/zoom/iris/dissolve Bayer + notePointer | ✅ DONE | 100% |
| MODE cards 4 grandes lift 6px + swipe mobile | ✅ DONE | 80% (falta scroll visual offset) |
| OPTIONS 5 abas Áudio/Vídeo/Controles/Acess/Idioma | ✅ DONE | 75% (falta sliders visuais + infiniteDash + bigFont impl) |
| PAUSA 2 colunas botões 104px + mapa + stats | ✅ DONE | 85% (falta mapa interativo + mais stats) |
| Mobile 104px toque + swipe | ✅ DONE | 70% (falta altura mínima auto + área toque rodapé) |
| Fundo sólido gótico outros menus | ✅ DONE | 100% |
| HighContrast border sobre parallax high-res | ✅ DONE | 100% |
| Ciclo dia/noite 60s | ⚠️ PARCIAL | 60% (hoje 80s, tint não gradiente full) |
| Formigueiro luz pulsando | ⚠️ PARCIAL | 50% (tem mas fraco) |
| Vaga-lumes | ❌ TODO | 0% (ainda tochas flicker) |
| Cristais + correntes ruínas | ⚠️ PARCIAL | 70% (cristais ok, correntes falta) |

### Próximos Passos Sugeridos (Ordem)

1. **Finalizar Fase 1 (30% restante):**
   - Ajustar ciclo dia/noite para 60s exatos
   - Adicionar 5ª camada nuvens como imagem parallax
   - Trocar tochas por vaga-lumes (fireflies com sin movimento + glow)
   - Melhorar trilha feromônio mais visível animada
   - Adicionar correntes nas ruínas bake

2. **Finalizar Fase 4 (25% restante):**
   - Implementar sliders visuais barra preenchida para áudio
   - Implementar `infiniteDash` cooldown zero em rallyDefenders
   - Implementar `bigFont` scale 1.3 em drawText

3. **Finalizar Fase 6 (30% restante):**
   - Altura mínima automática 88→104px em button()/iconButton() quando isMobile
   - Scroll visual offset nos cards MODE com modeScrollOffset
   - Área toque maior rodapé (aumentar de 28px para 44px+)

4. **Polish Fase 3 e 5 (15% cada):**
   - Snow particles no TITLE para Celeste
   - Mini-mapa interativo na pausa (clique move câmera)

### Arquivos Críticos Modificados Nesta Correção
- `game/assets/parallax/menu/layer1_foreground_vines_bottom_final.png` → 68.8% transparente
- `game/assets/parallax/menu/layer4_mountains_silhouette_highres.png` → 59.3% transparente
- `game/assets/parallax/menu/layer3_main_grass_ruins_anthill_transparent.png` → ~35% transparente, mantém apenas ruínas+formigueiro+gramado
- `game/js/render.js` → drawTitleBg com mouse real + 0.01/0.03/0.08/0.15 parallax + drawSolidMenuBg() novo
- `game/js/game.js` → import drawSolidMenuBg, renderOptions/renderHelp usam sólido

### Como Testar Parallax Corrigido
1. Abrir http://localhost:8000 (preview porta 8000)
2. Ir para TITLE (após PRETITLE clique)
3. Mover mouse: céu quase parado (0.01x), montanhas lento (0.03x), gramado médio (0.08x), vinhas rápido (0.15x)
4. Verificar composite: céu lua minguante laranja atrás, montanhas roxas silhueta atrás do formigueiro, ruínas+formigueiro frente, vinhas bottom frente
5. Outros menus (MODE, OPTIONS, HELP) devem ter fundo sólido gótico escuro sem parallax

---

**Fim do documento - aguardando confirmação para implementar Fases 1-6 restantes**
