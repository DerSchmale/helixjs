// This approach is by Jim Hejl and Richard Burgess-Dawson
void main()
{
	vec4 color = hx_getToneMapScaledColor();
	vec3 x = max(vec3(0.0), color.xyz - 0.004);
	gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);
}