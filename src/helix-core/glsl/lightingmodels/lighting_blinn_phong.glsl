// this is Schlick-Beckmann attenuation for only the view vector
float hx_probeGeometricShadowing(vec3 normal, vec3 reflection, float roughness, float metallicness)
{
//    float nDotV = max(dot(normal, reflection), 0.0);
//    float att = nDotV / (nDotV * (1.0 - roughness) + roughness);
    float att = 1.0 - roughness;
    return mix(att * att, 1.0, metallicness);
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

float hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)
{
	float roughnessSqr = clamp(roughness * roughness, 0.0001, .9999);
//	roughnessSqr *= roughnessSqr;
	float halfDotNormal = max(-dot(halfVector, normal), 0.0);
	return pow(halfDotNormal, 2.0/roughnessSqr - 2.0) / roughnessSqr;
}

void hx_brdf(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 normalSpecularReflectance, float roughness, out vec3 diffuseColor, out vec3 specularColor)
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
	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance)*power;

// / PI factor is encoded in light colour
	//approximated fresnel-based energy conservation
	diffuseColor = irradiance;

	specularColor = irradiance * fresnel * distribution;

//#ifdef HX_VISIBILITY
//    specularColor *= hx_lightVisibility(normal, lightDir, roughness, nDotL);
//#endif
}