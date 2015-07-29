#if defined(ALBEDO_MAP) || defined(NORMAL_MAP) || defined(SPECULAR_MAP)
varying vec2 texCoords;
#endif

varying vec3 normal;

#ifdef ALBEDO_MAP
uniform sampler2D albedoMap;
#else
uniform vec3 albedoColor;
#endif

#ifdef NORMAL_MAP
varying vec3 tangent;

uniform sampler2D normalMap;
#endif

uniform float roughness;
uniform float specularNormalReflection;
uniform float metallicness;

#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)
uniform sampler2D specularMap;
#endif

void main()
{
    vec4 albedo;
    #ifdef ALBEDO_MAP
        albedo = texture2D(albedoMap, texCoords);
    #else
        albedo = vec4(albedoColor, 1.0);
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
        TBN[1] = cross(TBN[0], TBN[2]);

        fragNormal = TBN * (normalSample.xyz * 2.0 - 1.0);

        #ifdef NORMAL_ROUGHNESS_MAP
            roughnessOut = 1.0 - (1.0 - roughnessOut) * normalSample.w;
        #endif
    #endif

    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)
          vec4 specSample = texture2D(specularMap, uv);
          roughnessOut = 1.0 - (1.0 - roughnessOut) * specularMap.x;

          #ifdef SPECULAR_MAP
              specNormalReflOut *= specularMap.y;
              metallicnessOut *= specularMap.z;
          #endif
    #endif

    // todo: should we linearize depth here instead?
    hx_processGeometry(albedo, fragNormal, gl_FragCoord.z, metallicnessOut, specNormalReflOut, roughnessOut);
}