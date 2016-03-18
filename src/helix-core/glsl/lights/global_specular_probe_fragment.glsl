varying vec3 viewWorldDir;
varying vec2 uv;

uniform samplerCube specularProbeSampler;
uniform float numMips;
uniform float mipOffset;
uniform float maxMipFactor;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;

uniform mat4 hx_cameraWorldMatrix;

// this is Schlick-Beckmann attenuation for only the view vector
float hx_geometricShadowing(vec3 normal, vec3 reflection, float roughness)
{
    float nDotV = max(dot(normal, reflection), 0.0);
    float att = nDotV / (nDotV * (1.0 - roughness) + roughness);
    return att;
}

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = mat3(hx_cameraWorldMatrix) * hx_decodeNormal(normalSample);
	vec3 totalLight = vec3(0.0);

	vec3 reflectedViewDir = reflect(normalize(viewWorldDir), normal);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;
	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);
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
	float attenuation = mix(hx_geometricShadowing(normal, reflectedViewDir, roughness), 1.0, metallicness);

	totalLight += fresnel * attenuation * specProbeSample.xyz;

	#ifdef HX_GAMMA_CORRECT_LIGHTS
        totalLight = hx_linearToGamma(totalLight);
    #endif

	gl_FragColor = vec4(totalLight, 1.0);
}