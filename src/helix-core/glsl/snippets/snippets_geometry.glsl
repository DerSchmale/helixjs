struct HX_GeometryData
{
    vec4 color;
    vec3 normal;
    float metallicness;
    float normalSpecularReflectance;
    float roughness;
    float occlusion;
    vec3 emission;
    vec4 data;  // this can be anything the lighting model requires (only works with forward rendering)
};

// used for parsing deferred passes
struct HX_GBufferData
{
    HX_GeometryData geometry;

    // extra decoding stuff
    vec3 normalSpecularReflectance;
    float linearDepth;
};

HX_GBufferData hx_parseGBuffer(sampler2D albedoTex, sampler2D normalDepthTex, sampler2D specularTex, vec2 uv)
{
    HX_GBufferData data;
    vec4 albedoSample = texture2D(albedoTex, uv);
    vec4 normalDepthSample = texture2D(normalDepthTex, uv);
    vec4 specularSample = texture2D(specularTex, uv);
    data.geometry.normal = hx_decodeNormal(normalDepthSample);
    data.geometry.metallicness = specularSample.x;
    data.geometry.normalSpecularReflectance = specularSample.y * .2;
    data.geometry.roughness = max(specularSample.z, .01);
    data.geometry.color = vec4(albedoSample.xyz * (1.0 - data.geometry.metallicness), 1.0);
    data.geometry.occlusion = albedoSample.w;
    data.normalSpecularReflectance = hx_getNormalSpecularReflectance(specularSample.x, data.geometry.normalSpecularReflectance, albedoSample.xyz);
    data.linearDepth = hx_RG8ToFloat(normalDepthSample.zw);
    return data;
}