varying vec3 viewWorldDir;

uniform samplerCube hx_skybox;

void main()
{
    gl_FragColor = textureCube(hx_skybox, viewWorldDir);
}