varying vec2 texCoords;

uniform vec3 color;
uniform float alpha;

#ifdef MASK_MAP
uniform sampler2D maskMap;
#endif

#ifdef ALPHA_THRESHOLD
uniform float alphaThreshold;
#endif

uniform sampler2D emissionMap;

void main()
{
    vec4 outputColor = texture2D(emissionMap, texCoords);

    #ifdef MASK_MAP
        outputColor *= texture2D(maskMap, texCoords).x;
    #endif

    #ifdef ALPHA_THRESHOLD
        if (outputColor.w < alphaThreshold) discard;
    #endif

    gl_FragColor = outputColor;
}