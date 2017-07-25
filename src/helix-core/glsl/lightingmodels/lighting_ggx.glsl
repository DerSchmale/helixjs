#ifdef HX_VISIBILITY_TERM
float hx_geometryTerm(vec3 normal, vec3 dir, float k)
{
    float d = max(-dot(normal, dir), 0.0);
    return d / (d * (1.0 - k) + k);
}

// schlick-beckman
float hx_lightVisibility(vec3 normal, vec3 viewDir, vec3 lightDir, float roughness)
{
	float k = roughness + 1.0;
	k = k * k * .125;
	return hx_geometryTerm(normal, viewDir, k) * hx_geometryTerm(normal, lightDir, k);
}
#endif

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

    float mappedRoughness =  geometry.roughness * geometry.roughness;

	float distribution = hx_ggxDistribution(mappedRoughness, geometry.normal, halfVector);

	float halfDotLight = max(dot(halfVector, lightDir), 0.0);
	float cosAngle = 1.0 - halfDotLight;
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance) * pow(cosAngle, 5.0);

	diffuseColor = irradiance;

	specularColor = irradiance * fresnel * distribution;

#ifdef HX_VISIBILITY_TERM
    specularColor *= hx_lightVisibility(geometry.normal, viewDir, lightDir, geometry.roughness);
#endif
}