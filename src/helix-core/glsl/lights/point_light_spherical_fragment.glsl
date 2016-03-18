varying vec3 viewDir;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_gbufferDepth;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform vec2 hx_rcpRenderTargetResolution;

varying vec3 lightColorVar;
varying vec3 lightPositionVar;
varying float lightRadiusVar;
void main()
{
    vec2 uv = gl_FragCoord.xy * hx_rcpRenderTargetResolution;
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

	vec3 diffuseReflection;
	vec3 specularReflection;

	vec3 lightViewDirection = viewPosition - lightPositionVar;
	float attenuation = dot(lightViewDirection, lightViewDirection);
	float distance = sqrt(attenuation);
	// normalize:
	lightViewDirection /= distance;

	// rescale attenuation so that irradiance at bounding edge really is 0
	attenuation = max(1.0 / attenuation * (1.0 - distance / lightRadiusVar), 0.0);
	hx_lighting(normal, lightViewDirection, viewDirNorm, lightColorVar * attenuation, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);

	diffuseReflection *= colorSample.xyz * (1.0 - metallicness);
	gl_FragColor = vec4(diffuseReflection + specularReflection, 0.0);
//	gl_FragColor = vec4(.1, 0.0, 0.0, 0.0);
}