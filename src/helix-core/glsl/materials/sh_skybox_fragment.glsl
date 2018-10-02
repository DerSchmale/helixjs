varying_in vec3 viewWorldDir;

uniform vec3 hx_sh[9];

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;
    data.color = vec4(hx_evaluateSH(hx_sh, normalize(viewWorldDir.xzy)), 1.0);
    data.emission = vec3(0.0);
    return data;
}