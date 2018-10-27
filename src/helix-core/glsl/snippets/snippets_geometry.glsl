struct HX_GeometryData
{
    vec4 color;
    vec3 normal;
    float metallicness;
    float normalSpecularReflectance;
    float roughness;
    float occlusion;
    vec3 emission;
    vec4 data;  // this can be anything the lighting model requires
};