vec3 hx_calculateDiffuseProbeLight(samplerCube texture, vec3 normal)
{
	return hx_gammaToLinear(textureCube(texture, normal).xyz);
}

vec3 hx_calculateSpecularProbeLight(samplerCube texture, vec3 reflectedViewDir, vec3 fresnelColor, float geometricFactor, float roughness)
{
    #ifdef USE_TEX_LOD
    // knald method:
        float power = 2.0/(roughness * roughness) - 2.0;
        float factor = (exp2(-10.0/sqrt(power)) - K0)/K1;
        float mipLevel = numMips*(1.0 - clamp(factor/maxMipFactor, 0.0, 1.0));
        vec4 specProbeSample = textureCubeLodEXT(texture, reflectedViewDir, mipLevel);
    #else
        vec4 specProbeSample = textureCube(texture, reflectedViewDir);
    #endif
	return hx_gammaToLinear(specProbeSample.xyz) * fresnelColor * geometricFactor;
}