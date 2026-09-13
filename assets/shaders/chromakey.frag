// ---------------------------------------------------------------------------
// chromakey.frag — Shader de Chroma Key (remoção de fundo verde) [TDD §7.2]
// ---------------------------------------------------------------------------
// GLSL ES (WebGL 1). Descarta pixels verde-puro (#00FF00) com tolerância para
// compressão. Fonte mora em arquivo .frag próprio (linguagem GLSL, não JS);
// PreloadScene carrega via load.text e injeta no pipeline em WebGLShaders.js.
// ---------------------------------------------------------------------------

precision mediump float;

uniform sampler2D uMainSampler;

varying vec2 outTexCoord;

void main(void) {
    vec4 color = texture2D(uMainSampler, outTexCoord);
    if (color.r < 0.1 && color.g > 0.9 && color.b < 0.1) {
        discard;
    }
    gl_FragColor = color;
}
