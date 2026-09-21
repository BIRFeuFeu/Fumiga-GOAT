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

# Formigueiro (sprite pixel-art procedural — ver tools/make_nest.py)
python3 "$ROOT/tools/make_nest.py"

# ---------------------------------------------------------------- Formigas ----
# trim transparente + redimensiona pela altura (mantém pixels nítidos)
ant () { # ant <src> <dst> <altura_px>
  convert "$1" -trim +repage -filter point -resize "x$3" "$OUT/sprites/ants/$2"
  echo "  ant $2 ($(identify -format '%wx%h' "$OUT/sprites/ants/$2"))"
}
F="$ROOT/formigas"
ant "$F/gen-4d3ea505-a3ec-4de8-b7a9-dbd72d194464.png" worker.png      30
ant "$F/gen-1e856e81-6689-4fac-ad52-cc38b9d8e3c7.png" soldier.png     44
ant "$F/gen-31f4c985-4828-4f6b-b3ba-0a62d916e42f.png" spitter.png     40
ant "$F/gen-474c2946-54af-4f66-8840-84bac5714930.png" tank.png        48
ant "$F/gen-70743d19-eeb2-4027-b93a-8c3ec1f599a7.png" queen.png      128
ant "$F/gen-f0b8f676-2347-4149-8649-a865599db323.png" e_runner.png    26
ant "$F/gen-6a5cd3cd-5ec4-4ce8-be03-1292d3529de8.png" e_swarm.png     30
ant "$F/gen-56160a10-922e-4c41-b97e-781930b8ecdc.png" e_warrior.png   44
ant "$F/gen-56df2381-ab9e-4c70-b7de-5beef7e37bd2.png" e_spitter.png   42
ant "$F/gen-78c7edb1-d4b6-4343-a2e9-834e7a8bd66c.png" e_reaper.png    40
ant "$F/gen-686ee82a-5469-4aa3-86c7-37a4cf797843.png" e_matron.png    72
ant "$F/gen-1573e56b-2049-49a6-b04d-571d2167ba4c.png" e_sentinel.png  56

# --- Novas classes aliadas (recolors) ---
# BATEDORA: operária com matiz teal — veloz e alerta
convert "$F/gen-4d3ea505-a3ec-4de8-b7a9-dbd72d194464.png" -trim +repage -filter point -resize x30 -modulate 115,105,190 "$OUT/sprites/ants/scout.png"
# CURANDEIRA: operária alva (brilho alto) — suporte médica
convert "$F/gen-4d3ea505-a3ec-4de8-b7a9-dbd72d194464.png" -trim +repage -filter point -resize x34 -modulate 420,50 "$OUT/sprites/ants/healer.png"
# BOMBEIRA: soldado em brasa profunda — dano em área + queimadura
convert "$F/gen-1e856e81-6689-4fac-ad52-cc38b9d8e3c7.png" -trim +repage -filter point -resize x46 -modulate 92,185,90 "$OUT/sprites/ants/bomber.png"
echo "  ants novas: scout/healer/bomber"

# clareia sprites muito escuras (fundo do jogo é sombrio)
bright () { convert "$OUT/sprites/ants/$1" -modulate "$2,100" "$OUT/sprites/ants/$1"; echo "  bright $1 x$2"; }
bright e_runner.png  175
bright e_warrior.png 150
bright e_matron.png  140
bright e_swarm.png   130
bright tank.png      145
bright e_reaper.png  125
bright e_sentinel.png 120
bright e_spitter.png 118
convert "$OUT/sprites/ants/queen.png"   -modulate 108,118 "$OUT/sprites/ants/queen.png"
convert "$OUT/sprites/ants/soldier.png" -modulate 106,112 "$OUT/sprites/ants/soldier.png"
convert "$OUT/sprites/ants/worker.png"  -modulate 108,110 "$OUT/sprites/ants/worker.png"
convert "$OUT/sprites/ants/spitter.png" -modulate 112,116 "$OUT/sprites/ants/spitter.png"

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
