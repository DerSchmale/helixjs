uniform vec2 hx_rcpRenderTargetResolution;

// TODO: Replace with hx_backBuffer, since it will contain the lit stuff
uniform sampler2D hx_gbufferAlbedo;

void main()
{
    HX_GeometryData data = hx_geometry();
    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
    gl_FragColor = texture2D(hx_gbufferAlbedo, screenUV);
    gl_FragColor.xyz += data.emission;
}