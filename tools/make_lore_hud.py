"""Arte original FUMIGA, paleta da rainha existente. Requer Pillow só no pipeline.
Desenha em master 4x alinhado à grade; exporta nearest sem antialiasing.
Uso: python tools/make_lore_hud.py [--master /caminho/fora/do/repo]

Fase 2 (rework de HUD): painéis 9-slice mais ricos (quitina dupla, motif do
bioma nos 4 cantos — cantos nunca esticam — costuras de seda, nós de cera) e
novo atlas lore_textbox.png com 7 temas (6 biomas + colônia) para caixas de
texto/diálogos. Nada humanoide (Regra 8).
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'game/assets/ui'
S = 4
INK, DARK, MID, SILK = '#100c1c', '#21182f', '#4a365c', '#efe2c4'
FIELD = '#1a1427'
COLORS = ['#7fd6a0', '#bfffa8', '#37e6c8', '#ffb347', '#ff9a5c', '#b9e5ff']
SHADES = ['#38553f', '#354b3e', '#244a48', '#62432c', '#61342e', '#394c69']
LIGHTS = ['#a8f0c8', '#e2ffc9', '#8ff0dc', '#ffd479', '#ffc09a', '#e8f4ff']

class Pixel:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w*S, h*S))
        self.d = ImageDraw.Draw(self.im)
    def rect(self, box, color):
        x,y,r,b = box
        self.d.rectangle((x*S,y*S,(r+1)*S-1,(b+1)*S-1), fill=color)
    def poly(self, pts, color):
        # Rasterize on the logical grid, then paint crisp high-resolution blocks.
        mask = Image.new('1', (self.im.width//S, self.im.height//S))
        ImageDraw.Draw(mask).polygon(pts, fill=1)
        for y in range(mask.height):
            for x in range(mask.width):
                if mask.getpixel((x,y)): self.rect((x,y,x,y),color)
    def line(self, pts, color):
        mask = Image.new('1', (self.im.width//S, self.im.height//S))
        ImageDraw.Draw(mask).line(pts, fill=1)
        for y in range(mask.height):
            for x in range(mask.width):
                if mask.getpixel((x,y)): self.rect((x,y,x,y),color)
    def save(self, name, master):
        OUT.mkdir(parents=True,exist_ok=True)
        self.im.resize((self.im.width//S,self.im.height//S),Image.Resampling.NEAREST).save(OUT/name,optimize=True)
        if master:
            Path(master).mkdir(parents=True,exist_ok=True)
            self.im.save(Path(master)/name,optimize=True)


# Motifs 6x6 por bioma (0 trevo, 1 cogumelo, 2 alga, 3 semente, 4 folha,
# 5 líquen/cristal, 6 coroa-de-fungo da colônia). Desenhados em coords locais;
# stamp() espelha nos cantos. Nunca humanos: só flora/fauna do bioma.
def glyph(d, i, c, light):
    if i == 0:  # trevo
        for a,b in [(1,1),(3,1),(2,3)]: d.rect((a,b,a+1,b+1),c)
        d.line([(2,4),(2,5)],'#d6b779')
    elif i == 1:  # cogumelo
        d.poly([(0,3),(2,0),(4,0),(5,3),(4,4),(1,4)],INK)
        d.poly([(1,3),(2,1),(4,1),(4,3),(1,3)],c)
        d.rect((2,4,3,5),SILK)
    elif i == 2:  # alga
        d.line([(1,5),(2,3),(1,1)],INK); d.line([(2,5),(3,3),(2,1)],c)
        d.line([(4,5),(4,2),(3,0)],c); d.rect((4,0,4,0),light)
    elif i == 3:  # semente
        d.poly([(2,0),(4,1),(4,4),(2,5),(1,3)],INK)
        d.poly([(2,1),(3,2),(3,4),(2,4),(2,2)],c)
        d.rect((2,2,2,2),'#ffd479')
    elif i == 4:  # folha de outono
        d.poly([(0,3),(2,0),(5,1),(4,4),(1,5)],INK)
        d.poly([(1,3),(2,1),(4,2),(3,4),(1,4)],c)
        d.line([(1,4),(3,2)],'#ffd479')
    elif i == 5:  # cristal/líquen gelado
        d.poly([(2,0),(4,1),(4,4),(2,5),(0,3)],INK)
        d.poly([(2,1),(3,2),(3,4),(2,4),(1,3)],c)
        d.line([(2,1),(2,4)],SILK)
    else:  # colônia: coroa de fungo/seda
        for a in (1,3,5):
            d.rect((a,3,a,4),SILK); d.rect((a-1,1,a+1,2),'#ffd479')
        d.rect((3,0,3,0),SILK)


class D:
    """Acumulador com espelhamento p/ carimbar o motif nos 4 cantos."""
    def __init__(self, p, x, fx, fy, gx, gy):
        self.p, self.x = p, x
        self.fx, self.fy, self.gx, self.gy = fx, fy, gx, gy
    def _t(self, pts):
        out = []
        for a,b in pts:
            a = 5-a if self.fx else a
            b = 5-b if self.fy else b
            out.append((self.x+self.gx+a, self.gy+b))
        return out
    def rect(self, box, col):
        a,b,r,d2 = box
        pts = [(a,b),(r,b),(r,d2),(a,d2)]
        self.p.poly(self._t(pts), col)
    def poly(self, pts, col): self.p.poly(self._t(pts), col)
    def line(self, pts, col): self.p.line(self._t(pts), col)


def stamp_corners(p, x, i, c, light, inset):
    for fx, fy, gx, gy in [(0,0,inset,inset),(1,0,25-inset,inset),
                           (0,1,inset,25-inset),(1,1,25-inset,25-inset)]:
        glyph(D(p, x, fx, fy, gx, gy), i, c, light)


def make(master=None):
    # ------------------------------------------------ painéis 9-slice ricos --
    # Six 32x32 nine-slices, 8px fixed corners (motif do bioma nos cantos),
    # quitina dupla, costuras de seda nas bordas e nós de cera âmbar.
    p = Pixel(192,32)
    for i,(c,shade,light) in enumerate(zip(COLORS,SHADES,LIGHTS)):
        x=i*32
        def poly(pts,col): p.poly([(x+a,b) for a,b in pts],col)
        def rect(box,col): a,b,r,d=box; p.rect((x+a,b,x+r,d),col)
        def line(pts,col): p.line([(x+a,b) for a,b in pts],col)
        # anel externo de quitina (INK) + anel interno (sombra do bioma)
        poly([(0,5),(5,0),(26,0),(31,5),(31,26),(26,31),(5,31),(0,26)],INK)
        poly([(1,6),(6,1),(25,1),(30,6),(30,25),(25,30),(6,30),(1,25)],shade)
        # segunda placa de quitina: bisel claro em cima, escuro embaixo
        poly([(2,7),(7,2),(24,2),(29,7),(29,24),(24,29),(7,29),(2,24)],INK)
        rect((7,3,24,3),c); rect((3,7,3,24),c)          # veia colorida topo/esq
        rect((7,28,24,28),shade); rect((28,7,28,24),shade)  # sombra baixo/dir
        line([(8,4),(23,4)],light)                      # brilho de cera superior
        # campo interno de leitura
        rect((6,6,25,25),DARK); rect((5,7,26,24),DARK); rect((8,8,23,23),FIELD)
        # motif do bioma nos 4 cantos (zona fixa do 9-slice, nunca estica)
        stamp_corners(p, x, i, c, light, 1)
        # costuras de seda no meio das bordas (zona esticável, padrão ralo)
        for a in (12,16,20):
            rect((a,1,a+1,1),SILK); rect((a+2,30,a+3,30),SILK)
        for b in (12,16,20):
            rect((1,b,1,b+1),SILK); rect((30,b+2,30,b+3),SILK)
        # nós de cera âmbar nos pontos médios do anel interno
        for a,b in [(4,15),(15,4),(27,16),(16,27)]:
            rect((a-1,b-1,a+1,b+1),INK); rect((a,b,a,b),'#ffd479')
    p.save('lore_panels.png',master)

    # --------------------------------------- caixas de texto 9-slice (7 temas) --
    # 6 biomas + colônia (menus). Moldura fina orgânica: fio de seda no topo,
    # nó de cera, motif pequeno nos cantos e pespontos na base.
    p = Pixel(224,32)
    TB = list(zip(COLORS,SHADES,LIGHTS)) + [('#8f6fd6','#3a2c4c','#d9c2ff')]
    for i,(c,shade,light) in enumerate(TB):
        x=i*32
        def poly(pts,col): p.poly([(x+a,b) for a,b in pts],col)
        def rect(box,col): a,b,r,d=box; p.rect((x+a,b,x+r,d),col)
        def line(pts,col): p.line([(x+a,b) for a,b in pts],col)
        poly([(0,4),(4,0),(27,0),(31,4),(31,27),(27,31),(4,31),(0,27)],INK)
        poly([(1,5),(5,1),(26,1),(30,5),(30,26),(26,30),(5,30),(1,26)],shade)
        poly([(2,6),(6,2),(25,2),(29,6),(29,25),(25,29),(6,29),(2,25)],DARK)
        rect((4,4,27,27),FIELD)
        # fio de seda no topo + nó de cera âmbar central
        line([(6,2),(25,2)],SILK); rect((15,1,16,2),'#ffd479')
        # pespontos na base e veias ralas nas laterais
        for a in (8,12,16,20,24): rect((a,29,a+1,29),MID)
        for b in (9,14,19,24): rect((2,b,2,b),shade); rect((29,b+2,29,b+2),shade)
        # motif do bioma nos cantos (menor, 6x6 com inset 2)
        stamp_corners(p, x, i if i < 6 else 6, c, light, 2)
        # brilho de leitura no topo do campo
        line([(6,4),(25,4)],'#241b36')
    p.save('lore_textbox.png',master)

    # ---------------------------------------------------------- ícones 16px --
    # 16px cells: foods 0..5, amber/violet crystals 6..7, walking ants 8..11.
    p=Pixel(192,16)
    for i,c in enumerate(COLORS):
        x=i*16
        def poly(pts,col): p.poly([(x+a,b) for a,b in pts],col)
        def line(pts,col): p.line([(x+a,b) for a,b in pts],col)
        if i==0:
            for a,b in [(3,3),(8,3),(5,7)]:
                poly([(a,b),(a+3,b-1),(a+5,b+2),(a+3,b+4),(a,b+3)],INK)
                poly([(a+1,b),(a+3,b),(a+4,b+2),(a+2,b+3)],c)
            line([(8,9),(8,12),(6,14)],'#d6b779')
        elif i==1:
            poly([(6,8),(10,8),(11,14),(5,14)],INK)
            poly([(7,8),(9,8),(9,13),(6,13)],SILK)
            poly([(1,8),(2,4),(5,1),(10,1),(14,5),(14,9)],INK)
            poly([(2,7),(4,4),(6,2),(10,2),(13,6),(13,8)],'#8f6fd6')
            p.rect((x+5,4,x+6,5),c); p.rect((x+10,6,x+11,6),SILK)
        elif i==2:
            for a in (3,7,11):
                line([(a,13),(a+1,10),(a-1,7),(a+1,3)],INK)
                line([(a+1,13),(a+2,10),(a,7),(a+2,3)],c)
            line([(3,14),(12,14)],'#568973')
        elif i==3:
            poly([(7,1),(12,4),(13,9),(9,14),(4,13),(2,9),(3,4)],INK)
            poly([(7,2),(11,5),(11,9),(8,13),(4,11),(3,8),(4,4)],c)
            line([(8,4),(6,7),(6,11)],'#825132'); line([(9,4),(10,6)],SILK)
        elif i==4:
            poly([(2,2),(8,3),(13,1),(13,7),(10,12),(5,13),(2,9)],INK)
            poly([(3,3),(8,4),(12,3),(12,7),(9,11),(5,12),(3,9)],c)
            line([(3,14),(7,9),(10,5)],'#ffd479'); line([(7,9),(5,6)],'#ffd479')
        else:
            for a,b in [(7,13),(4,10),(10,9),(5,6),(10,4)]:
                line([(7,14),(a,b),(a-2,b-3)],'#6085a6')
                line([(a,b),(a+2,b-2),(a+2,b-4)],c)
                p.rect((x+a-2,b-3,x+a-1,b-2),SILK)
    for i,c in [(6,'#ffd479'),(7,'#c77dff')]:
        x=i*16
        p.poly([(x+7,0),(x+13,5),(x+12,11),(x+7,15),(x+2,11),(x+1,5)],INK)
        p.poly([(x+7,1),(x+12,5),(x+11,10),(x+7,14),(x+3,10),(x+2,5)],c)
        p.poly([(x+7,2),(x+7,12),(x+3,9),(x+3,5)],'#93617e' if i==7 else '#b87936')
        p.line([(x+7,2),(x+10,5),(x+7,10),(x+7,2)],SILK)
    for frame in range(4):
        x=(8+frame)*16
        for a in (5,8,10):
            dy=(frame+a)%2
            p.line([(x+a-2,3+dy),(x+a,6),(x+a,9),(x+a+2,12-dy)],'#b99a7c')
        p.rect((x+2,6,x+6,9),INK); p.rect((x+3,6,x+5,8),'#a47b51')
        p.rect((x+7,7,x+9,8),'#ffd479'); p.rect((x+10,6,x+12,9),'#d6b779')
        p.line([(x+12,6),(x+14,4)],SILK); p.line([(x+12,9),(x+14,11)],SILK)
    p.save('lore_icons.png',master)

    # ------------------------------------------------------- gaster 64x24 ----
    # Three 64x24 gaster cells: empty / amber / injured. Crown is always visible.
    p=Pixel(192,24)
    for i in range(3):
        x=i*64
        body=[(2,14),(7,9),(17,7),(46,7),(57,10),(61,14),(59,19),(49,22),(13,22),(5,19)]
        p.poly([(x+a,b) for a,b in body],INK)
        p.poly([(x+4,14),(x+9,10),(x+18,8),(x+45,8),(x+55,11),(x+59,14),(x+57,18),(x+48,20),(x+14,20),(x+7,18)],MID)
        color=[DARK,'#c48b3c','#b32f50'][i]
        p.poly([(x+7,14),(x+13,10),(x+48,10),(x+56,14),(x+54,17),(x+47,19),(x+16,19),(x+9,17)],color)
        for a in (18,30,42):
            p.line([(x+a,9),(x+a-2,13),(x+a-2,17),(x+a,20)],INK)
            p.line([(x+a+1,10),(x+a-1,13)],'#ffd479' if i==1 else '#a96d92')
        if i:
            p.line([(x+9,13),(x+14,11),(x+46,11),(x+53,13)],'#ffe1a0' if i==1 else '#ff8a94')
        if i==2:
            p.line([(x+8,16),(x+22,14),(x+28,17),(x+37,14),(x+51,16)],'#ff4d5a')
        # Fungal crown and silk, NOT a human royal crown.
        p.line([(x+22,7),(x+30,5),(x+39,7)],SILK)
        for a,b in [(24,4),(31,2),(38,4)]:
            p.rect((x+a,b,x+a,b+4),'#c6acb5')
            p.rect((x+a-2,b-1,x+a+2,b),'#ffd479')
            p.rect((x+a-1,b-2,x+a+1,b-1),SILK)
    p.save('lore_gaster.png',master)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--master',help='Exportação opcional das fontes 4x, fora do jogo.')
    make(parser.parse_args().master)
