uniform vec3 color;

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;
    data.color = vec4(color, 1.0);
    return data;
}