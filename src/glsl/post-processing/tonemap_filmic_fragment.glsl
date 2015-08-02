varying vec2 uv;

#ifdef ADAPTIVE
uniform sampler2D hx_luminanceMap;
#else
uniform float referenceLuminance;
#endif

uniform sampler2D hx_source;
uniform float hx_luminanceMipLevel;
uniform float exposure;

// This approach is by Jim Hejl and Richard Burgess-Dawson
void main()
{
	vec4 color = texture2D(hx_source, uv);
	#ifdef ADAPTIVE
	float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x - .001);
	#endif
	color *= exposure / referenceLuminance;
	vec3 x = max(vec3(0.0), color.xyz - 0.004);
	gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);
}