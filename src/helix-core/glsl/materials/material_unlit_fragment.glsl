void main()
{
    HX_GeometryData data = hx_geometry();
    hx_FragColor = data.color;
    hx_FragColor.xyz += data.emission;
}