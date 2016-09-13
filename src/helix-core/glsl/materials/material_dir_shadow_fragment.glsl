void main()
{
    // geometry is really only used for kil instructions if necessary
    // hopefully the compiler optimizes the rest out for us
    HX_GeometryData data = hx_geometry();
    gl_FragColor = hx_getShadowMapValue(gl_FragCoord.z);
}