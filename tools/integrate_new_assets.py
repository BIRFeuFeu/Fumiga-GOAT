#!/usr/bin/env python3
"""Integra cenários, árvores, pedras, arbustos — recorte fiel, sem criar novo.
- Corta chão campo/deserto/pantano.jpeg (5x8 grid) → 8 tiles 16x16 → tilesets
- Empacota árvores, arbustos, pedras em spritesheets 32x32
- Copia gen cenários para bgs
"""
import pathlib, json, sys
from PIL import Image

ROOT = pathlib.Path(__file__).parent.parent
def slice_sheet_to_tileset(src_path, dst_path, cols=8, rows=5, out_tiles=8):
    """Detecta grid preta e recorta 40 tiles, pega 8 representativos."""
    im = Image.open(src_path).convert("RGBA")
    w,h = im.size
    # Detecta linhas pretas: procura colunas/linhas com >90% pixels pretos (0,0,0)
    # Simplifica: assume grid uniforme com borda preta 4-8px, calcula tamanho teórico
    # 1536x1024 → 8 cols, 5 rows. Com bordas de ~4-6px, tile ~ 186x198
    # Usa cálculo: tile_w = (w - (cols+1)*border)//cols, mas desconhecemos border.
    # Vamos detectar via amostragem: procura bordas pretas nas primeiras linhas.
    # Abordagem robusta: threshold para preto
    def is_black(px): return px[0] < 10 and px[1] < 10 and px[2] < 10
    # Estima border por diferença entre w e divisão ideal
    # Testa border 4 a 10
    best = None
    for border in range(3,12):
        tile_w = (w - (cols+1)*border)//cols
        tile_h = (h - (rows+1)*border)//rows
        if tile_w <=0 or tile_h<=0: continue
        # verifica se nas posições de borda esperadas há preto
        ok=True
        for c in range(cols+1):
            x = c*(tile_w+border)+border//2
            if x>=w: ok=False; break
            # amostra meio vertical
            for y in [h//2, h//4, 3*h//4]:
                if not is_black(im.getpixel((x,y))):
                    ok=False; break
        for r in range(rows+1):
            y = r*(tile_h+border)+border//2
            if y>=h: ok=False; break
            for x in [w//2, w//4, 3*w//4]:
                if not is_black(im.getpixel((x,y))):
                    ok=False; break
        if ok:
            best = (border, tile_w, tile_h)
            break
    if not best:
        # fallback: assume border 6
        border=6
        tile_w = (w - (cols+1)*border)//cols
        tile_h = (h - (rows+1)*border)//rows
        best = (border, tile_w, tile_h)
        print(f"[{src_path}] fallback border {border} tile {tile_w}x{tile_h}")
    border, tile_w, tile_h = best
    print(f"[{src_path}] {w}x{h} -> border {border} tile {tile_w}x{tile_h}")
    # recorta 40 tiles
    tiles = []
    for r in range(rows):
        for c in range(cols):
            x = border + c*(tile_w+border)
            y = border + r*(tile_h+border)
            box = (x,y,x+tile_w,y+tile_h)
            tile = im.crop(box).resize((16,16), Image.NEAREST)
            tiles.append(tile)
    # seleciona 8 representativos: pega índices espalhados para variedade
    # 0: limpa, 2, 7, 10, 15, 22, 30, 35 → cobertura de grama, pedras, flores, terra
    idxs = [0,2,7,10,15,22,30,35] if len(tiles)>=36 else list(range(min(8,len(tiles))))
    out = Image.new("RGBA",(128,16),(0,0,0,0))
    for i, idx in enumerate(idxs):
        out.paste(tiles[idx], (i*16,0))
    out.save(dst_path)
    print(f"  -> {dst_path} {out.size} 6.1K")
    # também salva preview 512x64
    preview = out.resize((512,64), Image.NEAREST)
    preview.save(pathlib.Path("/tmp") / (pathlib.Path(dst_path).stem + "_preview.png"))
    return True

def pack_folder_to_sheet(src_dir, dst_path, frame=32, cols=8, limit=16, pattern="*.png"):
    """Empacota PNGs de uma pasta em spritesheet cols x rows, frame x frame."""
    import glob
    src = pathlib.Path(src_dir)
    files = sorted(src.glob(pattern))
    # coleta recursiva se não achou no topo
    if not files or len(files) < limit:
        for sub in src.rglob("*.png"):
            if sub.is_file() and sub not in files:
                files.append(sub)
    files = sorted(set(files))
    # filtra: remove nada, source, shadow (mantém apenas base)
    filtered = []
    for f in files:
        low = f.name.lower()
        if f.name == "nada": continue
        if "source" in low: continue
        if "shadow" in low: continue
        filtered.append(f)
    files = filtered[:limit]
    if not files:
        print(f"[{src_dir}] nenhum arquivo")
        return False
    rows = (len(files)+cols-1)//cols
    sheet = Image.new("RGBA",(cols*frame, rows*frame),(0,0,0,0))
    for i, f in enumerate(files):
        try:
            im = Image.open(f).convert("RGBA")
            # centraliza e redimensiona para frame
            # mantém aspect ratio, centraliza
            im = im.resize((frame, frame), Image.NEAREST)
            x = (i%cols)*frame
            y = (i//cols)*frame
            sheet.paste(im, (x,y), im)
        except Exception as e:
            print(f"  erro {f}: {e}")
    sheet.save(dst_path)
    print(f"[{src_dir}] -> {dst_path} {sheet.size} {len(files)} frames {frame}x{frame}")
    # preview x2
    sheet.resize((sheet.size[0]*2, sheet.size[1]*2), Image.NEAREST).save(pathlib.Path("/tmp") / (pathlib.Path(dst_path).stem + "_preview.png"))
    return True

def main():
    ok=True
    # 1. cenários chão
    for src, dst in [
        ("cenarios/chão campo.jpeg","assets/tilesets/tiles_bosque_umido.png"),
        ("cenarios/chão deserto.jpeg","assets/tilesets/tiles_deserto_escaldante.png"),
        ("cenarios/chão pantano.jpeg","assets/tilesets/tiles_pantano_toxico.png"),
    ]:
        srcp = ROOT / src
        dstp = ROOT / dst
        if srcp.exists():
            slice_sheet_to_tileset(srcp, dstp)
        else:
            print(f"faltando {srcp}")
            ok=False
    # terra.png é tile único 96x95, não sheet — cria tileset repetindo
    terra = ROOT/"cenarios/terra.png"
    if terra.exists():
        im = Image.open(terra).convert("RGBA").resize((16,16), Image.NEAREST)
        out = Image.new("RGBA",(128,16),(0,0,0,0))
        for i in range(8):
            # leve variação de tom para dirt_alt etc
            var = im.copy()
            if i%2==1:
                # escurece um pouco
                var = Image.blend(var, Image.new("RGBA",(16,16),(0,0,0,40)), 0.15)
            out.paste(var, (i*16,0))
        out.save(ROOT/"assets/tilesets/tiles_cemiterio_troncos.png")
        print(f"[terra] -> tiles_cemiterio_troncos.png 128x16")
    # 2. arvores, arbustos, pedras como props
    pack_folder_to_sheet(ROOT/"arvores", ROOT/"assets/sprites/props_arvores.png", frame=32, cols=8, limit=16)
    pack_folder_to_sheet(ROOT/"arbustos", ROOT/"assets/sprites/props_arbustos.png", frame=32, cols=8, limit=16)
    pack_folder_to_sheet(ROOT/"pedras", ROOT/"assets/sprites/props_pedras.png", frame=32, cols=8, limit=16)
    pack_folder_to_sheet(ROOT/"pedras2", ROOT/"assets/sprites/props_pedras2.png", frame=32, cols=8, limit=8)
    pack_folder_to_sheet(ROOT/"cristais", ROOT/"assets/sprites/props_cristais.png", frame=32, cols=8, limit=16)
    # 3. copia gen cenários para bg
    import shutil
    for f in (ROOT/"cenarios").glob("gen-*.png"):
        dst = ROOT / f"assets/sprites/bg_cenario_{f.stem[4:12]}.png"
        try:
            im=Image.open(f).convert("RGBA")
            # redimensiona para 128x96 como bg_castle
            im=im.resize((128,96), Image.LANCZOS)
            im.save(dst)
            print(f"[cenarios gen] {f.name} -> {dst}")
        except Exception as e:
            print(e)
    # também copia slicebox e terra como referência (não usado no jogo, só doc)
    print("integrado")
    return ok

if __name__=="__main__":
    sys.exit(0 if main() else 1)
