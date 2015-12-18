varying vec3 normal;

uniform vec3 color;
uniform float alpha;

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)
varying vec2 texCoords;
#endif

#ifdef COLOR_MAP
uniform sampler2D colorMap;
#endif

#ifdef MASK_MAP
uniform sampler2D maskMap;
#endif

#ifdef NORMAL_MAP
varying vec3 tangent;
varying vec3 bitangent;

uniform sampler2D normalMap;
#endif

uniform float roughness;
uniform float specularNormalReflection;
uniform float metallicness;

#if defined(ALPHA_THRESHOLD)
uniform float alphaThreshold;
#endif

#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)
uniform sampler2D specularMap;
#endif

#ifdef VERTEX_COLORS
varying vec3 vertexColor;
#endif

void main()
{
    vec4 outputColor = vec4(color, alpha);

    #ifdef VERTEX_COLORS
        outputColor.xyz *= vertexColor;
    #endif

    #ifdef COLOR_MAP
        outputColor *= texture2D(colorMap, texCoords);
    #endif

    #ifdef MASK_MAP
        outputColor.w *= texture2D(maskMap, texCoords).x;
    #endif

    #ifdef ALPHA_THRESHOLD
        if (outputColor.w < alphaThreshold) discard;
    #endif

    float metallicnessOut = metallicness;
    float specNormalReflOut = specularNormalReflection;
    float roughnessOut = roughness;

    vec3 fragNormal = normal;
    #ifdef NORMAL_MAP
        vec4 normalSample = texture2D(normalMap, texCoords);
        mat3 TBN;
        TBN[2] = normalize(normal);
        TBN[0] = normalize(tangent);
        TBN[1] = normalize(bitangent);

        fragNormal = TBN * (normalSample.xyz * 2.0 - 1.0);

        #ifdef NORMAL_ROUGHNESS_MAP
            roughnessOut = 1.0 - (1.0 - roughnessOut) * normalSample.w;
        #endif
    #endif

    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)
          vec4 specSample = texture2D(specularMap, texCoords);
          roughnessOut = 1.0 - (1.0 - roughnessOut) * specSample.x;

          #ifdef SPECULAR_MAP
              specNormalReflOut *= specSample.y;
              metallicnessOut *= specSample.z;
          #endif
    #endif

    // todo: should we linearize depth here instead?
    hx_processGeometry(hx_gammaToLinear(outputColor), fragNormal, gl_FragCoord.z, metallicnessOut, specNormalReflOut, roughnessOut);
}