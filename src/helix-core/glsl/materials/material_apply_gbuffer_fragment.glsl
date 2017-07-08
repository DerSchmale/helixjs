uniform vec2 hx_rcpRenderTargetResolution;

uniform sampler2D hx_lightAccumulation;

void main()
{
    HX_GeometryData data = hx_geometry();
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
    gl_FragColor = texture2D(hx_lightAccumulation, screenUV);
    gl_FragColor.xyz += data.emission;
}