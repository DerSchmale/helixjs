varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

void main()
{
    GeometryData data;
    data.color = textureCube(hx_skybox, viewWorldDir);
    #ifndef HX_GAMMA_CORRECT_LIGHTS
    data.color = hx_gammaToLinear(data.color);
    #endif
    data.emission = 1.0;
    data.transparencyMode = HX_TRANSPARENCY_OPAQUE;
    data.linearDepth = 1.0;
    hx_processGeometry(data);
}