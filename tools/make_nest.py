#!/usr/bin/env python3
# ==============================================================================
# FUMIGA — gerador do formigueiro (top-down pixel art, estilo Dead Cells/Celeste)
# Recria o conceito do sprite de referência: cratera circular de terra com
# anéis concêntricos, rachaduras e buraco central escuro, vista de cima.
# Gera 3 estados de dano: nest.png, nest_d1.png, nest_d2.png
# Estilos: 0 = clássico (laranja vivo), 1 = boca com pedras, 2 = boca com
# raízes, 3 = terra escura da tela TITLE (boca deslocada p/ baixo + seixos).
# Uso: python3 tools/make_nest.py [style] [outdir] [prefixo]
# ==============================================================================
import math
import random
from PIL import Image

SIZE = 128
CX = CY = SIZE // 2

# paleta clássica (tons de terra quentes com contorno escuro)
PAL0 = dict(
    OUTLINE=(40, 22, 16),
    DEEP=(74, 43, 28),
    SHADOW=(96, 55, 34),
    BASE=(128, 76, 46),
    WARM=(158, 97, 58),
    LIGHT=(193, 124, 76),
    CREAM=(224, 158, 104),
    HI=(240, 186, 130),
    CRACK=(52, 30, 20),
    WALL_1=(66, 36, 24),
    WALL_2=(45, 24, 17),
    HOLE_EDGE=(30, 15, 11),
    HOLE=(10, 5, 4),
    PELLET=(110, 66, 40),
)

# paleta TITLE (terra escura e contida da tela de título: #3a2a16 → #5a3a22,
# boca quase preta #0a0812 com miolo negro)
PAL3 = dict(
    OUTLINE=(24, 14, 10),
    DEEP=(46, 32, 18),
    SHADOW=(58, 42, 22),
    BASE=(74, 52, 28),
    WARM=(90, 58, 32),
    LIGHT=(110, 72, 40),
    CREAM=(130, 88, 50),
    HI=(150, 104, 60),
    CRACK=(20, 12, 8),
    WALL_1=(36, 24, 14),
    WALL_2=(26, 16, 10),
    HOLE_EDGE=(10, 8, 18),
    HOLE=(0, 0, 0),
    PELLET=(64, 44, 26),
)


def edge_wobble(comps, a):
    """pequena variação senoidal de raio, suave no ângulo"""
    v = 0.0
    for amp, k in comps:
        v += (amp / k) * math.sin(a * k + k * 1.7)
    return v


def crack_dist(a, r, cracks):
    """distância angular à rachadura mais próxima (rachaduras radiais com serpenteio)"""
    best = 9e9
    for (ca, w, r0, r1, wig) in cracks:
        if r < r0 or r > r1:
            continue
        off = math.sin(r * 0.55 + ca * 7.0) * wig
        d = abs(math.atan2(math.sin(a - (ca + off)), math.cos(a - (ca + off))))
        best = min(best, d * r / max(1.0, r) + d)  # distância angular
    return best


def gen_nest(out_path, damage=0, style=0):
    rng = random.Random(1234 + damage * 77 + style * 913)
    P = PAL3 if style == 3 else PAL0

    base_comps = [(0.9, 3), (0.5, 6), (0.25, 9)]
    band_comps = [(0.4, 4), (0.2, 7)]

    R_OUT  = 55.0   # contorno externo
    R_B1   = 41.0   # topo do primeiro anel
    R_B2   = 28.0   # topo do segundo anel
    R_WALL = 15.0   # parede da cratera
    R_HOLE = 9.0    # buraco
    # STYLE 3: a boca da TITLE é generosa e fica abaixo do centro — o pixel
    # loop mede o buraco/parede a partir do centro deslocado (rh), e as bandas
    # continuam concêntricas no sprite (r). A porta do jogo (world.js: door)
    # acompanha esse deslocamento.
    HOLE_DY = 6.0 if style == 3 else 0.0
    if style == 3:
        R_WALL, R_HOLE = 17.0, 11.0

    # rachaduras: (ângulo base, largura ang, raio0, raio1, serpenteio)
    cracks = [(0.7, 0.035, 12, 52, 0.10), (2.6, 0.03, 14, 48, 0.08),
              (4.4, 0.028, 16, 44, 0.07)]
    if damage >= 1:
        cracks += [(1.6, 0.05, 10, 55, 0.12), (5.5, 0.045, 12, 52, 0.10)]
    if damage >= 2:
        cracks += [(3.5, 0.06, 8, 56, 0.14), (0.1, 0.05, 10, 55, 0.12)]

    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()

    for y in range(SIZE):
        for x in range(SIZE):
            dx = x - CX + 0.5
            dy = y - CY + 0.5
            r = math.hypot(dx, dy)
            rh = math.hypot(dx, dy - HOLE_DY)
            a = math.atan2(dy, dx)

            wob = edge_wobble(base_comps, a)
            r_out = R_OUT + wob * 2.2
            if r > r_out:
                continue  # transparente fora da silhueta

            # luz: topo-esquerda clara, baixa-direita escura (como a referência)
            li = (-dx - dy) / (R_OUT * 2)          # -0.5 .. 0.5
            # textura granulada determinística
            grain = ((x * 73856093 ^ y * 19349663) & 0xFFFF) / 0xFFFF  # hash simples
            grain2 = (((x * 2 + 1) * 2654435761 ^ (y * 3) * 40503) & 0xFFFF) / 0xFFFF

            r_b1 = R_B1 + edge_wobble(band_comps, a) * 1.6
            r_b2 = R_B2 + edge_wobble(band_comps, a + 2.2) * 1.4
            r_wall = R_WALL + edge_wobble(band_comps, a + 4.4) * 1.0
            r_hole = R_HOLE + edge_wobble(band_comps, a + 1.3) * 0.8

            col = None
            if rh <= r_hole:
                # buraco: quase preto com gradação a partir da borda
                t = rh / max(r_hole, 1e-3)
                col = tuple(int(P["HOLE"][i] + (P["HOLE_EDGE"][i] - P["HOLE"][i]) * t) for i in range(3))
            elif rh <= r_wall:
                # parede interna da cratera (escurece ao descer)
                t = (rh - r_hole) / max(r_wall - r_hole, 1e-3)
                pal = P["WALL_2"] if grain < 0.5 else P["WALL_1"]
                if li > 0.15:
                    pal = tuple(min(255, c + 16) for c in pal)
                col = pal
            elif r <= r_b2:
                # anel superior — mais iluminado
                base = P["LIGHT"] if grain < 0.55 else P["CREAM"]
                if grain2 > 0.93:
                    base = P["HI"]
                sh = int(14 * li - (6 if r_b2 - r < 2.2 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_wall < 1.6:
                    col = tuple(max(0, c - 42) for c in col)  # linha de queda do anel
            elif r <= r_b1:
                base = P["WARM"] if grain < 0.55 else (P["BASE"] if grain < 0.8 else P["LIGHT"])
                sh = int(12 * li - (7 if r_b1 - r < 2.2 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_b2 < 1.6:
                    col = tuple(max(0, c - 38) for c in col)
            else:
                # anel externo — mais escuro
                base = P["BASE"] if grain < 0.5 else (P["SHADOW"] if grain < 0.75 else P["WARM"])
                sh = int(10 * li - (8 if r_out - r < 2.5 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_b1 < 1.6:
                    col = tuple(max(0, c - 34) for c in col)

            # rachaduras sobre as bandas
            cd = crack_dist(a, r, cracks)
            if cd < 0.032 and rh > r_hole + 0.7:
                col = P["CRACK"] if cd < 0.016 else tuple(max(0, c - 26) for c in col)

            px[x, y] = (*col, 255)

    # ----------------------------------------------------------- detalhes ----
    # ESTILOS (style>=1): a boca ganha moldura e o montículo ganha textura.
    # style=0 é o clássico byte-idêntico; os outros desenham por cima da base.
    if style >= 1:
        STONE, STONE_DK, STONE_LT = (122, 116, 128), (82, 76, 92), (168, 162, 178)
        ROOT, ROOT_DK = (96, 64, 38), (58, 36, 24)
        TWIG, TWIG_LT = (70, 46, 28), (120, 84, 52)
        PEB, PEB_DK = (150, 110, 76), (104, 74, 52)

        def blob(cx, cy, rr, c_main, c_dk, c_lt):
            for yy in range(int(cy - rr - 1), int(cy + rr + 2)):
                for xx in range(int(cx - rr - 1), int(cx + rr + 2)):
                    if not (0 <= xx < SIZE and 0 <= yy < SIZE):
                        continue
                    d = math.hypot(xx - cx, yy - cy)
                    if d <= rr:
                        tilt = (xx - cx) + (yy - cy)
                        c = c_lt if tilt < -rr * 0.3 else (c_dk if tilt > rr * 0.4 else c_main)
                        px[xx, yy] = (*c, 255)
                    elif d <= rr + 1.1:
                        px[xx, yy] = (*P["OUTLINE"], 255)

        if style == 1:
            # anel de pedras emoldurando a boca (fora do buraco: r>=10)
            for i in range(9):
                sa = i / 9 * math.tau + 0.3
                sr = 13.0 + rng.uniform(-0.7, 0.7)
                blob(CX + math.cos(sa) * sr, CY + math.sin(sa) * sr,
                     rng.uniform(2.2, 3.0), STONE, STONE_DK, STONE_LT)
        elif style == 2:
            # raízes finas irradiando da boca (começam fora do buraco)
            for i in range(10):
                sa = i / 10 * math.tau + 0.15
                r0, r1 = 10.5, 15.5 + rng.uniform(0, 2.5)
                for s in range(15):
                    rr = r0 + (r1 - r0) * s / 14
                    aa = sa + math.sin(s * 1.1 + i) * 0.03
                    xx, yy = int(CX + math.cos(aa) * rr), int(CY + math.sin(aa) * rr)
                    if 0 <= xx < SIZE and 0 <= yy < SIZE and img.getpixel((xx, yy))[3] != 0:
                        px[xx, yy] = (*ROOT, 255)
                        if yy + 1 < SIZE and img.getpixel((xx, yy + 1))[3] != 0:
                            px[xx, yy + 1] = (*ROOT_DK, 255)

        # pedrinhas e gravetos espalhados nas bandas (longe da boca e da borda)
        for _ in range(26):
            pa = rng.uniform(0, math.tau)
            pr = rng.uniform(19, 38)
            qx, qy = int(CX + math.cos(pa) * pr), int(CY + math.sin(pa) * pr)
            if not (0 <= qx < SIZE and 0 <= qy < SIZE):
                continue
            if img.getpixel((qx, qy))[3] == 0:
                continue
            if rng.random() < 0.55:
                blob(qx, qy, rng.uniform(1.0, 1.8), PEB, PEB_DK, P["CREAM"])
            else:
                ta = rng.uniform(0, math.tau)
                for s in range(rng.randint(3, 5)):
                    xx, yy = int(qx + math.cos(ta) * s), int(qy + math.sin(ta) * s * 0.6)
                    if 0 <= xx < SIZE and 0 <= yy < SIZE and img.getpixel((xx, yy))[3] != 0:
                        px[xx, yy] = (*(TWIG_LT if s == 0 else TWIG), 255)

        if style == 3:
            # seixos da TITLE: 12 pedrinhas em anel largo ao redor do montículo
            for i in range(12):
                pa = i / 12 * math.tau + 0.2
                pr = 44 + rng.uniform(-2, 12)
                qx, qy = int(CX + math.cos(pa) * pr), int(CY + math.sin(pa) * pr * 0.92)
                blob(qx, qy, rng.uniform(1.4, 2.2), (74, 58, 46), (48, 36, 30), (96, 78, 60))

    # contorno escuro na silhueta (dilate->outline 1px)
    for y in range(SIZE):
        for x in range(SIZE):
            if img.getpixel((x, y))[3] == 0:
                continue
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + ox, y + oy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and img.getpixel((nx, ny))[3] == 0:
                    px[x, y] = (*P["OUTLINE"], 255)
                    break

    # pelotos de terra espalhados na periferia
    def pellet(cx, cy, s):
        for yy in range(cy - s, cy + s + 1):
            for xx in range(cx - s, cx + s + 1):
                if not (0 <= xx < SIZE and 0 <= yy < SIZE):
                    continue
                if math.hypot(xx - cx, yy - cy) > s + 0.5:
                    continue
                g = ((xx * 7349 ^ yy * 9131) & 0xF) / 0xF
                c = P["PELLET"] if g < 0.6 else P["WARM"]
                px[xx, yy] = (c[0], c[1], c[2], 255)
        # contorno do peloto
        for yy in range(cy - s - 1, cy + s + 2):
            for xx in range(cx - s - 1, cx + s + 2):
                if not (0 <= xx < SIZE and 0 <= yy < SIZE):
                    continue
                if math.hypot(xx - cx, yy - cy) > s + 1.2:
                    continue
                if img.getpixel((xx, yy))[3] == 0:
                    px[xx, yy] = (*P["OUTLINE"], 255)

    pellets = [(14, 30, 2), (106, 22, 3), (118, 66, 2), (12, 74, 2), (22, 106, 2),
               (84, 112, 2), (112, 96, 2), (52, 118, 2), (30, 12, 1)]
    for (cx2, cy2, s2) in pellets:
        n = rng.randint(0, 5)
        pellet(cx2 + n, cy2 - n, s2)

    # lascas na beirada (dano 2): mordidas na borda com preenchimento de sombra
    if damage >= 2:
        for (ba, bd) in [(1.05, 7), (3.9, 9), (5.1, 6)]:
            bx, by = CX + math.cos(ba) * (R_OUT - 3), CY + math.sin(ba) * (R_OUT - 3)
            for yy in range(SIZE):
                for xx in range(SIZE):
                    if math.hypot(xx - bx, yy - by) <= bd:
                        if math.hypot(xx - CX, yy - CY) > R_OUT - 9:
                            px[xx, yy] = (0, 0, 0, 0)

    img.save(out_path)
    print("  nest ->", out_path, img.size)


if __name__ == "__main__":
    import os
    import sys
    here = os.path.dirname(os.path.abspath(__file__))
    # Uso: make_nest.py [style] [outdir] [prefixo]
    #   sem args = clássico (style 0) nos assets do jogo (passo do pipeline)
    style = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    outdir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "..", "game", "assets", "sprites", "props")
    prefix = sys.argv[3] if len(sys.argv) > 3 else "nest"
    os.makedirs(outdir, exist_ok=True)
    gen_nest(os.path.join(outdir, prefix + ".png"), damage=0, style=style)
    gen_nest(os.path.join(outdir, prefix + "_d1.png"), damage=1, style=style)
    gen_nest(os.path.join(outdir, prefix + "_d2.png"), damage=2, style=style)
    print("Formigueiro gerado (style %d)." % style)
