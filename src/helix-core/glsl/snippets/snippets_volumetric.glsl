float hx_phaseRayleigh(float cosAngle)
{
    // 3 / (16PI)
    return 0.0596831 * (1.0 + cosAngle * cosAngle);
}

// schlick approximation
float hx_phaseHG(float cosAngle, float k)
{
    float d = 1.0 - k * cosAngle;
    // 4PI
    return (1.0 - k * k) / (12.56637061 * d * d);
}

vec3 hx_beerLambert(float dist, vec3 extinction)
{
    return exp(-dist * extinction);
}