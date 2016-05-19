varying vec2 uv;
varying vec2 uvBottom;
varying vec2 uvTop;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_backbuffer;

void main()
{
// if transparency type is 0, it's opaque and alpha represents unlit/lit ratio
    vec4 opaqueColor = texture2D(hx_gbufferColor, uv);
    vec4 transpColor = (texture2D(hx_gbufferColor, uvBottom) + texture2D(hx_gbufferColor, uvTop)) * .5;

    vec3 opaqueLight = texture2D(hx_backbuffer, uv).xyz;
    vec3 transpLight = (texture2D(hx_backbuffer, uvBottom).xyz + texture2D(hx_backbuffer, uvTop).xyz) * .5;
    vec4 normalSampleTop = texture2D(hx_gbufferNormals, uv);
    vec4 normalSampleBottom = texture2D(hx_gbufferNormals, uvBottom);
    float transparencyModeTop = normalSampleTop.w;
    float transparencyMode = normalSampleBottom.w;

    // handle unlit surfaces
    opaqueLight = mix(opaqueColor.xyz, opaqueLight, normalSampleTop.z);
    transpLight = mix(transpColor.xyz, transpLight, normalSampleBottom.z);

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

    // if we'd really want to, we could linearly interpolate with two-down sample here with either opaque or transparent (depending on transparency) to reduce artifacts

    float srcFactor = transparencyMode == HX_TRANSPARENCY_OPAQUE? 0.0 : transpColor.w;
    float dstFactor = transparencyMode == HX_TRANSPARENCY_ADDITIVE? 1.0 : 1.0 - srcFactor;

    gl_FragColor = vec4(opaqueLight * dstFactor + transpLight * srcFactor, 1.0);
}
