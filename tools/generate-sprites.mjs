/**
 * tools/generate-sprites.mjs
 * ---------------------------------------------------------------------------
 * Gera TODA a arte do beta como PNGs reais em /assets, seguindo:
 *  - Art Bible §"Regras de Ouro": insetos estritamente hexápodes, sem traços
 *    humanos, sem bípedes, silhuetas limpas.
 *  - "A Estética Geral": pixel art 16-bit crisp, shading 2D denso, personagens
 *    saturados/neon contra cenários menos saturados.
 *
 * Tudo é desenhado pixel a pixel (tools/pixlib.mjs) — sem blur, sem AA.
 *
 * Uso: npm run gen:art
 * Saída: assets/sprites/*.png, assets/tilesets/*.png, assets/ui/*.png,
 *        assets/fonts/*, assets/sprites/manifest.json
 * ---------------------------------------------------------------------------
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Surface, spriteSheet, writePNG, ramp, shade, mix, rgba, bitmapFontXML } from './pixlib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = {
    sprites: path.join(ROOT, 'assets', 'sprites'),
    tilesets: path.join(ROOT, 'assets', 'tilesets'),
    ui: path.join(ROOT, 'assets', 'ui'),
    fonts: path.join(ROOT, 'assets', 'fonts')
};
for (const d of Object.values(OUT)) mkdirSync(d, { recursive: true });

/** Registro do que foi gerado -> vira assets/sprites/manifest.json (TDD §7.1). */
const manifest = {};
function register(key, relFile, frameWidth, frameHeight, frames, extra = {}) {
    manifest[key] = { file: relFile, frameWidth, frameHeight, frames, ...extra };
}

/* ========================================================================== *
 * 1. FORMIGAS — renderer paramétrico (hexápode, top-down)
 * ========================================================================== */

/**
 * Desenha uma formiga top-down apontando para +x.
 * `phase` 0..3 = ciclo de caminhada em trípede (3 pernas no chão por vez).
 */
function drawAnt(o) {
    const {
        frame = 20,
        palette,
        phase = 0,
        pose = 'walk',
        abdomenR = 3.1,
        thoraxR = 1.9,
        headR = 2.2,
        mandible = 2,
        bodyLen = 5,
        antenna = 3,
        outline = null,
        glow = null,
        extras = []
    } = o;

    const s = new Surface(frame, frame);
    const cx = frame / 2 - 0.5 + (pose === 'attack' && phase === 1 ? 1 : 0);
    const cy = frame / 2;

    // Dead Cells: tons saturados, outline preto espesso, highlight quente no topo-esquerda
    const dark = outline || shade(palette, -0.78);
    const mid = palette;
    const light = shade(palette, 0.45);
    const rimCol = shade(palette, 0.65);
    const deep = shade(palette, -0.92);

    // --- Pernas Dead Cells: 2 segmentos + garra clara + highlight + junta ---
    const legDark = shade(palette, -0.62);
    const legMid = shade(palette, -0.28);
    const legHi = shade(palette, 0.18);
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
            const baseX = cx - 1.5 + k * 1.8;
            const tripod = (k + (side > 0 ? 0 : 1)) % 2 === 0 ? 0 : Math.PI;
            const swing = pose === 'idle' ? 0 : Math.sin(phase * (Math.PI / 2) + tripod) * 1.5;
            const kneeX = baseX + swing * 0.8;
            const kneeY = cy + side * 2.6;
            const footX = baseX + swing * 1.7;
            const footY = cy + side * (4.4 + Math.abs(swing) * 0.25);
            s.thickLine(baseX, cy, kneeX, kneeY, legDark, 1);
            s.px(Math.round((baseX+kneeX)/2), Math.round((cy+kneeY)/2 - side*0.5), legHi);
            s.thickLine(kneeX, kneeY, footX, footY, legMid, 1);
            s.px(Math.round(kneeX), Math.round(kneeY), deep);
            s.px(footX, footY, '#fff6b0');
            s.px(footX, footY - side*0.6, light);
        }
    }

    // --- Abdomen Dead Cells: volume 3 tons + highlight ---
    const abdX = cx - bodyLen * 0.72;
    s.ellipse(abdX+0.3, cy+0.3, abdomenR*1.18, abdomenR*0.88, deep, {outline:false, rim:false});
    s.ellipse(abdX, cy, abdomenR * 1.15, abdomenR * 0.86, mid, { outline: true, rim: true, rampSteps:5 });
    s.ellipse(abdX- abdomenR*0.25, cy- abdomenR*0.3, abdomenR*0.55, abdomenR*0.35, rimCol, {outline:false, rim:false});
    s.px(Math.round(abdX-0.5), Math.round(cy- abdomenR*0.55), '#ffffff');
    for (let i = 1; i <= 2; i++) {
        const gx = abdX + i * (abdomenR * 0.55) - 0.2;
        for (let y = -abdomenR * 0.7; y <= abdomenR * 0.7; y++) {
            const ny = y / (abdomenR * 0.86);
            if (Math.abs(ny) < 0.95) {
                s.px(gx, cy + Math.round(y), dark);
                if(Math.abs(ny)<0.6) s.px(gx+1, cy+Math.round(y), shade(palette,0.12));
            }
        }
    }

    // --- Pecíolo Dead Cells: nó com highlight ---
    s.rect(Math.round(cx - bodyLen * 0.32), Math.round(cy-0.5), 2, 2, dark);
    s.px(Math.round(cx - bodyLen*0.32)+1, Math.round(cy-0.5), light);
    // --- Tórax com placas e volume ---
    const thX=cx + bodyLen * 0.12;
    s.ellipse(thX+0.2, cy+0.3, thoraxR*1.28, thoraxR*1.02, deep, {outline:false, rim:false});
    s.ellipse(thX, cy, thoraxR * 1.25, thoraxR, mid, { outline: true, rim: true, rampSteps:4 });
    s.line(thX-0.5, cy-thoraxR*0.7, thX+0.5, cy+thoraxR*0.7, shade(mid,0.28));
    s.px(Math.round(thX- thoraxR*0.2), Math.round(cy- thoraxR*0.4), rimCol);

    // --- Cabeça ---
    // --- Cabeça Dead Cells: volume + carena ---
    const headX = cx + bodyLen * 0.62;
    s.ellipse(headX+0.25, cy+0.25, headR*1.08, headR*0.98, deep, {outline:false, rim:false});
    s.ellipse(headX, cy, headR * 1.05, headR * 0.95, mid, { outline: true, rim: true, rampSteps:4 });
    s.line(headX- headR*0.3, cy, headX+ headR*0.4, cy, shade(mid,0.22));

    // Olhos facetados Dead Cells: base preta + brilho vermelho
    for(const side of [-1,1]){
        const ex=Math.round(headX + headR * 0.42), ey=Math.round(cy + side*headR * 0.52);
        s.ellipse(ex,ey,1.4,1.2, '#0a0a0a', {outline:false, rim:false});
        s.px(ex,ey, '#1a1a2a');
        s.px(ex+1, ey-1, '#ff3b30');
    }

    // --- Mandíbulas Dead Cells: serrilhadas, dente interno, highlight ---
    const open = pose === 'attack' ? (phase === 1 ? 2 : 1) : 0;
    const mDark = shade(palette, -0.32);
    const mMid = shade(palette, -0.08);
    const mLight = shade(palette, 0.28);
    for (const side of [-1, 1]) {
        const spread = side * (1 + open);
        const tipX = headX + headR + mandible;
        const tipY = cy + spread * (0.9 + mandible * 0.12);
        s.poly([
                [headX + headR * 0.55, cy + side * 0.9],
                [tipX-0.8, tipY - side*0.6],
                [tipX, tipY],
                [headX + headR * 0.85, cy + side * 0.1]
            ], mMid);
        s.line(headX+headR*0.55, cy+side*0.9, tipX, tipY, mDark);
        s.px(Math.round(headX+headR*0.7 + mandible*0.4), Math.round(cy+ side*(1.2+open*0.3)), deep);
        s.px(tipX, tipY, mLight);
        s.px(tipX-1, tipY - side*0.5, '#ffffff');
    }

    // --- Antenas Dead Cells: segmentadas com clava e highlight ---
    const wig = pose === 'idle' ? (phase % 2 === 0 ? -1 : 1) * 0.5 : 0;
    for (const side of [-1, 1]) {
        const ax = headX + headR * 0.3;
        const ay = cy + side * (headR * 0.55);
        const elbowX = ax + antenna * 0.8;
        const elbowY = ay + side * (antenna * 0.55) + wig;
        const tipX2 = elbowX + antenna * 0.75;
        const tipY2 = elbowY + side * (antenna * 0.35) - wig * 0.5;
        s.line(ax, ay, elbowX, elbowY, legMid);
        s.px(Math.round((ax+elbowX)/2), Math.round((ay+elbowY)/2), shade(legMid,0.22));
        s.line(elbowX, elbowY, tipX2, tipY2, legMid);
        s.ellipse(tipX2, tipY2, 1.1,0.9, deep, {outline:false, rim:false});
        s.px(tipX2, tipY2, light);
        s.px(tipX2+0.5, tipY2-0.4, '#ffffff');
    }

    // --- Detalhes por classe --- Dead Cells: extras com highlight
    for (const fx of extras) fx(s, { cx, cy, headX, palette, dark, mid, light, rimCol, deep });

    if (glow) {
        s.recolor((p) => (p[3] > 0 ? mix(p, glow, 0.14) : null));
    }
    return s;
}

/** Gera um sprite sheet de formiga: walk(4) + idle(2) + attack(2). */
function antSheet(name, relFile, opts) {
    const frame = opts.frame || 20;
    const sheet = spriteSheet(frame, frame, 8, (i) => {
        if (i < 4) return drawAnt({ ...opts, frame, pose: 'walk', phase: i });
        if (i < 6) return drawAnt({ ...opts, frame, pose: 'idle', phase: i - 4 });
        return drawAnt({ ...opts, frame, pose: 'attack', phase: i - 6 });
    });
    writePNG(path.join(ROOT, relFile), sheet);
    register(name, relFile, frame, frame, 8, {
        anims: { walk: [0, 1, 2, 3], idle: [4, 5], attack: [6, 7] }
    });
}

// Extras visuais reutilizáveis
const fxAcidSack = (glowColor) => (s, { cx, cy, abdomenR }) => {
    const bx = cx - abdomenR * 1.9;
    s.ellipse(bx, cy + 0, 1.6, 1.3, glowColor, { outline: true });
    s.px(bx, cy - 1, shade(glowColor, 0.6));
};
const fxArmorPlates = (s, { cx, cy }) => {
    for (let i = -1; i <= 1; i++) s.rect(Math.round(cx + i * 2), Math.round(cy - 2.5), 2, 1, shade('#7d8794', 0.25));
};
const fxGlowAbdomen = (color) => (s, { cx, cy }) => {
    s.px(Math.round(cx - 6), Math.round(cy), color);
    s.px(Math.round(cx - 7), Math.round(cy), shade(color, -0.2));
};
const fxSpadeMandibles = (s, { headX, cy }) => {
    s.rect(Math.round(headX + 2), Math.round(cy - 2), 2, 4, '#9c7a3c');
};
const fxWings = (s, { cx, cy }) => {
    for (const side of [-1, 1]) {
        s.ellipse(cx - 1, cy + side * 3.4, 3.2, 1.2, '#c8f0ff', { outline: false });
    }
};

console.log('[gen:art] formigas...');
antSheet('ant_worker', 'assets/sprites/ant_worker.png', { palette: '#96602e', abdomenR: 2.9, mandible: 1.6 });
antSheet('ant_collector', 'assets/sprites/ant_collector.png', { palette: '#b58a2c', abdomenR: 3.3, mandible: 2 });
antSheet('ant_scout', 'assets/sprites/ant_scout.png', { palette: '#d7b257', abdomenR: 2.6, headR: 2.0, antenna: 4.4, mandible: 1.2 });
antSheet('ant_soldier', 'assets/sprites/ant_soldier.png', { palette: '#9e3a22', abdomenR: 3.4, headR: 2.7, mandible: 3.2 });
antSheet('ant_guardian', 'assets/sprites/ant_guardian.png', {
    palette: '#5f6b7a',
    abdomenR: 3.6,
    thoraxR: 2.3,
    mandible: 2,
    extras: [fxArmorPlates]
});
antSheet('ant_sniper', 'assets/sprites/ant_sniper.png', {
    palette: '#4f8f34',
    abdomenR: 3.0,
    mandible: 1.4,
    extras: [fxAcidSack('#b6ff3c')]
});
antSheet('ant_spy', 'assets/sprites/ant_spy.png', { palette: '#562f6b', abdomenR: 2.8, headR: 2.1, antenna: 4, mandible: 2.2 });
antSheet('ant_healer', 'assets/sprites/ant_healer.png', {
    palette: '#d9c48c',
    abdomenR: 3.0,
    mandible: 1.4,
    extras: [fxGlowAbdomen('#fff3b0')]
});
antSheet('ant_digger', 'assets/sprites/ant_digger.png', {
    palette: '#6d4a22',
    abdomenR: 3.3,
    headR: 2.6,
    mandible: 2.4,
    extras: [fxSpadeMandibles]
});
antSheet('ant_giant', 'assets/sprites/ant_giant.png', {
    frame: 16, // base pequena: o TDD manda setScale(10) -> ~160px de cercol colossal
    palette: '#3b3430',
    abdomenR: 3.6,
    thoraxR: 2.4,
    headR: 3.0,
    mandible: 3.4
});
antSheet('ant_enemy', 'assets/sprites/ant_enemy.png', {
    palette: '#c2341f',
    abdomenR: 3.2,
    headR: 2.5,
    mandible: 2.6,
    glow: '#ff6a2a'
});

/* ========================================================================== *
 * 2. RAINHA
 * ========================================================================== */
console.log('[gen:art] rainha...');
function drawQueen(phase, { dying = false } = {}) {
    const F = 32;
    const s = new Surface(F, F);
    const cx = 13;
    const cy = 16 + (dying ? 3 : 0);
    const pal = dying ? '#6b5a6e' : '#8f4fb8';
    const dark = shade(pal, -0.7);
    const breath = dying ? 0 : Math.sin(phase * (Math.PI / 2)) * 0.7;

    // pernas presas ao chão (Rainha estática)
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
            const bx = cx - 3 + k * 3;
            s.thickLine(bx, cy, bx - 1 + k, cy + side * 4.5, shade(pal, -0.5), 1);
            s.px(bx - 1 + k, cy + side * 4.5, shade(pal, 0.2));
        }
    }
    // abdomen colossal translúcido cheio de ovos
    s.ellipse(cx - 6, cy, 8.2 + breath, 6.4 + breath * 0.6, pal, { outline: true });
    const egg = mix('#ffffff', pal, 0.25);
    for (let i = 0; i < 7; i++) {
        const ex = cx - 11 + (i % 4) * 3.4;
        const ey = cy - 3 + Math.floor(i / 4) * 4 + (i % 2);
        s.ellipse(ex, ey, 1.4, 1.1, egg, { outline: false, rim: false });
    }
    // brilho pulsante
    s.px(Math.round(cx - 8), Math.round(cy - 3), shade('#ffd6ff', 0.2));

    // tórax + cabeça
    s.ellipse(cx + 3, cy, 3.1, 2.6, pal, { outline: true });
    const headX = cx + 8;
    s.ellipse(headX, cy, 3.2, 3.0, pal, { outline: true });
    s.px(headX + 1, cy - 2, dark);
    s.px(headX + 1, cy + 2, dark);
    for (const side of [-1, 1]) {
        s.poly(
            [
                [headX + 2.4, cy + side * 1.2],
                [headX + 6.5, cy + side * (2.4 + (dying ? 0 : breath))],
                [headX + 3.2, cy + side * 0.2]
            ],
            shade(pal, -0.2)
        );
        const ax = headX + 1.5;
        const ay = cy + side * 2;
        s.line(ax, ay, ax + 3, ay + side * 3, shade(pal, -0.4));
        s.line(ax + 3, ay + side * 3, ax + 6, ay + side * 2.4, shade(pal, -0.4));
    }
    // coroa de quitina (identidade da Rainha)
    for (let i = -2; i <= 2; i++) {
        s.px(headX + i, cy - 4, '#ffd34d');
        if (i % 2 === 0) s.px(headX + i, cy - 5, shade('#ffd34d', 0.4));
    }
    if (dying) {
        s.recolor((p) => mix(p, '#241016', 0.35));
    }
    return s;
}
{
    const sheet = spriteSheet(32, 32, 6, (i) => (i < 4 ? drawQueen(i) : i === 4 ? drawQueen(0) : drawQueen(0, { dying: true })));
    writePNG(path.join(ROOT, 'assets/sprites/queen.png'), sheet);
    register('queen', 'assets/sprites/queen.png', 32, 32, 6, { anims: { idle: [0, 1, 2, 3], hurt: [4], death: [5] } });
}

/* ========================================================================== *
 * 3. INIMIGOS
 * ========================================================================== */
console.log('[gen:art] inimigos...');

/** Centopeia: corpo segmentado, muitas pernas, ondulação. */
function drawCentipede(frame, pal, phase, { segments = 7, toxic = false } = {}) {
    const s = new Surface(frame, frame);
    const cy = frame / 2;
    const segR = Math.max(2, frame / 9);
    const dark = shade(pal, -0.65);
    for (let i = segments - 1; i >= 0; i--) {
        const x = frame * 0.16 + i * (frame * 0.68) / (segments - 1);
        const wob = Math.sin(phase * (Math.PI / 2) + i * 0.9) * (frame / 16);
        const r = segR * (i === 0 ? 1.25 : 1 - i * 0.03);
        s.ellipse(x, cy + wob, r, r * 0.85, i % 2 ? pal : shade(pal, -0.15), { outline: true });
        // pernas de cada segmento
        for (const side of [-1, 1]) {
            const lx = x + Math.sin(phase * (Math.PI / 2) + i) * 1.4;
            s.line(x, cy + wob, lx, cy + wob + side * (r + 2.4), dark);
            s.px(lx, cy + wob + side * (r + 2.4), shade(pal, 0.2));
        }
        if (toxic && i % 2 === 0) s.px(x, cy + wob - r, '#9dff3c');
    }
    // cabeça com forcípulas
    const hx = frame * 0.12;
    s.ellipse(hx, cy + Math.sin(phase * (Math.PI / 2)) * (frame / 16), segR * 1.3, segR * 1.1, shade(pal, 0.1), { outline: true });
    for (const side of [-1, 1]) {
        s.poly(
            [
                [hx - segR, cy + side * 1],
                [hx - segR - 3.4, cy + side * 2.6],
                [hx - segR + 0.5, cy + side * 2.4]
            ],
            shade(pal, -0.3)
        );
    }
    return s;
}

/** Besouro: carapaça oval com linha de élitros. */
function drawBeetle(frame, pal, phase, { horn = false, glow = null } = {}) {
    const s = new Surface(frame, frame);
    const cx = frame / 2 + 1;
    const cy = frame / 2;
    const dark = shade(pal, -0.7);
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
            const bx = cx - 3 + k * 3;
            const sw = Math.sin(phase * (Math.PI / 2) + k + (side > 0 ? 0 : 1.5)) * 1.4;
            s.line(bx, cy, bx + sw, cy + side * (frame / 4.4), dark);
        }
    }
    s.ellipse(cx - 1, cy, frame / 2.9, frame / 3.4, pal, { outline: true });
    s.line(cx - 1, cy - frame / 3.6, cx - 1, cy + frame / 3.6, dark); // élitros
    if (glow) s.ellipse(cx - frame / 4, cy, frame / 8, frame / 9, glow, { outline: false });
    const hx = cx + frame / 3.1;
    s.ellipse(hx, cy, frame / 6.5, frame / 7, shade(pal, -0.1), { outline: true });
    for (const side of [-1, 1]) {
        s.px(hx + 1, cy + side * (frame / 9), '#120a08');
        if (horn) {
            s.line(hx + 1, cy + side * 0.5, hx + frame / 4.5, cy + side * (frame / 7), shade(pal, 0.35));
            s.line(hx + frame / 4.5, cy + side * (frame / 7), hx + frame / 3.6, cy + side * (frame / 12), shade(pal, 0.5));
        }
    }
    return s;
}

/** Escorpião: pinças + cauda articulada com ferrão. */
function drawScorpion(frame, pal, phase) {
    const s = new Surface(frame, frame);
    const cx = frame / 2;
    const cy = frame / 2 + 1;
    const dark = shade(pal, -0.65);
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
            const bx = cx - 3 + k * 2.5;
            s.line(bx, cy, bx + Math.sin(phase + k) * 1.2, cy + side * (frame / 4), dark);
        }
    }
    s.ellipse(cx - 1, cy, frame / 4.2, frame / 5.2, pal, { outline: true });
    // cauda em arco
    const tailPts = 5;
    let px0 = cx - frame / 4;
    let py0 = cy;
    for (let i = 1; i <= tailPts; i++) {
        const t = i / tailPts;
        const nx = px0 - (frame / 14) * Math.cos(t * 1.2);
        const ny = py0 - (frame / 12) * (1 - Math.abs(0.5 - t)) + Math.sin(phase + i) * 0.4;
        s.line(px0, py0, nx, ny, shade(pal, -0.2));
        s.px(nx, ny, shade(pal, 0.15));
        px0 = nx;
        py0 = ny;
    }
    s.ellipse(px0, py0, 1.6, 1.3, '#e8ff5a', { outline: true }); // ferrão
    // pinças
    const hx = cx + frame / 4;
    s.ellipse(hx, cy, frame / 8, frame / 9, shade(pal, 0.05), { outline: true });
    for (const side of [-1, 1]) {
        const open = 1 + (phase % 2) * 0.6;
        s.poly(
            [
                [hx + 1, cy + side * 1],
                [hx + frame / 3.4, cy + side * (2 + open)],
                [hx + frame / 4.5, cy + side * 0.4]
            ],
            shade(pal, -0.25)
        );
    }
    return s;
}

/** Mosca: asas translúcidas + corpo peludo. */
function drawFly(frame, pal, phase) {
    const s = new Surface(frame, frame);
    const cx = frame / 2;
    const cy = frame / 2;
    const flap = phase % 2 === 0 ? 0 : 1;
    for (const side of [-1, 1]) {
        s.ellipse(cx - 1, cy + side * (2 + flap), frame / 3.4, frame / 7, '#cfe9ff', { outline: false, rim: false });
    }
    s.ellipse(cx, cy, frame / 4.2, frame / 5, pal, { outline: true });
    s.ellipse(cx - frame / 4, cy, frame / 6, frame / 7, shade(pal, -0.25), { outline: true });
    const hx = cx + frame / 4;
    s.ellipse(hx, cy, frame / 6.5, frame / 7, shade(pal, 0.15), { outline: true });
    s.px(hx + 1, cy - 1, '#ff3b3b');
    s.px(hx + 1, cy + 1, '#ff3b3b');
    for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) s.line(cx - 2 + k * 2, cy, cx - 2 + k * 2, cy + side * 3, shade(pal, -0.6));
    }
    return s;
}

/** Aranha: 8 pernas, abdômen grande, olhos múltiplos brilhantes. */
function drawSpider(frame, pal, phase, { eyes = '#ff4b2e', fur = true } = {}) {
    const s = new Surface(frame, frame);
    const cx = frame / 2 + frame / 12;
    const cy = frame / 2;
    const dark = shade(pal, -0.72);
    for (const side of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
            const ang = -0.9 + k * 0.6;
            const sw = Math.sin(phase * (Math.PI / 2) + k * 1.1 + (side > 0 ? 0 : 1.4)) * (frame / 22);
            const kneeX = cx + Math.cos(ang) * (frame / 5) * side * 0.2 - frame / 10;
            const kneeY = cy + side * (frame / 5.5 + k * 0.4) + sw;
            const footX = kneeX - (frame / 7) + Math.cos(ang) * 2;
            const footY = kneeY + side * (frame / 8);
            s.line(cx - frame / 14, cy + side * 1, kneeX, kneeY, dark);
            s.line(kneeX, kneeY, footX, footY, shade(pal, -0.4));
            s.px(footX, footY, shade(pal, 0.1));
        }
    }
    s.ellipse(cx - frame / 5, cy, frame / 3.6, frame / 4.2, pal, { outline: true });
    if (fur) {
        const rnd = new Surface(1, 1).noise(1337);
        for (let i = 0; i < frame; i++) {
            const a = rnd() * Math.PI * 2;
            const r = frame / 5;
            s.px(cx - frame / 5 + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, shade(pal, 0.25));
        }
    }
    // padrão no abdômen
    s.ellipse(cx - frame / 5, cy - frame / 12, frame / 9, frame / 14, shade(pal, 0.4), { outline: false, rim: false });
    s.ellipse(cx + frame / 9, cy, frame / 7, frame / 8, shade(pal, 0.08), { outline: true });
    // olhos
    for (let i = 0; i < 4; i++) {
        s.px(cx + frame / 5 + (i % 2), cy - 2 + Math.floor(i / 2) * 2 + (i % 2 ? 1 : 0), eyes);
    }
    // quelíceras
    for (const side of [-1, 1]) {
        s.poly(
            [
                [cx + frame / 5, cy + side * 1],
                [cx + frame / 3.2, cy + side * (2.4 + (phase % 2))],
                [cx + frame / 5 + 1, cy + side * 0.2]
            ],
            shade(pal, -0.35)
        );
    }
    return s;
}

function enemySheet(name, relFile, frameW, frameH, frames, draw, anims) {
    const sheet = spriteSheet(frameW, frameH, frames, draw);
    writePNG(path.join(ROOT, relFile), sheet);
    register(name, relFile, frameW, frameH, frames, { anims });
}

enemySheet('enemy_centipede', 'assets/sprites/enemy_centipede.png', 24, 24, 4, (i) => drawCentipede(24, '#a8402c', i), {
    walk: [0, 1, 2, 3],
    attack: [1, 3]
});
enemySheet('enemy_beetle', 'assets/sprites/enemy_beetle.png', 20, 20, 4, (i) => drawBeetle(20, '#5a4a86', i, { horn: true }), {
    walk: [0, 1, 2, 3],
    attack: [1, 3]
});
enemySheet('enemy_scorpion', 'assets/sprites/enemy_scorpion.png', 20, 20, 4, (i) => drawScorpion(20, '#c8862c', i), {
    walk: [0, 1, 2, 3],
    attack: [1, 3]
});
enemySheet('enemy_fly', 'assets/sprites/enemy_fly.png', 16, 16, 2, (i) => drawFly(16, '#4a5a3a', i), { walk: [0, 1], attack: [0, 1] });
enemySheet('enemy_spiderling', 'assets/sprites/enemy_spiderling.png', 12, 12, 2, (i) => drawSpider(12, '#6b4a5e', i), {
    walk: [0, 1],
    attack: [0, 1]
});
enemySheet('enemy_moth', 'assets/sprites/enemy_moth.png', 20, 20, 2, (i) => drawFly(20, '#9fc7e8', i), { walk: [0, 1], attack: [0, 1] });
enemySheet('enemy_termite', 'assets/sprites/enemy_termite.png', 18, 18, 4, (i) => drawCentipede(18, '#b08a4a', i, { segments: 4 }), {
    walk: [0, 1, 2, 3],
    attack: [1, 3]
});
enemySheet('enemy_plant', 'assets/sprites/enemy_plant.png', 20, 20, 2, (i) => {
    const s = new Surface(20, 20);
    for (let k = 0; k < 5; k++) {
        const a = -1.2 + k * 0.6;
        s.ellipse(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5 - (i ? 1 : 0), 3, 2, k % 2 ? '#3f7a34' : '#2f5c28', { outline: true });
    }
    s.ellipse(10, 12, 3, 4, '#6a4a22', { outline: true });
    return s;
}, { walk: [0, 1], attack: [1, 0] });

/* ---- Chefões -------------------------------------------------------- */
enemySheet('boss_wolf_spider', 'assets/sprites/boss_wolf_spider.png', 64, 64, 4, (i) => drawSpider(64, '#6b3a4a', i), {
    walk: [0, 1, 2, 3],
    attack: [2, 3]
});
enemySheet('boss_bombardier', 'assets/sprites/boss_bombardier.png', 48, 48, 4, (i) => drawBeetle(48, '#8a3a1e', i, { horn: true, glow: '#ff8a1e' }), {
    walk: [0, 1, 2, 3],
    attack: [2, 3]
});
enemySheet('boss_putrid_centipede', 'assets/sprites/boss_putrid_centipede.png', 64, 64, 4, (i) => drawCentipede(64, '#4f6b2a', i, { segments: 9, toxic: true }), {
    walk: [0, 1, 2, 3],
    attack: [1, 3]
});
enemySheet('boss_first_queen', 'assets/sprites/boss_first_queen.png', 64, 64, 6, (i) => {
    const s = drawQueen(i % 4);
    // escala para 64x64: desenha a deusa maior com aura branca/dourada e asas
    const F = 64;
    const out = new Surface(F, F);
    out.blit(s, 16, 16);
    for (const side of [-1, 1]) {
        out.ellipse(22, 32 + side * 14, 10, 4, '#dff6ff', { outline: false, rim: false });
    }
    const rnd = new Surface(1, 1).noise(99 + i);
    for (let k = 0; k < 40; k++) {
        const a = rnd() * Math.PI * 2;
        const r = 20 + rnd() * 10;
        out.px(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, rnd() > 0.5 ? '#fff3b0' : '#ffffff');
    }
    out.recolor((p) => mix(p, '#ffe9a8', 0.1));
    return out;
}, { walk: [0, 1, 2, 3], attack: [4, 5], idle: [0, 1, 2, 3] });

/* ========================================================================== *
 * 4. TILESETS POR BIOMA
 * frames: 0 dirt, 1 dirt_alt, 2 tunnel_floor, 3 rock, 4 surface,
 *         5 surface_alt, 6 hazard, 7 hazard_alt
 * ========================================================================== */
console.log('[gen:art] tilesets...');
export const BIOME_ART = {
    bosque_umido: { dirt: '#5c4029', rock: '#4a4238', surface: '#3f6b2a', hazard: '#2f6b4a', hazardName: 'musgo' },
    prado_fogo: { dirt: '#4a2f1e', rock: '#3a2a22', surface: '#7a4a1e', hazard: '#d24a12', hazardName: 'brasa' },
    deserto_escaldante: { dirt: '#a8834a', rock: '#8a6a3a', surface: '#d8b464', hazard: '#f0d078', hazardName: 'areia fofa' },
    pantano_toxico: { dirt: '#3a3a24', rock: '#2f3328', surface: '#4a5a2a', hazard: '#8fbf2a', hazardName: 'gás' },
    cemiterio_troncos: { dirt: '#4a3a2a', rock: '#3d3328', surface: '#5a4a32', hazard: '#7a6a4a', hazardName: 'raiz' },
    floresta_fungos: { dirt: '#3d2f45', rock: '#332a3d', surface: '#4a3a5a', hazard: '#b44ad2', hazardName: 'esporo' },
    cavernas_cristal: { dirt: '#2f3a4a', rock: '#5a7a9a', surface: '#3a4a5f', hazard: '#7ad2ff', hazardName: 'cristal' },
    tundra_congelada: { dirt: '#4a5a66', rock: '#6a7f8f', surface: '#a8c8dd', hazard: '#dff2ff', hazardName: 'gelo' },
    oasis_carnivoro: { dirt: '#4a4a24', rock: '#3d4028', surface: '#6a8a2a', hazard: '#c82a5a', hazardName: 'flora' },
    jardim_flutuante: { dirt: '#3a4a3a', rock: '#33443a', surface: '#4a7a6a', hazard: '#2a7ad2', hazardName: 'água' },
    abismo_bioluminescente: { dirt: '#161622', rock: '#232338', surface: '#1e1e2e', hazard: '#4affe0', hazardName: 'luz' },
    vale_ossos: { dirt: '#4a4238', rock: '#8a8478', surface: '#6b6455', hazard: '#d8d2b8', hazardName: 'osso' },
    fosso_teias: { dirt: '#3a3630', rock: '#44403a', surface: '#5a554c', hazard: '#e8e8f0', hazardName: 'teia' },
    canyon_geleia: { dirt: '#5a3a1e', rock: '#6a4a22', surface: '#8a6a2a', hazard: '#ffc832', hazardName: 'geleia' },
    prisao_ambar: { dirt: '#6a4a1e', rock: '#8a6a2a', surface: '#a8832a', hazard: '#ffae1e', hazardName: 'seiva' },
    nucleo_primordial: { dirt: '#2a1a2a', rock: '#4a3a4a', surface: '#5a3a3a', hazard: '#fff3b0', hazardName: 'arena' }
};

function drawTile(w, h, base, kind, seed, hazard) {
    const s = new Surface(w, h);
    const rnd = s.noise(seed);
    // Dead Cells: 5 tons com rampa densa + dithering + outline preto
    const r = ramp(base, 5);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const n = rnd();
            // dithering: mistura tons adjacentes para textura pintada
            let idx = n < 0.45 ? 0 : n < 0.70 ? 1 : n < 0.85 ? 2 : n < 0.95 ? 3 : 4;
            // variação de xorshift para evitar padrão
            if(((x*3+y*7)%5===0) && idx>0 && rnd()<0.15) idx--;
            let c = r[idx];
            // profundidade do grid: bordas escuras + bevel interno
            if (x === 0 || y === 0) c = shade(c, -0.32);
            else if (x===1 || y===1) c = shade(c, -0.12);
            if (x === w - 1 || y === h - 1) c = shade(c, -0.18);
            else if (x===w-2 || y===h-2) c = shade(c, 0.08);
            s.px(x, y, c);
        }
    }
    if (kind === 'dirt' || kind === 'dirt_alt') {
        // Dead Cells: terra com seixos facetados, raízes finas e fenda
        for (let i = 0; i < 5; i++) {
            const x = 2 + Math.floor(rnd() * (w - 4));
            const y = 2 + Math.floor(rnd() * (h - 4));
            const peb = shade(base, -0.38);
            s.ellipse(x, y, 1.4, 1.1, peb, { outline: false, rim: false });
            // highlight seixo topo-esquerda
            s.px(x-1, y-1, shade(base, 0.22));
            s.px(x, y+1, shade(base, -0.55));
        }
        // raízes / rachaduras finas
        for(let i=0;i<2;i++){
            const x0=1+Math.floor(rnd()*(w-2)), y0=1+Math.floor(rnd()*(h-2));
            s.line(x0,y0, x0+ (rnd()>0.5?2:-2), y0+ (rnd()>0.5?2:-2), shade(base,-0.55));
        }
        if (kind === 'dirt_alt') {
            // veio mineral horizontal (Dead Cells: linha de sedimento)
            s.line(1, h - 4, w - 2, h - 4, shade(base, -0.48));
            s.line(1, h - 5, w - 2, h - 5, shade(base, 0.14));
        }
    } else if (kind === 'tunnel') {
        // túnel escavado: mais escuro, marcas de mandíbula e cascalho solto
        s.recolor((p) => mix(p, '#0d0604', 0.58));
        // marcas de escavação (3 riscos curvos)
        for (let i = 0; i < 4; i++) {
            const x = 2 + Math.floor(rnd() * (w - 4));
            const y = 2 + Math.floor(rnd() * (h - 4));
            s.px(x, y, shade(base, 0.08));
            s.px(x+1, y+1, shade(base, -0.22));
        }
        // cascalho solto 2px
        for(let i=0;i<3;i++){
            const x=1+Math.floor(rnd()*(w-2)), y=1+Math.floor(rnd()*(h-2));
            s.px(x,y, shade(base,0.18));
        }
        // sombra de borda superior (teto do túnel) e luz inferior
        for (let x = 0; x < w; x++) {
            s.px(x, 0, [0,0,0,110]);
            s.px(x, 1, [0,0,0,55]);
            s.px(x, h - 1, [0,0,0,70]);
        }
    } else if (kind === 'rock') {
        // rocha Dead Cells: 3 facetas com luz topo-esquerda + rachadura central + musgo opcional
        for (let i = 0; i < 2; i++) {
            const cx = 4 + Math.floor(rnd() * (w - 8));
            const cy = 4 + Math.floor(rnd() * (h - 8));
            const sz=2.6+rnd()*0.8;
            // faceta base
            s.poly([[cx, cy - sz],[cx+sz, cy],[cx, cy+sz],[cx-sz, cy]], shade(base, 0.22));
            // luz topo-esquerda
            s.line(cx - sz, cy, cx, cy - sz, shade(base, 0.48));
            s.line(cx, cy - sz, cx+sz, cy, shade(base, 0.12));
            // sombra inferior-direita
            s.line(cx+sz, cy, cx, cy+sz, shade(base, -0.32));
            s.line(cx, cy+sz, cx-sz, cy, shade(base, -0.18));
            // rachadura fina
            s.line(cx-1, cy-1, cx+1, cy+1, shade(base,-0.42));
        }
        // borda rochosa escura (outline interno)
        s.rect(0,0,w,1, shade(base,-0.45));
        s.rect(0,0,1,h, shade(base,-0.45));
    } else if (kind === 'surface' || kind === 'surface_alt') {
        // superfície Dead Cells: grama com lâminas individuais + terra exposta
        for (let x = 0; x < w; x++) {
            const gh = 2 + Math.floor(rnd() * 3);
            for (let y = 0; y < gh; y++) {
                const blade = (x%2===0)? shade(base, 0.32 - y*0.14) : shade(base, 0.24 - y*0.10);
                s.px(x, y, blade);
                if(y===0 && rnd()<0.35) s.px(x, y-0.5, '#fff6b0'); // ponta iluminada
            }
            // talo escuro entre lâminas
            if(x%3===0) s.px(x, gh, shade(base,-0.22));
        }
        if (kind === 'surface_alt') {
            // touceira / pedra exposta
            s.ellipse(w/2, h/2+1, 2.6,1.6, shade(base,-0.32), {outline:false, rim:false});
            s.ellipse(w/2-0.5, h/2+0.5, 1.2,0.8, shade(base,0.18), {outline:false, rim:false});
        }
    } else if (kind === 'hazard' || kind === 'hazard_alt') {
        // hazard Dead Cells: base com veias neon + pulsação + partículas
        s.recolor((p) => mix(p, hazard, 0.48));
        // veias orgânicas
        for(let i=0;i<4;i++){
            const x=Math.floor(rnd()*w), y=Math.floor(rnd()*h);
            s.line(x,y, x+ (rnd()>0.5?2:-2), y+ (rnd()>0.5?1:-1), hazard);
            s.px(x, y-1, shade(hazard,0.45));
            s.px(x, y+1, shade(hazard,-0.25));
        }
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(rnd() * w);
            const y = Math.floor(rnd() * h);
            s.px(x, y, hazard);
            s.px(x, y - 1, shade(hazard, 0.52));
            s.px(x, y + 1, shade(hazard, -0.32));
        }
        // brilho central
        s.px(w/2, h/2, '#ffffff');
        if (kind === 'hazard_alt') {
            s.line(0, h - 2, w - 1, h - 3, shade(hazard, -0.34));
            s.line(0, h - 3, w - 1, h - 4, [255,255,255,22]);
        }
    }
    // outline preto final estilo Dead Cells (1px borda escura já acima, reforça cantos)
    s.px(0,0, shade(base,-0.55));
    return s;
}

const TILE_FRAMES = ['dirt', 'dirt_alt', 'tunnel', 'rock', 'surface', 'surface_alt', 'hazard', 'hazard_alt'];
for (const [biomeId, art] of Object.entries(BIOME_ART)) {
    const sheet = spriteSheet(16, 16, TILE_FRAMES.length, (i, w, h) => {
        const kind = TILE_FRAMES[i];
        const base = kind.startsWith('dirt') || kind === 'tunnel' ? art.dirt : kind === 'rock' ? art.rock : art.surface;
        const seed = (biomeId.charCodeAt(0) * 7919 + i * 104729) % 2147483647;
        return drawTile(w, h, base, kind, seed, art.hazard);
    });
    const rel = `assets/tilesets/tiles_${biomeId}.png`;
    writePNG(path.join(ROOT, rel), sheet);
    register(`tiles_${biomeId}`, rel, 16, 16, TILE_FRAMES.length, {
        tiles: { dirt: 0, dirt_alt: 1, tunnel: 2, rock: 3, surface: 4, surface_alt: 5, hazard: 6, hazard_alt: 7 }
    });
}

/* ========================================================================== *
 * 5. PROPS (salas, recursos, decoração)
 * ========================================================================== */
console.log('[gen:art] props...');
const PROPS = {
    nursery: (s) => {
        s.rect(1, 3, 14, 10, '#3a2a1c');
        for (let i = 0; i < 6; i++) {
            const x = 3 + (i % 3) * 4;
            const y = 5 + Math.floor(i / 3) * 4;
            s.ellipse(x, y, 1.8, 1.4, '#f2ecd8', { outline: true, rim: true });
        }
    },
    pantry: (s) => {
        s.rect(1, 4, 14, 9, '#2f2318');
        for (let i = 0; i < 5; i++) {
            const x = 3 + (i % 3) * 4;
            const y = 6 + Math.floor(i / 3) * 4;
            s.ellipse(x, y, 2.2, 1.5, i % 2 ? '#5aa832' : '#3f8a2a', { outline: true });
            s.line(x - 2, y, x + 2, y, '#2a5a1c');
        }
    },
    defense: (s) => {
        s.rect(1, 3, 14, 10, '#3b3a34');
        for (let y = 3; y < 13; y += 3) {
            s.rect(1, y, 14, 2, '#5c6470');
            s.rect(1, y + 2, 14, 1, '#2a2e34');
        }
        s.rect(6, 5, 4, 6, '#7d8794');
    },
    fungus: (s) => {
        s.rect(1, 9, 14, 4, '#2a2318');
        const cols = [
            [4, '#3ce0ff'],
            [8, '#b44ad2'],
            [12, '#3ce0ff']
        ];
        for (const [x, c] of cols) {
            s.rect(x, 8, 1, 4, '#cfc4a8');
            s.ellipse(x, 7, 2.4, 1.8, c, { outline: true });
            s.px(x, 5, shade(c, 0.6));
        }
    },
    trap: (s) => {
        s.rect(0, 0, 16, 16, '#2a1f12');
        for (let y = 0; y < 16; y++)
            for (let x = 0; x < 16; x++) if ((x + y) % 5 === 0) s.px(x, y, '#c8912a');
        s.ellipse(8, 8, 5, 4, '#e0a832', { outline: false, rim: false });
        s.ellipse(8, 8, 3, 2, '#ffcf5a', { outline: false, rim: false });
        for (const [px, py] of [
            [2, 2],
            [13, 3],
            [3, 13],
            [12, 12]
        ]) {
            s.line(px, py, px + 1, py - 2, '#e8e0c8');
        }
    },
    dais: (s) => {
        s.ellipse(8, 9, 7, 5, '#4a2f5a', { outline: true });
        s.ellipse(8, 8, 5, 3.4, '#6b3f8a', { outline: false, rim: false });
        for (let i = 0; i < 5; i++) s.px(3 + i * 2.5, 5, '#ffd34d');
    },
    anthill: (s) => {
        s.ellipse(8, 11, 7, 4.5, '#5c4029', { outline: true });
        s.ellipse(8, 10, 4, 2.4, '#3a2a1c', { outline: false, rim: false });
        s.ellipse(8, 10, 2.4, 1.6, '#0d0806', { outline: false, rim: false });
        for (let i = 0; i < 6; i++) s.px(3 + i * 2, 8 + (i % 2), '#6b4c30');
    },
    leaf_node: (s) => {
        s.ellipse(8, 8, 5.5, 4, '#4aa832', { outline: true });
        s.line(3, 10, 13, 6, '#2a6a1c');
        s.line(6, 5, 10, 11, '#2a6a1c');
        s.px(11, 6, '#8fe05a');
        // "carne de inseto" misturada (Art Bible Grupo 1 item 2)
        s.ellipse(11, 11, 2, 1.4, '#c86a4a', { outline: true });
    },
    jelly_node: (s) => {
        s.poly(
            [
                [8, 2],
                [11, 8],
                [8, 14],
                [5, 8]
            ],
            '#ffc832'
        );
        s.px(7, 6, '#fff3b0');
        s.px(8, 5, '#fff9dc');
    },
    egg: (s) => {
        s.ellipse(8, 8, 3, 4, '#f2ecd8', { outline: true });
        s.px(7, 6, '#ffffff');
    },
    cocoon: (s) => {
        s.ellipse(8, 9, 5, 6, '#6b5a3a', { outline: true });
        for (let y = 4; y < 15; y += 2) s.line(4, y, 12, y, shade('#6b5a3a', -0.35));
        s.px(8, 5, '#c8b48a');
    },
    stump: (s) => {
        s.ellipse(8, 10, 6, 4, '#5a4a32', { outline: true });
        s.ellipse(8, 8, 5, 3, '#7a6a4a', { outline: false, rim: false });
        s.ellipse(8, 8, 2.5, 1.5, '#4a3a28', { outline: false, rim: false });
    },
    rock_deco: (s) => {
        s.poly(
            [
                [3, 13],
                [5, 5],
                [10, 4],
                [13, 12]
            ],
            '#6b6455'
        );
        s.line(5, 5, 10, 4, '#8a8478');
        s.px(7, 8, '#4a4238');
    },
    mushroom_deco: (s) => {
        s.rect(7, 9, 2, 5, '#cfc4a8');
        s.ellipse(8, 8, 4.5, 3, '#b44ad2', { outline: true });
        s.px(6, 7, '#e08aff');
        s.px(10, 8, '#e08aff');
    },
    web: (s) => {
        for (let i = 0; i < 16; i++) {
            s.px(i, i, 'rgba(232,232,240,180)');
            s.px(i, 15 - i, 'rgba(232,232,240,180)');
        }
        s.ellipse(8, 8, 6, 6, 'rgba(232,232,240,60)', { outline: false, rim: false });
    },
    crystal: (s) => {
        s.poly(
            [
                [8, 1],
                [12, 7],
                [8, 15],
                [4, 7]
            ],
            '#7ad2ff'
        );
        s.line(8, 1, 8, 15, '#dff6ff');
        s.px(6, 6, '#ffffff');
    }
};
{
    const keys = Object.keys(PROPS);
    const sheet = spriteSheet(16, 16, keys.length, (i, w, h) => {
        const s = new Surface(w, h);
        PROPS[keys[i]](s);
        return s;
    });
    const rel = 'assets/sprites/props.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles = {};
    keys.forEach((k, i) => (tiles[k] = i));
    register('props', rel, 16, 16, keys.length, { tiles });
}

/* ========================================================================== *
 * 6. ÍCONES DE UI (16x16)
 * ========================================================================== */
console.log('[gen:art] ícones...');
const ICONS = {
    leaf: (s) => {
        s.ellipse(8, 8, 5.5, 4, '#6abf3a', { outline: true });
        s.line(3, 10, 13, 6, '#2a6a1c');
        s.px(11, 6, '#b6ff5a');
    },
    jelly: (s) => {
        s.poly(
            [
                [8, 2],
                [11, 8],
                [8, 14],
                [5, 8]
            ],
            '#ffc832'
        );
        s.px(7, 6, '#fff3b0');
    },
    heart: (s) => {
        s.ellipse(6, 6, 3, 3, '#e03a3a', { outline: false, rim: false });
        s.ellipse(10, 6, 3, 3, '#e03a3a', { outline: false, rim: false });
        s.poly(
            [
                [3, 7],
                [13, 7],
                [8, 14]
            ],
            '#e03a3a'
        );
        s.px(6, 5, '#ff9a9a');
    },
    dig: (s) => {
        s.line(4, 12, 11, 5, '#8a6a3a');
        s.poly(
            [
                [9, 3],
                [14, 5],
                [12, 8],
                [8, 6]
            ],
            '#c8c8d8'
        );
        s.px(10, 4, '#ffffff');
    },
    build: (s) => {
        s.rect(2, 6, 12, 8, '#5c4029');
        s.rect(2, 6, 12, 1, '#7a5a38');
        s.poly(
            [
                [1, 6],
                [8, 1],
                [15, 6]
            ],
            '#8a6a3a'
        );
        s.rect(6, 9, 4, 5, '#2a1f12');
    },
    cancel: (s) => {
        s.line(4, 4, 12, 12, '#e05a3a');
        s.line(12, 4, 4, 12, '#e05a3a');
        s.line(5, 4, 13, 12, '#e05a3a');
        s.line(12, 5, 4, 13, '#e05a3a');
    },
    pheromone_collect: (s) => {
        s.ellipse(8, 8, 4, 4, 'rgba(106,191,58,150)', { outline: false, rim: false });
        s.ellipse(8, 8, 6.5, 6.5, 'rgba(106,191,58,80)', { outline: false, rim: false });
        s.px(8, 8, '#b6ff5a');
    },
    pheromone_attack: (s) => {
        s.ellipse(8, 8, 4, 4, 'rgba(224,58,58,150)', { outline: false, rim: false });
        s.ellipse(8, 8, 6.5, 6.5, 'rgba(224,58,58,80)', { outline: false, rim: false });
        s.px(8, 8, '#ff8a6a');
    },
    pheromone_move: (s) => {
        s.ellipse(8, 8, 4, 4, 'rgba(122,210,255,150)', { outline: false, rim: false });
        s.ellipse(8, 8, 6.5, 6.5, 'rgba(122,210,255,80)', { outline: false, rim: false });
        s.px(8, 8, '#dff6ff');
    },
    pheromone_retreat: (s) => {
        s.ellipse(8, 8, 4, 4, 'rgba(200,200,220,150)', { outline: false, rim: false });
        s.poly(
            [
                [11, 4],
                [5, 8],
                [11, 12]
            ],
            '#e8e8f0'
        );
    },
    gear: (s) => {
        s.ellipse(8, 8, 5, 5, '#8a8478', { outline: true, rim: false });
        s.ellipse(8, 8, 2, 2, '#2a2418', { outline: false, rim: false });
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            s.px(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, '#c8c0a8');
        }
    },
    pause: (s) => {
        s.rect(5, 4, 2, 8, '#e8d9b5');
        s.rect(9, 4, 2, 8, '#e8d9b5');
    },
    back: (s) => {
        s.poly(
            [
                [10, 3],
                [4, 8],
                [10, 13]
            ],
            '#e8d9b5'
        );
    },
    skull: (s) => {
        s.ellipse(8, 7, 4.5, 4, '#e8e0c8', { outline: true });
        s.rect(6, 10, 4, 3, '#cfc4a8');
        s.px(6, 6, '#1a1410');
        s.px(10, 6, '#1a1410');
    },
    gene: (s) => {
        for (let y = 2; y < 15; y++) {
            const x = 8 + Math.sin(y * 0.7) * 3.4;
            s.px(x, y, '#b44ad2');
            s.px(16 - x, y, '#3ce0ff');
            if (y % 3 === 0) s.line(x, y, 16 - x, y, 'rgba(200,200,220,120)');
        }
    },
    route: (s) => {
        for (const [x, y] of [
            [3, 12],
            [8, 8],
            [13, 4]
        ])
            s.ellipse(x, y, 2, 2, '#c8ff5a', { outline: true });
        s.line(3, 12, 8, 8, '#6d5a41');
        s.line(8, 8, 13, 4, '#6d5a41');
    },
    ant: (s) => {
        const mini = drawAnt({ frame: 16, palette: '#c8a05a', abdomenR: 2.4, headR: 1.8, mandible: 1.4, bodyLen: 4, phase: 0 });
        s.blit(mini, 0, 0);
    },
    egg_icon: (s) => {
        s.ellipse(8, 8, 3, 4, '#f2ecd8', { outline: true });
        s.px(7, 6, '#ffffff');
    },
    shield: (s) => {
        s.poly(
            [
                [3, 3],
                [13, 3],
                [13, 9],
                [8, 14],
                [3, 9]
            ],
            '#5c6470'
        );
        s.poly(
            [
                [5, 5],
                [11, 5],
                [11, 8],
                [8, 12],
                [5, 8]
            ],
            '#7d8794'
        );
    },
    fungus_icon: (s) => {
        s.rect(7, 9, 2, 5, '#cfc4a8');
        s.ellipse(8, 8, 4.5, 3, '#3ce0ff', { outline: true });
        s.px(8, 6, '#dff6ff');
    },
    acid: (s) => {
        s.ellipse(8, 9, 4, 4, '#b6ff3c', { outline: true });
        s.px(8, 4, '#e0ff9a');
        s.px(6, 5, '#b6ff3c');
    },
    poison: (s) => {
        s.ellipse(8, 9, 4.5, 4, '#8fbf2a', { outline: true });
        s.px(8, 3, '#c8ff5a');
        s.line(8, 4, 8, 6, '#8fbf2a');
    },
    eye: (s) => {
        s.ellipse(8, 8, 6, 3.4, '#e8e0c8', { outline: true, rim: false });
        s.ellipse(8, 8, 2.4, 2.4, '#5a2a6b', { outline: false, rim: false });
        s.px(8, 8, '#120a12');
    },
    crown: (s) => {
        s.poly(
            [
                [2, 12],
                [14, 12],
                [13, 6],
                [10, 9],
                [8, 4],
                [6, 9],
                [3, 6]
            ],
            '#ffd34d'
        );
        s.rect(2, 12, 12, 2, '#c8a020');
    },
    wave: (s) => {
        for (let x = 1; x < 15; x++) {
            s.px(x, 8 + Math.round(Math.sin(x * 0.8) * 3), '#e05a3a');
        }
    },
    speed: (s) => {
        for (let i = 0; i < 3; i++) {
            s.line(2, 4 + i * 4, 9, 4 + i * 4, '#c8ff5a');
            s.line(9, 4 + i * 4, 6, 6 + i * 4, '#c8ff5a');
        }
    },
    hp: (s) => {
        s.rect(3, 7, 10, 3, '#e03a3a');
        s.rect(7, 3, 3, 11, '#e03a3a');
    }
};
{
    const keys = Object.keys(ICONS);
    const sheet = spriteSheet(16, 16, keys.length, (i, w, h) => {
        const s = new Surface(w, h);
        ICONS[keys[i]](s);
        return s;
    });
    const rel = 'assets/ui/icons.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles = {};
    keys.forEach((k, i) => (tiles[k] = i));
    register('ui_icons', rel, 16, 16, keys.length, { tiles });
}

/* ========================================================================== *
 * 7. PAINEL 9-SLICE (âmbar + lama + quitina) — Estética §5
 * ========================================================================== */
console.log('[gen:art] UI 9-slice...');
{
    const S = 48;
    const s = new Surface(S, S);
    const mud = '#3b2a1a';
    const amber = '#8a5f22';
    const chitin = '#241a10';
    // miolo
    for (let y = 12; y < S - 12; y++) {
        for (let x = 12; x < S - 12; x++) {
            const n = ((x * 7 + y * 13) % 11) / 11;
            s.px(x, y, mix(chitin, mud, 0.35 + n * 0.25));
        }
    }
    // bordas de âmbar
    const edge = (x, y) => {
        const onEdge = x < 12 || y < 12 || x >= S - 12 || y >= S - 12;
        if (!onEdge) return;
        const corner = (x < 12 && y < 12) || (x >= S - 12 && y < 12) || (x < 12 && y >= S - 12) || (x >= S - 12 && y >= S - 12);
        const t = ((x * 5 + y * 3) % 9) / 9;
        let c = mix(amber, mud, 0.25 + t * 0.35);
        if (corner) c = mix(c, '#c8912a', 0.35);
        if (x === 0 || y === 0) c = shade(c, -0.45);
        if (x === S - 1 || y === S - 1) c = shade(c, -0.6);
        s.px(x, y, c);
    };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) edge(x, y);
    // "dentes" de quitina na transição borda/miolo
    for (let i = 12; i < S - 12; i += 4) {
        s.px(i, 12, shade(amber, -0.35));
        s.px(i, S - 13, shade(amber, -0.35));
        s.px(12, i, shade(amber, -0.35));
        s.px(S - 13, i, shade(amber, -0.35));
    }
    writePNG(path.join(ROOT, 'assets/ui/panel.png'), s);
    register('ui_panel', 'assets/ui/panel.png', S, S, 1, { nineSlice: { left: 12, right: 12, top: 12, bottom: 12 } });
}

/* ========================================================================== *
 * 8. MOLDURAS DE CARTA DE MUTAÇÃO (1 por raridade)
 * ========================================================================== */
console.log('[gen:art] cartas...');
{
    const W = 96;
    const H = 128;
    const RARITIES = [
        ['comum', '#e8e8e8'],
        ['incomum', '#5ad25a'],
        ['rara', '#3c9aff'],
        ['epica', '#b44ad2'],
        ['lendario', '#ffc832'],
        ['mitica', '#e03a3a'],
        ['cosmica', '#6a4ad2'],
        ['deus', '#ffffff']
    ];
    const sheet = new Surface(W, H * RARITIES.length);
    RARITIES.forEach(([id, color], idx) => {
        const s = new Surface(W, H);
        // fundo orgânico
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++) {
                const n = ((x * 11 + y * 7) % 13) / 13;
                s.px(x, y, mix('#1a120c', '#2c2018', n * 0.8));
            }
        // moldura
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++) {
                const border = x < 6 || y < 6 || x >= W - 6 || y >= H - 6;
                if (!border) continue;
                const t = ((x * 3 + y * 5) % 7) / 7;
                s.px(x, y, mix(color, '#120c08', 0.25 + t * 0.3));
            }
        // "veias" de DNA
        for (let y = 8; y < H - 8; y++) {
            const x = W / 2 + Math.sin(y * 0.22) * 10;
            s.px(x, y, mix(color, '#000000', 0.55));
            s.px(W - x, y, mix(color, '#000000', 0.7));
        }
        // janela central para o ícone
        s.rect(16, 20, W - 32, 56, 'rgba(10,6,4,220)');
        for (let x = 16; x < W - 16; x++) {
            s.px(x, 20, color);
            s.px(x, 75, color);
        }
        s.rect(16, 86, W - 32, 30, 'rgba(10,6,4,180)');
        sheet.blit(s, 0, idx * H);
    });
    const rel = 'assets/ui/mutation_cards.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles = {};
    RARITIES.forEach(([id], i) => (tiles[id] = i));
    register('mutation_cards', rel, W, H, RARITIES.length, { tiles, rarities: RARITIES.map((r) => r[0]) });
}

/* ========================================================================== *
 * 9. FUNTE BITMAP 5x7 (tipografia "mandíbula")
 * ========================================================================== */
console.log('[gen:art] fonte bitmap...');
{
    // glifos 5x7 — traços angulares, sem serifas arredondadas
    const G = {
        A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
        C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
        D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
        G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
        H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
        I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
        J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
        K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
        L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
        M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
        N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
        P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
        Q: ['01110', '10001', '10001', '10001', '10101', '10011', '01101'],
        R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
        S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
        V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
        W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
        X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
        Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
        Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
        0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
        1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
        2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
        3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
        4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
        5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
        6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
        7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
        8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
        9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
        ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
        '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
        ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
        ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
        '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
        '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
        '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
        '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
        '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
        '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
        '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
        ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
        '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
        '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
        '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
        'ª': ['01110', '00001', '01111', '10001', '01111', '00000', '00000']
    };

    const GLYPH_W = 5;
    const GLYPH_H = 7;
    const ADVANCE = 6;
    const PAD = 1;
    const keys = Object.keys(G);
    const perRow = 16;
    const rows = Math.ceil(keys.length / perRow);
    const sheetW = perRow * (GLYPH_W + PAD);
    const sheetH = rows * (GLYPH_H + PAD);
    const sheet = new Surface(sheetW, sheetH, [0, 0, 0, 0]);

    const chars = [];
    keys.forEach((k, i) => {
        const gx = (i % perRow) * (GLYPH_W + PAD);
        const gy = Math.floor(i / perRow) * (GLYPH_H + PAD);
        const rowsDef = G[k];
        for (let y = 0; y < GLYPH_H; y++) {
            for (let x = 0; x < GLYPH_W; x++) {
                if (rowsDef[y][x] === '1') {
                    // shading: topo mais claro, base mais escura (letra "de osso")
                    const c = ramp('#f0e6c8', 3)[y < 3 ? 2 : y < 5 ? 1 : 0];
                    sheet.px(gx + x, gy + y, c);
                }
            }
        }
        chars.push({
            id: k.charCodeAt(0),
            x: gx,
            y: gy,
            width: GLYPH_W,
            height: GLYPH_H,
            xoffset: 0,
            yoffset: 0,
            xadvance: k === ' ' ? ADVANCE - 1 : ADVANCE
        });
    });

    writePNG(path.join(ROOT, 'assets/fonts/fumiga.png'), sheet);
    const xml = bitmapFontXML({
        fontName: 'fumiga',
        size: 7,
        chars,
        lineHeight: GLYPH_H + 2,
        base: GLYPH_H,
        pages: ['fumiga.png'],
        scaleW: sheetW,
        scaleH: sheetH
    });
    writeFileSync(path.join(ROOT, 'assets/fonts/fumiga.xml'), xml);
    manifest.font_fumiga = { file: 'assets/fonts/fumiga.xml', type: 'bitmapFont', texture: 'assets/fonts/fumiga.png' };
}

/* ========================================================================== *
 * 10. PROJÉTEIS
 * ========================================================================== */
{
    const sheet = spriteSheet(8, 8, 4, (i) => {
        const s = new Surface(8, 8);
        s.ellipse(4, 4, 3 - (i % 2) * 0.4, 3 - (i % 2) * 0.4, '#b6ff3c', { outline: true });
        s.px(3, 3, '#f0ffd0');
        return s;
    });
    writePNG(path.join(ROOT, 'assets/sprites/projectile_acid.png'), sheet);
    register('projectile_acid', 'assets/sprites/projectile_acid.png', 8, 8, 4, { anims: { fly: [0, 1, 2, 3] } });
}

/* ========================================================================== *
 * 10b. SPRITES DE FUNDO — Dead Cells gótico rico (pintura à mão, luz volumétrica)
 * ========================================================================== */
console.log('[gen:art] backgrounds — Dead Cells gótico...');
{
// Castelo gótico detalhado — 128x96 — Dead Cells: tons desaturados, tijolos, luz quente nas janelas, silhueta com volume
    const W=128,H=96;
    const s = new Surface(W,H);
    const rnd = s.noise(777);
    // montanha/volume com shading vertical + textura rochosa
    s.poly([[0,H],[64,16],[W,H]], '#1a0a2a');
    // textura rochosa sutil na montanha (sombra + highlight + ruído)
    for(let y=16;y<H;y++){
        for(let x=0;x<W;x++){
            // verifica se pixel está dentro do poly (aprox. por scan — já pintado) — só modula onde já é escuro
            const idx=(y*W+x)*4;
            if(s.data[idx+3]===0) continue;
            const n=rnd();
            if(n<0.04) s.px(x,y, shade('#1a0a2a', 0.22));
            if(n>0.96) s.px(x,y, shade('#1a0a2a', -0.35));
        }
    }
    // highlight na crista (luz lateral esquerda)
    for(let y=16;y<H;y++){
        const t=(H-y)/(H-16);
        if(t>0.6) s.px(64+(Math.sin(y*0.2)*2), y, mix('#1a0a2a','#3a2a5a', t*0.25));
    }
    // torres com volume (rectShaded) + tijolos + ameias
    function drawTower(x,y,w,h, base){
        const tower = new Surface(w,h);
        // corpo com gradiente vertical (luz vinda de cima-esquerda, Dead Cells)
        const rr=ramp(base,5);
        for(let j=0;j<h;j++){
            const t=j/h;
            const c=rr[Math.floor((1-t)* (rr.length-1))];
            for(let i=0;i<w;i++) tower.px(i,j, c);
        }
        // tijolos: argamassa escura
        for(let j=2;j<h-2;j+=4){
            for(let i=0;i<w;i++) tower.px(i,j, shade(base,-0.55));
            const offset=(Math.floor(j/4)%2)*3;
            for(let i=offset;i<w;i+=6) for(let k=0;k<2;k++) tower.px(i+k,j+1, shade(base,-0.55));
        }
        // sombra lateral direita (volume)
        for(let j=0;j<h;j++) for(let i=w-3;i<w;i++) tower.px(i,j, shade(base,-0.45));
        // highlight borda esquerda
        for(let j=0;j<h;j++) tower.px(0,j, shade(base,0.18));
        s.blit(tower,x,y);
        // ameias no topo (Dead Cells gótico)
        for(let i=0;i<w;i+=4){
            s.rect(x+i, y-3, 2,3, shade(base,0.15));
            s.rect(x+i, y-3, 2,1, shade(base,0.35));
        }
    }
    drawTower(46,24,14,72,'#2a1a3a');
    drawTower(70,16,18,80,'#2e1e40');
    drawTower(56,36,12,60,'#241a32');
    // ponte de pedra com arco
    s.poly([[56,60],[72,56],[72,64]], '#2a1e35');
    s.poly([[58,60],[70,57],[70,62]], '#1a0f22'); // sombra arco
    for(let x=58;x<70;x+=2) s.px(x,60, shade('#2a1e35',0.2)); // tabuleiro claro
    // janelas com luz quente volumétrica + cruz + brilho externo (Dead Cells)
    function win(x,y,w,h){
        // vidro quente
        s.rect(x,y,w,h,'#ffd54a');
        // cruz de pedra
        s.rect(x+w/2-1, y,2,h,'#1a0a2a');
        s.rect(x, y+h/2-1,w,2,'#1a0a2a');
        // brilho interno
        s.rect(x+1,y+1, w-2,1, '#fff3b0');
        s.rect(x+1,y+1,1,h-2, '#fff3b0');
        // luz vazando (glow) 1px ao redor
        for(let dy=-1;dy<=h;dy++) for(let dx=-1;dx<=w;dx++){
            if(dx>=0&&dx<w&&dy>=0&&dy<h) continue;
            if(Math.abs(dx)+Math.abs(dy)>2) continue;
            s.px(x+dx,y+dy,[255,213,74,28]);
        }
    }
    win(49,40,4,6);
    win(74,32,4,8);
    win(60,44,3,5);
    // hera/musgo escuro na base das torres
    for(let i=0;i<30;i++){
        const x=46+Math.floor(rnd()*40), y=88+Math.floor(rnd()*8);
        s.px(x,y, '#0f1a0f');
        s.px(x+1,y, '#1a2a1a');
    }
    writePNG(path.join(ROOT, 'assets/sprites/bg_castle.png'), s);
    register('bg_castle', 'assets/sprites/bg_castle.png', W, H, 1);
}
{
    // Água Dead Cells — 128x32 — gradiente profundo + ondas com espuma + reflexo dourado distorcido
    const W=128,H=32;
    const s = new Surface(W,H);
    const rnd=s.noise(333);
    // gradiente vertical profundo (Dead Cells: laranja queimado -> âmbar)
    for(let y=0;y<H;y++){
        const t=y/H;
        const c=mix('#8a3a1a','#ffb82a', 0.15+t*0.85);
        const sc=shade(c, Math.sin(y*0.5)*0.04);
        for(let x=0;x<W;x++) s.px(x,y, sc);
    }
    // textura de ruído sutil na água
    for(let i=0;i<400;i++){
        const x=Math.floor(rnd()*W), y=Math.floor(rnd()*H);
        s.px(x,y, rnd()>0.5? [255,255,255,10] : [0,0,0,18]);
    }
    // ondas horizontais com seno + espuma (3 faixas)
    for(let y=4;y<H;y+=7){
        const off=Math.sin(y*0.4)*6;
        for(let x=0;x<W;x++){
            const wx=x+off+Math.sin(x*0.15+y)*2;
            const a=0.6+Math.sin(x*0.2+y*0.3)*0.4;
            if(((x+y)%14)<2) s.px(Math.round(wx)%W, y, [255,255,255, Math.floor(22*a)]);
            s.px(Math.round(wx)%W, y+1, [255,240,180, Math.floor(14*a)]);
        }
    }
    // linha de espuma no topo (beira)
    s.rect(0,0,W,2, [255,255,255,38]);
    s.rect(0,1,W,1, [255,220,120,22]);
    // reflexo dourado do castelo (distorcido, alfa baixo) — faixa central
    for(let x=0;x<W;x++){
        const rx=64+ (x-64)*0.45 + Math.sin(x*0.08)*3;
        if(rx<0||rx>=W) continue;
        for(let y=2;y<10;y++){
            const a=Math.max(0, 1 - y/10)*0.18;
            s.px(x,y, [255,213,74, Math.floor(a*255* (0.5+rnd()*0.5))]);
        }
    }
    writePNG(path.join(ROOT, 'assets/sprites/bg_water.png'), s);
    register('bg_water', 'assets/sprites/bg_water.png', W, H, 1);
}
{
    // Barco à vela detalhado — 24x16 — casco de madeira com tábuas, vela com sombra e brisa
    const W=24,H=16;
    const s=new Surface(W,H);
    // vela principal com shading (luz esquerda)
    const sail=[[8,8],[12,1],[16,8]];
    s.poly(sail, '#e8e0c8');
    s.poly([[8,8],[12,1],[11,8]], '#ffffff'); // highlight
    s.poly([[11,8],[12,1],[16,8]], shade('#e8e0c8',-0.18)); // sombra direita
    s.line(12,1,12,8, '#8a7a5a'); // mastro
    // segunda vela menor atrás
    s.poly([[14,8],[15,4],[17,8]], '#d8c8a8');
    // casco com tábuas e quilha
    s.rect(5,8,14,6, '#2a1a0f');
    for(let y=9;y<14;y+=2) s.line(5,y,19,y, '#3a2a18'); // tábuas
    s.rect(5,8,14,1, '#5a3a1e'); // borda superior clara
    s.ellipse(12,14,6,2, '#1a0a00', {outline:false, rim:false}); // sombra na água
    // cordas
    s.line(8,8,10,2, '#6a5a4a');
    writePNG(path.join(ROOT, 'assets/sprites/bg_boat.png'), s);
    register('bg_boat', 'assets/sprites/bg_boat.png', W,H,1);
}
{
    // Nuvens volumétricas Dead Cells — 64x32 — 3 massas com sombra/rosto iluminado + back-light laranja
    const W=64,H=32;
    const s=new Surface(W,H);
    function cloud(cx,cy,rx,ry, base){
        const dark=shade(base,-0.45), light=shade(base,0.42), mid=base;
        // sombra embaixo
        s.ellipse(cx,cy+2,rx,ry, dark, {outline:false, rim:false});
        // corpo
        s.ellipse(cx,cy,rx,ry, mid, {outline:false, rim:false});
        // luz topo-esquerda (Dead Cells rim light)
        s.ellipse(cx- rx*0.2, cy- ry*0.25, rx*0.7, ry*0.6, light, {outline:false, rim:false});
        // highlight pontual
        s.ellipse(cx- rx*0.35, cy- ry*0.35, rx*0.25, ry*0.2, '#ffffff', {outline:false, rim:false});
    }
    cloud(16,16,18,12,'#ffd07a');
    cloud(32,12,22,14,'#ffb84a');
    cloud(48,18,14,10,'#ffd07a');
    // neblina baixa alaranjada (atmosfera)
    for(let x=0;x<W;x++) for(let y=H-6;y<H;y++) if((x+y)%3===0) s.px(x,y, [255,180,80,18]);
    writePNG(path.join(ROOT, 'assets/sprites/bg_clouds.png'), s);
    register('bg_clouds', 'assets/sprites/bg_clouds.png', W,H,1);
}
{
    // Lua Dead Cells — 64x64 — disco com gradiente radial, crateras com sombra interna, halo azul-laranja
    const W=64,H=64;
    const s=new Surface(W,H);
    const cx=32,cy=32;
    // halo externo azulado (2 camadas)
    s.ellipse(cx,cy,30,30, [255,246,176,18], {outline:false, rim:false});
    s.ellipse(cx,cy,26,26, [180,200,255,12], {outline:false, rim:false});
    // disco lunar com gradiente radial (centro mais claro, borda mais escura)
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const dx=x-cx, dy=y-cy, d=Math.sqrt(dx*dx+dy*dy);
        if(d>24) continue;
        const t=d/24;
        const base=mix('#fff6b0','#e8d06a', t*0.7);
        const shadeT= -t*0.25 + (dx*-0.02 + dy*-0.02);
        s.px(x,y, shade(base, shadeT));
    }
    // contorno escuro suave (Dead Cells outline)
    for(let a=0;a<360;a+=8){
        const x=Math.round(cx+Math.cos(a*Math.PI/180)*24), y=Math.round(cy+Math.sin(a*Math.PI/180)*24);
        s.px(x,y, shade('#fff6b0',-0.35));
    }
    // crateras com sombra interna e anel claro (pintura à mão)
    function crater(x,y,r, dark=false){
        const col=dark? '#c8b86a' : '#e8d9a0';
        s.ellipse(x,y,r,r, shade(col,-0.35), {outline:false, rim:false}); // sombra
        s.ellipse(x-1,y-1,r*0.85,r*0.85, col, {outline:false, rim:false});
        s.ellipse(x-1,y-1,r*0.45,r*0.35, '#fff8c0', {outline:false, rim:false}); // highlight
    }
    crater(24,26,4);
    crater(36,34,3);
    crater(30,38,2);
    crater(38,24,2.5);
    crater(20,36,1.8);
    writePNG(path.join(ROOT, 'assets/sprites/bg_moon.png'), s);
    register('bg_moon', 'assets/sprites/bg_moon.png', W,H,1);
}
{
    // Pássaros góticos — 32x12 — 6 aves com asas em V, corpo e cabeça, variação de altitude
    const W=32,H=12;
    const s=new Surface(W,H);
    for(let i=0;i<6;i++){
        const x=i*5+2, y=6+(i%2?2:-2);
        const flap=i%3===0?0:1;
        // asas em V com espessura (2px)
        s.line(x,y, x+2, y-2-flap, '#0a0a0f');
        s.line(x+2, y-2-flap, x+4, y, '#0a0a0f');
        s.line(x+0.3,y+0.3, x+2, y-1.7-flap, '#1a1a2a');
        // corpo pontual
        s.px(x+2,y-1, '#1a0a1a');
    }
    writePNG(path.join(ROOT, 'assets/sprites/bg_birds.png'), s);
    register('bg_birds', 'assets/sprites/bg_birds.png', W,H,1);
}
{
    // Partícula Dead Cells — 3x3 com halo sutil
    const s=new Surface(3,3);
    s.rect(0,0,3,3,'#ffffff');
    s.px(1,1,'#fff6b0');
    writePNG(path.join(ROOT, 'assets/sprites/particle.png'), s);
    register('particle', 'assets/sprites/particle.png', 3,3,1);
}
{
    // Glow — 8x8 radial com falloff (Dead Cells: núcleo branco -> amarelo -> transparente)
    const W=8,H=8;
    const s=new Surface(W,H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const dx=x-4, dy=y-4, d=Math.sqrt(dx*dx+dy*dy);
        if(d>4) continue;
        const t=d/4;
        const col=t<0.4? '#ffffff' : t<0.7? '#b6ff3c' : mix('#b6ff3c','#3a5a1a', (t-0.7)/0.3);
        const a=Math.floor((1-t*0.9)*255);
        s.px(x,y, [rgba(col)[0], rgba(col)[1], rgba(col)[2], a]);
    }
    writePNG(path.join(ROOT, 'assets/sprites/glow.png'), s);
    register('glow', 'assets/sprites/glow.png', W,H,1);
}
{
    // Fog brush — 32x32 radial suave para névoa (bordas feathered)
    const W=32,H=32;
    const s=new Surface(W,H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const dx=x-16, dy=y-16, d=Math.sqrt(dx*dx+dy*dy);
        if(d>16) continue;
        const t=d/16;
        const a=Math.floor((1-t)*(1-t)*255); // falloff quadrático
        s.px(x,y, [255,255,255, a]);
    }
    writePNG(path.join(ROOT, 'assets/sprites/fogbrush.png'), s);
    register('fogbrush', 'assets/sprites/fogbrush.png', W,H,1);
}
{
    // Janela gótica com luz volumétrica — 64x64 — pedra com tijolos, arco ogival, vitral ambar, raio de luz com partículas
    const W=64,H=64;
    const s=new Surface(W,H);
    const rnd=s.noise(999);
    // parede de pedra atrás (textura)
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const n=rnd();
        const c=n<0.5? '#2a3a4a' : n<0.8? '#334a5a' : '#1f2a3a';
        s.px(x,y, shade(c, (x%8===0||y%8===0)? -0.18:0));
    }
    // abertura da janela (ogiva)
    s.rect(12,12,40,40,'#0f0a14');
    s.poly([[12,20],[32,8],[52,20],[52,52],[12,52]], '#1a0f1e');
    // luz interna quente com gradiente (volumétrica)
    for(let y=12;y<52;y++) for(let x=12;x<52;x++){
        const dx=Math.abs(x-32), dy=Math.abs(y-30);
        if(dx>18||dy>18) continue;
        const t=(dx+dy)/36;
        const a=Math.floor((1-t)*90 + 20);
        s.px(x,y, [255,213,74, a]);
    }
    // vidro com reflexo
    s.rect(14,14,36,36, [255,240,180,14]);
    // traves de pedra (cruz gótica + arco)
    s.rect(30,8,4,44,'#3a2a1a');
    s.rect(12,30,40,4,'#3a2a1a');
    // arco ogival
    s.poly([[12,20],[32,12],[52,20],[52,24],[32,16],[12,24]], '#3a2a1a');
    // pedras do arco (juntas)
    for(let i=0;i<5;i++){
        const ax=16+i*8;
        s.line(ax,16, ax+2,12, '#5a3a1a');
    }
    // brilho central (sol)
    s.ellipse(32,20,7,7,'#ffd54a', {outline:false, rim:false});
    s.ellipse(32,20,4,4,'#fff6b0', {outline:false, rim:false});
    // poeira no raio de luz (partículas)
    for(let i=0;i<20;i++){
        const x=20+Math.floor(rnd()*24), y=28+Math.floor(rnd()*20);
        s.px(x,y, [255,255,200, 40+Math.floor(rnd()*40)]);
    }
    // moldura externa de pedra com bevel
    s.rect(10,10,44,2, shade('#3a2a1a',0.25));
    s.rect(10,52,44,2, shade('#3a2a1a',-0.4));
    s.rect(10,10,2,44, shade('#3a2a1a',0.15));
    s.rect(52,10,2,44, shade('#3a2a1a',-0.35));
    writePNG(path.join(ROOT, 'assets/sprites/bg_window.png'), s);
    register('bg_window', 'assets/sprites/bg_window.png', W,H,1);
}

/* ========================================================================== *
 * Manifest
 * ========================================================================== */
writeFileSync(path.join(ROOT, 'assets/sprites/manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[gen:art] OK — ${Object.keys(manifest).length} assets em assets/sprites/manifest.json`);
