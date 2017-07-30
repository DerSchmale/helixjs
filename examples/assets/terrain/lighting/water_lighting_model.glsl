// schlick-beckman
float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)
{
	float nDotV = max(-dot(normal, viewDir), 0.0);
	float r = roughness * roughness * 0.797896;
	float g1 = nDotV * (1.0 - r) + r;
	float g2 = nDotL * (1.0 - r) + r;
    return .25 / (g1 * g2);
}

float hx_ggxDistribution(float roughness, vec3 normal, vec3 halfVector)
{
    float roughSqr = roughness*roughness;
    float halfDotNormal = max(-dot(halfVector, normal), 0.0);
    float denom = (halfDotNormal * halfDotNormal) * (roughSqr - 1.0) + 1.0;
    return roughSqr / (denom * denom);
}

#define HX_NUM_VOLUME_SAMPLES 5

float hx_scatter(vec3 lightDir, vec3 viewDir)
{
    float d = dot(lightDir, viewDir);
    float g = -.5;
    float g2 = g * g;
    return pow(1.0 - g, 2.0) / pow(1.0 + g2 - 2.0 * g * d, 1.5) / 12.0;
}

vec3 hx_marchRay(HX_GeometryData geometry, vec3 lightDir, vec3 lightColor, vec3 viewDir, vec3 viewPos)
{
    float rayDistance = geometry.data.w;
    vec3 absorption = geometry.data.xyz;
    float t = viewPos.y / viewDir.y;
    float stepDistance = rayDistance / float(HX_NUM_VOLUME_SAMPLES);
    vec3 rayStep = viewDir * stepDistance;
    vec3 samplePos = viewDir * t + rayStep * .5;
    vec3 accum = vec3(0.0);

    float scatter = hx_scatter(lightDir, viewDir) * .1;
    float travelDistance = stepDistance * .5;

    for (int i = 0; i < HX_NUM_VOLUME_SAMPLES; ++i) {
        vec3 extinction = -absorption * travelDistance;
        extinction.x = exp(extinction.x);
        extinction.y = exp(extinction.y);
        extinction.z = exp(extinction.z);
        samplePos += rayStep;
        vec3 attenuatedLight = lightColor * extinction;
        accum += attenuatedLight * scatter * stepDistance;
        travelDistance += stepDistance;
    }

    return accum;
}

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = max(-dot(lightDir, geometry.normal), 0.0);
	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

	float distribution = hx_ggxDistribution(geometry.roughness, geometry.normal, halfVector);

	float halfDotLight = max(dot(halfVector, lightDir), 0.0);
	float cosAngle = 1.0 - halfDotLight;
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance) * pow(cosAngle, 5.0);

	diffuseColor = vec3(0.0);

	specularColor = irradiance * fresnel * distribution;

#ifdef VISIBILITY
    specularColor *= hx_lightVisibility(normal, lightDir, geometry.roughness, nDotL);
#endif

//    specularColor += hx_marchRay(geometry, lightDir, lightColor, viewDir, viewPos);
    // TODO: Probably also should add inscattering to specular component (otherwise albedo would be applied)
    // So for inscattering, what do we need:
    //  - fragment view position (!)
    //  - density information (can be in custom GeometryData field), or just list the same uniform here
}