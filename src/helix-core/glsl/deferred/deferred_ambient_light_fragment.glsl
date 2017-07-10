varying vec2 uv;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_ssao;

uniform vec3 hx_ambientColor;


void main()
{
// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    float ssao = texture2D(hx_ssao, uv).x;

    gl_FragColor.xyz = hx_ambientColor * ssao * data.geometry.color.xyz;
    gl_FragColor.w = 1.0;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}