float hx_lightVisibility(in vec3 normal, in vec3 viewDir, float roughness, float nDotLClamped)
{
	float nDotV = max(-dot(normal, viewDir), 0.0);
	// roughness remapping, this is essentially: sqrt(2 * roughness * roughness / PI)
	// this remaps beckman distribution roughness to SmithSchlick
	roughness *= .63772;
	float g1 = nDotV*(1.0 - roughness) + roughness;
	float g2 = nDotLClamped*(1.0 - roughness) + roughness;
	return 1.0/(g1*g2);
}

void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, float transmittance, out vec3 diffuseColor, out vec3 specularColor) 
{
	float nDotL = -dot(lightDir, normal);
	float nDotLClamped = max(nDotL, 0.0);
	vec3 irradiance = nDotLClamped * lightColor;	// in fact irradiance / PI

	vec3 halfVector = normalize(lightDir + viewDir);
	float halfDotLight = dot(halfVector, lightDir);

	float roughSqr = roughness*roughness;
	roughSqr *= roughSqr;
	float specular = max(-dot(halfVector, normal), 0.0);
	float distribution = pow(specular, 2.0/roughSqr - 2.0)/roughSqr;

	float visibility = hx_lightVisibility(normal, lightDir, roughness, nDotLClamped);
	float microfacet = .25 * distribution * visibility;

	float cosAngle = 1.0 - halfDotLight;
	// to the 5th power
	float power = cosAngle*cosAngle;
	power *= power;
	power *= cosAngle;
	vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;

	//approximated fresnel-based energy conservation
	diffuseColor = irradiance * (1.0 - fresnel) + max(-nDotL, 0.0) * lightColor * transmittance;
	specularColor = irradiance * fresnel * microfacet;
}

void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, float transmittance, out vec3 diffuseColor, out vec3 specularColor)
{
	float nDotL = -dot(lightDir, normal);
	float nDotLClamped = max(nDotL, 0.0);
	vec3 irradiance = nDotLClamped * lightColor;	// in fact irradiance / PI
	//approximated fresnel-based energy conservation
	float roughSqr = roughness*roughness;
	roughSqr *= roughSqr;
	vec3 halfVector = normalize(lightDir + viewDir);
	float specular = max(-dot(halfVector, normal), 0.0);
	float distribution = pow(specular, 2.0/roughSqr - 2.0)/roughSqr;
	float microfacet = pow(specular, 2.0/roughSqr - 2.0);

	diffuseColor = irradiance;
	specularColor = irradiance * microfacet;
}