varying_in vec3 viewWorldDir;

uniform samplerCube hx_skybox;
uniform float hx_intensity;

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;
    data.color = textureCube(hx_skybox, viewWorldDir.xzy);
    data.emission = vec3(0.0);
    data.color = hx_gammaToLinear(data.color) * hx_intensity;
    return data;
}