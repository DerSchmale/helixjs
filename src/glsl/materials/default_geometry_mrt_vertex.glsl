#if defined(ALBEDO_MAP) || defined(NORMAL_GLOSS_MAP)
varying vec2 texCoords;
#endif

varying vec3 normal;

void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;

    #if defined(ALBEDO_MAP) || defined(NORMAL_GLOSS_MAP)
    texCoords = hx_texCoord;
    #endif
}