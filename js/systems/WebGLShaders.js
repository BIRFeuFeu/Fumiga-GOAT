/**
 * js/systems/WebGLShaders.js — Registro do shader Chroma Key [TDD §7.2]
 * ---------------------------------------------------------------------------
 * A FONTE do shader mora em GLSL puro, em `assets/shaders/chromakey.frag`
 * (linguagem GLSL, não JS). O PreloadScene carrega o arquivo via
 * `this.load.text` e passa o texto aqui. O fallback inline existe só para
 * ambientes sem o arquivo (ex.: testes headless).
 *
 * Registrado apenas quando o renderer é WEBGL.
 *
 * NOTA (beta): os sprites procedurais já saem com alpha real, então nenhum
 * asset depende deste shader por padrão. Para ativar num asset, marque
 * `chromaKey:true` no manifest e aplique `sprite.setPipeline('ChromaKey')`.
 * ---------------------------------------------------------------------------
 */
const CHROMA_FRAG_FALLBACK = `
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
`;

export function registerChromaKey(game, fragSource) {
    if (!game.renderer || game.renderer.type !== Phaser.WEBGL) return false;
    const frag = (typeof fragSource === 'string' && fragSource.trim())
        ? fragSource
        : CHROMA_FRAG_FALLBACK;
    class ChromaKeyPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
        constructor(g) {
            super({ game: g, fragShader: frag });
        }
    }
    try {
        game.renderer.pipelines.add('ChromaKey', ChromaKeyPipeline);
        return true;
    } catch (e) {
        return false;
    }
}
