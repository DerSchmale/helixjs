void main()
{
	vec4 color = hx_getToneMapScaledColor();
	float lum = hx_luminance(color);
	gl_FragColor = color / (1.0 + lum);
}