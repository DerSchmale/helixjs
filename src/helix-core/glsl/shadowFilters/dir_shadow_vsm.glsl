vec4 hx_getShadowMapValue(float depth)
{
    return vec4(hx_floatToRG8(depth), hx_floatToRG8(depth * depth));
}

float hx_getShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias, vec2 screenUV)
{
    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);
    vec4 s = texture2D(shadowMap, shadowMapCoord.xy);
    vec2 moments = vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));
    shadowMapCoord.z += depthBias;

    float variance = moments.y - moments.x * moments.x;
    variance = max(variance, HX_VSM_MIN_VARIANCE);
    float diff = shadowMapCoord.z - moments.x;
    float upperBound = variance / (variance + diff*diff);

    float shadow = max(upperBound, float(shadowMapCoord.z <= moments.x));

    shadow = saturate((shadow - HX_VSM_LIGHT_BLEED_REDUCTION) / (1.0 - HX_VSM_LIGHT_BLEED_REDUCTION));
    return shadow;
}