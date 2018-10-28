#define HX_PROBE_K0 .00098
#define HX_PROBE_K1 .9921

struct HX_DiffuseProbe
{
    vec3 sh[9]; // rotated to be in view space
    vec3 position;
    float intensity;
    float sizeSqr;
};

struct HX_SpecularProbe
{
    vec3 position;
    float intensity;
    float sizeSqr;
    float numMips;
};

float hx_getProbeWeight(vec3 viewPos, vec3 pos, float sizeSqr)
{
    vec3 diff = viewPos - pos;
    float distSqr = dot(diff, diff);
    float weight = 1.0 / distSqr;

    if (sizeSqr > 0.0)
        weight *= saturate(1.0 - distSqr / sizeSqr);

    return weight;
}


float hx_getProbeWeight(HX_SpecularProbe probe, vec3 viewPos)
{
    return hx_getProbeWeight(viewPos, probe.position, probe.sizeSqr);
}

float hx_getProbeWeight(HX_DiffuseProbe probe, vec3 viewPos)
{
    return hx_getProbeWeight(viewPos, probe.position, probe.sizeSqr);
}

vec3 hx_calculateSpecularProbeLight(HX_SpecularProbe probe, samplerCube texture, vec3 reflectedViewDir, vec3 fresnelColor, float roughness)
{
    #ifdef HX_SKIP_SPECULAR
        return vec3(0.0);
    #endif

    #if defined(HX_TEXTURE_LOD) || defined (HX_GLSL_300_ES)
    // knald method:
        float power = 2.0/(roughness * roughness) - 2.0;
        float factor = (exp2(-10.0/sqrt(power)) - HX_PROBE_K0)/HX_PROBE_K1;
        float mipLevel = probe.numMips * (1.0 - clamp(factor, 0.0, 1.0));
        #ifdef HX_GLSL_300_ES
        vec4 specProbeSample = textureLod(texture, reflectedViewDir.xzy, mipLevel);
        #else
        vec4 specProbeSample = textureCubeLodEXT(texture, reflectedViewDir.xzy, mipLevel);
        #endif
    #else
        vec4 specProbeSample = textureCube(texture, reflectedViewDir.xzy);
    #endif
	return hx_gammaToLinear(specProbeSample.xyz) * fresnelColor * probe.intensity;
}