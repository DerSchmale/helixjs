#if defined(ALBEDO_MAP) || defined(NORMAL_MAP)
varying vec2 texCoords;
#endif

varying vec3 normal;

#ifdef ALBEDO_MAP
uniform sampler2D albedoMap;
#endif

#ifdef NORMAL_MAP
varying vec3 tangent;

uniform sampler2D normalMap;
#endif

uniform vec3 albedoColor;
uniform float specularNormalReflection;
uniform float metallicness;
uniform float roughness;

void main()
{
    vec4 albedo;
    #ifdef ALBEDO_MAP
        albedo = texture2D(albedoMap, texCoords);
    #else
        albedo = vec4(albedoColor, 1.0);
    #endif

    vec3 fragNormal;
    #ifdef NORMAL_MAP
        vec3 normalSample = texture2D(normalMap, texCoords).xyz * 2.0 - 1.0;
        mat3 TBN;
        TBN[2] = normalize(normal);
        TBN[0] = normalize(tangent);
        TBN[1] = cross(TBN[0], TBN[2]);

        fragNormal = TBN * normalSample;
    #else
        fragNormal = normal;
    #endif

    // todo: should we linearize depth here instead?
    hx_processGeometry(albedo, fragNormal, gl_FragCoord.z, metallicness, specularNormalReflection, roughness);
}