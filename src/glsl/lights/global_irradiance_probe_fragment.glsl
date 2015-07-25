varying vec3 viewWorldDir;
varying vec2 uv;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormals;

uniform samplerCube irradianceProbeSampler;

void main()
{
	vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec3 normal = normalize(normalSample.xyz - .5);
	vec3 totalLight = vec3(0.0);
	albedoSample = hx_gammaToLinear(albedoSample);

	#ifdef USE_AO
		vec4 occlusionSample = texture2D(hx_source, uv);
		albedoSample.xyz *= occlusionSample.w;
	#endif
	vec4 irradianceSample = textureCube(irradianceProbeSampler, normal);
	irradianceSample = hx_gammaToLinear(irradianceSample);
	#ifdef IRRADIANCE_HDR_FROM_ALPHA
		irradianceSample.xyz *= irradianceSample.w * IRRADIANCE_HDR_FROM_ALPHA;
	#endif
	//irradianceSample.xyz *= (1.0 - specularSample.x);
	totalLight += irradianceSample.xyz * albedoSample.xyz;

	gl_FragColor = vec4(totalLight, 1.0);
}