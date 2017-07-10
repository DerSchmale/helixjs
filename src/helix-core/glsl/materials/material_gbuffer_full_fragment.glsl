#drawbuffers

varying float hx_linearDepth;

void main()
{
    HX_GeometryData data = hx_geometry();
    gl_FragData[0] = vec4(data.color.xyz, 1.0);
    gl_FragData[1].xy = hx_encodeNormal(data.normal);
    gl_FragData[1].zw = hx_floatToRG8(hx_linearDepth);
    gl_FragData[2].x = data.metallicness;
    gl_FragData[2].y = data.normalSpecularReflectance * 5.0;  // better use of available range
    gl_FragData[2].z = data.roughness;
    gl_FragData[2].w = 1.0;
}