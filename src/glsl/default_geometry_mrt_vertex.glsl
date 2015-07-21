attribute vec4 hx_position;
attribute vec3 hx_normal;

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldMatrix;

#if defined(ALBEDO_MAP) || defined(NORMAL_GLOSS_MAP)
attribute vec2 hx_texCoord;

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