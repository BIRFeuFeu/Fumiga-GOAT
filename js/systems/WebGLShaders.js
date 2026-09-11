/**
 * js/systems/WebGLShaders.js — Shader de Chroma Key (remoção de fundo verde) [TDD §7.2]
 * ---------------------------------------------------------------------------
 * Fragment shader que descarta pixels verde-puro (#00FF00) com tolerância para
 * compressão. Registrado apenas quando o renderer é WEBGL.
 *
 * NOTA (beta): os sprites procedurais já saem com alpha real, então nenhum asset
 * depende deste shader por padrão. Para ativar num asset, marque `chromaKey:true`
 * no manifest e aplique `sprite.setPipeline('ChromaKey')`.
 * ---------------------------------------------------------------------------
 */
const CHROMA_FRAG = `
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

export function registerChromaKey(game) {
    if (!game.renderer || game.renderer.type !== Phaser.WEBGL) return false;
    class ChromaKeyPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
        constructor(g) {
            super({ game: g, fragShader: CHROMA_FRAG });
        }
    }
    try {
        game.renderer.pipelines.add('ChromaKey', ChromaKeyPipeline);
        return true;
    } catch (e) {
        return false;
    }
}
