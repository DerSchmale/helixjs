varying float hx_linearDepth;

void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragColor.xy = hx_encodeNormal(data.normal);
    gl_FragColor.zw = hx_floatToRG8(hx_linearDepth);
//    gl_FragColor.zw = hx_floatToRG8(gl_FragCoord.z);
}