uniform float specularNormalReflection;
uniform float metallicness;
uniform float roughness;

void main()
{
    vec4 specularData;
    specularData.x = metallicness;
    specularData.y = specularNormalReflection;
    specularData.z = roughness;
    specularData.w = 1.0;

    gl_FragColor = hx_encodeSpecular(specularData);
}