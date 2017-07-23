vec4 hx_spot_getShadowMapValue(float depth)
{
    return hx_floatToRGBA8(depth);
}

float hx_spot_readShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias)
{
    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);
    shadowMapCoord /= shadowMapCoord.w;
    shadowMapCoord.xyz = shadowMapCoord.xyz * .5 + .5;
    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));
    float diff = shadowMapCoord.z - shadowSample - depthBias;
    return float(diff < 0.0);
}