uniform vec3 hx_ambientColor;

#ifdef HX_SSAO
uniform sampler2D hx_ssao;
#endif

uniform vec2 hx_rcpRenderTargetResolution;

void main()
{
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;

    HX_GeometryData data = hx_geometry();
    // simply override with emission
    gl_FragColor = data.color;
    #ifdef HX_SSAO
    float ssao = texture2D(hx_ssao, screenUV).x;
    #else
    float ssao = 1.0;
    #endif
    gl_FragColor.xyz = gl_FragColor.xyz * hx_ambientColor * ssao + data.emission;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}