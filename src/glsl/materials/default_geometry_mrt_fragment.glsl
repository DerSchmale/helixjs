#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)
varying vec2 texCoords;
#endif

varying vec3 normal;

#ifdef COLOR_MAP
uniform sampler2D colorMap;
#else
uniform vec3 color;
#endif

#ifdef NORMAL_MAP
varying vec3 tangent;
varying vec3 bitangent;

uniform sampler2D normalMap;
#endif

uniform float roughness;
uniform float specularNormalReflection;
uniform float metallicness;

#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP)
uniform sampler2D specularMap;
#endif

#ifdef TRANSPARENT_REFRACT
// when used as TRANSPARENT_DIFFUSE, hx_source is a copy of the render target:
uniform sampler2D hx_source;
uniform sampler2D hx_gbufferDepth;

uniform mat4 hx_projectionMatrix;
uniform float hx_cameraFrustumRange;
uniform float refractionStrength;   // sort of per meter. TODO: Must improve
#endif

void main()
{
    vec4 outputColor;
    #ifdef COLOR_MAP
        outputColor = texture2D(colorMap, texCoords);
    #else
        outputColor = vec4(color, 1.0);
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
          roughnessOut = 1.0 - (1.0 - roughnessOut) * specularMap.x;

          #ifdef SPECULAR_MAP
              specNormalReflOut *= specularMap.y;
              metallicnessOut *= specularMap.z;
          #endif
    #endif

    #ifdef TRANSPARENT_REFRACT
        float depth = hx_sampleLinearDepth(hx_gbufferDepth, texCoords);
        float viewZ = hx_depthToViewZ(gl_FragCoord.z, hx_projectionMatrix);
        float distance = max(viewZ - depth * hx_cameraFrustumRange, 0.0);
        vec2 displacement = normal.xy * distance * refractionStrength;
        vec4 background = texture2D(hx_source, texCoords + displacement);
        outputColor *= background;
    #endif

    // todo: should we linearize depth here instead?
    hx_processGeometry(outputColor, fragNormal, gl_FragCoord.z, metallicnessOut, specNormalReflOut, roughnessOut);
}