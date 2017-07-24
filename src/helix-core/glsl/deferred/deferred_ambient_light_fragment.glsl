varying vec2 uv;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormalDepth;
uniform sampler2D hx_gbufferSpecular;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;
#endif

uniform vec3 hx_ambientColor;


void main()
{
// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method
    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);

    gl_FragColor.xyz = hx_ambientColor * data.geometry.color.xyz * data.geometry.occlusion;

#ifdef HX_SSAO
    gl_FragColor.xyz *= texture2D(hx_ssao, uv).x;
#endif

    gl_FragColor.w = 1.0;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}