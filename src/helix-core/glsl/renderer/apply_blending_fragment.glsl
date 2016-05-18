varying vec2 uv;
varying vec2 uvBottom;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_backbuffer;

void main()
{
// if transparency type is 0, it's opaque and alpha represents unlit/lit ratio
    vec4 opaqueColor = texture2D(hx_gbufferColor, uv);
    vec4 transpColor = texture2D(hx_gbufferColor, uvBottom);
    vec3 opaqueLight = texture2D(hx_backbuffer, uv).xyz;
    vec3 transpLight = texture2D(hx_backbuffer, uvBottom).xyz;
    float transparencyModeTop = texture2D(hx_gbufferNormals, uv).w;
    float transparencyMode = texture2D(hx_gbufferNormals, uvBottom).w;

    // swap pixels if top is the transparent one
    // not sure if this optimizes well
    if (transparencyModeTop != HX_TRANSPARENCY_OPAQUE) {
        transparencyMode = transparencyModeTop;
        vec4 temp = transpColor;
        transpColor = opaqueColor;
        opaqueColor = temp;

        temp.xyz = opaqueLight.xyz;
        opaqueLight.xyz = transpLight.xyz;
        transpLight.xyz = temp.xyz;
    }

    // handle unlit opaques
    opaqueLight = mix(opaqueColor.xyz, opaqueLight, opaqueColor.w);

    float srcFactor = transparencyMode == HX_TRANSPARENCY_OPAQUE? 0.0 : transpColor.w;
    float dstFactor = transparencyMode == HX_TRANSPARENCY_ADDITIVE? 1.0 : 1.0 - srcFactor;

    gl_FragColor = vec4(opaqueLight * dstFactor + transpLight * srcFactor, 1.0);
}
