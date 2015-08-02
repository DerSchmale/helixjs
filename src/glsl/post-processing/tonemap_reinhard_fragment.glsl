varying vec2 uv;

#ifdef ADAPTIVE
uniform sampler2D hx_luminanceMap;
#else
uniform float referenceLuminance;
#endif

uniform sampler2D hx_source;
uniform float hx_luminanceMipLevel;
uniform float exposure;

void main()
{
	vec4 color = texture2D(hx_source, uv);
	#ifdef ADAPTIVE
	float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x - .001);
	#endif
	color *= exposure / referenceLuminance;
	gl_FragColor = color / (1.0 + color);
}