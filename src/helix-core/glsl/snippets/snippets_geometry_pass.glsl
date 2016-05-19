struct GeometryData
{
    vec4 color;
    vec3 normal;
    float metallicness;
    float specularNormalReflection;
    float roughness;
    float emission;
    float transparencyMode;
    float linearDepth;
};

// emission of 1.0 is the same as "unlit", anything above emits more
vec4 hx_encodeNormal(vec3 normal, float emission, float transparencyMode)
{
    vec4 data;
    float p = sqrt(normal.z*8.0 + 8.0);
    data.xy = normal.xy / p + .5;
    data.z = emission / HX_EMISSION_RANGE;
    data.w = transparencyMode;
    return data;
}

vec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness)
{
	return vec4(roughness, specularNormalReflection * 5.0, metallicness, 1.0);
}

#ifdef HX_NO_DEPTH_TEXTURES
void hx_processGeometryMRT(GeometryData data, out vec4 gColor, out vec4 gNormals, out vec4 gSpec, out vec4 gDepth)
#else
void hx_processGeometryMRT(GeometryData data, out vec4 gColor, out vec4 gNormals, out vec4 gSpec)
#endif
{
    gColor = data.color;
	gNormals = hx_encodeNormal(data.normal, data.emission, data.transparencyMode);
    gSpec = hx_encodeSpecularData(data.metallicness, data.specularNormalReflection, data.roughness);

    #ifdef HX_NO_DEPTH_TEXTURES
    gDepth = hx_floatToRGBA8(data.linearDepth);
    #endif
}

#if defined(HX_NO_MRT_GBUFFER_COLOR)
#define hx_processGeometry(data) (gl_FragColor = data.color)
#elif defined(HX_NO_MRT_GBUFFER_NORMALS)
#define hx_processGeometry(data) (gl_FragColor = hx_encodeNormal(data.normal, data.emission, data.transparencyMode))
#elif defined(HX_NO_MRT_GBUFFER_SPECULAR)
#define hx_processGeometry(data) (gl_FragColor = hx_encodeSpecularData(data.metallicness, data.specularNormalReflection, data.roughness))
#elif defined(HX_NO_MRT_GBUFFER_LINEAR_DEPTH)
#define hx_processGeometry(data) (gl_FragColor = hx_floatToRGBA8(data.linearDepth))
#elif defined(HX_SHADOW_DEPTH_PASS)
#define hx_processGeometry(data) (gl_FragColor = hx_getShadowMapValue(data.linearDepth))
#elif defined(HX_NO_DEPTH_TEXTURES)
#define hx_processGeometry(data) hx_processGeometryMRT(data, gl_FragData[0], gl_FragData[1], gl_FragData[2], gl_FragData[3])
#else
#define hx_processGeometry(data) hx_processGeometryMRT(data, gl_FragData[0], gl_FragData[1], gl_FragData[2])
#endif