varying vec2 uv;

uniform sampler2D hx_frontbuffer;

void main()
{
	vec4 color = texture2D(hx_frontbuffer, uv);
	float lum = clamp(hx_luminance(color), 0.0, 1000.0);
	float l = log(1.0 + lum);
	gl_FragColor = vec4(l, l, l, 1.0);
}