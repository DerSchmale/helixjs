void hx_processGeometryMRT(vec4 color, vec3 normal, float depth, float metallicness, float specularNormalReflection, float roughness, out vec4 colorData, out vec4 normalData, out vec4 specularData)
{
    colorData = color;
	normalData = hx_encodeNormalDepth(normal, depth);
    specularData = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness);
}

#if defined(HX_NO_MRT_GBUFFER_COLOR)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = color)
#elif defined(HX_NO_MRT_GBUFFER_NORMALS)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeNormalDepth(normal, depth))
#elif defined(HX_NO_MRT_GBUFFER_SPECULAR)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness))
#elif defined(HX_SHADOW_MAP_PASS)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_floatToRGBA8(depth))
#else
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) hx_processGeometryMRT(color, normal, depth, metallicness, specularNormalReflection, roughness, gl_FragData[0], gl_FragData[1], gl_FragData[2])
#endif