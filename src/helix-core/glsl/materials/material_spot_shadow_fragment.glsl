void main()
{
    // geometry is really only used for kil instructions if necessary
    // hopefully the compiler optimizes the rest out for us
    HX_GeometryData data = hx_geometry();

    // should we store distance instead of shadow value?
    gl_FragColor = hx_spot_getShadowMapValue(gl_FragCoord.z);
}