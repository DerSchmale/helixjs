varying vec2 uv;
varying vec3 viewWorldDir;
varying vec3 lightColorVar;
varying vec3 lightPositionVar;
varying vec2 attenuationFixVar;

void main()
{
	vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);

	float viewZ = -depth * hx_cameraFrustumRange;
	vec3 worldPosition = hx_cameraWorldPosition + viewZ * viewWorldDir;

	vec3 normal = normalize(normalSample.xyz - .5);
	albedoSample = hx_gammaToLinear(albedoSample);
	vec3 viewDir = -normalize(viewWorldDir);

	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;
	hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness, metallicness);
	vec3 diffuseReflection;
	vec3 specularReflection;

	vec3 lightWorldDirection = worldPosition - lightPositionVar;
	float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);
	/* normalize:*/
	lightWorldDirection *= sqrt(attenuation);

	/*rescale attenuation so that irradiance at bounding edge really is 0*/
	attenuation = max(0.0, (attenuation - attenuationFixVar.x) * attenuationFixVar.y);
	hx_lighting(normal, lightWorldDirection, viewDir, lightColorVar * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);

	diffuseReflection *= albedoSample.xyz * (1.0 - metallicness);
	gl_FragColor = vec4(diffuseReflection + specularReflection, 0.0);
}