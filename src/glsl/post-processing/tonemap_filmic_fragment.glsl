#extension GL_EXT_shader_texture_lod : require
varying vec2 uv;

uniform sampler2D hx_source;
uniform sampler2D hx_luminanceMap;
uniform float hx_luminanceMipLevel;
uniform float key;

void main()
{
	vec4 color = texture2D(hx_source, uv);
	float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x - .001);
	color *= key / referenceLuminance;
	vec3 x = max(vec3(0.0), color.xyz - 0.004);
	gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);
}