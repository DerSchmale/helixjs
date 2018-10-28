void main()
{
    HX_GeometryData data = hx_geometry();
    hx_FragColor = data.color;
    hx_FragColor.xyz += data.emission;

    #ifdef HX_DEBUG_NORMALS
        // need to counter the gamma correction that will happen on output
        hx_FragColor.xyz = hx_gammaToLinear(data.normal.xzy * vec3(.5, .5, -.5) + .5);
    #endif
}