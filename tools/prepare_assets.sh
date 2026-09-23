#!/usr/bin/env bash
# ==============================================================================
# FUMIGA-GOAT — Pipeline de assets
# Processa os sprites do repositório (formigas / animais / arbustos / arvores /
# cristais / pedras / icones) e gera versões otimizadas em game/assets/.
# Requer: ImageMagick 6 (convert / montage)
# Uso: bash tools/prepare_assets.sh
# ==============================================================================
set -e
export LC_ALL=C.UTF-8
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/game/assets"
mkdir -p "$OUT/sprites/ants" "$OUT/sprites/animals" "$OUT/sprites/props" \
         "$OUT/sprites/icons" "$OUT/font"

# Formigueiro (sprite pixel-art procedural — ver tools/make_nest.py, style 3 = terra da TITLE)
python3 "$ROOT/tools/make_nest.py" 3

# ---------------------------------------------------------------- Formigas ----
# trim transparente + redimensiona pela altura (mantém pixels nítidos)
ant () { # ant <src> <dst> <altura_px>
  convert "$1" -trim +repage -filter point -resize "x$3" "$OUT/sprites/ants/$2"
  echo "  ant $2 ($(identify -format '%wx%h' "$OUT/sprites/ants/$2"))"
}
F="$ROOT/formigas"
# Espécies reais (rework das classes): a arte-fonte vem em fundo branco —
# aqui vira alfa, trim, redimensionamento pixel-perfect e canvas fixo.
# A SOLDADO em 34x44 é requisito: o assado da DINOPONERA precisa dar pad
# 5x o da soldado (ver game/test/assets.mjs).
species () { # species <src> <dst> <W> <H>
  convert "$1" \
    -bordercolor "#ffffff" -border 2x2 \
    -alpha set -channel RGBA -fuzz 12% \
    -fill "rgba(0,0,0,0)" -floodfill +0+0 "#ffffff" \
    -shave 2x2 \
    -trim +repage -filter point -resize "$3x$4" \
    -background none -gravity center -extent "$3x$4" \
    "$OUT/sprites/ants/$2"
  echo "  espécie $2 ($(identify -format '%wx%h' "$OUT/sprites/ants/$2"))"
}
species "$F/rework-cortadeira.png" worker.png   22 30
species "$F/rework-bala.png"       soldier.png  34 44
species "$F/rework-arpao.png"      trapjaw.png  34 44
species "$F/rework-acrobata.png"   spitter.png  31 40
species "$F/rework-fogo.png"       bomber.png   36 46
species "$F/rework-cefalote.png"   tank.png     48 48
species "$F/rework-mel.png"        gatherer.png 26 34
species "$F/rework-prata.png"      scout.png    22 30
species "$F/rework-matabele.png"   healer.png   25 34
species "$F/rework-tecela.png"     weaver.png   22 30
# RAINHA: arte do rework — fundo branco vira alfa, trim, altura 128 (largura livre)
convert "$F/rework-rainha.png" \
  -bordercolor "#ffffff" -border 2x2 \
  -alpha set -channel RGBA -fuzz 12% \
  -fill "rgba(0,0,0,0)" -floodfill +0+0 "#ffffff" \
  -shave 2x2 -trim +repage -filter point -resize x128 \
  "$OUT/sprites/ants/queen.png"
echo "  rainha ($(identify -format '%wx%h' "$OUT/sprites/ants/queen.png"))"
# FILHOS DA NÉVOA (Fase 2 da mega atualização): a horda deixa de ser só
# formigas — fauna real corrompida pela Névoa, paleta pálida #e8f4ff/#c9bce8
# com veias violeta e âmbar. Artes-fonte em inimigos/ (não-humanoides, Regra 8).
E="$ROOT/inimigos"
species "$E/larva.png"        e_runner.png    20 28   # LARVA RASTEJANTE DA NÉVOA
species "$E/sauva.png"        e_swarm.png     26 32   # SAÚVA CORROMPIDA
species "$E/mantis.png"       e_reaper.png    30 42   # CEIFADORA PÁLIDA (louva-a-deus)
species "$E/besouro.png"      e_spitter.png   34 40   # BESOURO-PRAGA (bombardeiro)
species "$E/vespa.png"        e_warrior.png   44 40   # VESPA CARRASCA
species "$E/caranguejo.png"   e_sentinel.png  52 42   # SENTINELA DE CONCHA
species "$E/aranha.png"       e_matron.png    64 52   # MATRONA PÁLIDA (aranha de ninhada)

# Cores ORIGINAIS: nenhum -modulate nos sprites de formiga — as artes das
# espécies (rework-*.png) entram exatamente como foram desenhadas.

# ------------------------------------------------------------------ Névoa ----
# MANTO DA NÉVOA (inimigos comuns + chefes): spritesheet 6 frames de 48x48
# desenhada via plasma DETERMINÍSTICO (sementes fixas + 1 thread — a mesma
# receita sempre gera bytes idênticos). Paleta da Névoa (Regra 6): osso
# #e8f4ff, sombra #c9bce8. O movimento vem do jogo (ciclo 6fps + deriva +
# balanço em 2 camadas).
mkdir -p "$OUT/sprites/fx"
FOGDIR=$(mktemp -d)
for i in 0 1 2 3 4 5; do
  seed=$((1100 + i * 77))
  convert -limit thread 1 -size 16x16 radial-gradient:white-black -roll +0+1 \
    \( -seed $seed -size 16x16 plasma:fractal -colorspace Gray -evaluate multiply 0.40 -evaluate add 60% \) \
    -compose Multiply -composite -gamma 0.75 -level 6%,100% "$FOGDIR/mask_$i.png"
  rx=$(( (i * 5) % 16 )); ry=$(( (i * 9 + 4) % 16 ))
  convert -limit thread 1 -seed $((2200 + i * 131)) -size 16x16 plasma:fractal \
    -colorspace Gray -roll +${rx}+${ry} -level 30%,72% -posterize 3 \
    +level-colors "#c9bce8,#e8f4ff" \
    \( "$FOGDIR/mask_$i.png" -alpha off \) -compose CopyOpacity -composite \
    -channel A -evaluate multiply 0.62 +channel \
    -sample 300% "$FOGDIR/frame_$i.png"
done
convert "$FOGDIR/frame_0.png" "$FOGDIR/frame_1.png" "$FOGDIR/frame_2.png" \
        "$FOGDIR/frame_3.png" "$FOGDIR/frame_4.png" "$FOGDIR/frame_5.png" \
        +append -strip "$OUT/sprites/fx/fog_mantle.png"
echo "  névoa fog_mantle.png ($(identify -format '%wx%h' "$OUT/sprites/fx/fog_mantle.png"))"
rm -rf "$FOGDIR"

# ----------------------------------------------------------------- Animais ----
# sheets 4 direções (linhas) x N frames (colunas) com células 32x32 -> sobe pra 64
A="$ROOT/animais/animais/Without_shadow"
animal () { # animal <src> <dst>
  convert "$1" +repage -filter point -scale 200% "$OUT/sprites/animals/$2"
  echo "  animal $2 ($(identify -format '%wx%h' "$OUT/sprites/animals/$2"))"
}
animal "$A/Boar/Boar_Idle.png"   boar_idle.png
animal "$A/Boar/Boar_Walk.png"   boar_walk.png
animal "$A/Boar/Boar_Run.png"    boar_run.png
animal "$A/Boar/Boar_Attack.png" boar_attack.png
animal "$A/Boar/Boar_Hurt.png"   boar_hurt.png
animal "$A/Boar/Boar_Death.png"  boar_death.png
animal "$A/Fox/Fox_Idle.png"     fox_idle.png
animal "$A/Fox/Fox_walk.png"     fox_walk.png
animal "$A/Fox/Fox_Run.png"      fox_run.png
animal "$A/Fox/Fox_Hurt.png"     fox_hurt.png
animal "$A/Fox/Fox_Death.png"    fox_death.png
animal "$A/Hare/Hare_Idle.png"   hare_idle.png
animal "$A/Hare/Hare_Walk.png"   hare_walk.png
animal "$A/Hare/Hare_Run.png"    hare_run.png
animal "$A/Hare/Hare_Hurt.png"   hare_hurt.png
animal "$A/Hare/Hare_Death.png"  hare_death.png
animal "$A/Deer/Deer_Idle.png"   deer_idle.png
animal "$A/Deer/Deer_Walk.png"   deer_walk.png
animal "$A/Deer/Deer_Run.png"    deer_run.png
animal "$A/Deer/Deer_Hurt.png"   deer_hurt.png
animal "$A/Deer/Deer_Death.png"  deer_death.png
animal "$A/Black_grouse/Black_grouse_Idle.png"   grouse_idle.png
animal "$A/Black_grouse/Black_grouse_Walk.png"   grouse_walk.png
animal "$A/Black_grouse/Black_grouse_Flight.png" grouse_flight.png
animal "$A/Black_grouse/Black_grouse_Hurt.png"   grouse_hurt.png
animal "$A/Black_grouse/Black_grouse_Death.png"  grouse_death.png

# ------------------------------------------------------------------- Props ----
prop () { # prop <src> <dst> [resize]
  if [ -n "$3" ]; then
    convert "$1" -trim +repage -filter point -resize "$3" "$OUT/sprites/props/$2"
  else
    convert "$1" "$OUT/sprites/props/$2"
  fi
  echo "  prop $2 ($(identify -format '%wx%h' "$OUT/sprites/props/$2"))"
}
T="$ROOT/arvores/Trees"; B="$ROOT/arbustos/Assets"; C="$ROOT/cristais/Assets"
R="$ROOT/pedras";        R2="$ROOT/pedras2"
prop "$T/Tree1.png"        tree1.png
prop "$T/Tree2.png"        tree2.png
prop "$T/Tree3.png"        tree3.png
prop "$T/Moss_tree1.png"   tree_moss1.png
prop "$T/Flower_tree1.png" tree_flower1.png
prop "$T/Fruit_tree1.png"  tree_fruit1.png
prop "$T/Fruit_tree2.png"  tree_fruit2.png
prop "$T/Autumn_tree1.png" tree_autumn1.png
prop "$T/Autumn_tree2.png" tree_autumn2.png
prop "$T/Broken_tree2.png" tree_broken1.png
prop "$T/Broken_tree4.png" tree_broken2.png
prop "$T/Moss_tree2.png"   tree_moss2.png
prop "$T/Palm_tree1_1.png" tree_palm1.png
prop "$T/Palm_tree2_1.png" tree_palm2.png
prop "$T/Burned_tree1.png" tree_burned1.png
prop "$T/Burned_tree2.png" tree_burned2.png
prop "$T/Snow_tree1.png"   tree_snow1.png
prop "$T/Snow_tree2.png"   tree_snow2.png
prop "$T/Snow_christmass_tree1.png" tree_snowpine1.png
prop "$B/Bush_blue_flowers1.png"   bush_blue1.png
prop "$B/Bush_blue_flowers2.png"   bush_blue2.png
prop "$B/Bush_pink_flowers1.png"   bush_pink1.png
prop "$B/Bush_red_flowers1.png"    bush_red1.png
prop "$B/Bush_orange_flowers1.png" bush_orange1.png
prop "$B/Bush_orange_flowers2.png" bush_orange2.png
prop "$B/Bush_simple1_1.png"       bush_plain1.png
prop "$B/Bush_simple1_2.png"       bush_plain2.png
prop "$B/Fern1_1.png"              fern1.png
prop "$B/Fern1_2.png"              fern2.png
prop "$B/Cactus1_1.png"            cactus1.png
prop "$B/Cactus1_2.png"            cactus2.png
prop "$B/Cactus2_1.png"            cactus3.png
prop "$B/Snow_bush1.png"           bush_snow1.png
prop "$B/Snow_bush2.png"           bush_snow2.png
prop "$B/Snow_bush3.png"           bush_snow3.png
prop "$B/Autumn_bush1.png"         bush_autumn1.png
prop "$B/Autumn_bush2.png"         bush_autumn2.png
prop "$B/Autumn_bush3.png"         bush_autumn3.png
prop "$B/Burned_tree1.png"         bush_burned1.png
prop "$C/Blue_crystal1.png"        crys_blue1.png
prop "$C/Blue_crystal2.png"        crys_blue2.png
prop "$C/Violet_crystal1.png"      crys_violet1.png
prop "$C/Yellow_crystal1.png"      crys_yellow1.png
prop "$C/White_crystal1.png"       crys_white1.png
prop "$C/Green_crystal1.png"       crys_green1.png
prop "$C/Red_crystal1.png"         crys_red1.png
prop "$R/Rock3_1_no_shadow.png"    rock_a.png
prop "$R/Rock5_2_no_shadow.png"    rock_b.png
prop "$R/Rock6_1_no_shadow.png"    rock_c.png
prop "$R2/Rock1_4_no_shadow.png"   rock_d.png
prop "$R2/Rock2_2_no_shadow.png"   rock_e.png
prop "$ROOT/cenarios/terra.png"    mound.png "96x96"

# ------------------------------------------------------------------- Ícones ---
I="$ROOT/icones"; I2="$ROOT/icones2"; I3="$ROOT/icones3"
icn () { cp "$1" "$OUT/sprites/icons/$2"; echo "  icon $2"; }
icn "$I2/Icon69_1_2.png"  food.png        # pão
icn "$I/Icon28_1_2.png"   essence.png     # diamante azul
icn "$I/Icon17_1_2.png"   potion.png      # poção roxa
icn "$I/Icon11_1_2.png"   lock.png        # cadeado
# mutações / nós de evolução
icn "$I/Icon15_1.png"     fire_sword.png  # lâmina ardente
icn "$I/Icon4_1_2.png"    shield.png
icn "$I/Icon8_1.png"      bolt.png        # velocidade
icn "$I/Icon49_1.png"     hourglass.png
icn "$I/Icon40_1.png"     crown.png       # rei/rainha
icn "$I/Icon22_1.png"     spider.png      # população
icn "$I/Icon26_1_2.png"   spider_gold.png
icn "$I/Icon7_1.png"      fist.png        # crítico
icn "$I/Icon5_1_2.png"    snow.png        # lentidão
icn "$I/Icon42_1_2.png"   heal.png        # cura (pote vermelho)
icn "$I/Icon3_1_2.png"    sun.png         # ganho de essência
icn "$I/Icon9_1.png"      wing_gem.png    # essência suprema
icn "$I/Icon50_1.png"     scale.png       # equilíbrio
icn "$I/Icon44_1_2.png"   ember.png       # brasa
icn "$I2/Icon83_1.png"    egg.png         # ovo verde
icn "$I2/Icon99_1.png"    clover.png      # sorte
icn "$I2/Icon61_1.png"    horseshoe.png
icn "$I2/Icon96_1_2.png"  fungo.png       # vaso / fungo
icn "$I3/Skill_icon1.png"  sk_slash.png   # garras de fogo
icn "$I3/Skill_icon5.png"  sk_tornado.png
icn "$I3/Skill_icon6.png"  sk_frost.png
icn "$I3/Skill_icon10.png" sk_acid.png
icn "$I3/Skill_icon11.png" sk_fury.png
icn "$I3/Skill_icon12.png" sk_time.png
icn "$I3/Skill_icon13.png" sk_banner.png
icn "$I3/Skill_icon14.png" sk_rico.png
icn "$I3/Skill_icon15.png" sk_heart.png
icn "$I3/Skill_icon7.png"  sk_bomb.png

# ----------------------------------------------------------------- Fonte ------
# O atlas só é regenerado se a DejaVu Sans Mono Bold estiver disponível;
# caso contrário preserva os arquivos já existentes em game/assets/font.
if convert -list font 2>/dev/null | grep -qi "DejaVu-Sans-Mono-Bold"; then
# Atlas bitmap gerado com DejaVu Sans Mono Bold SEM antialiasing (estilo pixel).
# Célula fixa 22x30, grade 12 colunas. A ordem é a mesma de FONT.CHARS em font.js.
# Os últimos glifos são usados nos textos do jogo (— travessão, • marcador,
# ▶ seta do botão de invocar onda, [ ] atalhos do draft, ✓ nível comprado na
# árvore). Ficam no FIM para não deslocar nenhum índice.
CHS=(A B C D E F G H I J K L M N O P Q R S T U V W X Y Z \
     Á À Â Ã É Ê Í Ó Ô Õ Ú Ç \
     0 1 2 3 4 5 6 7 8 9 \
     '?' '!' '.' ',' ':' ';' '+' '-' '*' '/' '%' '(' ')' '<' '>' '=' '#' '_' ' ' \
     '—' '•' '▶' '[' ']' '✓' '♿' '∞' 'Ñ')
FDIR=$(mktemp -d)
convert -size 22x30 xc:none "$FDIR/blank.png"
i=0
while [ $i -lt ${#CHS[@]} ]; do
  ch="${CHS[$i]}"
  f="$FDIR/$(printf '%03d' $i).png"
  if [ "$ch" = " " ]; then
    cp "$FDIR/blank.png" "$f"
  else
    convert -background none -fill white -font DejaVu-Sans-Mono-Bold \
      -pointsize 21 +antialias "label:$ch" -gravity north -extent 22x30 "$f"
  fi
  i=$((i+1))
done
# monta linhas de 12 e depois empilha
rows=$(( (${#CHS[@]} + 11) / 12 ))
r=0
while [ $r -lt $rows ]; do
  files=""
  c=0
  while [ $c -lt 12 ]; do
    idx=$(( r*12 + c ))
    if [ $idx -lt ${#CHS[@]} ]; then
      files="$files $FDIR/$(printf '%03d' $idx).png"
    else
      files="$files $FDIR/blank.png"
    fi
    c=$((c+1))
  done
  convert $files +append "$FDIR/row$r.png"
  r=$((r+1))
done
convert $(for r in $(seq 0 $((rows-1))); do echo "$FDIR/row$r.png"; done) -append "$OUT/font/font_big.png"
echo "  font font_big.png ($(identify -format '%wx%h' "$OUT/font/font_big.png"))"
rm -rf "$FDIR"

# Versão pequena (HUD / corpo de texto): pointsize 11, célula 13x16
FDIR=$(mktemp -d)
convert -size 13x16 xc:none "$FDIR/blank.png"
i=0
while [ $i -lt ${#CHS[@]} ]; do
  ch="${CHS[$i]}"
  f="$FDIR/$(printf '%03d' $i).png"
  if [ "$ch" = " " ]; then
    cp "$FDIR/blank.png" "$f"
  else
    convert -background none -fill white -font DejaVu-Sans-Mono-Bold \
      -pointsize 11 +antialias "label:$ch" -gravity north -extent 13x16 "$f"
  fi
  i=$((i+1))
done
r=0
while [ $r -lt $rows ]; do
  files=""
  c=0
  while [ $c -lt 12 ]; do
    idx=$(( r*12 + c ))
    if [ $idx -lt ${#CHS[@]} ]; then
      files="$files $FDIR/$(printf '%03d' $idx).png"
    else
      files="$files $FDIR/blank.png"
    fi
    c=$((c+1))
  done
  convert $files +append "$FDIR/row$r.png"
  r=$((r+1))
done
convert $(for r in $(seq 0 $((rows-1))); do echo "$FDIR/row$r.png"; done) -append "$OUT/font/font_small.png"
echo "  font font_small.png ($(identify -format '%wx%h' "$OUT/font/font_small.png"))"
rm -rf "$FDIR"

else
  echo "  font DejaVu indisponível — mantendo atlas existente"
fi

echo "Concluído -> $OUT"
echo "LEMBRETE: se algum PNG mudou, dê bump em ASSET_V (game/js/assets.js) — senão o cache do jogador esconde a arte nova."
