#includeHelix

#if defined(ALBEDO_MAP)
varying vec2 texCoords;

uniform sampler2D albedoMap;
#endif

uniform vec3 albedoColor;

void main()
{
    #ifdef ALBEDO_MAP
        gl_FragColor = texture2D(albedoMap, texCoords);
    #else
        gl_FragColor = vec4(albedoColor, 1.0);
    #endif
}