vec4 hx_point_getShadowMapValue(float distance)
{
    return hx_floatToRGBA8(distance);
}

float hx_point_readShadow(samplerCube shadowMap, vec3 worldDir, float rcpRadius, float depthBias)
{
    // in world direction, because rendering cube map in view space introduces temporal aliasing

    float dist = length(worldDir);
    worldDir /= dist;
    float shadowSample = hx_RGBA8ToFloat(textureCube(shadowMap, worldDir));
    float diff = dist * rcpRadius - shadowSample - depthBias;
    return float(diff < 0.0);
}