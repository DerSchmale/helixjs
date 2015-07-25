uniform vec3 lightColor;

varying vec2 uv;

void main()
{
	vec3 albedoSample = texture2D(hx_gbufferAlbedo, uv).xyz;
#ifdef USE_AO
	float occlusionSample = texture2D(hx_source, uv).w;
	albedoSample *= occlusionSample;
#endif

	albedoSample = hx_gammaToLinear(albedoSample);

	gl_FragColor = vec4(lightColor * albedoSample, 0.0);
}