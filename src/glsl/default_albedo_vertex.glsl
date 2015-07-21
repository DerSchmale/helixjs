attribute vec4 hx_position;

uniform mat4 hx_wvpMatrix;

#if defined(ALBEDO_MAP)
attribute vec2 hx_texCoord;

varying vec2 texCoords;
#endif

void main()
{
    gl_Position = hx_wvpMatrix * hx_position;

    #if defined(ALBEDO_MAP)
    texCoords = hx_texCoord;
    #endif
}