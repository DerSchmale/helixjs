varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

void main()
{
    GeometryData data;
    data.color = hx_gammaToLinear(textureCube(hx_skybox, viewWorldDir));
    data.emission = 1.0;
    data.transparencyMode = HX_TRANSPARENCY_OPAQUE;
    data.linearDepth = 1.0;
    hx_processGeometry(data);
}