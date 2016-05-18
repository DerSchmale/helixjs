varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

void main()
{
    vec4 color = hx_gammaToLinear(textureCube(hx_skybox, viewWorldDir));
    color.w = 0.0;
    hx_processGeometry(color, vec3(0.0), 0.0, 0.0, 0.0, 0.0, 1.0);
}