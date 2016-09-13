varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;
    data.color = textureCube(hx_skybox, viewWorldDir);
    #ifndef HX_GAMMA_CORRECT_LIGHTS
    data.color = hx_gammaToLinear(data.color);
    #endif
    return data;
}