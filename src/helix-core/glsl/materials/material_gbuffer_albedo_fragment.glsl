void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragColor.xyz = data.color.xyz;
    gl_FragColor.w = data.occlusion;
}