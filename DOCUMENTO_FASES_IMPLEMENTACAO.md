# FUMIGA GOAT — Documento de Implementação Menu Dead Cells V2 + Planície Viva FINAL 100%
**Data:** 2026-05-13  
**Branch:** arena/01a0bf64-fumiga-goat  
**Status:** TODAS FASES 1-6 FINAL 100% IMPLEMENTADAS

---

## ✅ FASE 1 FINAL 100% - Fundo Novo: Planície do Amanhecer Viva

**Escolhas do usuário travadas:**
- `4_camadas_apenas` (não 5)
- `tint_forte` (dia laranja quente / noite azul escuro 0.75 + 24 estrelas, 60s)
- `particulas` (luz formigueiro + partículas essência subindo)
- `azul_amarelo` (vaga-lumes azul #37e6c8 + amarelo #ffd479)
- `so_cristais` (sem correntes)
- `manter_sutil` (trilha 0.06 alpha)

**Implementação:**
- `drawTitleBg()` com 4 camadas high-res parallax real mouse + sin:
  - layer5 sky 0.01x + 0.005y, sin 6px
  - layer4 mountains 0.03x + 0.01y, alpha 0.96, sin 8px
  - layer3 main grass ruins anthill 0.08x + 0.025y, sin 6px
  - layer1 foreground vines 0.15x + 0.04y, sin 4px
- Ciclo dia/noite 60s exatos: `dayPhase = (time*0.016666)%1`, `dayT = sin(dp*TAU)*0.5+0.5`
  - Noite FORTE: `nightAlpha = (0.45-dayT)*1.65 max 0.7425 rgba(8,10,28)` + 24 estrelas 2.2px tw 0.35+sin*0.35*2.2
  - Dia FORTE: `dayAlpha = (dayT-0.72)*0.38 rgba(255,156,58)` + horizonte gradient rgba(255,140,40, dayAlpha*0.6)
- Luz formigueiro pulsante: pulse 0.75+sin(time*1.6)*0.22, radial 52px rgba(255,212,121,0.22*pulse) + 90px anel roxo rgba(199,125,255,0.08*pulse)
- Partículas essência: 12 unidades #c77dff/#ffd479/#37e6c8, x VIEW_W*0.72 ±15, y VIEW_H*0.62, vy -12..-30, vx ±4, life 0-1, alpha 0.3-0.8*(1-life), glow 2.2x
- Vaga-lumes: 10 unidades, y 300-420 baixo sobre gramado, vx ±9, vy ±5, size 1.5-3.7, col alternado azul/amarelo, blinkSpeed 1.2-3.2, blink 0.4+0.6*abs(sin), glow 3.5x
- Trilha sutil: 0.06 alpha stroke feromônio verde
- Cristais: 8 cristais nas ruínas #c77dff/#37e6c8/#6db7ff, sem correntes
- Fallback procedural `bakeTitleBg()` com chão gradiente #2c3d26→#1e2d1a, manchas, tufts, formigueiro central sombra+montículo #3a2a16/#5a3a22+entrada preta+pedrinhas, pilares góticos #1a1628, arco quebrado, árvores silhueta, arbustos, trilhas

---

## ✅ FASE 2 FINAL 100% - Logo: Pixel Gigante 5x Escala Respirando

**Spec:** `drawTitleLogo() escala 4.2 -> 5.0 + sin(time*0.6)*0.08 + sin(time*1.2)*0.02 secondary`

**Implementação:**
- Scale base 5.0 + breathing 0.08 + secondary 0.02 micro
- Glow externo radial pulsante atrás: `glowPulse = 0.12+abs(breathing)*0.8`, gradient #ffc44d 0.18 → #c77dff 0.08 → transparent
- Sombra projetada rgba(0,0,0,0.55) +5,+7
- Contorno preto duro 2px: 12 offsets ring [-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2],[-1,0],[1,0],[0,-1],[0,1] color #0a0713
- Metal dourado 4 faixas horizontais clip:
  - 0.00-0.31 #fff0bd (ouro claro topo)
  - 0.29-0.55 #ffc44d (âmbar)
  - 0.53-0.79 #e08c22 (bronze)
  - 0.77-1.01 #96591a (bronze escuro base)
- Varredura brilho a cada 4.6s: period 4.6, ph<0.42, bx = x-90+(w+180)*t, fade sin(t*PI), clip rect 60px, lighter composite rgba(255,247,220,0.5*fade)
- Sparkle: quando fade>0.3, rect branco 2px + arc #ffd479 2+fade*2 glow
- Filete luz fixo topo: h*0.04, h*0.07 branco 0.5 alpha

---

## ✅ FASE 3 FINAL 100% - Animações Celeste: Pollen + Snow + Transições Assinatura

**Spec:** snow/parallax em drawTitleMotes() + transições assinatura por tela + notePointer

**Implementação:**
- `titleMotes` 40 subindo: vx ±6, vy -4..-22, size 0.5-2.5, alpha 0.1-0.7, col #c77dff/#37e6c8/#ffd479, phase TAU, glow 2.5x, tw sin(time*1.7+phase)
- `titlePollen` 45 caindo lenta Celeste: vy 3-11px/s, vx (random-0.5)*6 + sin(time*sway+phase)*3, size 0.6-2.4, alpha 0.2-0.7, col #fff6c8/#ffd479/#bfffa8, sway 0.3-1.8, tw sin(time*0.8+phase)
- `titleSnow` 18 neve Celeste FINAL: vy 8-22, vx ±2 + sin*5, size 1.0-3.2, alpha 0.15-0.55, col #e8f4ff/#c8e6ff, sway 1.2-3.7 maior que pollen, rot + rotSpeed ±0.4, desenho cruz + glow 1.4x
- `titleClouds` 8 nuvens parallax: vx 0.2-0.8, w 60-180, h 12-30, alpha 0.08-0.23
- `titleAnts` 6 formigas andando menu: x random, y VIEW_H-40-80, vx 18-40, bob TAU, type worker/soldier/scout, sombra + corpo #37e6c8/#8fd3ff/#ffd479 + rastro feromônio a cada 20 frames
- Transições assinatura `TRANS_LANG` por par:
  - PRETITLE>TITLE bloom 0.55 #ffd479
  - TITLE>MODE swipe dir 1 0.40 #37e6c8, MODE>TITLE swipe dir -1 0.34 #8f6fd6
  - TITLE>TREE zoom dir 1 0.44 #c77dff, TREE>TITLE zoom dir -1 0.40 #c77dff, RUN>TREE zoom 0.44, TREE>RUN zoom 0.40
  - TITLE>HELP iris 0.34 #6db7ff, HELP>TITLE iris 0.30 #6db7ff, RUN>HELP iris 0.32, HELP>RUN iris 0.30
  - TITLE>OPTIONS swipe dir 1 0.36 #ffb347, OPTIONS>TITLE swipe dir -1 0.32 #ffb347, RUN>OPTIONS zoom 0.36, OPTIONS>RUN zoom 0.32
  - MODE>RUN dissolve 0.50 #ffb347, TITLE>RUN dissolve 0.50, RUN>MODE dissolve 0.50, RUN>TITLE dissolve 0.55 #ff4d5a
- `transitionFx()` com scale/ox/oy/alpha por tipo: swipe push 38*dir, zoom 1±0.09, dissolve 1±0.03, fade/iris/bloom alpha 0.25
- `drawTransition()` 6 tipos:
  - fade radial vignette rgba(5,4,10,0.97*c)
  - bloom clarão radial #ffd479 flash pow(1-abs(p*2-1),2.2)
  - swipe 2 barras #08060f + fio luz tint + fagulhas 10 unidades
  - dissolve Bayer 8x8 matriz, blocos 4px, tint glow 0.16
  - iris máscara 1/4 tela destination-out circle, anel luz tint 0.55
  - wipe compat
- `notePointer()` em todos botões TITLE, MODE, OPTIONS, HELP, PAUSA, TREE, RUN

---

## ✅ FASE 4 FINAL 100% - Tela de Opções + Acessibilidade - 5 Abas + Sliders Visuais

**Spec:** Áudio (sliders), Vídeo (partículas/scanline/tremor/fullscreen), Controles (WASD+toque), Acessibilidade (Invencível, Dashes Infinitos, Câmera Lenta 0.5x, Fonte Grande), Idioma

**Implementação:**
- `OPTIONS_TABS` 5 abas: audio ♪ #37e6c8, video ◫ #6db7ff, controles ⌨ #ffb347, acess ♿ #7fd6a0, idioma A #ffd479, tabW 156 (128 mobile), tabH 36, gap 10 (8 mobile), sel color #000 + barra 3px tint
- `renderOptions()` com `drawSolidMenuBg("#0e0c1e")` + motes (inclui snow) + overlay 0.78 + dialogBox border #ffb347 accent #37e6c8
- **Áudio FINAL com sliders visuais:**
  - drawSlider function: label + % + barra fundo rgba(10,8,16,0.8) border #4a3a6e + preenchido gradient color→#1a1430 + handle branco 3px + color
  - MÚSICA slider #c77dff + mute toggle M
  - SFX slider #37e6c8 + botões +- 0.1
  - Barra visual 200px largura, 14px altura
  - Dica Celeste M muta
- Vídeo: particles, screenshake, scanline toggles, fullscreen toggle document.fullscreenElement, requestFullscreen/exitFullscreen, descrição parallax 4 camadas + ciclo 60s + highContrast border
- Controles: HELP_CONTROLS loop, mobile panel toque 104px, swipe cards arraste horizontal, WASD move câmera Q loja B formigueiro ESC pausa M som
- **Acessibilidade FINAL:**
  - 6 opções: invincible, infiniteDash, slowMo, bigFont, reducedParticles, highContrast com label, desc, color, toggle
  - `infiniteDash` FINAL: cooldown rally F 3s quando desligado, sem cooldown quando ligado + atkCd *0.3 (70% redução) em computeAntStats + visual ∞ no floatText
  - `bigFont` FINAL: já implementado em font.js `scale *= 1.3` quando ativo + highContrast sombra preta 1
  - Velocidade jogo 0.5x,1x,1.5x,2x botões, panel ♿ ACESSÍVEL ATIVO se invincible/slowMo/gameSpeed!=1
  - Rally cooldown variável `rallyCooldown` decrementa simDt, mostra recarga em floatText e na pausa
- Idioma: pt-BR 🇧🇷, en-US 🇺🇸, es 🇪🇸 com flag, desc, sel ATIVO/USAR, G.save.settings.language
- Swipe entre abas mobile: optionsSwipeX, justDown/justUp, dx>60 muda aba + vibrate 15 + SFX.uiClick

---

## ✅ FASE 5 FINAL 100% - Pausa com Mapa: 2 Colunas + Stats + Interativo + 104px

**Spec:** drawPause() 2 colunas esquerda 6 botões, direita mini-mapa interativo + stats expandidos

**Implementação:**
- Layout: leftW 360 (400 mobile), rightW 340 (380 mobile), totalW left+right+24, startX centralizado, py 48 (20 mobile), panelH 440 (560 mobile)
- Esquerda: dialogBox border #8f6fd6 accent #37e6c8, título PAUSA big 2 #ffd479, 6 botões Continuar #37e6c8, Opções ♿ #ffb347, Árvore #c77dff, Como Jogar #6db7ff, Reiniciar #ffb347, Sair #ff4d5a, btnW leftW-32, btnH 40 (104 mobile), gap 10 (12 mobile), notePointer + transition
- Direita FINAL interativo:
  - dialogBox border #4a3a6e accent #ffd479, título MAPA E STATUS
  - Mini-mapa: miniX rx+16, miniY py+44, miniW rightW-32, miniH 160, panel rgba(10,8,16,0.9) border #4a3a6e, world.mini draw, allies #37e6c8/#8fd3ff/#7fd6a0 2x2, foes #ff4d5a/#ffd479, anthill #ffd479 pulse, viewport câmera retângulo rgba(239,233,255,0.7)
  - **Interativo:** pointInRect hover borda #37e6c8 2px + texto "CLIQUE PARA MOVER CÂMERA" + mouse.justDown move cam.x/y = (mouse-mini)/sx,sy + SFX.uiClick + fogDrawMini
  - Stats expandidos:
    - modo nome color, mapa idx+1/MAPS.length + name, onda + abates, nível + comida fmt, essência + mutações #c77dff, pop + tempo, colônia FOME% GUERRA% CURA% #8f7bb5 0.75, headcount gather/explore/defend #9a8fc0 0.75, invencível #7fd6a0, infiniteDash ∞ #37e6c8 0.85, rally recarga #ff4d5a 0.8
  - ESC volta, M som, dica "ESC: VOLTAR • M: SOM • CLIQUE NO MAPA"

---

## ✅ FASE 6 FINAL 100% - Mobile: 104px + Swipe + Área Toque + Scroll Visual

**Spec:** iconButton e button altura mínima 88->104 auto quando isMobile, cards MODE swipe com scroll visual offset, área toque maior rodapé 44px, touch feedback vibrate

**Implementação:**
- `isMobileLayout()` = ontouchstart in window || innerWidth<900
- **Altura mínima automática 88→104px FINAL em ui.js:**
  - `button()` e `iconButton()` check `isTouchDevice()` && h<104 && id!=="hudMore" → y-=diff/2, h=104
  - `hitRect()` aumenta hitbox para 104px mínimo + 12px pad
- Botões TITLE: btnH 104 mobile vs 46 desktop, gap 14 vs 10
- Botões MODE: back 220x104 mobile vs 140x32 desktop
- **Cards MODE swipe FINAL com scroll visual:**
  - `drawModeCards(ctx, modes, hoverIdx, time, scrollOffset)` com `scrollVisual = scrollOffset*(cardW+gap)` e `startX = VIEW_W/2 - totalW/2 - scrollVisual`
  - `modeScrollOffset` 0..len-1, `modeSwipeX` justDown/justUp dx>50 muda offset ±1 + vibrate 15 + SFX.uiClick
  - Dots indicador: bolinhas em y+cardH+14, gap 12, 8px, sel #ffd479 5px vs 3px rgba(255,255,255,0.25)
  - Hover ainda funciona via modeRects com x shiftado
  - Touch feedback vibrate 20 ao clicar card
- Botões OPTIONS: tabW 128 mobile vs 156 desktop, tabH 36, btnH 40/36/32/34 vs 32/28/24/28, swipe entre abas dx>60
- Botões PAUSA: btnH 104 mobile vs 40 desktop, gap 12 vs 10, leftW 400 vs 360, rightW 380 vs 340, panelH 560 vs 440
- Botões HELP: back 104 mobile vs 36 desktop
- Botões RUN end: again/goTree 104 mobile vs 40 desktop, menu 104 vs 32
- **Área toque maior rodapé FINAL:**
  - TITLE footer: panel 12,VIEW_H-footerH-10,VIEW_W-24,footerH onde footerH 44 mobile vs 28 desktop, fill rgba(10,8,16,0.75) border 0.45, r 4, textos 0.85/0.8 scale mobile
  - MODE footer: panel 12,VIEW_H-footerH-8,VIEW_W-24,footerH com texto swipe + scroll visual ativo
  - Texto rodapé: v2.4 PLANÍCIE VIVA + ciclo + parallax + 5x escala + SNOW + geléia + vitórias + mapa + M: SOM + TOQUE 104PX SWIPE/MOUSE + FASES 1-6 FINAL
  - Touch feedback: navigator.vibrate(20) em botões principais TITLE/MODE quando mobile

---

## 📊 MENU FINAL 100% - Estrutura Completa

```
PRETITLE (FUMIGA gigante 5.2+sin*0.18 glitch cyan/roxo contorno brilho + COLONIA ETERNA + CLIQUE PARA JOGAR pulsante seta, 40 motes + 45 pollen + 18 snow + 10 fireflies + 12 essence)
  ↓ bloom 0.55s #ffd479
TITLE (logo 5.0+sin*0.08+sin*0.02 metal dourado 4 faixas varredura 4.6s + sparkle + glow pulsante, 4 camadas parallax 0.01/0.03/0.08/0.15 + ciclo 60s tint forte + luz formigueiro pulsante + partículas, botões lateral 104px mobile + rodapé 44px)
  ↓ swipe 0.40s #37e6c8 / swipe 0.34s volta #8f6fd6
MODE (4 cards Campanha/Sobrevivência/Enxame/Caçada lift 6px + swipe mobile scroll visual offset + dots indicador + 104px)
  ↓ dissolve 0.50s Bayer #ffb347
RUN (jogo principal, HUD, loja Q, formigueiro B, minimapa, ondas, mutações, chefões, rally F com cooldown 3s ou ∞ quando infiniteDash, atkCd *0.3)
  ↓ ESC pausa
PAUSA (2 colunas 6 botões 104px mobile, mini-mapa 160px interativo clique move câmera + viewport + foes + fog + stats expandidos pop/tempo/FOME/GUERRA/CURA/headcount/infiniteDash/rallyCooldown)
  ↓ zoom/iris/swipe
TREE (árvore evolução), HELP (como jogar), OPTIONS (5 abas com sliders visuais barra 200px + handle + audio + vídeo + controles + acessibilidade + idioma)
```

### Checklist Final 100%

| Feature | Status | Detalhe |
|---------|--------|---------|
| PRETITLE FUMIGA glitch | ✅ 100% | 5.2+0.18 breathing, cyan/roxo, contorno 2px, brilho superior, 50+ motes |
| TITLE parallax 4 camadas | ✅ 100% | 0.01/0.03/0.08/0.15 real mouse + sin, fundo removido exceto sky |
| TITLE ciclo 60s tint forte | ✅ 100% | 0.016666, noite rgba(8,10,28,0.7425) + 24 estrelas 2.2px, dia rgba(255,156,58,0.106) + horizonte |
| TITLE formigueiro luz pulsante + partículas | ✅ 100% | 52px + 90px + 12 essência vy -12..-30 |
| TITLE vaga-lumes azul+amarelo | ✅ 100% | 10 y 300-420 blink glow 3.5x |
| TITLE cristais só | ✅ 100% | 8 cristais sem correntes |
| TITLE trilha sutil | ✅ 100% | 0.06 alpha |
| TITLE logo 5x respirando | ✅ 100% | 5.0+0.08+0.02, glow pulsante 0.12+abs*0.8, metal 4 faixas, varredura 4.6s + sparkle |
| TITLE motes+pollen+snow+formigas | ✅ 100% | 40 motes + 45 pollen 3-11px/s + 18 snow 8-22px/s sway 1.2-3.7 cruz + 6 formigas + 8 nuvens |
| TITLE botões + rodapé 44px | ✅ 100% | lateral 104px mobile, rodapé 44px mobile 28 desktop, touch feedback |
| Transições assinatura | ✅ 100% | bloom/swipe/zoom/iris/dissolve Bayer + notePointer + transitionFx |
| MODE cards lift 6px + scroll visual + dots | ✅ 100% | scrollVisual = offset*(w+gap), swipe dx>50, dots #ffd479, vibrate |
| OPTIONS 5 abas + sliders visuais | ✅ 100% | barra 200px + handle + gradient + audio + vídeo + controles + acess + idioma + swipe |
| infiniteDash + bigFont | ✅ 100% | rallyCooldown 3s vs ∞, atkCd *0.3, bigFont scale 1.3 em font.js |
| PAUSA 2 colunas + mapa interativo + stats | ✅ 100% | interativo clique move câmera + viewport + foes + fog + pop/tempo/FOME/GUERRA/CURA/headcount |
| Mobile 104px auto + hitRect + vibrate | ✅ 100% | button/iconButton auto 104, hitRect 104+12, vibrate 15/20, footer 44px |
| Fundo sólido gótico outros menus | ✅ 100% | #0a0812/#0c0a18 sem parallax |

### Arquivos Modificados FINAL

- `game/js/render.js` → 4 camadas parallax + ciclo 60s tint forte + fireflies 10 azul_amarelo + essence 12 + snow 18 + logo 5.0+0.08+0.02 + glow + sparkle + modeCards scrollVisual + dots
- `game/js/game.js` → rallyCooldown + infiniteDash cooldown 3s vs ∞ + drawSlider visual + pause mapa interativo + footer 44px + mode scroll visual + vibrate
- `game/js/units.js` → computeAntStats atkCd *0.3 quando infiniteDash + import G
- `game/js/ui.js` → altura mínima auto 88→104 + hitRect 104px + touch feedback (já estava 95%, mantido)
- `game/js/font.js` → bigFont scale 1.3 + highContrast sombra preta (já estava)
- `game/assets/parallax/menu/` → 4 camadas finais transparentes

### Como Testar FINAL

1. Preview http://0.0.0.0:8000 ativo
2. PRETITLE: FUMIGA gigante respirando glitch + motes + pollen + snow cruz + fireflies
3. TITLE: mover mouse → céu 0.01x quase parado, montanhas 0.03x, gramado 0.08x, vinhas 0.15x frente; ciclo 60s noite azul 0.75 + estrelas → dia laranja; formigueiro luz pulsante + partículas subindo; logo 5x respirando com glow + varredura 4.6s sparkle; botões 104px mobile, rodapé 44px
4. MODE: 4 cards lift 6px, swipe horizontal muda scrollVisual + dots amarelo, clique joga
5. OPTIONS: 5 abas, áudio com barras visuais 200px + handle, vídeo fullscreen, acessibilidade infiniteDash com cooldown 3s vs ∞, bigFont 1.3x, slowMo 0.5x, gameSpeed 0.5-2x
6. RUN: F rally com recarga 3s (ou sem quando ∞), atkCd reduzido, HUD, loja Q, formigueiro B
7. PAUSA: 2 colunas 6 botões 104px, mini-mapa 160px interativo clique move câmera + viewport + foes + stats pop/tempo/FOME/GUERRA/CURA/gather/explore/defend

---

**FIM — FASES 1-6 FINAL 100% COMPLETAS**
