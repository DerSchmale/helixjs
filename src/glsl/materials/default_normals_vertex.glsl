varying vec3 normal;

#ifdef NORMAL_MAP
varying vec3 tangent;
varying vec2 texCoords;
#endif

void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;

#ifdef NORMAL_MAP
    texCoords = hx_texCoord;
    tangent = mat3(hx_worldMatrix) * hx_tangent;
#endif
}