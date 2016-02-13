vec4 hx_getShadowMapValue(float depth)
{
    // I wish we could write exp directly, but precision issues
//    return vec4(exp(HX_ESM_CONSTANT * depth));
// so when blurring, we'll need to do ln(sum(exp())
    return hx_floatToRGBA8(depth);
}

float hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)
{
    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);
    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));
    shadowMapCoord.z += depthBias;
    float diff = shadowSample - shadowMapCoord.z;
    return saturate(HX_ESM_DARKENING * exp(HX_ESM_CONSTANT * diff));
}