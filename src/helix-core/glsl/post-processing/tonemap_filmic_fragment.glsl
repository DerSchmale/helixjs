void main()
{
	vec4 color = hx_getToneMapScaledColor();
	vec3 x = max(vec3(0.0), color.xyz - 0.004);

	// this has pow 2.2 gamma included, not valid if using fast gamma correction
	//hx_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);

    #ifdef HX_ACES
    // ACES -> this desaturates less
    	float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
    #else
    // Jim Hejl and Richard Burgess-Dawson
        float a = 6.2;
        float b = .5;
        float c = 6.2;
        float d = 1.7;
        float e = 0.06;
    #endif
	hx_FragColor = vec4(clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0), 1.0);
}