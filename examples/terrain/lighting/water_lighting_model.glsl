float hx_probeGeometricShadowing(vec3 normal, vec3 reflection, float roughness, float metallicness)
{
    /*float nDotV = max(dot(normal, reflection), 0.0);
    float att = nDotV / (nDotV * (1.0 - roughness) + roughness);*/
    // TODO: Get a better approximation
    float att = 1.0 - roughness;
    return mix(att, 1.0, metallicness);
}

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

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 normalSpecularReflectance, float roughness, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = max(-dot(lightDir, normal), 0.0);
	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

	float distribution = hx_ggxDistribution(roughness, normal, halfVector);

	float halfDotLight = max(dot(halfVector, lightDir), 0.0);
	float cosAngle = 1.0 - halfDotLight;
	// to the 5th power
	float power = cosAngle*cosAngle;
	power *= power;
	power *= cosAngle;
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance)*power;

	diffuseColor = vec3(0.0);

	specularColor = irradiance * fresnel * distribution;

#ifdef VISIBILITY
    specularColor *= hx_lightVisibility(normal, lightDir, roughness, nDotL);
#endif

    // TODO: Probably also should add inscattering to specular component (otherwise albedo would be applied)

}