uniform vec3 color;

void main()
{
    GeometryData data;
    data.color = vec4(color, 1.0);
    data.emission = 50.0;
    data.transparencyMode = 0.0;
    data.linearDepth = 1.0;
    hx_processGeometry(data);
}