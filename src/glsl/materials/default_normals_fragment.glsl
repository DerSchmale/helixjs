varying vec3 normal;

#ifdef NORMAL_MAP
varying vec3 tangent;
varying vec2 texCoords;

uniform sampler2D normalMap;
#endif

void main()
{
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

    gl_FragColor = hx_encodeNormalDepth(fragNormal, gl_FragCoord.z);
}