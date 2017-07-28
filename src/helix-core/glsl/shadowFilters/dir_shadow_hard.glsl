vec4 hx_dir_getShadowMapValue(float depth)
{
    return hx_floatToRGBA8(depth);
}

float hx_dir_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)
{
    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));
    float diff = shadowMapCoord.z - shadowSample - depthBias;
    return float(diff < 0.0);
}