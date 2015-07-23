#if defined(ALBEDO_MAP)
varying vec2 texCoords;
#endif

void main()
{
    gl_Position = hx_wvpMatrix * hx_position;

    #if defined(ALBEDO_MAP)
    texCoords = hx_texCoord;
    #endif
}