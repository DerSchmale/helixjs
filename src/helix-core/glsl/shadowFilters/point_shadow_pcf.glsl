#ifdef HX_POINT_PCF_DITHER_SHADOWS
    uniform sampler2D hx_dither2D;
    uniform vec2 hx_dither2DTextureScale;
#endif

uniform vec2 hx_poissonDisk[32];

vec4 hx_point_getShadowMapValue(float distance)
{
    return hx_floatToRGBA8(distance);
}

#ifdef HX_FRAGMENT_SHADER
float hx_point_readShadow(samplerCube shadowMap, vec3 worldDir, float rcpRadius, float depthBias)
{
    // in world direction, because rendering cube map in view space introduces temporal aliasing
    float dist = length(worldDir);
    worldDir /= dist;

    // get the basis perpendicular to the sample vector to distribute the sphere samples correctly
    float shadowTest = 0.0;
    vec3 xDir = cross(worldDir, vec3(0.0, 1.0, 0.0));
    vec3 yDir = cross(xDir, worldDir);

    #ifdef HX_POINT_PCF_DITHER_SHADOWS
        vec4 dither = hx_sampleDefaultDither(hx_dither2D, gl_FragCoord.xy * hx_dither2DTextureScale);
        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * HX_POINT_PCF_SOFTNESS;  // add radius scale
    #else
        vec4 dither = vec4(HX_POINT_PCF_SOFTNESS);
    #endif

    vec3 offset = vec3(0.0);
    for (int i = 0; i < HX_POINT_PCF_NUM_SHADOW_SAMPLES; ++i) {
        offset.x = dot(dither.xy, hx_poissonDisk[i]);
        offset.y = dot(dither.zw, hx_poissonDisk[i]);
        vec3 coord = worldDir + xDir * offset.x + yDir * offset.y;
        float shadowSample = hx_RGBA8ToFloat(textureCube(shadowMap, coord.xzy));
        float diff = dist * rcpRadius - shadowSample - depthBias;
        shadowTest += float(diff < 0.0);
    }


    return shadowTest * HX_POINT_PCF_RCP_NUM_SHADOW_SAMPLES;
}
#endif