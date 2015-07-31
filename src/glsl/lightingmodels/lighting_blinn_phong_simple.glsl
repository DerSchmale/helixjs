void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = max(-dot(lightDir, normal), 0.0);
	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);

	highp float roughSqr = roughness*roughness;
	roughSqr *= roughSqr;
	highp float halfDotNormal = max(-dot(halfVector, normal), 0.0);
	highp float distribution = pow(halfDotNormal, 2.0/roughSqr - 2.0)/roughSqr;

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
}