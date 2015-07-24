#if defined(ALBEDO_MAP) || defined(NORMAL_MAP)
varying vec2 texCoords;
#endif

varying vec3 normal;

#ifdef NORMAL_MAP
varying vec3 tangent;
#endif


void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldMatrix) * hx_tangent;
#endif

#if defined(ALBEDO_MAP) || defined(NORMAL_MAP)
    texCoords = hx_texCoord;
#endif
}