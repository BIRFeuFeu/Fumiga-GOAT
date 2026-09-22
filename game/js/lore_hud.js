import { G } from "./state.js";
import { drawText } from "./font.js";
import { MAPS } from "./config.js";

// ============================================================================
// LORE HUD — Sistema Orgânico Total por Bioma
// Regra 8: Nada humanoide — Rainha com coroa fungo/seda, gaster vivo
// HUD muda por bioma: textura quitina/cera, ícones comida bioma, cristal memória
// ============================================================================
export const BIOME_HUD = {
  planicie: {
    id: "planicie",
    loreName: "VASO DA PLANÍCIE",
    border: "#7fd6a0",
    bg: "rgba(51,69,44,0.92)",
    bg2: "rgba(44,61,38,0.88)",
    accent: "#ffd479",
    foodLabel: "FOLHA TENRA",
    foodIcon: "🍃",
    foodColor: "#7fd6a0",
    essenceLabel: "PÓLEN ÂMBAR",
    essenceColor: "#ffd479",
    texture: "#4a7a42",
    gasterColor: "#ffb347",
    gasterVein: "#7fd6a0",
    minimapBorder: "#7fd6a0",
    waveLabel: "TRILHA DO ORVALHO",
    iconLeaf: "trevo",
  },
  floresta: {
    id: "floresta",
    loreName: "CÂMARA DE MUSGO",
    border: "#6db7ff",
    bg: "rgba(36,56,42,0.92)",
    bg2: "rgba(31,49,36,0.88)",
    accent: "#bfffa8",
    foodLabel: "COGUMELO FUNGO",
    foodIcon: "🍄",
    foodColor: "#bfffa8",
    essenceLabel: "ESPORO VIOLETA",
    essenceColor: "#c77dff",
    texture: "#2f5238",
    gasterColor: "#8f6fd6",
    gasterVein: "#6db7ff",
    minimapBorder: "#6db7ff",
    waveLabel: "TRILHA DE SEDA",
    iconLeaf: "musgo",
  },
  pantano: {
    id: "pantano",
    loreName: "VENTRE PÚTRIDO",
    border: "#37e6c8",
    bg: "rgba(33,48,49,0.92)",
    bg2: "rgba(28,42,43,0.88)",
    accent: "#7fd6ff",
    foodLabel: "ALGA PODRE",
    foodIcon: "🌿",
    foodColor: "#37e6c8",
    essenceLabel: "BRUMA MEMÓRIA",
    essenceColor: "#7fd6ff",
    texture: "#2c4a3f",
    gasterColor: "#37e6c8",
    gasterVein: "#7fd6ff",
    minimapBorder: "#37e6c8",
    waveLabel: "TRILHA SUBMERSA",
    iconLeaf: "alga",
  },
  deserto: {
    id: "deserto",
    loreName: "FORNALHA DE AREIA",
    border: "#ffb347",
    bg: "rgba(74,58,40,0.92)",
    bg2: "rgba(65,50,31,0.88)",
    accent: "#ffd479",
    foodLabel: "SEMENTE SECA",
    foodIcon: "🌾",
    foodColor: "#ffb347",
    essenceLabel: "ÂMBAR CALCINADO",
    essenceColor: "#ff9a5c",
    texture: "#6b532f",
    gasterColor: "#ffb347",
    gasterVein: "#ffd479",
    minimapBorder: "#ffb347",
    waveLabel: "TRILHA QUEIMADA",
    iconLeaf: "semente",
  },
  outono: {
    id: "outono",
    loreName: "CÂMARA DOURADA",
    border: "#ff9a5c",
    bg: "rgba(61,47,34,0.92)",
    bg2: "rgba(53,41,32,0.88)",
    accent: "#ffd479",
    foodLabel: "FOLHA OUTONO",
    foodIcon: "🍂",
    foodColor: "#ff9a5c",
    essenceLabel: "RESINA ÂMBAR",
    essenceColor: "#ffd479",
    texture: "#5c4626",
    gasterColor: "#ff9a5c",
    gasterVein: "#ffd479",
    minimapBorder: "#ff9a5c",
    waveLabel: "TRILHA DE FOLHAS",
    iconLeaf: "outono",
  },
  gelo: {
    id: "gelo",
    loreName: "GASTER CONGELADO",
    border: "#e8f4ff",
    bg: "rgba(58,66,84,0.92)",
    bg2: "rgba(51,59,76,0.88)",
    accent: "#7fd6ff",
    foodLabel: "LÍQUEN GELADO",
    foodIcon: "❄️",
    foodColor: "#e8f4ff",
    essenceLabel: "CRISTAL PÁLIDO",
    essenceColor: "#e8f4ff",
    texture: "#4a5470",
    gasterColor: "#e8f4ff",
    gasterVein: "#7fd6ff",
    minimapBorder: "#e8f4ff",
    waveLabel: "TRILHA DA NÉVOA",
    iconLeaf: "gelo",
  },
  // Tema neutro dos menus fora da expedição (vaso da Colônia Ancestral).
  colonia: {
    id: "colonia",
    loreName: "VASO DA COLÔNIA",
    border: "#8f6fd6",
    bg: "rgba(40,30,56,0.92)",
    bg2: "rgba(34,26,48,0.88)",
    accent: "#ffd479",
    foodLabel: "FOLHA TENRA",
    foodIcon: "🍃",
    foodColor: "#8f6fd6",
    essenceLabel: "PÓLEN ÂMBAR",
    essenceColor: "#ffd479",
    texture: "#3a2c4c",
    gasterColor: "#ffd479",
    gasterVein: "#8f6fd6",
    minimapBorder: "#8f6fd6",
    waveLabel: "TRILHA DA COLÔNIA",
    iconLeaf: "trevo",
  },
};

export function getBiomeHUD(mapId) {
  return BIOME_HUD[mapId] || BIOME_HUD.planicie;
}

// Atlas originais: master 4x, exportação nearest. Nenhum asset criado no loop.
// BIOMES fixo: a ordem das células nos atlas (painéis/ícones/textboxes/kit).
const BIOMES = ["planicie", "floresta", "pantano", "deserto", "outono", "gelo"];
const art = {};
const panelCache = new Map();
const fogCache = [];
let loading;
export function loadLoreHUD() {
  if (!loading) loading = Promise.all(["panels", "icons", "gaster", "textbox", "kit"].map(key => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { art[key] = img; panelCache.clear(); resolve(); };
    img.onerror = () => reject(new Error("HUD não carregou: lore_" + key + ".png"));
    img.src = "assets/ui/lore_" + key + ".png";
  })));
  return loading;
}

// --------------------------------------------- MUDA DE QUITINA (Fase 2) ------
// Ao trocar de bioma o HUD "troca de pele": o tema antigo dá lugar ao novo com
// um dissolve curto + fio de luz. Só dois blits cacheados por frame, sem
// alocação. Acessibilidade (reducedFX) troca seco, sem animação.
const MOLT_DUR = 0.6;
let lastBiomeId = null, moltFromId = null, moltStart = -10;
function noteBiome(id) {
  if (lastBiomeId && id !== lastBiomeId && BIOME_HUD[id] && BIOME_HUD[lastBiomeId]) {
    moltFromId = lastBiomeId;
    moltStart = G.time;
  }
  lastBiomeId = id;
}

/** Bioma vivo do HUD: o mapa atual da expedição, ou o Vaso da Colônia nos menus. */
export function hudBiome() {
  const m = G.run && typeof G.run.mapIdx === "number" ? MAPS[G.run.mapIdx] : null;
  return m && BIOME_HUD[m.id] ? m.id : "colonia";
}

function tbIndex(id) { return id === "colonia" ? 6 : Math.max(0, BIOMES.indexOf(id)); }

// Layouts 9-slice dos atlas do kit (célula + margens fixas que nunca esticam).
const L_BOX    = { cw: 32, ch: 32, l: 8, r: 8, t: 8, b: 8 };  // painéis e tábuas
const L_BANNER = { cw: 40, ch: 24, l: 8, r: 14, t: 8, b: 8 }; // tábua-seta
const L_BAR    = { cw: 32, ch: 12, l: 4, r: 4, t: 4, b: 4 };  // moldura de barra

// Os cantos nunca esticam; apenas as faixas e o centro. Cache limitado por uso.
function tileOf(kind, styleId, w, h, L) {
  const key = kind + ":" + styleId + ":" + w + ":" + h;
  let tile = panelCache.get(key);
  if (tile) return tile;
  tile = document.createElement("canvas"); tile.width = w; tile.height = h;
  const c = tile.getContext("2d"); c.imageSmoothingEnabled = false;
  if (kind !== "bar") { c.fillStyle = "#1a1427"; c.fillRect(0, 0, w, h); }
  const img = kind === "panels" ? art.panels : kind === "textbox" ? art.textbox : art.kit;
  if (img) {
    const idx = kind === "panels"
      ? Math.max(0, BIOMES.indexOf(styleId === "colonia" ? "planicie" : styleId))
      : tbIndex(styleId);
    const sx = idx * L.cw, sy = kind === "bar" ? 24 : kind === "banner" ? 0 : 0;
    const ex = Math.min(L.l, Math.floor(w / 2)), ey = Math.min(L.t, Math.floor(h / 2));
    const exr = Math.min(L.r, Math.floor(w / 2)), eyb = Math.min(L.b, Math.floor(h / 2));
    const srcX = [0, L.l, L.cw - L.r], sizeX = [L.l, L.cw - L.l - L.r, L.r];
    const srcY = [0, L.t, L.ch - L.b], sizeY = [L.t, L.ch - L.t - L.b, L.b];
    const dx = [0, ex, w - exr], dw = [ex, w - ex - exr, exr];
    const dy = [0, ey, h - eyb], dh = [ey, h - ey - eyb, eyb];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      if (dw[col] > 0 && dh[row] > 0) c.drawImage(img, sx + srcX[col], sy + srcY[row], sizeX[col], sizeY[row], dx[col], dy[row], dw[col], dh[row]);
    }
  }
  if (kind === "panels") {
    // Quitina/cera determinística, preparada uma vez, sem gradientes por frame.
    const style = getBiomeHUD(styleId);
    c.globalAlpha = 0.12; c.fillStyle = style.border;
    for (let i = 0; i < Math.floor(w * h / 350); i++) {
      const px = 8 + (i * 37 % Math.max(1, w - 16)), py = 8 + (i * 17 % Math.max(1, h - 16));
      if (px < w - 8 && py < h - 8) c.fillRect(px, py, 2, 1);
    }
  }
  if (panelCache.size >= 160) panelCache.delete(panelCache.keys().next().value);
  panelCache.set(key, tile);
  return tile;
}

function blitMolt(ctx, kind, styleId, x, y, w, h, L) {
  x = Math.round(x); y = Math.round(y);
  const dt = G.time - moltStart;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (moltFromId && dt >= 0 && dt < MOLT_DUR && !reducedFX()) {
    const t = dt / MOLT_DUR, e = t * t * (3 - 2 * t);
    ctx.drawImage(tileOf(kind, moltFromId, w, h, L), x, y);
    ctx.globalAlpha = e;
    ctx.drawImage(tileOf(kind, styleId, w, h, L), x, y);
    // fio de luz da muda varrendo a caixa
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.fillStyle = getBiomeHUD(styleId).accent;
    ctx.fillRect(x + Math.round(w * e) - 1, y, 2, h);
  } else {
    ctx.drawImage(tileOf(kind, styleId, w, h, L), x, y);
  }
  ctx.restore();
}

export function drawBiomeTexture(ctx, x, y, w, h, biome, time) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  const style = getBiomeHUD(biome);
  noteBiome(style.id);
  blitMolt(ctx, "panels", style.id, x, y, w, h, L_BOX);
  // Respiração discreta sem movimentar texto ou hitboxes.
  ctx.save();
  ctx.globalAlpha = reducedFX() ? 0.12 : 0.16 + Math.sin(time * 2) * 0.06;
  ctx.fillStyle = style.accent; ctx.fillRect(Math.round(x) + 8, Math.round(y) + 3, Math.max(0, w - 16), 1);
  ctx.restore();
}

// Caixa de texto orgânica 9-slice do bioma (diálogos, tooltips, menus).
// Retorna false sem arte carregada — o chamador volta ao painel procedural.
export function drawLoreTextbox(ctx, x, y, w, h, biome) {
  if (!art.textbox) return false;
  const id = BIOME_HUD[biome] ? biome : "colonia";
  noteBiome(id);
  blitMolt(ctx, "textbox", id, x, y, Math.max(16, Math.round(w)), Math.max(16, Math.round(h)), L_BOX);
  return true;
}

// Tábua-seta de madeira do bioma para banners (onda/mapa/muda).
export function drawWoodBanner(ctx, x, y, w, h, biome) {
  if (!art.kit) return false;
  const id = BIOME_HUD[biome] ? biome : "colonia";
  noteBiome(id);
  w = Math.max(32, Math.round(w)); h = Math.max(24, Math.round(h));
  blitMolt(ctx, "banner", id, x, y, w, h, L_BANNER);
  // placa gravada p/ legibilidade do texto (a tábua continua visível nas bordas)
  ctx.save();
  ctx.fillStyle = "rgba(12,8,20,0.5)";
  ctx.fillRect(Math.round(x) + 10, Math.round(y) + 8, w - 20, h - 16);
  ctx.restore();
  return true;
}

// Moldura de barra de madeira (centro transparente: o fill vem do chamador).
export function drawWoodBarFrame(ctx, x, y, w, h, biome) {
  if (!art.kit) return false;
  const id = BIOME_HUD[biome] ? biome : "colonia";
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tileOf("bar", id, Math.max(8, Math.round(w)), Math.max(8, Math.round(h)), L_BAR), Math.round(x), Math.round(y));
  ctx.restore();
  return true;
}

// Ícones do kit: 0 check · 1 cross · 2 gema · 3 botão. false sem arte.
export function drawKitIcon(ctx, kind, x, y, size = 16) {
  if (!art.kit) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art.kit, kind * 16, 36, 16, 16, Math.round(x), Math.round(y), size, size);
  ctx.restore();
  return true;
}

function reducedFX() { return !!G.save?.accessibility?.reducedParticles || G.save?.settings?.particles === false; }

export function drawLoreIcon(ctx, index, x, y, size = 16) {
  if (!art.icons) return;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art.icons, index*16, 0, 16, 16, Math.round(x), Math.round(y), size, size);
  ctx.restore();
}
export function drawFoodIcon(ctx, biome, x, y) {
  drawLoreIcon(ctx, BIOMES.indexOf(getBiomeHUD(biome).id), x, y);
}
export function trailProgress(time, index, count = 7) {
  return (index / count + (reducedFX() ? 0 : time * 0.035)) % 1;
}

export function drawTrailAnt(ctx, x, y, time) {
  drawLoreIcon(ctx, 8 + (reducedFX() ? 0 : Math.floor(time*8)%4), x, y, 16);
}

// Desenha barra de vida como gaster da rainha com coroa fungo/seda
export function drawGasterBar(ctx, x, y, w, h, frac, biome, low, time) {
  const style = getBiomeHUD(biome);
  frac = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0));
  if (art.gaster && w >= 80 && w <= 160 && h >= 10) {
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // Respira em torno do próprio centro sem mover labels ou área de interação.
    // Acessibilidade mantém a cor de alerta, mas elimina a pulsação.
    if (low && !reducedFX()) {
      const pulse = 1 + Math.sin(time * 6) * 0.04;
      ctx.translate(x + w/2, y + h/2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(x + w/2), -(y + h/2));
    }
    const py = Math.round(y - h*0.5), ph = Math.round(h*2);
    ctx.drawImage(art.gaster, 0, 0, 64, 24, Math.round(x), py, Math.round(w), ph);
    // Vida só recorta o abdômen; a coroa de fungo/seda permanece intacta.
    ctx.save(); ctx.beginPath(); ctx.rect(x, y+h/6, Math.round(w*frac), ph); ctx.clip();
    ctx.drawImage(art.gaster, low ? 128 : 64, 0, 64, 24, Math.round(x), py, Math.round(w), ph);
    ctx.restore();
    if (low && !reducedFX()) {
      ctx.globalAlpha *= 0.3 + (Math.sin(time*6)+1)*0.25;
      ctx.strokeStyle = "#ff4d5a"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x+w*0.12),Math.round(y+h*0.7));
      for (let i=0;i<5;i++) ctx.lineTo(Math.round(x+w*(0.22+i*0.14)),Math.round(y+h*(i%2 ? 0.8 : 0.5)));
      ctx.stroke();
    }
    ctx.restore(); return;
  }
  const pulse = low && !reducedFX() ? 1 + Math.sin(time * 6) * 0.06 : 1;
  
  ctx.save();
  // gaster shape - elipse orgânica
  ctx.translate(x + w/2, y + h/2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(x + w/2), -(y + h/2));
  
  // fundo gaster - quitina escura
  ctx.fillStyle = "rgba(20,14,28,0.9)";
  ctx.beginPath();
  ctx.ellipse(x + w/2, y + h/2 + 1, w/2 + 2, h/2 + 3, 0, 0, Math.PI*2);
  ctx.fill();
  
  // preenchimento vida - seiva âmbar
  if (frac > 0) {
    const clipW = w * frac;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2);
    ctx.clip();
    
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    if (low) {
      grad.addColorStop(0, "#ff4d5a");
      grad.addColorStop(0.5, "#ff7a6a");
      grad.addColorStop(1, "#a32e3a");
    } else {
      grad.addColorStop(0, style.gasterColor);
      grad.addColorStop(0.5, style.accent);
      grad.addColorStop(1, style.gasterVein);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, clipW, h);
    
    // brilho seiva
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x, y, clipW, h * 0.35);
    
    // veias pulsando
    if (!low) {
      ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.2;
      ctx.strokeStyle = style.gasterVein;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + clipW * 0.3, y + h*0.5);
      ctx.lineTo(x + clipW * 0.7, y + h*0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // contorno quitina
  ctx.strokeStyle = low ? "#ff4d5a" : style.border;
  ctx.lineWidth = low ? 2 : 1.2;
  ctx.beginPath();
  ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2);
  ctx.stroke();
  
  // coroa fungo/seda - pequenos cogumelos orgânicos em cima
  if (!low || Math.sin(time*4) > -0.3) {
    ctx.fillStyle = style.accent;
    const crownY = y - 2;
    for (let i = -1; i <= 1; i++) {
      const cx = x + w/2 + i * 6;
      const cy = crownY + Math.abs(i) * 1.5;
      // fungo: haste + chapéu
      ctx.fillRect(cx - 0.5, cy, 1, 3);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI*2);
      ctx.fill();
    }
    // luz âmbar central
    ctx.fillStyle = "#ffd479";
    ctx.globalAlpha = 0.8 + Math.sin(time*2)*0.2;
    ctx.beginPath();
    ctx.arc(x + w/2, y - 1, 1.5, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

// Névoa pré-rasterizada uma vez: sem centenas de gradientes por frame.
function fogStamp(index) {
  if (fogCache[index]) return fogCache[index];
  const cv = document.createElement("canvas"); cv.width = cv.height = 32;
  const c = cv.getContext("2d"), rgb = index ? "255,77,90" : "127,214,160";
  const g = c.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,`rgba(${rgb},0.9)`); g.addColorStop(0.5,`rgba(${rgb},0.4)`); g.addColorStop(1,`rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0,0,32,32); fogCache[index] = cv; return cv;
}

let fogLayer, fogTime = -Infinity, fogX, fogY, fogZoom, fogOX, fogOY;
export function drawPheromoneOverlay(ctx, cam, VIEW_W, VIEW_H, worldToScreen, foodTrailAt, dangerAt, time) {
  const step = 32, foodStamp = fogStamp(0), dangerStamp = fogStamp(1);
  if (!fogLayer) fogLayer = document.createElement("canvas");
  if (fogLayer.width !== VIEW_W/2 || fogLayer.height !== VIEW_H/2) {
    fogLayer.width=VIEW_W/2; fogLayer.height=VIEW_H/2; fogTime=-Infinity;
  }
  // 30 Hz sensorial, 60 Hz de composição. Pan/zoom/shake invalidam de imediato.
  if (time < fogTime || time-fogTime >= 1/30 || cam.x!==fogX || cam.y!==fogY || cam.zoom!==fogZoom || cam.offsetX!==fogOX || cam.offsetY!==fogOY) {
    const c=fogLayer.getContext("2d"); c.clearRect(0,0,fogLayer.width,fogLayer.height);
    for (let sx=0; sx<VIEW_W+step; sx+=step) for (let sy=0; sy<VIEW_H+step; sy+=step) {
      const wx=cam.x+(sx-VIEW_W/2-(cam.offsetX||0))/cam.zoom;
      const wy=cam.y+(sy-VIEW_H/2-(cam.offsetY||0))/cam.zoom;
      const food=foodTrailAt(wx,wy), danger=dangerAt(wx,wy);
      if (food>0.08) {
        c.globalAlpha=Math.min(0.65,food*1.2); c.drawImage(foodStamp,sx/2-16,sy/2-16,32,32);
        if (!reducedFX() && (sx+sy)%96===0) {
          c.fillStyle="#bfffa8"; c.fillRect(sx/2,(sy-Math.floor(time*8)%16)/2,1,1);
        }
      }
      if (danger>0.08) {
        c.globalAlpha=Math.min(0.7,danger*1.3); c.drawImage(dangerStamp,sx/2-16,sy/2-16,32,32);
      }
    }
    fogTime=time; fogX=cam.x; fogY=cam.y; fogZoom=cam.zoom; fogOX=cam.offsetX; fogOY=cam.offsetY;
  }
  ctx.save();
  ctx.fillStyle="rgba(10,8,16,0.35)"; ctx.fillRect(0,0,VIEW_W,VIEW_H);
  ctx.imageSmoothingEnabled=false; ctx.drawImage(fogLayer,0,0,VIEW_W,VIEW_H);
  ctx.restore();
}

// Desenhada por último no HUD, acima da loja (não escondida atrás dos cards).
export function drawPheromoneLegend(ctx, width, y) {
  const w = 420, x = Math.round((width-w)/2);
  ctx.save();
  ctx.fillStyle = "#100c1c"; ctx.fillRect(x,y,w,36);
  ctx.strokeStyle = "#7fd6a0"; ctx.strokeRect(x+0.5,y+0.5,w-1,35);
  drawText(ctx,"A COLÔNIA VÊ COM CHEIRO",width/2,y+3,{align:"center",scale:0.8,color:"#efe9ff"});
  drawText(ctx,"COMIDA +",x+18,y+19,{scale:0.75,color:"#7fd6a0"});
  drawText(ctx,"PERIGO !",x+154,y+19,{scale:0.75,color:"#ff4d5a"});
  drawText(ctx,"SOLTE H: VOLTAR",x+w-12,y+19,{align:"right",scale:0.7,color:"#efe9ff"});
  ctx.restore();
}

// FASE 2 (P11): cristal geométrico hexagonal com luz interna + memória ascendente.
// Âmbar = memória da Colônia · violeta = Névoa. Sem voz/figura humana.
export function drawEssenceCrystal(ctx, x, y, size, color, time) {
  const r = size / 2;
  const pulse = reducedFX() ? 0 : Math.sin(time * 3) * 0.08;
  ctx.save();
  // halo
  ctx.globalAlpha = 0.22 + pulse;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r * 1.5, 0, Math.PI * 2); ctx.fill();
  // corpo hexagonal
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 - Math.PI / 2;
    const px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r);
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#1a1427"; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  // luz interna
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - 1), Math.round(y - r * 0.55), 2, Math.round(r * 1.1));
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#fff";
  ctx.fillRect(Math.round(x - 1), Math.round(y - 2), 2, 2);
  ctx.restore();
  if (reducedFX()) return;
  // partículas de memória subindo
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < 2; i++) {
    const rise = (time * 8 + i * 7) % 12;
    ctx.globalAlpha = 0.8 * (1 - rise / 12);
    ctx.fillRect(Math.round(x - 3 + i * 6), Math.round(y - size / 2 - rise), 1, 2);
  }
  ctx.restore();
}

// Anéis de crescimento irregulares: memória da Árvore, não medidor tecnológico.
export function drawTreeRings(ctx, x, y, frac, biome) {
  const style = getBiomeHUD(biome);
  frac = Math.max(0, Math.min(1, Number.isFinite(frac) ? frac : 0));
  ctx.save();
  ctx.lineWidth = 1;
  for (let ring=0; ring<3; ring++) {
    ctx.strokeStyle = ring===2 ? style.border : "#79593f";
    ctx.beginPath();
    for (let i=0;i<=24;i++) {
      const a=i/24*Math.PI*2-Math.PI/2;
      const r=3+ring*3+Math.sin(a*3+ring)*0.65;
      const px=Math.round(x+Math.cos(a)*r), py=Math.round(y+Math.sin(a)*r);
      if (!i) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#ffd479"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x,y,9,-Math.PI/2,-Math.PI/2+frac*Math.PI*2); ctx.stroke();
  ctx.restore();
}

// Mapa sensorial: campos reais da IA, atualizado a 10 Hz, mascarado pela
// exploração em game.js. Cache único e limitado; nenhuma alteração nos campos.
let scentMap, scentTime = -Infinity, scentWorld;
export function drawScentMinimap(ctx, x, y, w, h, world, worldW, worldH, foodAt, dangerAt, time) {
  if (!scentMap) { scentMap=document.createElement("canvas"); scentMap.width=50; scentMap.height=38; }
  if (time < scentTime || time-scentTime >= 0.1 || scentWorld !== world) {
    const c=scentMap.getContext("2d"); c.clearRect(0,0,50,38);
    for (let iy=0;iy<38;iy++) for(let ix=0;ix<50;ix++) {
      const wx=(ix+0.5)*worldW/50, wy=(iy+0.5)*worldH/38;
      const food=foodAt(wx,wy), danger=dangerAt(wx,wy);
      if (food<=0.08 && danger<=0.08) continue;
      c.fillStyle=danger>food ? "#ff4d5a" : "#7fd6a0";
      c.globalAlpha=Math.min(0.85,Math.max(food,danger)); c.fillRect(ix,iy,1,1);
    }
    scentTime=time; scentWorld=world;
  }
  ctx.save(); ctx.imageSmoothingEnabled=false;
  ctx.drawImage(scentMap,x,y,w,h); ctx.restore();
}
