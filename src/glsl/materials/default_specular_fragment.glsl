uniform float specularNormalReflection;
uniform float metallicness;
uniform float roughness;

void main()
{
    gl_FragColor = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness);
}