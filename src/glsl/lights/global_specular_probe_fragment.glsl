varying vec3 viewWorldDir;
varying vec2 uv;

uniform samplerCube specularProbeSampler;
uniform float numMips;
uniform float mipOffset;
uniform float maxMipFactor;

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = normalize(normalSample.xyz - .5);
	vec3 totalLight = vec3(0.0);
	colorSample = hx_gammaToLinear(colorSample);

	vec3 reflectedViewDir = reflect(normalize(viewWorldDir), normal);
	vec3 normalSpecularReflectance;
	float roughness;
	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness);
	#ifdef USE_TEX_LOD
	// knald method:
		float power = 2.0/(roughness * roughness) - 2.0;
		float factor = (exp2(-10.0/sqrt(power)) - K0)/K1;
		float mipLevel = numMips*(1.0 - clamp(factor/maxMipFactor, 0.0, 1.0));
		vec4 specProbeSample = textureCubeLodEXT(specularProbeSampler, reflectedViewDir, mipLevel);
	#else
		vec4 specProbeSample = textureCube(specularProbeSampler, reflectedViewDir);
	#endif
	specProbeSample = hx_gammaToLinear(specProbeSample);
	vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflectedViewDir, normal);
	// not physically correct, but attenuation is required to look good
	fresnel *= (1.0 - roughness);
	totalLight += fresnel * specProbeSample.xyz;

	gl_FragColor = vec4(totalLight, 1.0);
}