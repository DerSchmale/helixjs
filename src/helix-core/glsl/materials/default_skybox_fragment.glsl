varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

void main()
{
    vec4 color = textureCube(hx_skybox, viewWorldDir);
    gl_FragColor = hx_gammaToLinear(color);
}