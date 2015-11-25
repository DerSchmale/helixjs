uniform vec3 lightColor;

uniform sampler2D hx_gbufferColor;

#ifdef USE_AO
uniform sampler2D hx_ambientOcclusion;
#endif

varying vec2 uv;

void main()
{
	vec3 colorSample = texture2D(hx_gbufferColor, uv).xyz;
#ifdef USE_AO
	float occlusionSample = texture2D(hx_ambientOcclusion, uv).w;
	colorSample *= occlusionSample;
#endif

	gl_FragColor = vec4(lightColor * colorSample, 0.0);
}