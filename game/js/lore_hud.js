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
};

export function getBiomeHUD(mapId) {
  return BIOME_HUD[mapId] || BIOME_HUD.planicie;
}

// Desenha textura quitina/cera orgânica por bioma
export function drawBiomeTexture(ctx, x, y, w, h, biome, time) {
  const style = getBiomeHUD(biome);
  // base
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, style.bg);
  grad.addColorStop(1, style.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  
  // textura quitina - pontos orgânicos
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = style.texture;
  for (let i = 0; i < 40; i++) {
    const px = x + (Math.sin(i * 1.7 + time * 0.1) * 0.5 + 0.5) * w;
    const py = y + (Math.cos(i * 2.3) * 0.5 + 0.5) * h;
    const r = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // veias quitina
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = style.texture;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y + h * (0.2 + i * 0.3));
    ctx.bezierCurveTo(
      x + w * 0.3, y + h * (0.15 + i * 0.3 + Math.sin(time * 0.5 + i) * 0.05),
      x + w * 0.7, y + h * (0.25 + i * 0.3 + Math.cos(time * 0.3 + i) * 0.05),
      x + w, y + h * (0.2 + i * 0.3)
    );
    ctx.stroke();
  }
  ctx.restore();
}

// Desenha barra de vida como gaster da rainha com coroa fungo/seda
export function drawGasterBar(ctx, x, y, w, h, frac, biome, low, time) {
  const style = getBiomeHUD(biome);
  const pulse = low ? 1 + Math.sin(time * 6) * 0.15 : 1;
  
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

// Desenha overlay feromônio quando segura H - verde comida, vermelho perigo
export function drawPheromoneOverlay(ctx, cam, VIEW_W, VIEW_H, worldToScreen, foodTrailAt, dangerAt, time) {
  const step = 28;
  const cols = Math.ceil(VIEW_W / step) + 2;
  const rows = Math.ceil(VIEW_H / step) + 2;
  
  // fundo escurecido leve
  ctx.fillStyle = "rgba(10,8,16,0.35)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  
  ctx.save();
  ctx.globalAlpha = 0.75;
  
  for (let ix = -1; ix < cols; ix++) {
    for (let iy = -1; iy < rows; iy++) {
      const sx = ix * step + (time * 10 % step);
      const sy = iy * step;
      // converter para mundo
      // precisamos importar screenToWorld mas passamos cam aqui - aproximar
      const wx = cam.x + (sx - VIEW_W/2) / cam.zoom;
      const wy = cam.y + (sy - VIEW_H/2) / cam.zoom;
      
      const food = foodTrailAt(wx, wy);
      const danger = dangerAt(wx, wy);
      
      if (food > 0.08) {
        const a = Math.min(0.65, food * 1.2);
        ctx.globalAlpha = a;
        // névoa verde comida - orgânica
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, step*0.6);
        grad.addColorStop(0, "rgba(127,214,160,0.9)");
        grad.addColorStop(0.5, "rgba(127,214,160,0.4)");
        grad.addColorStop(1, "rgba(127,214,160,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, step*0.55, 0, Math.PI*2);
        ctx.fill();
        
        // partícula subindo
        if (Math.random() < 0.03) {
          ctx.fillStyle = "#bfffa8";
          ctx.globalAlpha = a * 0.8;
          ctx.fillRect(sx + Math.sin(time*2+ix)*3, sy - 4, 2, 2);
        }
      }
      
      if (danger > 0.08) {
        const a = Math.min(0.7, danger * 1.3);
        ctx.globalAlpha = a;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, step*0.65);
        grad.addColorStop(0, "rgba(255,77,90,0.9)");
        grad.addColorStop(0.5, "rgba(255,77,90,0.35)");
        grad.addColorStop(1, "rgba(255,77,90,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, step*0.6, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
  
  // legenda feromônio
  ctx.fillStyle = "rgba(10,8,16,0.85)";
  ctx.fillRect(VIEW_W/2 - 180, VIEW_H - 38, 360, 28);
  ctx.strokeStyle = "#4a3a6e";
  ctx.strokeRect(VIEW_W/2 - 180, VIEW_H - 38, 360, 28);
  
  // verde = comida
  ctx.fillStyle = "#7fd6a0";
  ctx.beginPath(); ctx.arc(VIEW_W/2 - 120, VIEW_H - 24, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#efe9ff";
  ctx.font = "12px monospace";
  ctx.fillText("COMIDA", VIEW_W/2 - 108, VIEW_H - 20);
  
  // vermelho = perigo
  ctx.fillStyle = "#ff4d5a";
  ctx.beginPath(); ctx.arc(VIEW_W/2 + 10, VIEW_H - 24, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#efe9ff";
  ctx.fillText("PERIGO", VIEW_W/2 + 22, VIEW_H - 20);
  
  ctx.fillStyle = "#8f7bb5";
  ctx.fillText("H = VISÃO FEROMÔNIO • A COLÔNIA VÊ COM CHEIRO", VIEW_W/2 + 80, VIEW_H - 20);
}

// Desenha cristal geométrico com luz interna (essência)
export function drawEssenceCrystal(ctx, x, y, size, color, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 0.8) * 0.15);
  
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.moveTo(0, size*0.6);
  ctx.lineTo(-size*0.3, size*0.2);
  ctx.lineTo(0, -size*0.5);
  ctx.lineTo(size*0.3, size*0.2);
  ctx.closePath();
  ctx.fill();
  
  // cristal geométrico - hexágono
  const grad = ctx.createLinearGradient(-size*0.3, -size*0.5, size*0.3, size*0.6);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.2, color);
  grad.addColorStop(1, "#1a1430");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -size*0.6);
  ctx.lineTo(size*0.35, -size*0.2);
  ctx.lineTo(size*0.25, size*0.4);
  ctx.lineTo(-size*0.25, size*0.4);
  ctx.lineTo(-size*0.35, -size*0.2);
  ctx.closePath();
  ctx.fill();
  
  // luz interna pulsando
  ctx.globalAlpha = 0.6 + Math.sin(time*3)*0.3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, -size*0.1, size*0.12, 0, Math.PI*2);
  ctx.fill();
  
  // partículas subindo
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 2; i++) {
    const py = -size*0.3 - (time*20 + i*15) % (size*1.2);
    ctx.fillStyle = color;
    ctx.fillRect(-1 + i*2, py, 1.5, 1.5);
  }
  
  ctx.restore();
}
