void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragColor.xyz = data.color.xyz;
    gl_FragColor.w = 1.0;    // only opaques are rendered; could use this as a sort of post-process mark (fe: apply SSS)
}