// todo: could save some data here if needed
vec4 hx_encodeNormal(vec3 normal, float litRatio, float transparencyMode)
{
    vec4 data;
    float p = sqrt(normal.z*8.0 + 8.0);
    data.xy = normal.xy / p + .5;
    data.z = litRatio;
    data.w = transparencyMode;
    return data;
}

vec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness)
{
	return vec4(roughness, specularNormalReflection * 5.0, metallicness, 1.0);
}

#ifdef HX_NO_DEPTH_TEXTURES
void hx_processGeometryMRT(vec4 color, vec3 normal, float metallicness, float specularNormalReflection, float roughness, float litRatio, float transparencyMode, float linearDepth, out vec4 colorData, out vec4 normalData, out vec4 specularData, out vec4 depthData)
#else
void hx_processGeometryMRT(vec4 color, vec3 normal, float metallicness, float specularNormalReflection, float roughness, float litRatio, float transparencyMode, float linearDepth, out vec4 colorData, out vec4 normalData, out vec4 specularData)
#endif
{
    colorData = color;
	normalData = hx_encodeNormal(normal, litRatio, transparencyMode);
    specularData = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness);

    #ifdef HX_NO_DEPTH_TEXTURES
    depthData = hx_floatToRGBA8(linearDepth);
    #endif
}

#if defined(HX_NO_MRT_GBUFFER_COLOR)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) (gl_FragColor = color)
#elif defined(HX_NO_MRT_GBUFFER_NORMALS)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) (gl_FragColor = hx_encodeNormal(normal, litRatio, transparencyMode))
#elif defined(HX_NO_MRT_GBUFFER_SPECULAR)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) (gl_FragColor = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness))
#elif defined(HX_NO_MRT_GBUFFER_LINEAR_DEPTH)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) (gl_FragColor = hx_floatToRGBA8(linearDepth))
#elif defined(HX_SHADOW_DEPTH_PASS)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) (gl_FragColor = hx_getShadowMapValue(linearDepth))
#elif defined(HX_NO_DEPTH_TEXTURES)
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) hx_processGeometryMRT(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth, gl_FragData[0], gl_FragData[1], gl_FragData[2], gl_FragData[3])
#else
#define hx_processGeometry(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth) hx_processGeometryMRT(color, normal, metallicness, specularNormalReflection, roughness, litRatio, transparencyMode, linearDepth, gl_FragData[0], gl_FragData[1], gl_FragData[2])
#endif