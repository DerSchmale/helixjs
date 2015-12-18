void main()
{
	vec4 color = hx_getToneMapScaledColor();
	gl_FragColor = color / (1.0 + color);
}