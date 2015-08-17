// most stuff is in snippets_directional_lights.glsl

varying vec2 uv;
varying vec3 viewWorldDir;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;

void main()
{
	vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = hx_decodeNormal(normalSample);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;

	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);

	vec3 normalizedWorldView = normalize(viewWorldDir);

	// hx_calculateLight must be the same for every object
	vec3 totalReflection = hx_calculateLight(colorSample.xyz, normal, lightWorldDirection, viewWorldDir, normalSpecularReflectance, roughness, metallicness);

	gl_FragColor = vec4(totalReflection, 0.0);

}