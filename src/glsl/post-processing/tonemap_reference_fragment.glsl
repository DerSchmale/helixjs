varying vec2 uv;

uniform sampler2D hx_frontbuffer;

void main()
{
	vec4 color = texture2D(hx_frontbuffer, uv);
	float l = log(.001 + hx_luminance(color));
	gl_FragColor = vec4(l, l, l, 1.0);
}