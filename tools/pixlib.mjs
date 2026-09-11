/**
 * tools/pixlib.mjs — Micro-biblioteca de Pixel Art / Áudio usada pelos geradores de assets.
 *
 * Zero dependências: escreve PNG (RGBA 8-bit) e WAV (PCM 16-bit) à mão.
 * Tudo é desenhado pixel a pixel para respeitar a regra da Art Bible:
 * "crocante" (crisp-edges), sem blur e sem antialiasing.
 */
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/* ------------------------------------------------------------------ *
 *  Cor / Paleta
 * ------------------------------------------------------------------ */

/** Aceita '#rrggbb', '#rgb' ou [r,g,b,a] e devolve [r,g,b,a]. */
export function rgba(c, alpha = 255) {
    if (Array.isArray(c)) return [c[0] | 0, c[1] | 0, c[2] | 0, c.length > 3 ? c[3] : alpha];
    const s = String(c);
    // suporta rgb()/rgba() — usado por ícones de feromônio e vinheta
    const fn = s.match(/^rgba?\(([^)]+)\)$/);
    if (fn) {
        const parts = fn[1].split(',').map((v) => parseFloat(v.trim()));
        return [parts[0] | 0, parts[1] | 0, parts[2] | 0, parts.length > 3 ? Math.round(parts[3] * 255) : alpha];
    }
    let h = s.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), alpha];
}

function clamp(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Escurece (t<0) ou clareia (t>0) uma cor. t em -1..1 */
export function shade(c, t) {
    const [r, g, b, a] = rgba(c);
    if (t < 0) return [clamp(r * (1 + t)), clamp(g * (1 + t)), clamp(b * (1 + t)), a];
    return [clamp(r + (255 - r) * t), clamp(g + (255 - g) * t), clamp(b + (255 - b) * t), a];
}

/** Mistura duas cores. */
export function mix(c1, c2, t) {
    const a = rgba(c1);
    const b = rgba(c2);
    return [
        clamp(a[0] + (b[0] - a[0]) * t),
        clamp(a[1] + (b[1] - a[1]) * t),
        clamp(a[2] + (b[2] - a[2]) * t),
        clamp(a[3] + (b[3] - a[3]) * t)
    ];
}

/** Rampa de N tons (do mais escuro ao mais claro) — base do shading 2D denso. */
export function ramp(base, steps = 4, dark = -0.6, light = 0.35) {
    const out = [];
    for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0 : i / (steps - 1);
        out.push(shade(base, dark + (light - dark) * t));
    }
    return out;
}

/* ------------------------------------------------------------------ *
 *  Surface — tela de pixels
 * ------------------------------------------------------------------ */

export class Surface {
    constructor(w, h, fill = null) {
        this.w = w;
        this.h = h;
        this.data = new Uint8Array(w * h * 4);
        if (fill) this.clear(fill);
    }

    clear(color) {
        const [r, g, b, a] = rgba(color);
        for (let i = 0; i < this.data.length; i += 4) {
            this.data[i] = r;
            this.data[i + 1] = g;
            this.data[i + 2] = b;
            this.data[i + 3] = a;
        }
        return this;
    }

    inside(x, y) {
        return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }

    /** set com blending "over" simples (respeita alpha da tinta). */
    px(x, y, color) {
        x = Math.round(x);
        y = Math.round(y);
        if (!this.inside(x, y)) return this;
        const [r, g, b, a] = rgba(color);
        if (a === 0) return this;
        const i = (y * this.w + x) * 4;
        if (a >= 255) {
            this.data[i] = r;
            this.data[i + 1] = g;
            this.data[i + 2] = b;
            this.data[i + 3] = 255;
        } else {
            const sa = a / 255;
            const da = this.data[i + 3] / 255;
            const oa = sa + da * (1 - sa);
            if (oa > 0) {
                this.data[i] = clamp((r * sa + this.data[i] * da * (1 - sa)) / oa);
                this.data[i + 1] = clamp((g * sa + this.data[i + 1] * da * (1 - sa)) / oa);
                this.data[i + 2] = clamp((b * sa + this.data[i + 2] * da * (1 - sa)) / oa);
            }
            this.data[i + 3] = clamp(oa * 255);
        }
        return this;
    }

    rect(x, y, w, h, color) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color);
        return this;
    }

    /** Retângulo com shading vertical (rampa) — dá o volume 2D "denso". */
    rectShaded(x, y, w, h, base, rampSteps = 3) {
        const r = ramp(base, rampSteps);
        for (let j = 0; j < h; j++) {
            const t = h === 1 ? 1 : j / (h - 1);
            const idx = Math.min(r.length - 1, Math.floor((1 - t) * r.length));
            for (let i = 0; i < w; i++) this.px(x + i, y + j, r[idx]);
        }
        return this;
    }

    /** Elipse cheia com contorno + rim light (iluminação vinda do topo-esquerda). */
    ellipse(cx, cy, rx, ry, base, opts = {}) {
        const { outline = true, rim = true, rampSteps = 4 } = opts;
        const r = ramp(base, rampSteps);
        const dark = shade(base, -0.75);
        const lightColor = shade(base, 0.5);
        for (let y = -Math.ceil(ry) - 1; y <= Math.ceil(ry) + 1; y++) {
            for (let x = -Math.ceil(rx) - 1; x <= Math.ceil(rx) + 1; x++) {
                const nx = rx > 0 ? x / rx : 99;
                const ny = ry > 0 ? y / ry : 99;
                const d = nx * nx + ny * ny;
                if (d <= 1) {
                    // gradiente radial deslocado para cima/esquerda (fonte de luz)
                    const g = Math.max(0, Math.min(1, (1 - d) * 0.8 + (-x / (rx * 2) - y / (ry * 2)) * 0.5 + 0.35));
                    const idx = Math.min(r.length - 1, Math.floor(g * r.length));
                    this.px(cx + x, cy + y, r[idx]);
                } else if (outline && d <= 1.35) {
                    this.px(cx + x, cy + y, dark);
                }
            }
        }
        if (rim) {
            // brilho pontual no quadrante superior esquerdo
            this.px(cx - Math.floor(rx * 0.4), cy - Math.floor(ry * 0.45), lightColor);
            this.px(cx - Math.floor(rx * 0.4) + 1, cy - Math.floor(ry * 0.45), mix(base, lightColor, 0.5));
        }
        return this;
    }

    line(x0, y0, x1, y1, color) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            this.px(x0, y0, color);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
        return this;
    }

    /** Linha "grossa" (2px) desenhada com deslocamento perpendicular. */
    thickLine(x0, y0, x1, y1, color, w = 2) {
        this.line(x0, y0, x1, y1, color);
        if (w > 1) this.line(x0, y0 + 1, x1, y1 + 1, color);
        if (w > 2) this.line(x0 + 1, y0, x1 + 1, y1, color);
        return this;
    }

    /** Polígono cheio (scanline) — usado para mandíbulas, esporões e estandartes. */
    poly(points, color) {
        if (points.length < 3) return this;
        const ys = points.map((p) => p[1]);
        const minY = Math.floor(Math.min(...ys));
        const maxY = Math.ceil(Math.max(...ys));
        for (let y = minY; y <= maxY; y++) {
            const xs = [];
            for (let i = 0; i < points.length; i++) {
                const [ax, ay] = points[i];
                const [bx, by] = points[(i + 1) % points.length];
                if ((ay <= y && by > y) || (by <= y && ay > y)) {
                    xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
                }
            }
            xs.sort((a, b) => a - b);
            for (let i = 0; i + 1 < xs.length; i += 2) {
                const x0 = Math.round(xs[i]);
                const x1 = Math.round(xs[i + 1]);
                for (let x = x0; x <= x1; x++) this.px(x, y, color);
            }
        }
        return this;
    }

    /** Ruído determinístico (xorshift) para textura de terra/pedra. */
    noise(seed) {
        let s = seed >>> 0 || 1;
        return () => {
            s ^= s << 13;
            s >>>= 0;
            s ^= s >> 17;
            s ^= s << 5;
            s >>>= 0;
            return s / 4294967296;
        };
    }

    blit(other, ox, oy, flipX = false) {
        for (let y = 0; y < other.h; y++) {
            for (let x = 0; x < other.w; x++) {
                const sx = flipX ? other.w - 1 - x : x;
                const i = (y * other.w + sx) * 4;
                const a = other.data[i + 3];
                if (a === 0) continue;
                this.px(ox + x, oy + y, [other.data[i], other.data[i + 1], other.data[i + 2], a]);
            }
        }
        return this;
    }

    /** Aplica uma cor sólida só nos pixels opacos (troca de paleta / tint de bioma). */
    recolor(fn) {
        for (let i = 0; i < this.data.length; i += 4) {
            if (this.data[i + 3] === 0) continue;
            const out = fn([this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]]);
            if (out) {
                this.data[i] = clamp(out[0]);
                this.data[i + 1] = clamp(out[1]);
                this.data[i + 2] = clamp(out[2]);
                this.data[i + 3] = clamp(out[3]);
            }
        }
        return this;
    }
}

/* ------------------------------------------------------------------ *
 *  PNG
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Codifica uma Surface como PNG RGBA 8-bit. */
export function encodePNG(surface) {
    const { w, h, data } = surface;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 4 + 1)] = 0; // filter: None
        Buffer.from(data.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type RGBA
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

/** Salva uma Surface como PNG. */
export function writePNG(file, surface) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, encodePNG(surface));
    return file;
}

/**
 * Cria um sprite sheet em grade: cada frame vem de uma função (i) => Surface.
 * `frames` frames dispostos em `cols` colunas.
 */
export function spriteSheet(frameW, frameH, frames, draw, cols = frames) {
    const rows = Math.ceil(frames / cols);
    const sheet = new Surface(frameW * cols, frameH * rows);
    for (let i = 0; i < frames; i++) {
        const cell = draw(i, frameW, frameH);
        sheet.blit(cell, (i % cols) * frameW, Math.floor(i / cols) * frameH);
    }
    return sheet;
}

/* ------------------------------------------------------------------ *
 *  WAV (PCM 16-bit mono)
 * ------------------------------------------------------------------ */

export function writeWAV(file, samples, sampleRate = 22050) {
    const bytes = samples.length * 2;
    const buf = Buffer.alloc(44 + bytes);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + bytes, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20); // PCM
    buf.writeUInt16LE(1, 22); // mono
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(bytes, 40);
    for (let i = 0; i < samples.length; i++) {
        const v = Math.max(-1, Math.min(1, samples[i]));
        buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
    }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, buf);
    return file;
}

/* ------------------------------------------------------------------ *
 *  AngelCode BitmapFont XML (para o Phaser bitmapText)
 * ------------------------------------------------------------------ */

export function bitmapFontXML({ fontName, size, chars, lineHeight, base, pages, scaleW = 256, scaleH = 256 }) {
    const charLines = chars
        .map(
            (c) =>
                `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" xoffset="${c.xoffset}" yoffset="${c.yoffset}" xadvance="${c.xadvance}" page="0" chnl="15"/>`
        )
        .join('\n');
    const pageLines = pages.map((p, i) => `    <page id="${i}" file="${p}"/>`).join('\n');
    return `<?xml version="1.0"?>
<font>
  <info face="${fontName}" size="${size}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="0,0"/>
  <common lineHeight="${lineHeight}" base="${base}" scaleW="${chars.charW || 256}" scaleH="256" pages="${pages.length}" packed="0"/>
  <pages>
${pageLines}
  </pages>
  <chars count="${chars.length}">
${charLines}
  </chars>
</font>
`;
}
