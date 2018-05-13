#ifdef HX_PCF_DITHER_SHADOWS
    uniform sampler2D hx_dither2D;
    uniform vec2 hx_dither2DTextureScale;
#endif

uniform vec2 hx_poissonDisk[32];

vec4 hx_getShadowMapValue(float depth)
{
    return hx_floatToRGBA8(depth);
}

float hx_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)
{
    float shadowTest = 0.0;

    #ifdef HX_PCF_DITHER_SHADOWS
        vec4 dither = hx_sampleDefaultDither(hx_dither2D, gl_FragCoord.xy * hx_dither2DTextureScale);
        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * HX_PCF_SOFTNESS;  // add radius scale
    #else
        vec4 dither = vec4(HX_PCF_SOFTNESS);
    #endif

    for (int i = 0; i < HX_PCF_NUM_SHADOW_SAMPLES; ++i) {
        vec2 offset;
        offset.x = dot(dither.xy, hx_poissonDisk[i]);
        offset.y = dot(dither.zw, hx_poissonDisk[i]);
        float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy + offset));
        float diff = shadowMapCoord.z - shadowSample - depthBias;
        shadowTest += float(diff < 0.0);
    }

    return shadowTest * HX_PCF_RCP_NUM_SHADOW_SAMPLES;
}