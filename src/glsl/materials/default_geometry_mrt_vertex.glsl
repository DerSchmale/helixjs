attribute vec4 hx_position;
attribute vec3 hx_normal;

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldMatrix;

varying vec3 normal;

#if defined(ALBEDO_MAP) || defined(NORMAL_MAP) || defined(SPECULAR_MAP)
attribute vec2 hx_texCoord;
varying vec2 texCoords;
#endif


#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

uniform mat4 hx_worldMatrix;

varying vec3 tangent;
varying vec3 bitangent;
#endif


void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldMatrix) * hx_tangent.xyz;
    bitangent = cross(tangent, normal) * hx_tangent.w;
#endif

#if defined(ALBEDO_MAP) || defined(NORMAL_MAP)
    texCoords = hx_texCoord;
#endif
}