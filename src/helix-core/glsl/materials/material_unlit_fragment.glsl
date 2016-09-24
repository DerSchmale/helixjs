void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragColor = data.color;
    gl_FragColor.xyz += data.emission;


    #ifdef HX_GAMMA_CORRECT_LIGHTS
        gl_FragColor = hx_linearToGamma(gl_FragColor);
    #endif
}