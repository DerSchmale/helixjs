varying_in float hx_linearDepth;

void main()
{
    HX_GeometryData data = hx_geometry();
    hx_FragColor.xy = hx_encodeNormal(data.normal);
    hx_FragColor.zw = hx_floatToRG8(hx_linearDepth);
}