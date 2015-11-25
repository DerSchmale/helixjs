varying vec3 viewWorldDir;
varying vec2 uv;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
#ifdef USE_AO
uniform sampler2D hx_ambientOcclusion;
#endif

uniform samplerCube irradianceProbeSampler;

uniform mat4 hx_cameraWorldMatrix;

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);

	vec3 normal = mat3(hx_cameraWorldMatrix) * hx_decodeNormal(normalSample);
	vec3 totalLight = vec3(0.0);


	#ifdef USE_AO
		vec4 occlusionSample = texture2D(hx_ambientOcclusion, uv);
		colorSample.xyz *= occlusionSample.w;
	#endif
	vec4 irradianceSample = textureCube(irradianceProbeSampler, normal);
	irradianceSample = hx_gammaToLinear(irradianceSample);
	irradianceSample.xyz *= (1.0 - specularSample.z);
	totalLight += irradianceSample.xyz * colorSample.xyz;

	gl_FragColor = vec4(totalLight, 1.0);
}