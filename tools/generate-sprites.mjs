/**
 * tools/generate-sprites.mjs — HÍBRIDO Dead Cells × Castle Crashers [POLIDO MINIMALISTA]
 * ---------------------------------------------------------------------------
 * Reconstrução completa: todos os sprites, placeholders e spritesheets.
 * Direção artística:
 *  - Dead Cells: paleta gótica dessaturada (fundo) vs saturada (personagens),
 *    luz volumétrica topo-esquerda, sombra inferior-direita, bevel sutil.
 *  - Castle Crashers: outline preto ESPESSO 1.8px, formas arredondadas
 *    exageradas (cabeça grande 1.2×, corpo fofo), flat color + 2 tons
 *    (sombra 30% + highlight pontual branco), minimalismo polido — zero ruído,
 *    zero dithering, zero textura aleatória. Cada pixel intencional.
 *
 * Resultado: legível a 16px, bonito em 64px, leve e nítido.
 * Zero dependências, pixel-a-pixel via pixlib.mjs (crisp, sem AA/blur).
 *
 * Uso: npm run gen:art  -> assets/sprites/*.png + manifest.json
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Surface, spriteSheet, writePNG, shade, mix, rgba, bitmapFontXML } from './pixlib.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = {
    sprites: path.join(ROOT, 'assets', 'sprites'),
    tilesets: path.join(ROOT, 'assets', 'tilesets'),
    ui: path.join(ROOT, 'assets', 'ui'),
    fonts: path.join(ROOT, 'assets', 'fonts')
};
for (const d of Object.values(OUT)) mkdirSync(d, { recursive: true });

const manifest = {};
function register(key, relFile, frameWidth, frameHeight, frames, extra = {}) {
    manifest[key] = { file: relFile, frameWidth, frameHeight, frames, ...extra };
}

/* ========================================================================== *
 * HELPERS — Híbrido polido minimalista
 * ========================================================================== */
// Flat minimalista: base + sombra 30% + highlight branco pontual + outline preto espesso
function ccShade(base, t){ return shade(base, t); }
// desenha elipse com fill flat + sombra inferior-direita + highlight topo-esquerda + outline espesso
function ccEllipse(s, cx, cy, rx, ry, base){
    const dark = ccShade(base, -0.28);
    const light = '#ffffff';
    // sombra inferior-direita (1px deslocada)
    s.ellipse(cx+0.6, cy+0.6, rx, ry, dark, {outline:false, rim:false});
    // base flat
    s.ellipse(cx, cy, rx, ry, base, {outline:true, rim:false});
    // highlight pontual topo-esquerda (Castle Crashers)
    s.ellipse(cx - rx*0.32, cy - ry*0.32, rx*0.28, ry*0.22, [255,255,255, 92], {outline:false, rim:false});
    s.px(Math.round(cx - rx*0.35), Math.round(cy - ry*0.38), [255,255,255, 160]);
}

/* ========================================================================== *
 * 1. FORMIGAS — Castle Crashers fofo + Dead Cells gótico
 * ========================================================================== */
function drawAnt(o){
    const {
        frame=20, palette, phase=0, pose='walk',
        abdomenR=3.0, thoraxR=1.9, headR=2.4, mandible=1.9, bodyLen=5, antenna=3.2, extras=[]
    } = o;
    const s = new Surface(frame, frame);
    const cx = frame/2 - 0.5 + (pose==='attack' && phase===1 ? 1 : 0);
    const cy = frame/2 + 0.2;

    // Pernas minimalistas: 2 segmentos grossos + ponta clara (Castle Crashers)
    const legCol = ccShade(palette, -0.42);
    const legHi = ccShade(palette, 0.22);
    for(const side of [-1,1]){
        for(let k=0;k<3;k++){
            const baseX = cx -1.2 + k*1.7;
            const tripod = (k + (side>0?0:1))%2===0 ? 0 : Math.PI;
            const swing = pose==='idle' ? 0 : Math.sin(phase*(Math.PI/2)+tripod)*1.1;
            const kneeX = baseX + swing*0.7;
            const kneeY = cy + side*2.4;
            const footX = baseX + swing*1.3;
            const footY = cy + side*3.9;
            s.thickLine(baseX, cy, kneeX, kneeY, legCol, 2);
            s.px(Math.round((baseX+kneeX)/2), Math.round((cy+kneeY)/2), legHi);
            s.thickLine(kneeX, kneeY, footX, footY, legCol, 2);
            s.px(Math.round(footX), Math.round(footY), '#fff6b0');
        }
    }

    // Abdomen fofo (Castle Crashers) + volumetric Dead Cells
    const abdX = cx - bodyLen*0.70;
    ccEllipse(s, abdX, cy, abdomenR*1.12, abdomenR*0.86, palette);
    // listra minimalista (1 linha escura dupla)
    s.rect(Math.round(abdX+0.2), Math.round(cy-0.6), 1, 1, ccShade(palette,-0.55));
    s.rect(Math.round(abdX+1.6), Math.round(cy-0.6), 1, 1, ccShade(palette,-0.55));

    // Pecíolo minimalista (ponto)
    s.ellipse(cx - bodyLen*0.28, cy, 1.1, 1.1, ccShade(palette,-0.55), {outline:true, rim:false});

    // Tórax compacto fofo
    const thX = cx + bodyLen*0.14;
    ccEllipse(s, thX, cy, thoraxR*1.18, thoraxR*0.98, palette);

    // Cabeça GRANDE fofa Castle Crashers (1.15×)
    const headX = cx + bodyLen*0.62;
    ccEllipse(s, headX, cy, headR*1.12, headR*1.02, palette);

    // Olhos grandes fofos Castle Crashers + bochecha rosada Dead Cells volumetric
    for(const side of [-1,1]){
        const ex = Math.round(headX + headR*0.30), ey = Math.round(cy + side*headR*0.42);
        s.ellipse(ex, ey, 1.75, 1.45, '#0a0a12', {outline:true, rim:false});
        s.ellipse(ex+0.32, ey-0.28, 0.92,0.78, '#ffffff', {outline:false, rim:false});
        s.px(ex+0.55, ey-0.45, '#ff3b30');
        // blush rosado fofo
        s.ellipse(Math.round(headX-0.2), Math.round(cy+side*headR*0.12), 0.9,0.55, [255,140,150, 52], {outline:false});
    }

    // Mandíbulas minimalistas: triângulo flat + ponta clara
    const open = pose==='attack' ? (phase===1?1.6:0.8):0.2;
    for(const side of [-1,1]){
        const tipX = headX + headR + mandible;
        const tipY = cy + side*(1.0+open);
        s.poly([[headX+headR*0.62, cy+side*0.9],[tipX, tipY],[headX+headR*0.92, cy+side*0.15]], ccShade(palette,-0.12));
        s.line(headX+headR*0.62, cy+side*0.9, tipX, tipY, '#0a0a12');
        s.px(Math.round(tipX-0.4), Math.round(tipY-side*0.3), '#ffffff');
    }

    // Antenas finas minimalistas com bolinha ponta
    const wig = pose==='idle' ? (phase%2===0?-0.4:0.4):0;
    for(const side of [-1,1]){
        const ax=headX+headR*0.35, ay=cy+side*headR*0.52;
        const ex=ax+antenna*0.78, ey=ay+side*antenna*0.52+wig;
        const tx=ex+antenna*0.62, ty=ey+side*antenna*0.28;
        s.line(ax,ay, ex,ey, ccShade(palette,-0.45));
        s.line(ex,ey, tx,ty, ccShade(palette,-0.45));
        s.ellipse(tx,ty, 0.9,0.9, '#fff6b0', {outline:true, rim:false});
    }

    for(const fx of extras) fx(s, {cx, cy, headX, palette});
    return s;
}

function antSheet(name, relFile, opts){
    const frame = opts.frame||20;
    const sheet = spriteSheet(frame, frame, 8, (i)=>{
        if(i<4) return drawAnt({...opts, frame, pose:'walk', phase:i});
        if(i<6) return drawAnt({...opts, frame, pose:'idle', phase:i-4});
        return drawAnt({...opts, frame, pose:'attack', phase:i-6});
    });
    writePNG(path.join(ROOT, relFile), sheet);
    register(name, relFile, frame, frame, 8, {anims:{walk:[0,1,2,3], idle:[4,5], attack:[6,7]}});
}
const fxAcid = (c)=>(s,{cx,cy})=> s.ellipse(cx-4.2, cy+0.4, 1.5,1.2, c, {outline:true, rim:false});
const fxArmor = (s,{cx,cy})=> { s.rect(Math.round(cx-1), Math.round(cy-2), 3,1, '#d0d8e8'); s.rect(Math.round(cx-1), Math.round(cy), 3,1, '#8a94a8'); };
const fxGlow = (c)=>(s,{cx,cy})=> s.ellipse(cx-4.6, cy-0.2, 1.0,1.0, c, {outline:false, rim:false});
const fxSpade = (s,{headX,cy})=> s.rect(Math.round(headX+2.2), Math.round(cy-1.4), 2,3, '#c8a86a');

console.log('[gen:art] formigas — CC×DC polido minimalista...');
antSheet('ant_worker', 'assets/sprites/ant_worker.png', {palette:'#b07a2e', abdomenR:2.9, mandible:1.6});
antSheet('ant_collector', 'assets/sprites/ant_collector.png', {palette:'#d4a017', abdomenR:3.15, mandible:1.7});
antSheet('ant_scout', 'assets/sprites/ant_scout.png', {palette:'#5ac8ff', abdomenR:2.55, headR:2.15, antenna:3.8, mandible:1.1});
antSheet('ant_soldier', 'assets/sprites/ant_soldier.png', {palette:'#d6452a', abdomenR:3.35, headR:2.65, mandible:2.6});
antSheet('ant_guardian', 'assets/sprites/ant_guardian.png', {palette:'#8aa0b8', abdomenR:3.5, thoraxR:2.2, mandible:1.7, extras:[fxArmor]});
antSheet('ant_sniper', 'assets/sprites/ant_sniper.png', {palette:'#6abf3a', abdomenR:2.95, mandible:1.2, extras:[fxAcid('#b6ff3c')]});
antSheet('ant_spy', 'assets/sprites/ant_spy.png', {palette:'#8a5fbf', abdomenR:2.7, headR:2.15, antenna:3.6, mandible:1.9});
antSheet('ant_healer', 'assets/sprites/ant_healer.png', {palette:'#f2c6a0', abdomenR:2.95, mandible:1.2, extras:[fxGlow('#fff3b0')]});
antSheet('ant_digger', 'assets/sprites/ant_digger.png', {palette:'#8a6a3a', abdomenR:3.2, headR:2.5, mandible:2.1, extras:[fxSpade]});
antSheet('ant_giant', 'assets/sprites/ant_giant.png', {frame:16, palette:'#5a4a44', abdomenR:3.4, thoraxR:2.3, headR:2.9, mandible:2.9});
antSheet('ant_enemy', 'assets/sprites/ant_enemy.png', {palette:'#c83a2a', abdomenR:3.1, headR:2.45, mandible:2.3});

/* ========================================================================== *
 * 2. RAINHA — fofa imponente minimalista
 * ========================================================================== */
console.log('[gen:art] rainha...');
function drawQueen(phase, {dying=false}={}){
    const F=32, s=new Surface(F,F);
    const cx=13, cy=16+(dying?2:0);
    const pal= dying ? '#8a7a8a' : '#a45fbf';
    const breath = dying?0: Math.sin(phase*(Math.PI/2))*0.5;
    for(const side of [-1,1]) for(let k=0;k<3;k++){
        const bx=cx-3+k*3;
        s.thickLine(bx, cy, bx-0.6+k*0.2, cy+side*4.2, ccShade(pal,-0.45), 2);
    }
    // abdomen fofo com ovos minimalistas (3)
    ccEllipse(s, cx-5.6, cy, 7.8+breath, 6.0+breath*0.5, pal);
    for(let i=0;i<3;i++){
        const ex=cx-9+i*3.2, ey=cy-1+i%2;
        s.ellipse(ex, ey, 1.1,0.9, '#fff6dc', {outline:true, rim:false});
    }
    // tórax + cabeça fofa
    ccEllipse(s, cx+3.2, cy, 3.0,2.5, pal);
    const hx=cx+8.2;
    ccEllipse(s, hx, cy, 3.1,2.9, pal);
    s.ellipse(hx+0.8, cy-1.6, 0.9,0.7, '#0a0a12', {outline:false}); s.ellipse(hx+0.8, cy+1.6, 0.9,0.7, '#0a0a12', {outline:false});
    for(const side of [-1,1]){
        s.poly([[hx+2.2, cy+side*1.1],[hx+5.2, cy+side*1.8],[hx+3.0, cy+side*0.2]], ccShade(pal,-0.18));
    }
    // antenas curtas fofas
    for(const side of [-1,1]){
        s.line(hx+1.2, cy+side*1.8, hx+3.2, cy+side*4.2, ccShade(pal,-0.4));
        s.ellipse(hx+3.2, cy+side*4.2, 0.7,0.7, '#fff6b0', {outline:true});
    }
    // coroa minimalista 3 pontas
    s.poly([[hx-1.6, cy-3.6],[hx, cy-5.6],[hx+1.6, cy-3.6],[hx, cy-2.8]], '#ffd54a');
    s.rect(hx-1.6, cy-3.6, 3.2,0.6, '#0a0a12');
    if(dying) s.recolor(p=> mix(p,'#241016',0.30));
    return s;
}
{
    const sheet=spriteSheet(32,32,6,i=> (i<4?drawQueen(i): i===4?drawQueen(0):drawQueen(0,{dying:true})));
    writePNG(path.join(ROOT,'assets/sprites/queen.png'), sheet);
    register('queen','assets/sprites/queen.png',32,32,6,{anims:{idle:[0,1,2,3], hurt:[4], death:[5]}});
}

/* ========================================================================== *
 * 3. INIMIGOS — chibi ameaçador minimalista
 * ========================================================================== */
console.log('[gen:art] inimigos...');
function drawCentipede(frame,pal,phase,{segments=6,toxic=false}={}){
    const s=new Surface(frame,frame); const cy=frame/2; const segR=Math.max(1.9, frame/9.5);
    for(let i=segments-1;i>=0;i--){
        const x=frame*0.18 + i*(frame*0.64)/(segments-1);
        const wob=Math.sin(phase*(Math.PI/2)+i*0.85)*(frame/20);
        const r=segR*(i===0?1.18:1-i*0.035);
        ccEllipse(s, x, cy+wob, r, r*0.82, i%2?pal:ccShade(pal,-0.14));
        for(const side of [-1,1]){
            s.line(x, cy+wob, x+Math.sin(phase*(Math.PI/2)+i)*1.0, cy+wob+side*(r+1.9), '#0a0a12');
        }
        if(toxic && i%2===0) s.ellipse(x, cy+wob - r*0.7, 0.7,0.7, '#b6ff3c', {outline:false});
    }
    const hx=frame*0.14; ccEllipse(s, hx, cy+Math.sin(phase*(Math.PI/2))*(frame/22), segR*1.12, segR*0.96, ccShade(pal,0.08));
    for(const side of [-1,1]) s.poly([[hx-1.2, cy+side*0.8],[hx-3.0, cy+side*2.0],[hx-0.6, cy+side*0.9]], ccShade(pal,-0.28));
    return s;
}
function drawBeetle(frame,pal,phase,{horn=false,glow=null}={}){
    const s=new Surface(frame,frame); const cx=frame/2+0.6, cy=frame/2;
    for(const side of [-1,1]) for(let k=0;k<3;k++){
        const bx=cx-2.6+k*2.6;
        s.line(bx, cy, bx+Math.sin(phase*(Math.PI/2)+k+(side>0?0:1.2))*0.9, cy+side*(frame/4.8), '#0a0a12');
    }
    ccEllipse(s, cx-0.6, cy, frame/3.1, frame/3.6, pal);
    s.rect(Math.round(cx-0.6), Math.round(cy-frame/3.8), 1, Math.round(frame/1.9), '#0a0a12');
    if(glow) s.ellipse(cx-frame/4.2, cy, frame/9, frame/10, glow, {outline:false});
    const hx=cx+frame/3.3; ccEllipse(s, hx, cy, frame/7, frame/7.8, ccShade(pal,0.06));
    s.ellipse(hx+0.7, cy-0.8, 0.6,0.6, '#0a0a12', {outline:false}); s.ellipse(hx+0.7, cy+0.8, 0.6,0.6, '#0a0a12', {outline:false});
    if(horn) for(const side of [-1,1]){
        s.line(hx+0.8, cy+side*0.4, hx+frame/5, cy+side*frame/8, '#0a0a12');
        s.line(hx+frame/5, cy+side*frame/8, hx+frame/3.8, cy+side*frame/14, ccShade(pal,0.35));
    }
    return s;
}
function drawScorpion(frame,pal,phase){
    const s=new Surface(frame,frame); const cx=frame/2, cy=frame/2+0.6;
    for(const side of [-1,1]) for(let k=0;k<3;k++){
        const bx=cx-2.8+k*2.4;
        s.line(bx, cy, bx+Math.sin(phase+k)*0.8, cy+side*(frame/4.4), '#0a0a12');
    }
    ccEllipse(s, cx-0.8, cy, frame/4.6, frame/5.6, pal);
    let px=cx-frame/4, py=cy;
    for(let i=1;i<=4;i++){
        const nx=px - (frame/16), ny=py - (i===4?frame/9: frame/18) + (i===2? Math.sin(phase+i)*0.5:0);
        s.thickLine(px,py, nx,ny, ccShade(pal,-0.18), 2);
        px=nx; py=ny;
    }
    s.ellipse(px, py, 1.3,1.1, '#fff6b0', {outline:true});
    const hx=cx+frame/4; ccEllipse(s, hx, cy, frame/8.5, frame/9.2, ccShade(pal,0.04));
    for(const side of [-1,1]){
        const o=1+ (phase%2)*0.4;
        s.poly([[hx+0.8, cy+side*0.8],[hx+frame/3.8, cy+side*(1.8+o)],[hx+frame/5, cy+side*0.3]], ccShade(pal,-0.22));
        s.line(hx+0.8, cy+side*0.8, hx+frame/3.8, cy+side*(1.8+o), '#0a0a12');
    }
    return s;
}
function drawFly(frame,pal,phase){
    const s=new Surface(frame,frame); const cx=frame/2, cy=frame/2; const flap=phase%2===0?0:0.7;
    for(const side of [-1,1]) s.ellipse(cx-0.6, cy+side*(1.8+flap), frame/3.6, frame/7.5, [207,233,255, 88], {outline:false});
    ccEllipse(s, cx, cy, frame/4.6, frame/5.4, pal);
    ccEllipse(s, cx-frame/4.2, cy, frame/6.4, frame/7.2, ccShade(pal,-0.22));
    const hx=cx+frame/4.2; ccEllipse(s, hx, cy, frame/6.8, frame/7.4, ccShade(pal,0.10));
    s.ellipse(hx+0.6, cy-0.7, 0.8,0.8, '#ff3b30', {outline:true}); s.ellipse(hx+0.6, cy+0.7, 0.8,0.8, '#ff3b30', {outline:true});
    for(const side of [-1,1]) for(let k=0;k<3;k++) s.line(cx-1.6+k*1.6, cy, cx-1.6+k*1.6, cy+side*2.6, '#0a0a12');
    return s;
}
function drawSpider(frame,pal,phase){
    const s=new Surface(frame,frame); const cx=frame/2+frame/14, cy=frame/2;
    for(const side of [-1,1]) for(let k=0;k<4;k++){
        const baseX=cx-frame/10, baseY=cy+side*1.1;
        const kneeX=baseX - frame/7 + Math.cos(-0.9+k*0.58)*3*side*0.2;
        const kneeY=cy+side*(frame/5.8 + k*0.35)+ Math.sin(phase*(Math.PI/2)+k*1.05)*0.5;
        const footX=kneeX - frame/8; const footY=kneeY+side*frame/9;
        s.line(baseX, baseY, kneeX, kneeY, '#0a0a12');
        s.line(kneeX, kneeY, footX, footY, '#0a0a12');
        s.px(Math.round(footX), Math.round(footY), '#fff6b0');
    }
    ccEllipse(s, cx-frame/5, cy, frame/3.9, frame/4.5, pal);
    s.ellipse(cx-frame/5, cy - frame/14, frame/10, frame/15, [255,255,255, 70], {outline:false});
    ccEllipse(s, cx+frame/9.5, cy, frame/7.4, frame/8.2, ccShade(pal,0.06));
    for(let i=0;i<4;i++) s.ellipse(cx+frame/5 + (i%2)*1.1, cy-1.2+Math.floor(i/2)*1.2, 0.62,0.62, '#ff3b30', {outline:false});
    for(const side of [-1,1]) s.poly([[cx+frame/5, cy+side*0.8],[cx+frame/3.4, cy+side*(1.9+ (phase%2)*0.3)],[cx+frame/5+0.8, cy+side*0.2]], ccShade(pal,-0.32));
    return s;
}
function enemySheet(name, relFile, fw,fh, frames, draw, anims){
    const sheet=spriteSheet(fw,fh,frames,draw);
    writePNG(path.join(ROOT, relFile), sheet);
    register(name, relFile, fw,fh, frames, {anims});
}
enemySheet('enemy_centipede','assets/sprites/enemy_centipede.png',24,24,4,i=>drawCentipede(24,'#b84a2e',i),{walk:[0,1,2,3],attack:[1,3]});
enemySheet('enemy_beetle','assets/sprites/enemy_beetle.png',20,20,4,i=>drawBeetle(20,'#6a5abf',i,{horn:true}),{walk:[0,1,2,3],attack:[1,3]});
enemySheet('enemy_scorpion','assets/sprites/enemy_scorpion.png',20,20,4,i=>drawScorpion(20,'#d4a01a',i),{walk:[0,1,2,3],attack:[1,3]});
enemySheet('enemy_fly','assets/sprites/enemy_fly.png',16,16,2,i=>drawFly(16,'#6a7a4a',i),{walk:[0,1],attack:[0,1]});
enemySheet('enemy_spiderling','assets/sprites/enemy_spiderling.png',12,12,2,i=>drawSpider(12,'#7a5a6e',i),{walk:[0,1],attack:[0,1]});
enemySheet('enemy_moth','assets/sprites/enemy_moth.png',20,20,2,i=>drawFly(20,'#8ac6e8',i),{walk:[0,1],attack:[0,1]});
enemySheet('enemy_termite','assets/sprites/enemy_termite.png',18,18,4,i=>drawCentipede(18,'#c49a3a',i,{segments:4}),{walk:[0,1,2,3],attack:[1,3]});
enemySheet('enemy_plant','assets/sprites/enemy_plant.png',20,20,2,i=>{
    const s=new Surface(20,20);
    for(let k=0;k<5;k++){ const a=-1.2+k*0.6; ccEllipse(s, 10+Math.cos(a)*4.8, 10+Math.sin(a)*4.8 - (i?0.6:0), 2.4,1.7, k%2?'#5abf3a':'#3a7a2a'); }
    ccEllipse(s, 10,12, 2.8,3.4, '#8a6a3a');
    return s;
},{walk:[0,1],attack:[1,0]});
enemySheet('boss_wolf_spider','assets/sprites/boss_wolf_spider.png',64,64,4,i=>drawSpider(64,'#7a3a4a',i),{walk:[0,1,2,3],attack:[2,3]});
enemySheet('boss_bombardier','assets/sprites/boss_bombardier.png',48,48,4,i=>drawBeetle(48,'#b84a1a',i,{horn:true, glow:'#ff8a2a'}),{walk:[0,1,2,3],attack:[2,3]});
enemySheet('boss_putrid_centipede','assets/sprites/boss_putrid_centipede.png',64,64,4,i=>drawCentipede(64,'#5a8a2a',i,{segments:8,toxic:true}),{walk:[0,1,2,3],attack:[1,3]});
enemySheet('boss_first_queen','assets/sprites/boss_first_queen.png',64,64,6,i=>{
    const q=drawQueen(i%4); const out=new Surface(64,64);
    out.blit(q,16,16);
    for(const side of [-1,1]) out.ellipse(22,32+side*14, 9,3.2, [223,246,255, 68], {outline:false});
    out.recolor(p=> mix(p,'#ffe9a8',0.08));
    return out;
},{walk:[0,1,2,3],attack:[4,5],idle:[0,1,2,3]});

/* ========================================================================== *
 * 4. TILESETS — minimalista polido (flat + 2 tons, sem ruído)
 * ========================================================================== */
console.log('[gen:art] tilesets — CC×DC minimalista...');
export const BIOME_ART = {
    bosque_umido: { dirt:'#6b4a2a', rock:'#5a5a5a', surface:'#4aa82e', hazard:'#2a9a4a' },
    prado_fogo: { dirt:'#5a3320', rock:'#4a3a32', surface:'#8a5a2a', hazard:'#d44a12' },
    deserto_escaldante: { dirt:'#c4a86a', rock:'#a88a4a', surface:'#e0c47a', hazard:'#ffe08a' },
    pantano_toxico: { dirt:'#4a4a30', rock:'#3a4038', surface:'#5a7a2a', hazard:'#8fbf2a' },
    cemiterio_troncos: { dirt:'#5a4a3a', rock:'#4a3a32', surface:'#7a6a4a', hazard:'#8a7a5a' },
    floresta_fungos: { dirt:'#4a3a5a', rock:'#3a344a', surface:'#6a5a8a', hazard:'#b44ad2' },
    cavernas_cristal: { dirt:'#3a4a5a', rock:'#6a8aaa', surface:'#4a5a6a', hazard:'#7ad2ff' },
    tundra_congelada: { dirt:'#5a6a7a', rock:'#7a8a9a', surface:'#b8d0e0', hazard:'#e0f2ff' },
    oasis_carnivoro: { dirt:'#5a5a2a', rock:'#4a4a32', surface:'#7ab82a', hazard:'#c82a5a' },
    jardim_flutuante: { dirt:'#4a5a44', rock:'#3a4a40', surface:'#5a9a7a', hazard:'#2a8ad2' },
    abismo_bioluminescente: { dirt:'#22223a', rock:'#2a2a4a', surface:'#2a2a3a', hazard:'#4affe0' },
    vale_ossos: { dirt:'#5a4a3a', rock:'#9a948a', surface:'#7a7462', hazard:'#e0dcc8' },
    fosso_teias: { dirt:'#4a463e', rock:'#5a564e', surface:'#6a665e', hazard:'#e8e8f0' },
    canyon_geleia: { dirt:'#6a4a1a', rock:'#7a5a20', surface:'#9a7a20', hazard:'#ffcc2a' },
    prisao_ambar: { dirt:'#7a5a1a', rock:'#9a7a20', surface:'#c49a20', hazard:'#ffb82a' },
    nucleo_primordial: { dirt:'#3a2a3a', rock:'#5a4a5a', surface:'#6a5a5a', hazard:'#fff3b0' }
};
function drawTile(w,h,base,kind,seed,hazard){
    const s=new Surface(w,h);
    // base flat minimalista + bevel topo highlight / base sombra (Castle Crashers)
    s.rect(0,0,w,h, base);
    // highlight topo 1px
    s.rect(0,0,w,1, shade(base, 0.18));
    s.rect(0,0,1,h, shade(base, 0.18));
    // sombra base 1px
    s.rect(0,h-1,w,1, shade(base, -0.24));
    s.rect(w-1,0,1,h, shade(base, -0.24));
    // detalhe minimalista por tipo (1-2 elementos apenas)
    if(kind==='dirt' || kind==='dirt_alt'){
        // 2 seixos fofos minimalistas
        s.ellipse(5,6, 1.4,1.1, shade(base,-0.26), {outline:true, rim:false});
        s.ellipse(11,10, 1.1,0.9, shade(base,-0.26), {outline:true, rim:false});
        s.px(4,5, shade(base,0.30)); s.px(10,9, shade(base,0.30));
        if(kind==='dirt_alt'){
            s.rect(2,12,12,1, shade(base,-0.32));
            s.rect(2,13,12,1, shade(base, 0.14));
        }
    } else if(kind==='tunnel'){
        s.recolor(p=> mix(p,'#0d0604',0.52));
        // 2 riscos escavação minimalistas
        s.line(4,5, 7,6, shade(base,0.18));
        s.line(9,10, 12,11, shade(base,0.18));
        // cascalho 1 dot
        s.px(8,8, shade(base,0.22));
        s.rect(0,0,w,1, [0,0,0, 90]); s.rect(0,h-1,w,1,[0,0,0,60]);
    } else if(kind==='rock'){
        // faceta diamante minimalista 1
        const cx=8, cy=8, sz=3.2;
        s.poly([[cx,cy-sz],[cx+sz,cy],[cx,cy+sz],[cx-sz,cy]], shade(base,0.20));
        s.line(cx-sz,cy, cx,cy-sz, shade(base,0.34));
        s.line(cx,cy-sz, cx+sz,cy, shade(base,0.10));
        s.line(cx+sz,cy, cx,cy+sz, shade(base,-0.22));
        s.line(cx,cy+sz, cx-sz,cy, shade(base,-0.14));
        s.line(cx-1,cy-1, cx+1,cy+1, shade(base,-0.36));
    } else if(kind==='surface' || kind==='surface_alt'){
        // grama 4 lâminas minimalistas
        for(let x=2;x<w;x+=4){
            s.line(x,0, x,3, shade(base,0.26));
            s.px(x,0, '#fff6b0');
        }
        if(kind==='surface_alt'){
            s.ellipse(8,9, 2.2,1.4, shade(base,-0.28), {outline:false});
            s.ellipse(7.5,8.5, 1.0,0.7, shade(base,0.22), {outline:false});
        }
    } else if(kind==='hazard' || kind==='hazard_alt'){
        s.recolor(p=> mix(p,hazard,0.40));
        // 2 veias + brilho central
        s.line(4,8, 7,5, hazard); s.px(4,5, shade(hazard,0.40));
        s.line(12,6, 10,10, hazard);
        s.px(8,8, '#ffffff');
        if(kind==='hazard_alt') s.rect(0,13,w,1, shade(hazard,-0.30));
    }
    // outline preto fino Castle Crashers (0.6 alpha) nos 4 cantos
    s.px(0,0, shade(base,-0.55)); s.px(w-1,0, shade(base,-0.55));
    s.px(0,h-1, shade(base,-0.55)); s.px(w-1,h-1, shade(base,-0.55));
    return s;
}
const TILE_FRAMES=['dirt','dirt_alt','tunnel','rock','surface','surface_alt','hazard','hazard_alt'];
for(const [biomeId, art] of Object.entries(BIOME_ART)){
    const sheet=spriteSheet(16,16,TILE_FRAMES.length,(i,w,h)=>{
        const kind=TILE_FRAMES[i];
        const base= kind.startsWith('dirt')||kind==='tunnel' ? art.dirt : kind==='rock'? art.rock : art.surface;
        const seed=(biomeId.charCodeAt(0)*7919 + i*104729)%2147483647;
        return drawTile(w,h,base,kind,seed,art.hazard);
    });
    const rel=`assets/tilesets/tiles_${biomeId}.png`;
    writePNG(path.join(ROOT, rel), sheet);
    register(`tiles_${biomeId}`, rel, 16,16, TILE_FRAMES.length, {tiles:{dirt:0, dirt_alt:1, tunnel:2, rock:3, surface:4, surface_alt:5, hazard:6, hazard_alt:7}});
}

/* ========================================================================== *
 * 5. PROPS — minimalista fofo (flat + outline espesso)
 * ========================================================================== */
console.log('[gen:art] props — minimalista polido...');
const PROPS = {
    nursery: (s)=>{ s.rect(1,3,14,10, '#3a2a1c'); s.rect(1,3,14,1, shade('#3a2a1c',0.18));
        for(let i=0;i<3;i++){ const x=3+i*4, y=6; s.ellipse(x,y,1.5,1.2,'#fff6dc',{outline:true}); s.px(x-0.6,y-0.6,'#ffffff');}
        for(let i=0;i<3;i++){ const x=3+i*4, y=10; s.ellipse(x,y,1.5,1.2,'#fff6dc',{outline:true}); }
    },
    pantry: (s)=>{ s.rect(1,4,14,9,'#2f2318'); for(let i=0;i<4;i++){ const x=3+(i%2)*6, y=6+Math.floor(i/2)*4; s.ellipse(x,y,1.9,1.3, i%2?'#6abf3a':'#4a8a2a',{outline:true}); s.px(x-0.5,y-0.6,'#b6ff5a');}},
    defense: (s)=>{ s.rect(1,3,14,10,'#3b3a34'); for(let y=3;y<13;y+=4){ s.rect(1,y,14,2,'#7a8290'); s.rect(1,y+2,14,1,'#2a2e34'); } s.rect(6,5,4,6,'#a0a8b8'); s.rect(6,5,4,1,'#ffffff'); },
    fungus: (s)=>{ s.rect(1,9,14,4,'#2a2318'); for(const [x,c] of [[4,'#3ce0ff'],[8,'#b44ad2'],[12,'#3ce0ff']]){ s.rect(x,8,1,4,'#cfc4a8'); s.ellipse(x,6.2,1.9,1.4,c,{outline:true}); s.px(x-0.5,5.2,'#ffffff');}},
    trap: (s)=>{ s.rect(0,0,16,16,'#2a1f12'); s.ellipse(8,8,4.2,3.2,'#e0a832',{outline:true}); s.ellipse(8,8,2.2,1.4,'#ffcf5a',{outline:false}); s.px(7,7,'#ffffff'); },
    dais: (s)=>{ s.ellipse(8,9,6.2,4.4,'#5a3a6a',{outline:true}); s.ellipse(8,7.6,4.2,2.8,'#7a4a9a',{outline:false}); s.px(6.5,6.2,'#ffd54a'); s.px(9.5,6.2,'#ffd54a'); },
    anthill: (s)=>{ s.ellipse(8,11,6.2,3.9,'#6b4a2a',{outline:true}); s.ellipse(8,10,2.0,1.3,'#0d0806',{outline:true}); s.px(7,9,'#ffffff'); },
    leaf_node: (s)=>{ s.ellipse(8,8,4.8,3.4,'#5abf3a',{outline:true}); s.line(3,10,13,6,'#2a6a1c'); s.px(11,5.5,'#b6ff5a'); },
    jelly_node: (s)=>{ s.poly([[8,2],[11,8],[8,14],[5,8]], '#ffcc2a'); s.poly([[8,2],[11,8],[8,14],[5,8]], '#0a0a12'); s.ellipse(7.2,5.6,0.7,0.7,'#ffffff',{outline:false}); },
    egg: (s)=>{ s.ellipse(8,8,2.6,3.4,'#fff6dc',{outline:true}); s.ellipse(7,6.8,0.7,0.6,'#ffffff',{outline:false}); },
    cocoon: (s)=>{ s.ellipse(8,9,4.4,5.2,'#7a6a4a',{outline:true}); for(let y=5;y<14;y+=2) s.line(4,y,12,y, shade('#7a6a4a',-0.28)); s.px(7,6,'#ffffff'); },
    stump: (s)=>{ s.ellipse(8,10,5.2,3.4,'#6a5a42',{outline:true}); s.ellipse(8,7.8,4.2,2.4,'#8a7a5a',{outline:false}); s.ellipse(8,7.8,1.8,1.0,'#4a3a28',{outline:false}); },
    rock_deco: (s)=>{ s.poly([[3,13],[5,5],[10,4],[13,12]], '#7a7462'); s.line(5,5,10,4,'#e0dcc8'); s.line(5,5,3,13,'#0a0a12'); },
    mushroom_deco: (s)=>{ s.rect(7,9,2,5,'#cfc4a8'); s.ellipse(8,7.2,3.8,2.4,'#b44ad2',{outline:true}); s.ellipse(7,6.2,0.9,0.7,'#ffffff',{outline:false}); },
    web: (s)=>{ for(let i=0;i<16;i++){ s.px(i,i, [232,232,240, 170]); s.px(i,15-i, [232,232,240, 170]); } s.ellipse(8,8,5,5, [232,232,240, 50], {outline:false}); },
    crystal: (s)=>{ s.poly([[8,1],[12,7],[8,15],[4,7]], '#7ad2ff'); s.line(8,1,8,15,'#ffffff'); s.line(8,1,12,7,'#0a0a12'); s.line(8,1,4,7,'#0a0a12'); }
};
{
    const keys=Object.keys(PROPS);
    const sheet=spriteSheet(16,16,keys.length,(i,w,h)=>{ const s=new Surface(w,h); PROPS[keys[i]](s); return s;});
    const rel='assets/sprites/props.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles={}; keys.forEach((k,i)=> tiles[k]=i);
    register('props', rel, 16,16, keys.length, {tiles});
}

/* ========================================================================== *
 * 6. ÍCONES — Castle Crashers bold minimalista
 * ========================================================================== */
console.log('[gen:art] ícones — bold minimalista...');
const ICONS = {
    leaf: (s)=>{ s.ellipse(8,8,4.8,3.4,'#6abf3a',{outline:true}); s.line(3,10,13,6,'#0a0a12'); s.px(11,5.8,'#ffffff'); },
    jelly: (s)=>{ s.poly([[8,2],[11,8],[8,14],[5,8]], '#ffcc2a'); s.line(8,2,11,8,'#0a0a12'); s.line(11,8,8,14,'#0a0a12'); s.px(7,5,'#ffffff'); },
    heart: (s)=>{ s.ellipse(6,6,2.8,2.8,'#e03a3a',{outline:true}); s.ellipse(10,6,2.8,2.8,'#e03a3a',{outline:true}); s.poly([[3,7],[13,7],[8,14]],'#e03a3a'); s.line(3,7,13,7,'#0a0a12'); s.px(6,5,'#ffffff'); },
    dig: (s)=>{ s.line(4,12,11,5,'#0a0a12'); s.poly([[9,3],[14,5],[12,8],[8,6]],'#c8c8d8'); s.line(9,3,14,5,'#0a0a12'); s.px(10,4,'#ffffff'); },
    build: (s)=>{ s.rect(2,6,12,8,'#6b4a2a'); s.rect(2,6,12,1,'#ffffff'); s.poly([[1,6],[8,1],[15,6]],'#8a6a3a'); s.line(1,6,8,1,'#0a0a12'); s.rect(6,9,4,5,'#0a0a12'); },
    cancel: (s)=>{ s.line(4,4,12,12,'#e03a3a'); s.line(12,4,4,12,'#e03a3a'); s.line(4,4,12,12,'#0a0a12'); },
    pheromone_collect: (s)=>{ s.ellipse(8,8,3.6,3.6, '#6abf3a',{outline:true}); s.ellipse(8,8,2.0,2.0,'#b6ff5a',{outline:false}); s.px(7,7,'#ffffff'); },
    pheromone_attack: (s)=>{ s.ellipse(8,8,3.6,3.6, '#e03a3a',{outline:true}); s.ellipse(8,8,2.0,2.0,'#ff8a6a',{outline:false}); },
    pheromone_move: (s)=>{ s.ellipse(8,8,3.6,3.6, '#5ac8ff',{outline:true}); s.ellipse(8,8,2.0,2.0,'#dff6ff',{outline:false}); },
    pheromone_retreat: (s)=>{ s.ellipse(8,8,3.6,3.6, '#c8c8d8',{outline:true}); s.poly([[10,5],[5,8],[10,11]],'#e8e8f0'); s.line(10,5,5,8,'#0a0a12'); },
    gear: (s)=>{ s.ellipse(8,8,4.4,4.4,'#9a948a',{outline:true}); s.ellipse(8,8,1.6,1.6,'#2a2418',{outline:true}); s.px(8,3,'#ffffff'); },
    pause: (s)=>{ s.rect(5,4,2,8,'#e8d9b5'); s.rect(9,4,2,8,'#e8d9b5'); s.rect(5,4,2,1,'#ffffff'); },
    back: (s)=>{ s.poly([[10,3],[4,8],[10,13]],'#e8d9b5'); s.line(10,3,4,8,'#0a0a12'); },
    skull: (s)=>{ s.ellipse(8,7,3.9,3.4,'#e8e0c8',{outline:true}); s.rect(6,10,4,2.6,'#cfc4a8'); s.ellipse(6,6,0.7,0.7,'#0a0a12',{outline:false}); s.ellipse(10,6,0.7,0.7,'#0a0a12',{outline:false}); s.px(6,5,'#ffffff'); },
    gene: (s)=>{ for(let y=3;y<13;y++){ const x=8+Math.sin(y*0.7)*2.8; s.px(Math.round(x), y, '#b44ad2'); s.px(16-Math.round(x), y, '#3ce0ff'); if(y%3===0) s.line(Math.round(x), y, 16-Math.round(x), y, '#0a0a12'); }},
    route: (s)=>{ for(const [x,y] of [[3,12],[8,8],[13,4]]) s.ellipse(x,y,1.7,1.7,'#c8ff5a',{outline:true}); s.line(3,12,8,8,'#0a0a12'); s.line(8,8,13,4,'#0a0a12'); },
    ant: (s)=>{ const mini=drawAnt({frame:16, palette:'#c8a05a', abdomenR:2.1, headR:1.7, mandible:1.2, bodyLen:3.8, phase:0}); s.blit(mini,0,0); },
    egg_icon: (s)=>{ s.ellipse(8,8,2.6,3.4,'#fff6dc',{outline:true}); s.px(7,6,'#ffffff'); },
    shield: (s)=>{ s.poly([[3,3],[13,3],[13,9],[8,14],[3,9]],'#7a8aaa'); s.line(3,3,13,3,'#0a0a12'); s.poly([[5,5],[11,5],[11,8],[8,12],[5,8]],'#a0a8b8'); },
    fungus_icon: (s)=>{ s.rect(7,9,2,5,'#cfc4a8'); s.ellipse(8,7.2,3.6,2.2,'#3ce0ff',{outline:true}); s.px(7,6,'#ffffff'); },
    acid: (s)=>{ s.ellipse(8,9,3.4,3.4,'#b6ff3c',{outline:true}); s.px(7,7,'#ffffff'); },
    poison: (s)=>{ s.ellipse(8,9,3.8,3.4,'#8fbf2a',{outline:true}); s.px(7,6,'#ffffff'); },
    eye: (s)=>{ s.ellipse(8,8,5.2,2.9,'#e8e0c8',{outline:true}); s.ellipse(8,8,1.9,1.9,'#5a2a6b',{outline:false}); s.px(7,7,'#ffffff'); },
    crown: (s)=>{ s.poly([[2,12],[14,12],[13,6],[10,9],[8,4],[6,9],[3,6]],'#ffd54a'); s.line(2,12,14,12,'#0a0a12'); s.rect(2,12,12,2,'#c8a020'); s.px(4,7,'#ffffff'); },
    wave: (s)=>{ for(let x=1;x<15;x++) s.px(x, 8+Math.round(Math.sin(x*0.8)*2.2), '#e03a3a'); s.px(2,8,'#0a0a12'); },
    speed: (s)=>{ for(let i=0;i<3;i++){ s.line(2,4+i*4,9,4+i*4,'#c8ff5a'); s.line(9,4+i*4,6,6+i*4,'#0a0a12'); }},
    hp: (s)=>{ s.rect(3,7,10,3,'#e03a3a'); s.rect(7,3,3,11,'#e03a3a'); s.rect(3,7,10,1,'#ffffff'); }
};
{
    const keys=Object.keys(ICONS);
    const sheet=spriteSheet(16,16,keys.length,(i,w,h)=>{ const s=new Surface(w,h); ICONS[keys[i]](s); return s;});
    const rel='assets/ui/icons.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles={}; keys.forEach((k,i)=> tiles[k]=i);
    register('ui_icons', rel, 16,16, keys.length, {tiles});
}

/* ========================================================================== *
 * 7. PAINEL 9-SLICE — minimalista fofo (Castle Crashers parquês)
 * ========================================================================== */
console.log('[gen:art] UI 9-slice — polido...');
{
    const S=48, s=new Surface(S,S);
    s.rect(0,0,S,S,'#2a1e16');
    s.rect(2,2,S-4,S-4,'#3a2a1a'); s.rect(2,2,S-4,1,'#ffffff'); s.rect(2,2,1,S-4,'#ffffff');
    // borda âmbar flat
    for(let x=0;x<S;x++){ s.px(x,0,'#0a0a12'); s.px(x,S-1,'#0a0a12');}
    for(let y=0;y<S;y++){ s.px(0,y,'#0a0a12'); s.px(S-1,y,'#0a0a12');}
    s.rect(6,6,S-12,S-12,'#1e150f');
    s.rect(6,6,S-12,1, shade('#3a2a1a',0.22)); s.rect(6,6,1,S-12, shade('#3a2a1a',0.22));
    writePNG(path.join(ROOT,'assets/ui/panel.png'), s);
    register('ui_panel','assets/ui/panel.png',S,S,1,{nineSlice:{left:12,right:12,top:12,bottom:12}});
}

/* ========================================================================== *
 * 8. CARTAS — minimalista com outline espesso
 * ========================================================================== */
console.log('[gen:art] cartas — minimalista...');
{
    const W=96,H=128;
    const RARITIES=[['comum','#e8e8e8'],['incomum','#5ad25a'],['rara','#3c9aff'],['epica','#b44ad2'],['lendario','#ffc832'],['mitica','#e03a3a'],['cosmica','#6a4ad2'],['deus','#ffffff']];
    const sheet=new Surface(W, H*RARITIES.length);
    RARITIES.forEach(([id,color],idx)=>{
        const s=new Surface(W,H);
        s.rect(0,0,W,H,'#1a120c');
        s.rect(3,3,W-6,H-6, color); s.rect(5,5,W-10,H-10,'#1a120c');
        s.rect(4,4,W-8,3, shade(color,0.30)); s.rect(4,4,3,H-8, shade(color,0.30));
        // janela ícone flat
        s.rect(16,20,W-32,56,'#0a0604'); s.rect(16,20,W-32,1,color); s.rect(16,76,W-32,1,color);
        s.rect(16,86,W-32,30,'#0a0604'); s.rect(16,86,W-32,1, mix(color,'#ffffff',0.30));
        sheet.blit(s,0,idx*H);
    });
    const rel='assets/ui/mutation_cards.png';
    writePNG(path.join(ROOT, rel), sheet);
    const tiles={}; RARITIES.forEach(([id],i)=> tiles[id]=i);
    register('mutation_cards', rel, W,H, RARITIES.length, {tiles, rarities:RARITIES.map(r=>r[0])});
}

/* ========================================================================== *
 * 9. FONTE — mantida (5×7 mandíbula)
 * ========================================================================== */
console.log('[gen:art] fonte bitmap...');
{
    const G={ A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'], C:['01110','10001','10000','10000','10000','10001','01110'], D:['11110','10001','10001','10001','10001','10001','11110'], E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'], G:['01110','10001','10000','10111','10001','10001','01111'], H:['10001','10001','10001','11111','10001','10001','10001'], I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00010','00010','00010','00010','10010','01100'], K:['10001','10010','10100','11000','10100','10010','10001'], L:['10000','10000','10000','10000','10000','10000','11111'], M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','10101','10011','10001','10001','10001'], O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'], Q:['01110','10001','10001','10001','10101','10011','01101'], R:['11110','10001','10001','11110','10100','10010','10001'], S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'], U:['10001','10001','10001','10001','10001','10001','01110'], V:['10001','10001','10001','10001','10001','01010','00100'], W:['10001','10001','10001','10101','10101','11011','10001'], X:['10001','10001','01010','00100','01010','10001','10001'], Y:['10001','10001','01010','00100','00100','00100','00100'], Z:['11111','00001','00010','00100','01000','10000','11111'], 0:['01110','10001','10011','10101','11001','10001','01110'], 1:['00100','01100','00100','00100','00100','00100','01110'], 2:['01110','10001','00001','00010','00100','01000','11111'], 3:['11111','00010','00100','00010','00001','10001','01110'], 4:['00010','00110','01010','10010','11111','00010','00010'], 5:['11111','10000','11110','00001','00001','10001','01110'], 6:['00110','01000','10000','11110','10001','10001','01110'], 7:['11111','00001','00010','00100','01000','01000','01000'], 8:['01110','10001','10001','01110','10001','10001','01110'], 9:['01110','10001','10001','01111','00001','00010','01100'], ' ':['00000','00000','00000','00000','00000','00000','00000'], '.':['00000','00000','00000','00000','00000','01100','01100'], ',':['00000','00000','00000','00000','01100','00100','01000'], ':':['00000','01100','01100','00000','01100','01100','00000'], '!':['00100','00100','00100','00100','00100','00000','00100'], '?':['01110','10001','00001','00010','00100','00000','00100'], '+':['00000','00100','00100','11111','00100','00100','00000'], '-':['00000','00000','00000','11111','00000','00000','00000'], '/':['00001','00010','00010','00100','01000','01000','10000'], '%':['11001','11010','00010','00100','01000','01011','10011'], '(' :['00010','00100','01000','01000','01000','00100','00010'], ')':['01000','00100','00010','00010','00010','00100','01000'], '>':['01000','00100','00010','00001','00010','00100','01000'], '<':['00010','00100','01000','10000','01000','00100','00010'], '*':['00000','10101','01110','11111','01110','10101','00000'], 'ª':['01110','00001','01111','10001','01111','00000','00000'] };
    const GW=5, GH=7, ADV=6, PAD=1, keys=Object.keys(G), perRow=16, rows=Math.ceil(keys.length/perRow), sheetW=perRow*(GW+PAD), sheetH=rows*(GH+PAD);
    const sheet=new Surface(sheetW, sheetH, [0,0,0,0]);
    const chars=[];
    keys.forEach((k,i)=>{
        const gx=(i%perRow)*(GW+PAD), gy=Math.floor(i/perRow)*(GH+PAD);
        for(let y=0;y<GH;y++) for(let x=0;x<GW;x++) if(G[k][y][x]==='1') sheet.px(gx+x, gy+y, '#f0e6c8');
        chars.push({id:k.charCodeAt(0), x:gx, y:gy, width:GW, height:GH, xoffset:0, yoffset:0, xadvance: k===' '?ADV-1:ADV});
    });
    writePNG(path.join(ROOT,'assets/fonts/fumiga.png'), sheet);
    const xml=bitmapFontXML({fontName:'fumiga', size:7, chars, lineHeight:GH+2, base:GH, pages:['fumiga.png'], scaleW:sheetW, scaleH:sheetH});
    writeFileSync(path.join(ROOT,'assets/fonts/fumiga.xml'), xml);
    manifest.font_fumiga={file:'assets/fonts/fumiga.xml', type:'bitmapFont', texture:'assets/fonts/fumiga.png'};
}

/* ========================================================================== *
 * 10. PROJÉTEIS — minimalista
 * ========================================================================== */
{
    const sheet=spriteSheet(8,8,4,i=>{
        const s=new Surface(8,8);
        s.ellipse(4,4, 2.6-(i%2)*0.3, 2.6-(i%2)*0.3, '#b6ff3c', {outline:true});
        s.ellipse(3.2,3.2, 0.7,0.7, '#ffffff', {outline:false});
        return s;
    });
    writePNG(path.join(ROOT,'assets/sprites/projectile_acid.png'), sheet);
    register('projectile_acid','assets/sprites/projectile_acid.png',8,8,4,{anims:{fly:[0,1,2,3]}});
}

/* ========================================================================== *
 * 10b. BACKGROUNDS — polido minimalista (flat + outline)
 * ========================================================================== */
console.log('[gen:art] backgrounds — polido minimalista...');
{
    const W=128,H=96, s=new Surface(W,H);
    // céu flat desaturado gótico
    s.rect(0,0,W,H, '#2a1a3a');
    s.poly([[0,H],[64,20],[W,H]], '#1e0f2a');
    s.poly([[0,H],[64,20],[W,H]], '#0a0a12'); s.poly([[2,H-2],[64,22],[W-2,H-2]], '#1e0f2a');
    function tower(x,y,w,h, base){
        s.rect(x,y,w,h, base); s.rect(x,y,w,1,'#ffffff'); s.rect(x,y,1,h,'#ffffff');
        s.rect(x+w-1,y,1,h,'#0a0a12'); s.rect(x,y+h-1,w,1,'#0a0a12');
        for(let j=4;j<h-4;j+=6) s.rect(x,y+j,w,1, shade(base,-0.32));
        for(let i=0;i<w;i+=4){ s.rect(x+i, y-2, 2,2, base); s.rect(x+i, y-2,2,1,'#ffffff');}
    }
    tower(46,28,14,68,'#3a2a4a'); tower(70,20,18,76,'#4a3a5a'); tower(56,40,12,56,'#2a1a32');
    s.rect(56,60,16,4,'#2a1e35'); s.rect(58,60,12,1,'#ffffff');
    function win(x,y,w,h){ s.rect(x,y,w,h,'#ffd54a'); s.rect(x,y,w,1,'#ffffff'); s.rect(x+Math.floor(w/2)-1,y,2,h,'#0a0a12'); s.rect(x,y+Math.floor(h/2)-1,w,2,'#0a0a12');}
    win(49,42,4,6); win(74,34,4,8); win(60,46,3,5);
    writePNG(path.join(ROOT,'assets/sprites/bg_castle.png'), s);
    register('bg_castle','assets/sprites/bg_castle.png',W,H,1);
}
{
    const W=128,H=32, s=new Surface(W,H);
    s.rect(0,0,W,H, '#ff8a2a'); s.rect(0,0,W,1,'#ffffff'); s.rect(0,H-1,W,1,'#0a0a12');
    for(let y=5;y<H;y+=7){
        const off=Math.sin(y*0.4)*4;
        for(let x=0;x<W;x++) if((x+y)%14<2) s.px(Math.round((x+off))%W, y, [255,255,255, 36]);
    }
    s.rect(0,0,W,2, [255,255,255, 40]);
    writePNG(path.join(ROOT,'assets/sprites/bg_water.png'), s);
    register('bg_water','assets/sprites/bg_water.png',W,H,1);
}
{
    const W=24,H=16, s=new Surface(W,H);
    s.poly([[8,8],[12,1],[16,8]], '#e8e0c8'); s.line(8,8,12,1,'#0a0a12'); s.line(12,1,16,8,'#0a0a12'); s.line(12,1,12,8,'#0a0a12');
    s.rect(5,8,14,6,'#3a2a18'); s.rect(5,8,14,1,'#ffffff'); s.rect(5,13,14,1,'#0a0a12');
    writePNG(path.join(ROOT,'assets/sprites/bg_boat.png'), s);
    register('bg_boat','assets/sprites/bg_boat.png',W,H,1);
}
{
    const W=64,H=32, s=new Surface(W,H);
    function cloud(cx,cy,rx,ry, base){ s.ellipse(cx,cy+1,rx,ry, shade(base,-0.28), {outline:false}); s.ellipse(cx,cy,rx,ry, base, {outline:true}); s.ellipse(cx-rx*0.28, cy-ry*0.28, rx*0.22, ry*0.18, '#ffffff', {outline:false});}
    cloud(16,16,14,10,'#ffd07a'); cloud(32,12,17,11,'#ffb84a'); cloud(48,18,11,8,'#ffd07a');
    writePNG(path.join(ROOT,'assets/sprites/bg_clouds.png'), s);
    register('bg_clouds','assets/sprites/bg_clouds.png',W,H,1);
}
{
    const W=64,H=64, s=new Surface(W,H);
    s.ellipse(32,32,24,24,'#fff6b0',{outline:true}); s.ellipse(31,31, 7,7,'#ffffff',{outline:false});
    s.ellipse(24,26,3,2.2, shade('#fff6b0',-0.30), {outline:true}); s.ellipse(36,34,2.2,1.7, shade('#fff6b0',-0.30), {outline:true});
    writePNG(path.join(ROOT,'assets/sprites/bg_moon.png'), s);
    register('bg_moon','assets/sprites/bg_moon.png',W,H,1);
}
{
    const W=32,H=12, s=new Surface(W,H);
    for(let i=0;i<6;i++){ const x=i*5+2, y=6+(i%2?2:-2); s.line(x,y, x+2,y-2,'#0a0a12'); s.line(x+2,y-2,x+4,y,'#0a0a12'); s.px(x+2,y-1,'#1a0a1a');}
    writePNG(path.join(ROOT,'assets/sprites/bg_birds.png'), s);
    register('bg_birds','assets/sprites/bg_birds.png',W,H,1);
}
{
    const s=new Surface(3,3); s.rect(0,0,3,3,'#ffffff'); s.px(1,1,'#fff6b0');
    writePNG(path.join(ROOT,'assets/sprites/particle.png'), s);
    register('particle','assets/sprites/particle.png',3,3,1);
}
{
    const W=8,H=8, s=new Surface(W,H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const dx=x-4, dy=y-4, d=Math.sqrt(dx*dx+dy*dy); if(d>4) continue; const t=d/4; const c=t<0.45?'#ffffff':t<0.75?'#fff6b0':'#b6ff3c'; s.px(x,y, [rgba(c)[0],rgba(c)[1],rgba(c)[2], Math.floor((1-t*0.9)*255)]); }
    writePNG(path.join(ROOT,'assets/sprites/glow.png'), s);
    register('glow','assets/sprites/glow.png',W,H,1);
}
{
    const W=32,H=32, s=new Surface(W,H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const dx=x-16, dy=y-16, d=Math.sqrt(dx*dx+dy*dy); if(d>16) continue; s.px(x,y, [255,255,255, Math.floor((1-d/16)*(1-d/16)*255)]); }
    writePNG(path.join(ROOT,'assets/sprites/fogbrush.png'), s);
    register('fogbrush','assets/sprites/fogbrush.png',W,H,1);
}
{
    const W=64,H=64, s=new Surface(W,H);
    s.rect(0,0,W,H,'#2a3a4a');
    s.rect(12,12,40,40,'#1a0f1e'); s.rect(12,12,40,1,'#ffffff'); s.rect(12,12,1,40,'#ffffff');
    s.rect(30,8,4,44,'#3a2a1a'); s.rect(12,30,40,4,'#3a2a1a');
    s.ellipse(32,20,6,6,'#ffd54a',{outline:true}); s.ellipse(31,19,2.2,1.6,'#ffffff',{outline:false});
    writePNG(path.join(ROOT,'assets/sprites/bg_window.png'), s);
    register('bg_window','assets/sprites/bg_window.png',W,H,1);
}

/* ========================================================================== *
 * Portraits 64×64 — CC×DC polido minimalista (flat fofo + outline espesso)
 * ========================================================================== */
{
    const CLASSES = [
        {id:'ant_worker', col:'#b07a2e', accent:'#5a3a0a'},
        {id:'ant_collector', col:'#d4a017', accent:'#6a4a0a'},
        {id:'ant_scout', col:'#5ac8ff', accent:'#1a5a8a'},
        {id:'ant_soldier', col:'#d6452a', accent:'#6a1a0a'},
        {id:'ant_guardian', col:'#8aa0b8', accent:'#3a4a6a'},
        {id:'ant_sniper', col:'#6abf3a', accent:'#1a4a0a'},
        {id:'ant_spy', col:'#8a5fbf', accent:'#3a2a6a'},
        {id:'ant_healer', col:'#f2c6a0', accent:'#8a5a4a'},
        {id:'ant_digger', col:'#8a6a3a', accent:'#4a3a1a'},
        {id:'ant_giant', col:'#5a4a44', accent:'#2a1a14'},
        {id:'queen', col:'#ffd54a', accent:'#8a6a1a'},
        {id:'enemy_centipede', col:'#b84a2e', accent:'#4a1a0a'},
        {id:'enemy_beetle', col:'#6a5abf', accent:'#2a2a4a'},
        {id:'enemy_scorpion', col:'#d4a01a', accent:'#4a3a0a'},
        {id:'enemy_fly', col:'#6a7a4a', accent:'#2a2a1a'},
        {id:'enemy_moth', col:'#8ac6e8', accent:'#3a5a7a'},
        {id:'enemy_termite', col:'#c49a3a', accent:'#3a2a0a'},
        {id:'enemy_plant', col:'#5abf3a', accent:'#1a4a0a'},
        {id:'enemy_spiderling', col:'#7a5a6e', accent:'#2a1a2a'},
        {id:'boss_wolf_spider', col:'#7a3a4a', accent:'#2a0a1a'},
        {id:'boss_bombardier', col:'#ff8a2a', accent:'#4a1a0a'},
        {id:'boss_putrid_centipede', col:'#5a8a2a', accent:'#1a2a0a'},
        {id:'boss_first_queen', col:'#ffd54a', accent:'#4a1a2a'},
    ];
    function drawPortrait(cls){
        const W=64,H=64, s=new Surface(W,H);
        // fundo Dead Cells gótico com luz volumétrica sutil (Castle Crashers flat)
        const bgBase = cls.id.includes('queen') ? '#2a1a3a' : cls.id.includes('boss') ? '#2a1a1a' : '#1e1428';
        for(let y=0;y<H;y++){
            const t=y/H;
            s.rect(0,y,W,1, mix(bgBase, '#0a0a12', t*0.45));
        }
        // vinheta suave
        for(let y=0;y<H;y++) for(let x=0;x<W;x++){
            const dx=(x-32)/32, dy=(y-32)/32, d=Math.sqrt(dx*dx+dy*dy);
            if(d>0.82) s.px(x,y, [0,0,0, Math.floor((d-0.82)/0.18*90)]);
        }
        // moldura polida: outline preto 3px + highlight interno 1px (Castle Crashers) + bevel gótico
        s.rect(0,0,W,3, '#0a0a12'); s.rect(0,H-3,W,3, '#0a0a12'); s.rect(0,0,3,H,'#0a0a12'); s.rect(W-3,0,3,H,'#0a0a12');
        s.rect(3,3,W-6,1, [255,255,255, 38]); s.rect(3,3,1,H-6, [255,255,255, 38]);
        s.rect(4,4,W-8,1, shade('#3a2a1a',0.18)); // bevel âmbar sutil
        // halo queen/boss mais intenso e volumetric
        if(cls.id.includes('queen')||cls.id.includes('boss')){
            s.ellipse(32,32,26,26, [255,213,74, 18], {outline:false, rim:false});
            for(let a=0;a<360;a+=15) s.px(Math.round(32+Math.cos(a*Math.PI/180)*26), Math.round(32+Math.sin(a*Math.PI/180)*26), [255,213,74, 32]);
        } else {
            // luz volumétrica sutil topo
            s.ellipse(32,18,22,10, [255,255,255, 10], {outline:false, rim:false});
        }
        const cx=32, cy=34, base=cls.col;
        // sombra projetada fofa no chão (Castle Crashers)
        s.ellipse(cx, cy+14, 10,3.2, [0,0,0, 55], {outline:false, rim:false});
        // personagem fofo minimalista central — mais detalhado e bonito
        if(cls.id.startsWith('ant_')||cls.id==='queen'){
            // abdomen com 2 tons + highlight + listra
            ccEllipse(s, cx, cy+7, 9.8,11.2, base);
            s.rect(Math.round(cx-0.2), Math.round(cy+3), 1,4, shade(base,-0.42));
            // tórax
            ccEllipse(s, cx, cy-4.2, 7.4,6.4, mix(base,'#ffffff',0.12));
            // cabeça grande fofa com bochecha rosada (Castle Crashers)
            ccEllipse(s, cx, cy-12.2, 5.9,5.0, mix(base,'#ffffff',0.20));
            s.ellipse(cx-2.2, cy-11.0, 1.1,0.7, [255,120,130, 55], {outline:false}); // blush
            s.ellipse(cx+2.2, cy-11.0, 1.1,0.7, [255,120,130, 55], {outline:false});
            // olhos grandes expressivos
            for(const side of [-1,1]){
                const ex=cx-1.8+side*1.8, ey=cy-12.0;
                s.ellipse(ex, ey, 1.35,1.15, '#0a0a12', {outline:true, rim:false});
                s.ellipse(ex+0.25, ey-0.25, 0.75,0.65, '#ffffff', {outline:false});
                s.px(Math.round(ex+0.4), Math.round(ey-0.3), '#ff3b30');
            }
            // antenas com curva fofa e ponta brilhante
            s.thickLine(cx-2.6, cy-15.0, cx-6.2, cy-18.5, '#0a0a12', 2);
            s.thickLine(cx+2.6, cy-15.0, cx+6.2, cy-18.5, '#0a0a12', 2);
            s.line(cx-2.6, cy-15.0, cx-6.2, cy-18.5, shade(base,-0.35));
            s.line(cx+2.6, cy-15.0, cx+6.2, cy-18.5, shade(base,-0.35));
            s.ellipse(cx-6.2, cy-18.5, 1.1,1.0, '#fff6b0',{outline:true}); s.ellipse(cx+6.2, cy-18.5, 1.1,1.0, '#fff6b0',{outline:true});
            // mandíbulas minimalistas com dente branco
            for(const side of [-1,1]){
                const tipX=cx+5.9+side*0.6, tipY=cy-11.2+side*1.1;
                s.poly([[cx+3.2, cy-10.2+side*0.7],[tipX, tipY],[cx+3.8, cy-9.6]], shade(base,-0.18));
                s.line(cx+3.2, cy-10.2+side*0.7, tipX, tipY, '#0a0a12');
                s.px(Math.round(tipX-side*0.3), Math.round(tipY), '#ffffff');
            }
            // acessório classe — ícone minimalista único e legível
            if(cls.id==='ant_soldier'){ s.poly([[cx-5,cy+2],[cx-9.5,cy+5],[cx-5,cy+7]], '#c0392b'); s.line(cx-5,cy+2, cx-9.5,cy+5,'#0a0a12'); }
            if(cls.id==='ant_guardian'){ s.rect(cx-7.5, cy+3, 5,6, '#4a6a8a'); s.rect(cx-7.5, cy+3,5,1,'#ffffff'); s.rect(cx-7.5, cy+3,1,6,'#ffffff'); }
            if(cls.id==='ant_sniper'){ s.ellipse(cx+5.2, cy+7, 2.4,1.7, '#b6ff3c',{outline:true}); s.ellipse(cx+5.0, cy+6.2,0.7,0.5,'#ffffff',{outline:false}); }
            if(cls.id==='ant_spy'){ s.ellipse(cx, cy+0, 3.2,2.2, [120,80,180, 42], {outline:false}); }
            if(cls.id==='ant_healer'){ s.rect(cx-0.6, cy+6,1.2,3,'#ffffff'); s.rect(cx-1.4, cy+7,3,1.2,'#ffffff'); }
            if(cls.id==='ant_collector'){ s.ellipse(cx+6.2, cy+6.8, 2.6,2.0, '#ffcc2a',{outline:true}); s.ellipse(cx+5.8, cy+5.8,0.7,0.5,'#ffffff',{outline:false}); }
            if(cls.id==='ant_digger'){ s.rect(cx-1, cy+5,2,4,'#8a6a3a'); s.rect(cx-1, cy+5,2,1,'#ffffff'); }
            if(cls.id==='ant_giant'){ s.rect(cx-1.5, cy+4,3,4, '#3a2a1a'); }
            if(cls.id==='queen'){ s.poly([[cx-6.5,cy-14],[cx,cy-19],[cx+6.5,cy-14],[cx,cy-11.5]], '#ffd54a'); s.line(cx-6.5,cy-14,cx,cy-19,'#0a0a12'); s.ellipse(cx,cy-16,0.9,0.7,'#ffffff',{outline:false}); }
        } else if(cls.id.startsWith('enemy_')){
            if(cls.id==='enemy_centipede'){
                // 5 segmentos fofos com outline espesso + olho vermelho
                for(let i=0;i<5;i++) ccEllipse(s, cx-8+i*4, cy+2, 3.6,2.8, i%2?base:shade(base,-0.16));
                ccEllipse(s, cx-9, cy-3, 3.0,2.4, shade(base,0.18));
                s.ellipse(cx-9.5, cy-3.2, 0.8,0.6,'#ff3b30',{outline:false});
            } else if(cls.id==='enemy_beetle'){
                // carapaça chibi com linha élitros + chifre fofo
                ccEllipse(s, cx, cy+4, 11.5,7.8, base);
                s.rect(Math.round(cx-0.4), Math.round(cy-3), 1,13, '#0a0a12');
                ccEllipse(s, cx, cy-3.5, 5.2,4.0, mix(base,'#ffffff',0.14));
                s.ellipse(cx, cy-3.8, 1.0,0.7,'#ffffff',{outline:false});
            } else if(cls.id==='enemy_scorpion'){
                ccEllipse(s, cx, cy+5.5, 9.5,5.5, base);
                // cauda grossa em S com ferrão brilhante
                s.thickLine(cx-2, cy+2, cx-4, cy-1, '#0a0a12', 3); s.thickLine(cx-4, cy-1, cx-1, cy-4, shade(base,-0.18), 3);
                s.ellipse(cx-1, cy-4, 1.6,1.3,'#ffec5a',{outline:true}); s.ellipse(cx-1.2, cy-4.3,0.6,0.4,'#ffffff',{outline:false});
                // pinças fofas
                for(const side of [-1,1]){ const px=cx+6*side, py=cy+1; s.ellipse(px, py, 2.6,1.9, shade(base,-0.22),{outline:true}); s.ellipse(px+side*0.8, py, 0.9,0.6,'#ffffff',{outline:false}); }
            } else if(cls.id==='enemy_fly' || cls.id==='enemy_moth'){
                // asas translúcidas + corpo fofo + olhos vermelhos grandes
                for(const side of [-1,1]) s.ellipse(cx-1, cy+side*5.2, 9,3.8, [200,230,255, 68], {outline:false});
                ccEllipse(s, cx, cy+2, 7.2,6.0, base);
                ccEllipse(s, cx+4.2, cy-1.5, 4.2,3.4, mix(base,'#ffffff',0.16));
                s.ellipse(cx+4.8, cy-2.2, 1.0,0.8,'#ff3b30',{outline:true}); s.ellipse(cx+4.8, cy-0.6, 1.0,0.8,'#ff3b30',{outline:true});
            } else if(cls.id==='enemy_spiderling'){
                // aranha chibi: 4 pernas grossas por lado + olhos vermelhos + presas
                for(const side of [-1,1]) for(let k=0;k<3;k++){
                    const bx=cx-1, by=cy+side*1.2; const kx=bx-6+ k*2.2, ky=cy+side*(4+k*1.1);
                    s.thickLine(bx, by, kx, ky, '#0a0a12', 2); s.line(bx, by, kx, ky, shade(base,-0.22));
                }
                ccEllipse(s, cx-0.5, cy+3, 7.0,6.2, base);
                ccEllipse(s, cx+3.5, cy-1.2, 3.4,2.8, mix(base,'#ffffff',0.14));
                for(let i=0;i<4;i++) s.ellipse(cx+4.2+(i%2)*1.0, cy-2+Math.floor(i/2)*1.1, 0.62,0.62, '#ff3b30', {outline:false});
            } else {
                ccEllipse(s, cx, cy+3.2, 9.2,8.2, base); ccEllipse(s, cx, cy-4.8, 5.2,5.0, mix(base,'#ffffff',0.16)); s.ellipse(cx-1.2, cy-5.2,1.0,0.7,'#ffffff',{outline:false});
            }
        } else {
            // BOSSES — imponentes fofos com chifres/coroa + highlight grande
            ccEllipse(s, cx, cy+5.5, 13.5,10.5, base);
            ccEllipse(s, cx, cy-5.8, 8.5,7.2, mix(base,'#ffffff',0.16));
            // chifres góticos minimalistas
            s.poly([[cx-9.5,cy-6],[cx-6,cy-13.5],[cx-3.5,cy-6]], shade(base,-0.34)); s.line(cx-9.5,cy-6, cx-6,cy-13.5,'#0a0a12');
            s.poly([[cx+9.5,cy-6],[cx+6,cy-13.5],[cx+3.5,cy-6]], shade(base,-0.34)); s.line(cx+9.5,cy-6, cx+6,cy-13.5,'#0a0a12');
            if(cls.id==='boss_bombardier'){ s.ellipse(cx, cy+1, 3.2,2.0,'#ff8a2a',{outline:true}); s.ellipse(cx-0.6,cy+0.4,0.9,0.6,'#ffffff',{outline:false}); }
            if(cls.id==='boss_first_queen'){ s.poly([[cx-7,cy-13],[cx,cy-18.5],[cx+7,cy-13],[cx,cy-10.5]], '#ffd54a'); s.line(cx-7,cy-13,cx,cy-18.5,'#0a0a12'); }
            if(cls.id==='boss_wolf_spider'){ for(const side of [-1,1]) for(let k=0;k<2;k++){ s.thickLine(cx-1, cy-1+side*0.8, cx-7+k*2, cy-3+side*2.2, '#0a0a12',2); } s.ellipse(cx+3.5, cy-6,0.7,0.7,'#ff3b30',{outline:false}); }
        }
        s.ellipse(cx-4.5, cy-8.5, 2.4,1.5, [255,255,255, 72], {outline:false});
        return s;
    }
    mkdirSync(path.join(ROOT,'assets/sprites/portraits'), {recursive:true});
    const portraitMap={};
    for(const cls of CLASSES){
        const surf=drawPortrait(cls);
        const file=`assets/sprites/portraits/${cls.id}.png`;
        writePNG(path.join(ROOT,file), surf);
        portraitMap[cls.id]={file, w:64, h:64};
    }
    manifest.portraits=portraitMap;
}

/* ========================================================================== *
 * Manifest
 * ========================================================================== */
writeFileSync(path.join(ROOT,'assets/sprites/manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[gen:art] OK — ${Object.keys(manifest).length} módulos (inclui ${Object.keys(manifest.portraits||{}).length} retratos) CC×DC polido minimalista`);
