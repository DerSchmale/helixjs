varying vec2 uv;
varying vec3 viewDir;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_gbufferDepth;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

uniform vec3 lightColor[LIGHTS_PER_BATCH];
uniform vec3 lightViewPosition[LIGHTS_PER_BATCH];
uniform float lightRadius[LIGHTS_PER_BATCH];

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = hx_decodeNormal(normalSample);
	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;

	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);

	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
	vec3 viewPosition = absViewZ * viewDir;

	vec3 viewDirNorm = normalize(viewDir);

	vec3 totalDiffuse = vec3(0.0);
	vec3 totalSpecular = vec3(0.0);
	vec3 diffuseReflection;
	vec3 specularReflection;

	for (int i = 0; i < LIGHTS_PER_BATCH; ++i) {
		vec3 lightViewDirection = viewPosition - lightViewPosition[i];
		// square distance
		float attenuation = dot(lightViewDirection, lightViewDirection);
		float distance = sqrt(attenuation);
		lightViewDirection /= distance;

		// rescale attenuation so that irradiance at bounding edge really is 0
		attenuation = max(1.0 / attenuation * (1.0 - distance / lightRadius[i]), 0.0);
		hx_lighting(normal, lightViewDirection, viewDirNorm, lightColor[i] * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);
		totalDiffuse += diffuseReflection;
		totalSpecular += specularReflection;
	}
	totalDiffuse *= colorSample.xyz * (1.0 - metallicness);

    vec3 totalLight = totalDiffuse + totalSpecular;
	#ifdef HX_GAMMA_CORRECT_LIGHTS
        totalLight = hx_linearToGamma(totalLight);
    #endif

	gl_FragColor = vec4(totalLight, 1.0);
}