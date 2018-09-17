uniform vec3 color;
uniform vec3 emissiveColor;
uniform float alpha;

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(METALLIC_ROUGHNESS_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)
    varying_in vec2 texCoords;
#endif

#ifdef COLOR_MAP
    uniform sampler2D colorMap;

    #ifdef COLOR_MAP_SCALE_OFFSET
        uniform vec2 colorMapScale;
        uniform vec2 colorMapOffset;
    #endif
#endif

#ifdef OCCLUSION_MAP
    uniform sampler2D occlusionMap;
#endif

#ifdef EMISSION_MAP
    uniform sampler2D emissionMap;

    #ifdef EMISSION_MAP_SCALE_OFFSET
        uniform vec2 emissionMapScale;
        uniform vec2 emissionMapOffset;
    #endif
#endif

#ifdef MASK_MAP
    uniform sampler2D maskMap;

    #ifdef MASK_MAP_SCALE_OFFSET
        uniform vec2 maskMapScale;
        uniform vec2 maskMapOffset;
    #endif
#endif

#ifndef HX_SKIP_NORMALS
    varying_in vec3 normal;

    #ifdef NORMAL_MAP
        varying_in vec3 tangent;
        varying_in vec3 bitangent;

        uniform sampler2D normalMap;

        #ifdef NORMAL_MAP_SCALE_OFFSET
            uniform vec2 normalMapScale;
            uniform vec2 normalMapOffset;
        #endif

    #endif
#endif

#ifndef HX_SKIP_SPECULAR
    uniform float roughness;
    uniform float roughnessRange;
    uniform float normalSpecularReflectance;
    uniform float metallicness;

    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP) || defined(METALLIC_ROUGHNESS_MAP)
        uniform sampler2D specularMap;

        #ifdef SPECULAR_MAP_SCALE_OFFSET
            uniform vec2 specularMapScale;
            uniform vec2 specularMapOffset;
        #endif
    #endif
#endif

#if defined(ALPHA_THRESHOLD)
    uniform float alphaThreshold;
#endif

#ifdef VERTEX_COLORS
    varying_in vec3 vertexColor;
#endif

HX_GeometryData hx_geometry()
{
    HX_GeometryData data;

    vec4 outputColor = vec4(color, alpha);

    #ifdef VERTEX_COLORS
        outputColor.xyz *= vertexColor;
    #endif

    vec2 uv;

    #ifdef COLOR_MAP
        uv = texCoords;
        #ifdef COLOR_MAP_SCALE_OFFSET
            uv = uv * colorMapScale + colorMapOffset;
        #endif
        #ifdef COLOR_MAP_ADD
            outputColor += texture2D(colorMap, uv);
        #else
            outputColor *= texture2D(colorMap, uv);
        #endif
    #endif

    #ifdef MASK_MAP
        uv = texCoords;
        #ifdef MASK_MAP_SCALE_OFFSET
            uv = uv * maskMapScale + maskMapOffset;
        #endif
        outputColor.w *= texture2D(maskMap, uv).x;
    #endif

    #ifdef ALPHA_THRESHOLD
        if (outputColor.w < alphaThreshold) discard;
    #endif

    data.color = hx_gammaToLinear(outputColor);

#ifndef HX_SKIP_SPECULAR
    float metallicnessOut = metallicness;
    float specNormalReflOut = normalSpecularReflectance;
    float roughnessOut = roughness;
#endif

#if defined(HX_SKIP_NORMALS) && defined(NORMAL_ROUGHNESS_MAP) && !defined(HX_SKIP_SPECULAR)
    uv = texCoords;
    #ifdef NORMAL_MAP_SCALE_OFFSET
        uv = uv * normalMapScale + normalMapOffset;
    #endif
    vec4 normalSample = texture2D(normalMap, uv);
    roughnessOut -= roughnessRange * (normalSample.w - .5);
#endif

#ifndef HX_SKIP_NORMALS
    vec3 fragNormal = normal;

    #ifdef NORMAL_MAP
        uv = texCoords;
        #ifdef NORMAL_MAP_SCALE_OFFSET
            uv = uv * normalMapScale + normalMapOffset;
        #endif
        vec4 normalSample = texture2D(normalMap, uv);
        mat3 TBN;
        TBN[2] = normalize(normal);
        TBN[0] = normalize(tangent);
        TBN[1] = normalize(bitangent);

        fragNormal = TBN * (normalSample.xyz - .5);

        #ifdef NORMAL_ROUGHNESS_MAP
            roughnessOut -= roughnessRange * (normalSample.w - .5);
        #endif
    #endif

    #ifdef DOUBLE_SIDED
        fragNormal *= gl_FrontFacing? 1.0 : -1.0;
    #endif
    data.normal = normalize(fragNormal);
#endif

#ifndef HX_SKIP_SPECULAR
    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP) || defined(METALLIC_ROUGHNESS_MAP)
        uv = texCoords;
        #ifdef SPECULAR_MAP_SCALE_OFFSET
            uv = uv * specularMapScale + specularMapOffset;
        #endif
        vec4 specSample = texture2D(specularMap, uv);

        #ifdef METALLIC_ROUGHNESS_MAP
            roughnessOut -= roughnessRange * (specSample.y - .5);
            metallicnessOut *= specSample.z;

        #else
            roughnessOut -= roughnessRange * (specSample.x - .5);

        #ifdef SPECULAR_MAP
            specNormalReflOut *= specSample.y;
            metallicnessOut *= specSample.z;
        #endif
    #endif
#endif

    data.metallicness = metallicnessOut;
    data.normalSpecularReflectance = specNormalReflOut;
    data.roughness = roughnessOut;
#endif

    data.occlusion = 1.0;

#ifdef OCCLUSION_MAP
    data.occlusion = texture2D(occlusionMap, texCoords).x;
#endif

    vec3 emission = emissiveColor;
#ifdef EMISSION_MAP
    uv = texCoords;
    #ifdef EMISSION_MAP_SCALE_OFFSET
        uv = uv * emissionMapScale + emissionMapOffset;
    #endif
    emission *= texture2D(emissionMap, uv).xyz;
#endif

    data.emission = hx_gammaToLinear(emission);
    return data;
}