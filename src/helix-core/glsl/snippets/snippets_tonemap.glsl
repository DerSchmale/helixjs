varying_in vec2 uv;

#ifdef HX_ADAPTIVE
uniform sampler2D hx_luminanceMap;
uniform float hx_luminanceMipLevel;
#endif

uniform float hx_exposure;
uniform float hx_key;

uniform sampler2D hx_backbuffer;


vec4 hx_getToneMapScaledColor()
{
    #ifdef HX_ADAPTIVE
    #ifdef HX_GLSL_300_ES
    float referenceLuminance = textureLod(hx_luminanceMap, uv, hx_luminanceMipLevel).x;
    #else
    float referenceLuminance = texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x;
    #endif
    referenceLuminance = exp(referenceLuminance) - 1.0;
    referenceLuminance = clamp(referenceLuminance, .08, 1000.0);
	float exposure = hx_key / referenceLuminance * hx_exposure;
	#else
	float exposure = hx_exposure;
	#endif
    return texture2D(hx_backbuffer, uv) * exposure;
}