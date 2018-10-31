/*// schlick-beckman
float hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)
{
	float nDotV = max(-dot(normal, viewDir), 0.0);
	float r = roughness * roughness * 0.797896;
	float g1 = nDotV * (1.0 - r) + r;
	float g2 = nDotL * (1.0 - r) + r;
    return .25 / (g1 * g2);
}*/

float hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)
{
	float roughnessSqr = clamp(roughness * roughness, 0.0001, .9999);
//	roughnessSqr *= roughnessSqr;
	float halfDotNormal = max(-dot(halfVector, normal), 0.0);
	return pow(halfDotNormal, 2.0/roughnessSqr - 2.0) / roughnessSqr;
}

void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = -dot(lightDir, geometry.normal);
	vec3 irradiance = max(nDotL, 0.0) * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

	float distribution = hx_blinnPhongDistribution(geometry.roughness, geometry.normal, halfVector);

	float halfDotLight = max(dot(halfVector, lightDir), 0.0);
	float cosAngle = 1.0 - halfDotLight;
	// to the 5th power
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance)*pow(cosAngle, 5.0);

    #ifdef HX_USE_TRANSLUCENCY
	    // light for flipped normal
        diffuseColor += geometry.translucency * max(-nDotL, 0.0) * lightColor;
    #endif

// / PI factor is encoded in light colour
	diffuseColor = irradiance;
	specularColor = irradiance * fresnel * distribution;

//#ifdef HX_VISIBILITY
//    specularColor *= hx_lightVisibility(normal, lightDir, geometry.roughness, nDotL);
//#endif
}