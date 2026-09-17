#!/usr/bin/env python3
# ==============================================================================
# FUMIGA — gerador do formigueiro (top-down pixel art, estilo Dead Cells/Celeste)
# Recria o conceito do sprite de referência: cratera circular de terra com
# anéis concêntricos, rachaduras e buraco central escuro, vista de cima.
# Gera 3 estados de dano: nest.png, nest_d1.png, nest_d2.png
# Uso: python3 tools/make_nest.py
# ==============================================================================
import math
import random
from PIL import Image

SIZE = 128
CX = CY = SIZE // 2

# paleta (tons de terra quentes com contorno escuro — casa com a paleta roxa do jogo)
OUTLINE   = (40, 22, 16)
DEEP      = (74, 43, 28)
SHADOW    = (96, 55, 34)
BASE      = (128, 76, 46)
WARM      = (158, 97, 58)
LIGHT     = (193, 124, 76)
CREAM     = (224, 158, 104)
HI        = (240, 186, 130)
CRACK     = (52, 30, 20)
WALL_1    = (66, 36, 24)
WALL_2    = (45, 24, 17)
HOLE_EDGE = (30, 15, 11)
HOLE      = (10, 5, 4)
PELLET    = (110, 66, 40)


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


def gen_nest(out_path, damage=0):
    rng = random.Random(1234 + damage * 77)

    base_comps = [(0.9, 3), (0.5, 6), (0.25, 9)]
    band_comps = [(0.4, 4), (0.2, 7)]

    R_OUT  = 55.0   # contorno externo
    R_B1   = 41.0   # topo do primeiro anel
    R_B2   = 28.0   # topo do segundo anel
    R_WALL = 15.0   # parede da cratera
    R_HOLE = 9.0    # buraco

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
            if r <= r_hole:
                # buraco: quase preto com gradação a partir da borda
                t = r / max(r_hole, 1e-3)
                col = tuple(int(HOLE[i] + (HOLE_EDGE[i] - HOLE[i]) * t) for i in range(3))
            elif r <= r_wall:
                # parede interna da cratera (escurece ao descer)
                t = (r - r_hole) / max(r_wall - r_hole, 1e-3)
                pal = WALL_2 if grain < 0.5 else WALL_1
                if li > 0.15: pal = tuple(min(255, c + 16) for c in pal)
                col = pal
            elif r <= r_b2:
                # anel superior — mais iluminado
                base = LIGHT if grain < 0.55 else CREAM
                if grain2 > 0.93: base = HI
                sh = int(14 * li - (6 if r_b2 - r < 2.2 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_wall < 1.6:
                    col = tuple(max(0, c - 42) for c in col)  # linha de queda do anel
            elif r <= r_b1:
                base = WARM if grain < 0.55 else (BASE if grain < 0.8 else LIGHT)
                sh = int(12 * li - (7 if r_b1 - r < 2.2 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_b2 < 1.6:
                    col = tuple(max(0, c - 38) for c in col)
            else:
                # anel externo — mais escuro
                base = BASE if grain < 0.5 else (SHADOW if grain < 0.75 else WARM)
                sh = int(10 * li - (8 if r_out - r < 2.5 else 0))
                col = tuple(max(0, min(255, c + sh)) for c in base)
                if r - r_b1 < 1.6:
                    col = tuple(max(0, c - 34) for c in col)

            # rachaduras sobre as bandas
            cd = crack_dist(a, r, cracks)
            if cd < 0.032 and r > r_hole + 0.7:
                col = CRACK if cd < 0.016 else tuple(max(0, c - 26) for c in col)

            px[x, y] = (*col, 255)

    # ----------------------------------------------------------- detalhes ----

    # contorno escuro na silhueta (dilate->outline 1px)
    for y in range(SIZE):
        for x in range(SIZE):
            if img.getpixel((x, y))[3] == 0:
                continue
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + ox, y + oy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and img.getpixel((nx, ny))[3] == 0:
                    px[x, y] = (*OUTLINE, 255)
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
                c = PELLET if g < 0.6 else WARM
                px[xx, yy] = (c[0], c[1], c[2], 255)
        # contorno do peloto
        for yy in range(cy - s - 1, cy + s + 2):
            for xx in range(cx - s - 1, cx + s + 2):
                if not (0 <= xx < SIZE and 0 <= yy < SIZE):
                    continue
                if math.hypot(xx - cx, yy - cy) > s + 1.2:
                    continue
                if img.getpixel((xx, yy))[3] == 0:
                    px[xx, yy] = (*OUTLINE, 255)

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
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(here, "..", "game", "assets", "sprites", "props")
    os.makedirs(outdir, exist_ok=True)
    gen_nest(os.path.join(outdir, "nest.png"), damage=0)
    gen_nest(os.path.join(outdir, "nest_d1.png"), damage=1)
    gen_nest(os.path.join(outdir, "nest_d2.png"), damage=2)
    print("Formigueiro gerado.")
