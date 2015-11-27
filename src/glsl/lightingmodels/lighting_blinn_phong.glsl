/*float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)
{
	float nDotV = max(-dot(normal, viewDir), 0.0);
    float roughSqr = roughness*roughness;
    float g1 = nDotV + sqrt( roughSqr + (1.0 - roughSqr) * nDotV * nDotV );
    float g2 = nDotL + sqrt( roughSqr + (1.0 - roughSqr) * nDotL * nDotL );
    return 1.0 / (g1 * g2);
}*/

// schlick-beckman
float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)
{
	float nDotV = max(-dot(normal, viewDir), 0.0);
	float r = roughness * roughness * 0.797896;
	float g1 = nDotV * (1.0 - r) + r;
	float g2 = nDotL * (1.0 - r) + r;
    return .25 / (g1 * g2);
}

float hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)
{
	float roughSqr = roughness*roughness;
	roughSqr *= roughSqr;
	float halfDotNormal = max(-dot(halfVector, normal), 0.0);
	// the
	return pow(halfDotNormal, 2.0/roughSqr - 2.0)/roughSqr;
}

void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = max(-dot(lightDir, normal), 0.0);
	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

	float distribution = hx_blinnPhongDistribution(roughness, normal, halfVector);

	float halfDotLight = dot(halfVector, lightDir);
	float cosAngle = 1.0 - halfDotLight;
	// to the 5th power
	float power = cosAngle*cosAngle;
	power *= power;
	power *= cosAngle;
	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;

	//approximated fresnel-based energy conservation
	diffuseColor = irradiance;

	specularColor = .25 * irradiance * fresnel * distribution;

#ifdef VISIBILITY
    specularColor *= hx_lightVisibility(normal, lightDir, roughness, nDotL);
#endif
}