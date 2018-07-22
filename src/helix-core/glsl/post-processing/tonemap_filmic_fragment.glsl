void main()
{
	vec3 x = hx_getToneMapScaledColor().xyz * 16.0;

    // Uncharted 2 tonemapping (http://filmicworlds.com/blog/filmic-tonemapping-operators/)

	float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    float W = 11.2;

    hx_FragColor.xyz = hx_gammaToLinear(((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F);
    hx_FragColor.w = 1.0;
}