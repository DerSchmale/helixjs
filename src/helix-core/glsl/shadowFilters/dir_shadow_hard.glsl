vec4 hx_getShadowMapValue(float depth)
{
    return hx_floatToRGBA8(depth);
}

float hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)
{
    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);
    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));
    float diff = shadowMapCoord.z - shadowSample - depthBias;
    return float(diff < 0.0);
}