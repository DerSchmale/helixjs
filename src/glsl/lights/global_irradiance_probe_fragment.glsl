varying vec3 viewWorldDir;
varying vec2 uv;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;

uniform samplerCube irradianceProbeSampler;

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec3 normal = normalize(normalSample.xyz - .5);
	vec3 totalLight = vec3(0.0);
	colorSample = hx_gammaToLinear(colorSample);

	#ifdef USE_AO
		vec4 occlusionSample = texture2D(hx_source, uv);
		colorSample.xyz *= occlusionSample.w;
	#endif
	vec4 irradianceSample = textureCube(irradianceProbeSampler, normal);
	irradianceSample = hx_gammaToLinear(irradianceSample);
	#ifdef IRRADIANCE_HDR_FROM_ALPHA
		irradianceSample.xyz *= irradianceSample.w * IRRADIANCE_HDR_FROM_ALPHA;
	#endif
	//irradianceSample.xyz *= (1.0 - specularSample.x);
	totalLight += irradianceSample.xyz * colorSample.xyz;

	gl_FragColor = vec4(totalLight, 1.0);
}