#extension GL_EXT_draw_buffers : require

#if defined(ALBEDO_MAP) || defined(NORMAL_GLOSS_MAP)
varying vec2 texCoords;
#endif

varying vec3 normal;

#ifdef ALBEDO_MAP
uniform sampler2D albedoMap;
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

    // todo: should we linearize depth here instead?
    hx_processGeometry(albedo, normal, gl_FragCoord.z, metallicness, specularNormalReflection, roughness);
}