varying vec2 uv;

#ifdef ADAPTIVE
uniform sampler2D hx_luminanceMap;
uniform float hx_luminanceMipLevel;
#endif

uniform float hx_exposure;

uniform sampler2D hx_backbuffer;


vec4 hx_getToneMapScaledColor()
{
    #ifdef ADAPTIVE
    float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x);
	float key = 1.03 - (2.0 / (2.0 + log(referenceLuminance + 1.0)/log(10.0)));
	float exposure = key / referenceLuminance * hx_exposure;
	#else
	float exposure = hx_exposure;
	#endif
    return texture2D(hx_backbuffer, uv) * exposure;
}