varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;
    data.color = textureCube(hx_skybox, viewWorldDir);
    data.emission = vec3(0.0);
    data.color = hx_gammaToLinear(data.color);
    return data;
}