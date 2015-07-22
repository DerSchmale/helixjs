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
    vec4 specularData;
    specularData.x = metallicness;
    specularData.y = specularNormalReflection;
    specularData.z = roughness;
    specularData.w = 1.0;

    #ifdef ALBEDO_MAP
        gl_FragData[0] = texture2D(albedoMap, texCoords);
    #else
        gl_FragData[0] = vec4(albedoColor, 1.0);
    #endif

    gl_FragData[1] = vec4(normal * .5 + .5, 1.0);
    gl_FragData[2] = hx_encodeSpecular(specularData);
}