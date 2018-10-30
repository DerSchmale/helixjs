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
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = max(-dot(lightDir, geometry.normal), 0.0);
	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

    float roughAlpha = geometry.roughness;

	float distribution = hx_ggxDistribution(roughAlpha, geometry.normal, halfVector);

	float halfDotLight = max(dot(halfVector, lightDir), 0.0);
	float cosAngle = 1.0 - halfDotLight;
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance) * pow(cosAngle, 5.0);

	diffuseColor = vec3(0.0);

	specularColor = irradiance * fresnel * distribution;

#ifdef VISIBILITY
    specularColor *= hx_lightVisibility(normal, lightDir, geometry.roughness, nDotL);
#endif
}