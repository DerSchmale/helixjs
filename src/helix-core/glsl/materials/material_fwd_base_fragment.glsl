uniform vec3 hx_ambientColor;

uniform sampler2D hx_ssao;
uniform vec2 hx_rcpRenderTargetResolution;

void main()
{
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;

    HX_GeometryData data = hx_geometry();
    // simply override with emission
    gl_FragColor = data.color;
    float ssao = texture2D(hx_ssao, screenUV).x;
    gl_FragColor.xyz = gl_FragColor.xyz * hx_ambientColor * ssao + data.emission;

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}