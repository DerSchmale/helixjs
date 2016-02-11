void main()
{
	vec4 color = hx_getToneMapScaledColor();
	vec3 x = max(vec3(0.0), color.xyz - 0.004);

	// this has pow 2.2 gamma included, not valid if using fast gamma correction
	//gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);

    // Jim Hejl and Richard Burgess-Dawson
	float a = 6.2;
    float b = .5;
    float c = 6.2;
    float d = 1.7;
    float e = 0.06;

	// ACES
	/*float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;*/
	gl_FragColor = vec4(saturate((x*(a*x+b))/(x*(c*x+d)+e)), 1.0);
}