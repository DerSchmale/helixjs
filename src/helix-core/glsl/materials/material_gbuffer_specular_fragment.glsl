void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragColor.x = data.metallicness;
    gl_FragColor.y = data.normalSpecularReflectance * 5.0;  // better use of available range
    gl_FragColor.z = data.roughness;
    gl_FragColor.w = 1.0;
}