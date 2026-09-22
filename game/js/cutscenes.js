// ============================================================================
// CUTSCENES HQ — Noite Branca, 6 Degraus, Pálida, Eras, Ascensão, Profecias
// 320x180 base upscale 3x nearest, 8 layers parallax cinema, Dead Cells HQ style
// Texto animado letra por letra + SFX ambiente bioma, trigger auto+biblioteca
// Regra 8: Nada humanoide — rainha formiga coroa fungo/seda, Pálida marionete névoa formiga
// ============================================================================
import { VIEW_W, VIEW_H, MAPS } from "./config.js";
import { G, persistSave } from "./state.js";
import { drawText, wrapText } from "./font.js";
import { SFX } from "./audio.js";
import { assetUrl, loadImage } from "./assets.js";

const CUTSCENE_DEFS = {
  noite_branca: {
    id: "noite_branca",
    title: "NOITE BRANCA",
    subtitle: "A Névoa levou o velho mundo. A colônia segue em frente.",
    biome: "planicie",
    panels: [
      {
        id: "panel1_intro", assetPanel: "panel1", layerCount: 8,
        lore: "Era uma vez uma colônia que vivia sob a lua laranja. A Rainha Silenciosa cantava com feromônio.",
        tip: "DICA: Segure H para ver o mundo como as formigas veem — com cheiro.",
      },
      {
        id: "panel2_conflito", layerCount: 3,
        lore: "Na Noite Branca, a névoa subiu do vale sem vento. Ela não queimava. Ela lembrava.",
        tip: "DICA: Cristais roxos guardam memória. Colete essência para a Árvore.",
      },
      {
        id: "panel3_gancho",
        lore: "No alto da névoa, algo pálido observava. Forma de rainha, fios de bruma. A Pálida.",
        tip: "DICA: A Pálida não é inimiga. É a memória que a colônia esqueceu.",
      },
    ],
  },
  planicie: {
    id: "planicie",
    title: "DEGRAU 1 — PLANÍCIE DO AMANHECER",
    subtitle: "Um gramado amplo onde a colônia fincou suas raízes.",
    biome: "planicie",
    boss: "hare",
    panels: [
      { id: "p1", lore: "A Planície respira orvalho. Aqui a colônia aprendeu a cortar.", tip: "CORTADEIRA corta folhas, MEL guarda néctar." },
      { id: "p2", lore: "O Tamborilador marca território tamborilando. Ele cobra pedágio de patas.", tip: "Quando 3+ irmãs cercam, o chefe usa THUMP." },
      { id: "p3", lore: "Se vencer, a seiva dourada sobe pela Árvore. Um fruto nasce.", tip: "Frutos são mini-árvores de habilidades liberadas por mapa." },
    ],
  },
  floresta: {
    id: "floresta",
    title: "DEGRAU 2 — FLORESTA DE MUSGO",
    subtitle: "Árvores antigas guardam segredos — e predadores.",
    biome: "floresta",
    boss: "fox",
    panels: [
      { id: "p1", lore: "O musgo é cama e teto. A Tecelã costura seda entre raízes.", tip: "TECELÃ cria túneis de seda que aceleram irmãs." },
      { id: "p2", lore: "A Caçadora Astuta aprendeu o cheiro de rainha há cem gerações.", tip: "Fase 2: ela some na névoa 1,2s. Ouça os passos." },
      { id: "p3", lore: "Cada árvore tem anel. Cada anel é uma guerra vencida.", tip: "PRATA corre mais rápido que vento. Use para explorar." },
    ],
  },
  pantano: {
    id: "pantano",
    title: "DEGRAU 3 — PÂNTANO PÚTRIDO",
    subtitle: "Águas paradas, insetos gordos e fome velha.",
    biome: "pantano",
    boss: "grouse",
    panels: [
      { id: "p1", lore: "O brejo é a boca da Névoa. Atravessem depressa, irmãs.", tip: "Pântano: trilhas somem na água. Seda marca caminho." },
      { id: "p2", lore: "A Sombra Alada mergulha sem aviso. Até a Névoa recua daqui.", tip: "Fase 2: grito inverte controles 0,85s. Respire." },
      { id: "p3", lore: "Ela é proto-Pálida. Asas de névoa, olhos de memória.", tip: "MATABELE cura em dobro quando aliada está <30%." },
    ],
  },
  deserto: {
    id: "deserto",
    title: "DEGRAU 4 — DESERTO CALCINADO",
    subtitle: "Areia, ossos e o zumbido de uma colônia rival.",
    biome: "deserto",
    boss: "matriarch",
    panels: [
      { id: "p1", lore: "A areia guarda um trato antigo: filhas em troca de perdão.", tip: "DESERTO: comida é semente seca. Leva tempo para achar." },
      { id: "p2", lore: "A Matriarca beijou a Névoa para sobreviver. Rainha que trocou seda por bruma.", tip: "Fase 2: cospe 5 direções. Não agrupe." },
      { id: "p3", lore: "Colônia rival não é inimiga. É espelho pálido do que podemos virar.", tip: "CEFALOTE bloqueia túneis com cabeça. Porta-viva." },
    ],
  },
  outono: {
    id: "outono",
    title: "DEGRAU 5 — BOSQUE DOURADO",
    subtitle: "Um outono eterno. As folhas caem; a fome não.",
    biome: "outono",
    boss: "deer",
    panels: [
      { id: "p1", lore: "O último verde antes do inverno patrulha em formação. O outono não perdoa.", tip: "Folhas douradas: +comida mas -visibilidade." },
      { id: "p2", lore: "O Galhada Real guarda o bosque. A coroa cobra um reino. Luta triste.", tip: "Fase 2: folhas caindo curam aliados. Luta triste." },
      { id: "p3", lore: "Ele não quer lutar. Ele quer que o bosque lembre dele.", tip: "ACROBATA salta sobre inimigos. Bailarina da colônia." },
    ],
  },
  gelo: {
    id: "gelo",
    title: "DEGRAU 6 — PICO CONGELADO",
    subtitle: "O topo do mundo, onde só a fome sobrevive.",
    biome: "gelo",
    boss: "boar",
    panels: [
      { id: "p1", lore: "O frio é só o hálito dela. A Névoa subiu junto. No topo, algo pálido espera.", tip: "PICO: essência é cristal pálido. Memória congelada." },
      { id: "p2", lore: "O Devastador é arauto. Ele abre caminho para o inverno. Para ELA.", tip: "Fase 2: névoa atrás revela Pálida. Ela está chegando." },
      { id: "p3", lore: "Se vencer aqui, a colônia atravessou seis degraus. Mas a Névoa nunca morre.", tip: "DINOPONERA: colosso sem atalho. Só no card. Vale cada folha." },
    ],
  },
  palida: {
    id: "palida",
    title: "A PÁLIDA",
    subtitle: "Marionete de névoa em forma de formiga rainha ancestral.",
    biome: "gelo",
    panels: [
      { id: "p1", lore: "Ela não é chefe. Ela é a memória que a colônia esqueceu. Rainha antes da Rainha.", tip: "Pálida: coroa de fungo/seda, olhos escorrendo memória." },
      { id: "p2", lore: "Fios de névoa seguram seus braços. Ela dança porque a bruma manda.", tip: "Não lute contra a Pálida. Ouça." },
      { id: "p3", lore: "Quando a colônia lembrar, a Pálida sorri — e vira semente.", tip: "Final verdadeiro: colônia vira paisagem. Era 10." },
    ],
  },
};

let active = null;
let layerImgs = []; // 8 layers; painéis ainda sem arte usam o fallback procedural

export function getCutsceneDefs() { return CUTSCENE_DEFS; }

export function startCutscene(id, opts = {}) {
  const def = CUTSCENE_DEFS[id];
  if (!def) return false;
  // já viu? se biblioteca, permite rever
  if (!opts.force && G.save.cutscenes && G.save.cutscenes[id] && !opts.isLoading) {
    // se não é loading e já viu, não auto-triggera, só via biblioteca
    if (!opts.fromLibrary) return false;
  }
  active = {
    def,
    id,
    panelIdx: 0,
    textShown: 0,
    textTimer: 0,
    autoCloseT: opts.isLoading ? (opts.duration || 3.5) : 0,
    isLoading: !!opts.isLoading,
    fromLibrary: !!opts.fromLibrary,
    onEnd: opts.onEnd || null,
  };
  loadPanelLayers(def, 0);
  // marca como vista
  if (!G.save.cutscenes) G.save.cutscenes = {};
  G.save.cutscenes[id] = true;
  persistSave();
  return true;
}

function loadPanelLayers(def, pIdx) {
  const panel = def.panels[pIdx];
  if (!panel) return;
  // Só pedir arquivos que já existem. Camadas pendentes não são falhas do boot.
  // Cada carga escreve no próprio array: uma imagem lenta do painel anterior
  // nunca pode substituir uma camada do painel que o jogador acabou de abrir.
  const images = layerImgs = Array(8).fill(null);
  const names = ["sky", "distant", "mid", "ground", "foreground", "particles", "vfx", "vignette"];
  for (let i = 0; i < (panel.layerCount || 0); i++) {
    // prazo + retry (loadImage): em 4G, uma camada de corte que não responde
    // deixaria o painel faltando PARA SEMPRE; agora ela vira o fallback desenhado
    loadImage(assetUrl(`assets/cutscenes/${def.id}/${panel.assetPanel || panel.id}/${i}_${names[i]}.png`))
      .then((img) => {
        // Adequar a arte-fonte uma única vez à resolução do parallax, não
        // redimensionar oito PNGs de alta resolução em todo frame da introdução.
        const layer = document.createElement("canvas");
        layer.width = 320; layer.height = 180;
        const c = layer.getContext("2d");
        c.imageSmoothingEnabled = false;
        c.drawImage(img, 0, 0, layer.width, layer.height);
        images[i] = layer;
      })
      .catch(() => { images[i] = null; });
  }
}

export function updateCutscene(dt) {
  if (!active) return null;
  active.textTimer += dt;
  // texto animado letra por letra: 30 chars/s
  if (active.textTimer > 0.03) {
    active.textTimer = 0;
    const panel = active.def.panels[active.panelIdx];
    const full = panel.lore + "  " + panel.tip;
    if (active.textShown < full.length) {
      active.textShown++;
      // SFX typewriter sutil (se existir)
      if (active.textShown % 3 === 0) SFX.type();
    }
  }
  if (active.isLoading) {
    active.autoCloseT -= dt;
    if (active.autoCloseT <= 0) {
      const cb = active.onEnd;
      active = null;
      if (cb) cb();
      return "close";
    }
  }
  return null;
}

export function drawCutscene(ctx, time) {
  if (!active) return false;
  const def = active.def;
  const panel = def.panels[active.panelIdx];
  if (!panel) return false;

  ctx.save();
  // fundo preto
  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // desenha 8 layers parallax com velocidades diferentes
  const speeds = [0.01, 0.03, 0.06, 0.08, 0.15, 0.04, 0.02, 0];
  const baseW = 320, baseH = 180;
  const scale = 3; // upscale 960x540 centralizado
  const drawW = baseW * scale;
  const drawH = baseH * scale;
  const ox = (VIEW_W - drawW) / 2;
  const oy = (VIEW_H - drawH) / 2;

  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < 8; i++) {
    const img = layerImgs[i];
    const speed = speeds[i];
    const offX = Math.sin(time * 0.2 + i) * speed * 40;
    const offY = Math.cos(time * 0.15 + i * 0.7) * speed * 10;
    if (i === 5) { // particles sway
      // partículas flutuam
    }
    if (img) {
      ctx.globalAlpha = i === 6 ? 0.85 : i === 7 ? 0.9 : 1;
      ctx.drawImage(img, ox + offX, oy + offY, drawW, drawH);
      ctx.globalAlpha = 1;
    } else {
      // fallback: cor por layer
      if (i === 0) {
        const grad = ctx.createLinearGradient(0, oy, 0, oy+drawH);
        grad.addColorStop(0, "#1a1430");
        grad.addColorStop(0.5, "#2a1f4a");
        grad.addColorStop(1, "#3d2f22");
        ctx.fillStyle = grad;
        ctx.fillRect(ox, oy, drawW, drawH);
        // lua
        ctx.fillStyle = "#ffd479";
        ctx.beginPath();
        ctx.arc(ox + drawW - 80, oy + 50, 18, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#1a1430";
        ctx.beginPath();
        ctx.arc(ox + drawW - 70, oy + 45, 16, 0, Math.PI*2);
        ctx.fill();
      } else if (i === 1) {
        ctx.fillStyle = "rgba(20,14,32,0.6)";
        ctx.beginPath();
        ctx.moveTo(ox, oy+drawH*0.4);
        ctx.lineTo(ox+drawW*0.3, oy+drawH*0.25);
        ctx.lineTo(ox+drawW*0.6, oy+drawH*0.35);
        ctx.lineTo(ox+drawW, oy+drawH*0.3);
        ctx.lineTo(ox+drawW, oy+drawH*0.5);
        ctx.lineTo(ox, oy+drawH*0.5);
        ctx.closePath();
        ctx.fill();
      } else if (i === 2 && def.id !== "noite_branca") {
        ctx.fillStyle = "rgba(74,58,110,0.35)";
        ctx.fillRect(ox+drawW*0.2, oy+drawH*0.5, drawW*0.6, drawH*0.15);
      } else if (i === 6) {
        // névoa
        ctx.fillStyle = "rgba(232,244,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(ox+drawW*0.25, oy+drawH*0.6, drawW*0.3, drawH*0.15, 0, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // vinheta gótica por cima se não tem layer 7
  if (!layerImgs[7]) {
    const grad = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, VIEW_W*0.3, VIEW_W/2, VIEW_H/2, VIEW_W*0.8);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(10,8,16,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Moldura e legendas SOBRE a imagem: 960x540 já ocupa o canvas inteiro.
  // Antes o cabeçalho ficava em y=-56 e as instruções abaixo de y=540.
  const margin = 16, innerW = VIEW_W - margin * 2;
  ctx.strokeStyle = "#ffd479";
  ctx.lineWidth = 3;
  ctx.strokeRect(margin - 3, margin - 3, innerW + 6, VIEW_H - margin * 2 + 6);

  const fontMult = G.save.accessibility.bigFont ? 1.3 : 1;
  const title = def.title + " — PAINEL " + (active.panelIdx + 1) + "/" + def.panels.length;
  const titleLines = wrapText(title, innerW - 24, { scale: fontMult });
  const subtitleLines = wrapText(def.subtitle || "", innerW - 24, { scale: 0.8 * fontMult });
  const titleH = 22 * fontMult, subtitleH = 17 * fontMult;
  const headerH = 20 + titleLines.length * titleH + subtitleLines.length * subtitleH;
  ctx.fillStyle = "rgba(10,8,16,0.92)";
  ctx.fillRect(margin, margin, innerW, headerH);
  titleLines.forEach((line, i) => drawText(ctx, line, margin + 12, margin + 8 + i * titleH, { color: "#ffd479" }));
  subtitleLines.forEach((line, i) => drawText(ctx, line, margin + 12, margin + 8 + titleLines.length * titleH + i * subtitleH, { color: "#9a8fc0", scale: 0.8 }));

  const fullText = panel.lore + "  " + panel.tip;
  const textScale = 0.9, lineH = 18 * fontMult;
  const fullLines = wrapText(fullText, innerW - 24, { scale: textScale * fontMult });
  const lines = wrapText(fullText.slice(0, active.textShown), innerW - 24, { scale: textScale * fontMult });
  const boxH = 20 + fullLines.length * lineH;
  const boxY = VIEW_H - 72 - boxH;
  ctx.fillStyle = "rgba(10,8,16,0.92)";
  ctx.fillRect(margin, boxY, innerW, boxH);
  ctx.strokeStyle = "#4a3a6e";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin, boxY, innerW, boxH);
  lines.forEach((line, i) => drawText(ctx, line, margin + 12, boxY + 8 + i * lineH, {
    color: line.includes("DICA:") ? "#7fd6a0" : "#efe9ff", scale: textScale,
  }));

  ctx.fillStyle = "rgba(10,8,16,0.92)";
  ctx.fillRect(margin, VIEW_H - 68, innerW, 52);
  for (let i = 0; i < def.panels.length; i++) {
    const dotX = VIEW_W / 2 + (i - (def.panels.length - 1) / 2) * 20;
    ctx.fillStyle = i === active.panelIdx ? "#ffd479" : "#4a3a6e";
    ctx.beginPath();
    ctx.arc(dotX, VIEW_H - 58, i === active.panelIdx ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const isLast = active.panelIdx === def.panels.length - 1;
  const action = active.textShown < fullText.length ? "MOSTRAR TEXTO" : isLast ? "JOGAR" : "PRÓXIMO PAINEL";
  const hint = active.isLoading
    ? "CARREGANDO... " + Math.ceil(active.autoCloseT) + "s"
    : "ENTER / ESPAÇO / CLIQUE: " + action + " • ESC: PULAR";
  drawText(ctx, hint, VIEW_W / 2, VIEW_H - 40, { color: "#efe9ff", align: "center", scale: 0.8 });
  ctx.restore();
  return true;
}

export function handleCutsceneInput(pressed, mouse) {
  if (!active) return false;
  if (active.isLoading) return true; // bloqueia input durante loading
  if (pressed.Escape) {
    const { id, onEnd } = active;
    active = null;
    if (onEnd) onEnd();
    return "closed:" + id;
  }
  if (pressed.Enter || pressed.Space || (mouse && mouse.justDown)) {
    const panel = active.def.panels[active.panelIdx];
    const full = panel.lore + "  " + panel.tip;
    if (active.textShown < full.length) {
      // skip texto
      active.textShown = full.length;
    } else {
      if (active.panelIdx < active.def.panels.length - 1) {
        active.panelIdx++;
        active.textShown = 0;
        active.textTimer = 0;
        loadPanelLayers(active.def, active.panelIdx);
      } else {
        // fecha
        const cb = active.onEnd;
        const id = active.id;
        active = null;
        if (cb) cb();
        return "closed:" + id;
      }
    }
    return true;
  }
  if (pressed.KeyB) {
    // vai para biblioteca (fecha cutscene)
    const cb = active.onEnd;
    active = null;
    if (cb) cb("library");
    return "library";
  }
  return true;
}

export function isCutsceneActive() { return !!active; }
export function isLoadingCutscene() { return active && active.isLoading; }

// Loading como HQ cutscene 3-5s
export function startLoadingCutscene(nextMapId) {
  const mapDef = MAPS.find(m => m.id === nextMapId) || MAPS[0];
  const lorePool = [
    "A colônia não migra. Ela se lembra de outro lugar.",
    "Cada formiga carrega um mapa que nunca desenhou.",
    "A Rainha Silenciosa não fala. Ela deixa rastro.",
    "O fungo não apodrece. Ele escreve.",
    "A Névoa não mata. Ela convida para esquecer.",
    "Seis degraus. Seis memórias. Um topo.",
  ];
  const tipPool = [
    "DICA: Tecelã costura túneis de seda. +velocidade na trilha.",
    "DICA: Pote-de-Mel guarda néctar. Gaster brilha quando cheio.",
    "DICA: Prata vê longe. Use para revelar mapa.",
    "DICA: Matabele cura feridas críticas em dobro.",
    "DICA: Cefalote bloqueia túneis com cabeça.",
    "DICA: Segure H para ver feromônio verde comida, vermelho perigo.",
  ];
  const id = mapDef.id in CUTSCENE_DEFS ? mapDef.id : "noite_branca";
  const def = CUTSCENE_DEFS[id];
  // cria cutscene temporária de loading com 1 painel
  const tempDef = {
    id: "loading_" + id,
    title: "CARREGANDO " + mapDef.name,
    subtitle: mapDef.sub,
    biome: mapDef.id,
    panels: [
      {
        id: "loading",
        lore: lorePool[Math.floor(Math.random()*lorePool.length)],
        tip: tipPool[Math.floor(Math.random()*tipPool.length)],
      }
    ]
  };
  // registra temporariamente
  CUTSCENE_DEFS[tempDef.id] = tempDef;
  return startCutscene(tempDef.id, { isLoading: true, duration: 3.5 + Math.random()*1.5, force: true });
}
