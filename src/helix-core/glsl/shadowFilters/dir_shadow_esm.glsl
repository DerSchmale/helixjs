vec4 hx_dir_getShadowMapValue(float depth)
{
    // I wish we could write exp directly, but precision issues (can't encode real floats)
    return vec4(exp(HX_ESM_CONSTANT * depth));
// so when blurring, we'll need to do ln(sum(exp())
//    return vec4(depth);
}

float hx_dir_readShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias)
{
    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);
    float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;
    shadowMapCoord.z += depthBias;
//    float diff = shadowSample - shadowMapCoord.z;
//    return saturate(HX_ESM_DARKENING * exp(HX_ESM_CONSTANT * diff));
    return saturate(HX_ESM_DARKENING * shadowSample * exp(-HX_ESM_CONSTANT * shadowMapCoord.z));
}