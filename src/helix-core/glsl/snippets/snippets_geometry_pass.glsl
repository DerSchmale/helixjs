vec4 hx_encodeNormalDepth(vec3 normal, float depth)
{
	#ifdef HX_NO_DEPTH_TEXTURES
    	vec4 data;
    	float p = sqrt(normal.z*8.0 + 8.0);
        data.xy = normal.xy / p + .5;
    	#ifdef HX_MAX_DEPTH_PRECISION
		data.zw = hx_floatToRGBA8(depth).xy;
		#else
		data.zw = hx_floatToRG8(depth).xy;
		#endif
		return data;
	#else
		return vec4(normal * .5 + .5, 1.0);
    #endif
}

vec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness, float depth)
{
    #if defined(HX_NO_DEPTH_TEXTURES) && defined(HX_MAX_DEPTH_PRECISION)
    depth = hx_floatToRGBA8(depth).z;
    #else
    depth = 1.0;
    #endif
	return vec4(roughness, specularNormalReflection * 5.0, metallicness, depth);
}

void hx_processGeometryMRT(vec4 color, vec3 normal, float depth, float metallicness, float specularNormalReflection, float roughness, out vec4 colorData, out vec4 normalData, out vec4 specularData)
{
    colorData = color;
	normalData = hx_encodeNormalDepth(normal, depth);
    specularData = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness, depth);
}

#if defined(HX_NO_MRT_GBUFFER_COLOR)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = color)
#elif defined(HX_NO_MRT_GBUFFER_NORMALS)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeNormalDepth(normal, depth))
#elif defined(HX_NO_MRT_GBUFFER_SPECULAR)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_encodeSpecularData(metallicness, specularNormalReflection, roughness, depth))
#elif defined(HX_SHADOW_DEPTH_PASS)
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) (gl_FragColor = hx_floatToRGBA8(depth))
#else
#define hx_processGeometry(color, normal, depth, metallicness, specularNormalReflection, roughness) hx_processGeometryMRT(color, normal, depth, metallicness, specularNormalReflection, roughness, gl_FragData[0], gl_FragData[1], gl_FragData[2])
#endif