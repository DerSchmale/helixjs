varying vec2 uv;
varying vec3 viewWorldDir;

uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_gbufferDepth;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform vec3 hx_cameraWorldPosition;

uniform vec3 lightColor[LIGHTS_PER_BATCH];
uniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];
uniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];

void main()
{
	vec4 albedoSample = hx_gammaToLinear(texture2D(hx_gbufferAlbedo, uv));
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = hx_decodeNormal(normalSample);
	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;

	hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness, metallicness);

	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
	vec3 worldPosition = hx_cameraWorldPosition + absViewZ * viewWorldDir;

	vec3 viewDir = normalize(viewWorldDir);


	vec3 totalDiffuse = vec3(0.0);
	vec3 totalSpecular = vec3(0.0);
	vec3 diffuseReflection;
	vec3 specularReflection;

	for (int i = 0; i < LIGHTS_PER_BATCH; ++i) {
		vec3 lightWorldDirection = worldPosition - lightWorldPosition[i];
		float attenuation = 1.0/dot(lightWorldDirection, lightWorldDirection);
		/* normalize:*/
		lightWorldDirection *= sqrt(attenuation);

		/*rescale attenuation so that irradiance at bounding edge really is 0*/
		attenuation = max(0.0, (attenuation - attenuationFixFactors[i].x) * attenuationFixFactors[i].y);
		hx_lighting(normal, lightWorldDirection, viewDir, lightColor[i] * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);
		totalDiffuse += diffuseReflection;
		totalSpecular += specularReflection;
	}
	totalDiffuse *= albedoSample.xyz * (1.0 - metallicness);
	gl_FragColor = vec4(totalDiffuse + totalSpecular, 1.0);
}