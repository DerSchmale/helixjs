vec4 hx_getShadowMapValue(float depth)
{
    return hx_floatToRGBA8(exp(80.0 * depth));
}