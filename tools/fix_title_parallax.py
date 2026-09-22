#!/usr/bin/env python3
# ==============================================================================
# FUMIGA — reparo das 4 camadas de parallax da tela TITLE
# game/assets/parallax/menu/layer{5,4,3,1}_*.png
#
# Problema: as camadas foram recortadas com chromakey e o matte veio sujo:
#   • alpha binário (zero anti-aliasing)  -> bordas serrilhadas
#   • buracos fechados                    -> o céu aparece DENTRO do cenário
#   • especas/ilhas minúsculas            -> chuvisco
#   • spill verde na crista das montanhas -> faixa esverdeada (briga com o céu)
#   • fundo recortado achatado em cor plana (branco nas vinhas/montanhas,
#     laranja na camada principal) — por isso todo recorte ganha halo
#
# O que este script faz (sem arte nova, tudo numérico e reproduzível):
#   1. backup dos originais em _orig/ (o script passa a ser re-executável)
#   2. remove ilhas minúsculas (chuvisco)
#   3. tapa os buracos fechados que estão dentro de massa sólida — inpainting
#      por convolução normalizada; frestas naturais entre folhas são mantidas
#   4. estende a cor das bordas para fora do alpha (defringe): fim do halo
#   5. paleta: montanhas e vinhas entram na paleta do pôr do sol amostrada do
#      próprio céu, com perspectiva aérea (o verde das serras distantes some)
#   6. redimensiona cada camada para o tamanho EXATO em que drawTitleBg() a
#      desenha, com filtro de qualidade -> anti-aliasing embutido no pixel
#      (o jogo segue com imageSmoothingEnabled = false, agora em 1:1)
#
# Requer: Python 3 + Pillow + NumPy (mesma base dos outros scripts de tools/)
# Uso:
#   python3 tools/fix_title_parallax.py            # repara e grava
#   python3 tools/fix_title_parallax.py --report   # só mede, não grava
#   python3 tools/fix_title_parallax.py --restore  # devolve os originais
# ==============================================================================
import argparse
import os
import shutil

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MENU = os.path.join(ROOT, "game", "assets", "parallax", "menu")
ORIG = os.path.join(MENU, "_orig")

F_SKY = "layer5_sky_sunset_moon_highres.png"
F_MTN = "layer4_mountains_silhouette_highres.png"
F_MAIN = "layer3_main_grass_ruins_anthill_transparent.png"
F_VINE = "layer1_foreground_vines_bottom_final.png"

# Retângulo EXATO em que drawTitleBg() (game/js/render.js) desenha cada camada.
# Gerar o PNG já nesse tamanho = blit 1:1, sem reamostragem na hora de desenhar.
TARGET = {
    F_SKY: (1040, 580),    # -40,-20  VIEW_W+80 x VIEW_H+40
    F_MTN: (1060, 335),    # -50,+20  VIEW_W+100 x 335 (era VIEW_H*0.62 = 334.8)
    F_MAIN: (1020, 535),   # -30,+10  VIEW_W+60 x VIEW_H-5
    F_VINE: (1040, 540),   # -40, 0   VIEW_W+80 x VIEW_H
}

# Faixa da serra dentro do PNG original das montanhas.
MTN_BAND = (318, 648)
# Onde a crista cai na tela (igual ao desenho atual) e a escala uniforme que
# devolve a proporção correta da imagem (fim do esmagamento vertical de 1,78x).
MTN_TOP_SCREEN = 20 + 148
MTN_SCALE = 1060.0 / 1280.0


# ------------------------------------------------------------- ajudas numéricas
def imread_rgba(path):
    """-> (rgb float32 0..255 [H,W,3], alpha float32 0..1 [H,W])"""
    im = Image.open(path)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    arr = np.asarray(im, dtype=np.float32)
    return arr[..., :3].copy(), arr[..., 3].copy() / 255.0


def box_blur(a, r):
    """box blur separável por soma acumulada (rápido, sem scipy)."""
    if r <= 0:
        return a.astype(np.float32, copy=True)
    single = a.ndim == 2
    if single:
        a = a[..., None]
    H, W, C = a.shape
    k = 2 * r + 1
    out = np.empty((H, W, C), dtype=np.float32)
    for c in range(C):
        x = a[..., c]
        xp = np.pad(x, ((0, 0), (r, r)), mode="edge")
        cs = np.concatenate([np.zeros((H, 1), np.float32), np.cumsum(xp, axis=1)], axis=1)
        xh = (cs[:, k:] - cs[:, :W]) / k
        xp = np.pad(xh, ((r, r), (0, 0)), mode="edge")
        cs = np.concatenate([np.zeros((1, W), np.float32), np.cumsum(xp, axis=0)], axis=0)
        out[..., c] = (cs[k:, :] - cs[:H, :]) / k
    return out[..., 0] if single else out


def label_components(mask):
    """Componentes conexos (8-vizinhos) por runs de linha + union-find.
    -> (labels int32 [H,W] (-1 = fundo), areas int32 [n])"""
    H, W = mask.shape
    labels = np.full((H, W), -1, np.int32)
    parent = []

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    prev = []
    for y in range(H):
        row = mask[y].astype(np.int8)
        edges = np.flatnonzero(np.diff(np.concatenate(([0], row, [0]))))
        cur = []
        p = 0
        for s, e in zip(edges[0::2], edges[1::2]):
            lab = len(parent)
            parent.append(lab)
            while p < len(prev) and prev[p][1] < s - 1:
                p += 1
            q = p
            while q < len(prev) and prev[q][0] <= e + 1:
                ra, rb = find(lab), find(prev[q][2])
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
                q += 1
            cur.append([s, e, lab])
            labels[y, s:e] = lab
        prev = cur

    roots = np.array([find(i) for i in range(len(parent))], dtype=np.int32)
    uniq = np.unique(roots)
    remap = -np.ones(len(parent), dtype=np.int32)
    remap[uniq] = np.arange(len(uniq), dtype=np.int32)
    safe = np.where(labels >= 0, labels, 0)
    out = remap[roots[safe]]
    out[labels < 0] = -1
    areas = np.bincount(out.ravel() + 1, minlength=len(uniq) + 1)[1:]
    return out, areas


def inpaint(rgb, known, radius=10, iters=30):
    """Convolução normalizada: espalha a cor conhecida para dentro dos buracos
    e para fora das bordas (defringe). Devolve o RGB completo."""
    kf = (known > 0).astype(np.float32)
    cur = np.where(known[..., None], rgb, 0.0).astype(np.float32)
    for _ in range(iters):
        num = box_blur(cur * kf[..., None], radius)
        den = box_blur(kf, radius)
        cur = np.where(known[..., None], rgb, num / np.maximum(den[..., None], 1e-6))
    return cur


def rgb_to_hsl(rgb):
    """rgb 0..1 -> (h, s, l) em 0..1"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    l = (mx + mn) / 2.0
    d = mx - mn
    s = np.clip(np.where(d <= 1e-6, 0.0, d / np.maximum(1.0 - np.abs(2.0 * l - 1.0), 1e-6)), 0, 1)
    h = np.zeros_like(l)
    rm = (mx == r) & (d > 1e-6)
    gm = (mx == g) & (d > 1e-6) & ~rm
    bm = (mx == b) & (d > 1e-6) & ~rm & ~gm
    h[rm] = ((g - b)[rm] / d[rm]) % 6.0
    h[gm] = ((b - r)[gm] / d[gm]) + 2.0
    h[bm] = ((r - g)[bm] / d[bm]) + 4.0
    return np.stack([h / 6.0, s, l], -1)


def hsl_to_rgb(hsl):
    """(h, s, l) em 0..1 -> rgb 0..1 (fórmula fechada: cobre os 6 setores,
    incluindo o magenta/vermelho, que uma tabela por partes costuma errar)."""
    h, s, l = hsl[..., 0], hsl[..., 1], hsl[..., 2]
    a = s * np.minimum(l, 1.0 - l)
    ch = []
    for n in (0.0, 8.0, 4.0):
        k = (n + h * 12.0) % 12.0
        ch.append(l - a * np.clip(np.minimum(k - 3.0, 9.0 - k), -1.0, 1.0))
    return np.clip(np.stack(ch, -1), 0.0, 1.0)


# ---------------------------------------------------------------- diagnóstico
def measure(tag, rgb, a):
    solid = a >= 0.5
    lab, areas = label_components(~solid)
    H, W = a.shape
    border = np.zeros(len(areas), bool)
    for edge in (lab[0, :], lab[H - 1, :], lab[:, 0], lab[:, W - 1]):
        e = edge[edge >= 0]
        border[e] = True
    nholes = int((~border).sum())
    holes = int(areas[~border].sum())
    semi = int(((a > 0.002) & (a < 0.998)).sum())
    g_exc = float((rgb[..., 1] - 0.5 * (rgb[..., 0] + rgb[..., 2]))[solid].mean())
    print(f"  {tag:11s} buracos={holes:6d}px/{nholes:5d}  semi-transparente={semi:6d}px"
          f"  verde-em-excesso={g_exc:+5.1f}")


# -------------------------------------------------------------------- etapas
def step_backup():
    os.makedirs(ORIG, exist_ok=True)
    for f in TARGET:
        src, dst = os.path.join(MENU, f), os.path.join(ORIG, f)
        if not os.path.exists(dst) and os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  backup {f} -> _orig/")


def step_restore():
    if not os.path.isdir(ORIG):
        print("  _orig/ vazio — os originais também estão no commit anterior do git")
        return
    for f in TARGET:
        src, dst = os.path.join(ORIG, f), os.path.join(MENU, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  restaurado {f}")


def clean_matte(rgb, a, min_island, max_hole, ring_k=8, ring_solid=0.86):
    """Remove ilhas minúsculas e tapa buracos fechados dentro de massa sólida.
    Um buraco só é tapado se o retângulo em volta dele for quase todo sólido —
    assim as frestas naturais entre folhas/vinhas continuam abertas."""
    solid = a >= 0.5

    # 1) ilhas minúsculas (chuvisco) somem
    if min_island > 0:
        lab, areas = label_components(solid)
        small = areas < min_island
        if small.any():
            drop = small[np.where(lab >= 0, lab, 0)] & solid & (lab >= 0)
            a = np.where(drop, 0.0, a)
            solid = a >= 0.5
            print(f"    ilhas removidas : {int(drop.sum()):6d}px em {int(small.sum())} componentes")

    # 2) buracos fechados (não encostam na borda da imagem)
    lab, areas = label_components(~solid)
    H, W = a.shape
    touches = np.zeros(len(areas), bool)
    for edge in (lab[0, :], lab[H - 1, :], lab[:, 0], lab[:, W - 1]):
        e = edge[edge >= 0]
        touches[e] = True
    cand = np.flatnonzero(~touches & (areas <= max_hole))
    # integral do sólido para medir a "massa em volta" em O(1) por buraco
    integ = np.zeros((H + 1, W + 1), np.float64)
    np.cumsum(np.cumsum(solid.astype(np.float64), axis=0), axis=1, out=integ[1:, 1:])
    filled = np.zeros((H, W), bool)
    kept_px = kept_n = 0
    for ci in cand:
        hole = lab == ci
        ys, xs = np.flatnonzero(hole.any(axis=1)), np.flatnonzero(hole.any(axis=0))
        y0, y1 = max(ys[0] - ring_k, 0), min(ys[-1] + ring_k + 1, H)
        x0, x1 = max(xs[0] - ring_k, 0), min(xs[-1] + ring_k + 1, W)
        rect = (integ[y1, x1] - integ[y0, x1] - integ[y1, x0] + integ[y0, x0])
        ar = float(hole.sum())
        frac = (rect - 0.0) / max((y1 - y0) * (x1 - x0) - ar, 1.0)
        if frac >= ring_solid:
            filled |= hole
        else:
            kept_px += int(ar)
            kept_n += 1
    if filled.any():
        a = np.where(filled, 1.0, a)
    print(f"    buracos tapados : {int(filled.sum()):6d}px  |  frestas preservadas: {kept_px}px em {kept_n}")
    return rgb, a, filled


def palette_mountains(rgb, a, real, sky_row_color):
    """Montanhas de acordo com o céu de fim de tarde:
       • despill — corta o verde em excesso deixado pelo chromakey na crista
       • troca de matiz preservando a luminância: onde havia verde passa a ter
         a cor do céu naquela altura (serras distantes -> violeta/laranja)
       • só um pingo de perspectiva aérea, para a serra não se apagar no céu."""
    H = rgb.shape[0]
    rgb = rgb.copy()
    g_exc = rgb[..., 1] - 0.5 * (rgb[..., 0] + rgb[..., 2])
    cut = np.clip(g_exc - 3.0, 0, None) * 0.95
    rgb[..., 1] = np.clip(rgb[..., 1] - cut, 0, 255)

    y0, y1 = MTN_BAND
    ys = np.arange(H, dtype=np.float32)[:, None]
    t = np.clip((ys - y0) / float(y1 - y0), 0, 1)          # 0 = serra distante
    screen_y = MTN_TOP_SCREEN + (ys - y0) * MTN_SCALE
    # cor de névoa = céu daquela altura ESCURECIDO: a serra continua mais escura
    # que o céu (senão as montanhas se apagam e viram mancha)
    skyc = sky_row_color(np.clip(screen_y, 0, 539).astype(np.int32)) * 0.62
    skyc = np.broadcast_to(skyc, rgb.shape)          # [H,1,3] -> [H,W,3]

    # 1) matiz do céu, luminância do artista — só onde o verde aparecia
    w_green = (np.clip(g_exc / 40.0, 0, 1) * 0.95)[..., None]
    hsl_pix = rgb_to_hsl(np.clip(rgb / 255.0, 0, 1))
    hsl_sky = rgb_to_hsl(np.clip(skyc / 255.0, 0, 1))
    swapped = hsl_to_rgb(np.stack([hsl_sky[..., 0], hsl_sky[..., 1] * 0.85, hsl_pix[..., 2]], -1)) * 255.0
    rgb = rgb * (1.0 - w_green) + swapped * w_green

    # 2) perspectiva aérea: 0.55 na crista -> 0 na base (serras distantes
    #    puxam a cor do céu e escurecem; as mais próximas ficam violeta cheio)
    haze = np.broadcast_to(0.55 * np.power(1.0 - t, 1.1), (H, rgb.shape[1]))[..., None]
    rgb = rgb * (1.0 - haze) + skyc * haze
    print(f"    despill medio={float(cut[real].mean()):.1f}  troca de matiz="
          f"{float(w_green[..., 0][real].mean()):.2f}  névoa={float(haze[..., 0][real].mean()):.2f}")
    return rgb


def palette_vines(rgb, a, real, sky_ramp):
    """Vinhas na paleta do fim de tarde: mantém a estrutura (luminância do
    recorte) e troca a cor pela rampa amostrada do próprio céu."""
    hsl = rgb_to_hsl(np.clip(rgb / 255.0, 0, 1))
    lum = hsl[..., 2]
    lo, hi = np.percentile(lum[real], 2), np.percentile(lum[real], 98)
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1)
    pos = np.clip(0.34 + 0.60 * t, 0, 0.995)               # faixa quente da rampa
    ramp_hsl = rgb_to_hsl(sky_ramp(pos))
    out = np.stack([ramp_hsl[..., 0], ramp_hsl[..., 1] * 0.95, lum], -1)
    rgb2 = hsl_to_rgb(out) * 255.0
    # rim quente: a borda de cima das folhas pega o âmbar do sol
    up = np.zeros_like(real)
    up[:-3, :] = real[3:, :]
    rim = (real & ~up).astype(np.float32) * 0.22
    rgb2 = rgb2 * (1 - rim[..., None]) + rgb2 * np.array([1.10, 1.02, 0.86], np.float32) * rim[..., None]
    rgb = np.where(real[..., None], rgb2, rgb)
    print(f"    rampa do céu aplicada (luminância preservada), rim quente em {int(rim.sum())}px")
    return rgb


def resize_layer(rgb_full, a, target):
    """Redimensiona para o tamanho exato de desenho com Lanczos. O RGB já vem
    estendido para fora do alpha (defringe) -> anti-aliasing sem halo."""
    W, H = target
    r = np.asarray(Image.fromarray(np.clip(rgb_full, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS), np.float32)
    al = np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS), np.float32) / 255.0
    return r, al


def save(path, rgb, a):
    arr = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (np.clip(a, 0, 1) * 255).astype(np.uint8)])
    Image.fromarray(arr, "RGBA").save(path, optimize=True)


# ------------------------------------------------------------------ principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true", help="só mede, não grava")
    ap.add_argument("--restore", action="store_true", help="devolve os originais de _orig/")
    args = ap.parse_args()

    if args.restore:
        step_restore()
        return

    print("FUMIGA — reparo do parallax do TITLE")
    if not args.report:
        step_backup()

    base = ORIG if os.path.exists(os.path.join(ORIG, F_SKY)) else MENU

    # ---- céu: referência de paleta
    sky_rgb, _ = imread_rgba(os.path.join(base, F_SKY))
    sky_by_row = sky_rgb.mean(axis=1)                       # cor média por linha
    sky_row_color = lambda ys: sky_by_row[np.clip(ys, 0, sky_by_row.shape[0] - 1)].astype(np.float32)
    idx = np.linspace(0, sky_by_row.shape[0] - 1, 16).astype(np.int32)
    ramp16 = sky_by_row[idx] / 255.0

    def sky_ramp(pos):
        p = np.clip(pos, 0, 1) * (len(ramp16) - 1)
        i0 = np.floor(p).astype(np.int32)
        i1 = np.minimum(i0 + 1, len(ramp16) - 1)
        f = (p - i0)[..., None]
        return ramp16[i0] * (1 - f) + ramp16[i1] * f

    print("\nANTES")
    for f in (F_MTN, F_MAIN, F_VINE):
        rgb, a = imread_rgba(os.path.join(base, f))
        measure(os.path.basename(f)[:11], rgb, a)

    if args.report:
        return

    out = {}

    # ---------- layer5 céu (sem alpha): só redimensiona -------------------
    print("\n>> layer5 céu")
    W, H = TARGET[F_SKY]
    sky_small = np.asarray(Image.fromarray(sky_rgb.astype(np.uint8)).resize((W, H), Image.LANCZOS), np.float32)
    save(os.path.join(MENU, F_SKY), sky_small, np.ones((H, W), np.float32))
    print(f"    {W}x{H}")
    out[F_SKY] = (sky_small, np.ones((H, W), np.float32))

    # ---------- layer4 montanhas -----------------------------------------
    print("\n>> layer4 montanhas")
    rgb, a = imread_rgba(os.path.join(base, F_MTN))
    rgb, a, filled = clean_matte(rgb, a, min_island=24, max_hole=4000, ring_solid=0.80)
    real = (a >= 0.5) & ~filled
    rgb = palette_mountains(rgb, a, real, sky_row_color)
    rgb_full = inpaint(rgb, real)
    # remonta na proporção correta (fim do esmagamento vertical) já no tamanho
    # de desenho: crista na mesma altura de antes, corpo descendo até o pé
    Wn, Hn = TARGET[F_MTN]
    y0, y1 = MTN_BAND
    sh = int(round((y1 - y0) * MTN_SCALE))
    rsz = np.asarray(Image.fromarray(np.clip(rgb_full[y0:y1], 0, 255).astype(np.uint8)).resize((Wn, sh), Image.LANCZOS), np.float32)
    rsa = np.asarray(Image.fromarray((np.clip(a[y0:y1], 0, 1) * 255).astype(np.uint8)).resize((Wn, sh), Image.LANCZOS), np.float32) / 255.0
    top = MTN_TOP_SCREEN - 20
    take = min(sh, Hn - top)
    canvas_rgb = np.zeros((Hn, Wn, 3), np.float32)
    canvas_a = np.zeros((Hn, Wn), np.float32)
    canvas_rgb[top:top + take] = rsz[:take]
    canvas_a[top:top + take] = rsa[:take]
    if top + take < Hn:                     # corpo da serra esticado até o pé
        canvas_rgb[top + take:] = rsz[take - 1:take]
        canvas_a[top + take:] = rsa[take - 1:take]
    save(os.path.join(MENU, F_MTN), canvas_rgb, canvas_a)
    print(f"    {Wn}x{Hn}  (escala uniforme {MTN_SCALE:.3f}, crista em y={top})")
    out[F_MTN] = (canvas_rgb, canvas_a)

    # ---------- layer3 principal -----------------------------------------
    print("\n>> layer3 principal (gramado, ruínas, formigueiro)")
    rgb, a = imread_rgba(os.path.join(base, F_MAIN))
    rgb, a, filled = clean_matte(rgb, a, min_island=40, max_hole=6000, ring_solid=0.86)
    real = (a >= 0.5) & ~filled
    rgb_full = inpaint(rgb, real)
    r, al = resize_layer(rgb_full, a, TARGET[F_MAIN])
    save(os.path.join(MENU, F_MAIN), r, al)
    print(f"    {TARGET[F_MAIN][0]}x{TARGET[F_MAIN][1]}")
    out[F_MAIN] = (r, al)

    # ---------- layer1 vinhas --------------------------------------------
    print("\n>> layer1 vinhas")
    rgb, a = imread_rgba(os.path.join(base, F_VINE))
    rgb, a, filled = clean_matte(rgb, a, min_island=20, max_hole=900, ring_solid=0.92)
    real = (a >= 0.5) & ~filled
    rgb = palette_vines(rgb, a, real, sky_ramp)
    rgb_full = inpaint(rgb, real)
    r, al = resize_layer(rgb_full, a, TARGET[F_VINE])
    save(os.path.join(MENU, F_VINE), r, al)
    print(f"    {TARGET[F_VINE][0]}x{TARGET[F_VINE][1]}")
    out[F_VINE] = (r, al)

    print("\nDEPOIS")
    for f in (F_MTN, F_MAIN, F_VINE):
        measure(os.path.basename(f)[:11], *out[f])

    print("\nTamanhos finais (1:1 com drawTitleBg):")
    for f, (w, h) in TARGET.items():
        print(f"  {f}: {w}x{h}")


if __name__ == "__main__":
    main()
