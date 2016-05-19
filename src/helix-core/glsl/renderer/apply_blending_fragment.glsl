varying vec2 uv;
varying vec2 uvBottom;
varying vec2 uvTop;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_backbuffer;

void main()
{
// if transparency type is 0, it's opaque and alpha represents unlit/lit ratio
    vec4 transpColor = texture2D(hx_gbufferColor, uv);
    vec4 opaqueColor = (texture2D(hx_gbufferColor, uvBottom) + texture2D(hx_gbufferColor, uvTop)) * .5;

    vec3 transpLight = texture2D(hx_backbuffer, uv).xyz;
    vec3 opaqueLight = (texture2D(hx_backbuffer, uvBottom).xyz + texture2D(hx_backbuffer, uvTop).xyz) * .5;
    vec4 normalSampleTop = texture2D(hx_gbufferNormals, uv);
    vec4 normalSampleBottom = texture2D(hx_gbufferNormals, uvBottom);
    float transparencyMode = normalSampleTop.w;
    float transparencyModeBottom = normalSampleBottom.w;
    float emissionTop = normalSampleTop.z * HX_EMISSION_RANGE;
    float emissionBottom = normalSampleBottom.z * HX_EMISSION_RANGE;

    transpLight *= max(1.0 - emissionTop, 0.0);
    opaqueLight *= max(1.0 - emissionBottom, 0.0);
    transpLight += transpColor.xyz * emissionTop;
    opaqueLight += opaqueColor.xyz * emissionBottom;

    // swap pixels if the current pixel is not the transparent one, but the neighbour is
    if (transparencyModeBottom != HX_TRANSPARENCY_OPAQUE) {
        transparencyMode = transparencyModeBottom;
        vec4 temp = transpColor;
        transpColor = opaqueColor;
        opaqueColor = temp;

        temp.xyz = opaqueLight;
        opaqueLight = transpLight;
        transpLight = temp.xyz;
    }

    float srcFactor = transparencyMode == HX_TRANSPARENCY_OPAQUE? 1.0 : transpColor.w;
    float dstFactor = transparencyMode == HX_TRANSPARENCY_ADDITIVE? 1.0 : 1.0 - srcFactor;

    gl_FragColor = vec4(opaqueLight * dstFactor + transpLight * srcFactor, 1.0);
}
