attribute vec4 hx_position;
attribute vec3 hx_normal;

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldMatrix;

varying vec3 normal;

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)
attribute vec2 hx_texCoord;
varying vec2 texCoords;
#endif

#ifdef TRANSPARENT_REFRACT
uniform vec3 hx_cameraWorldPosition;

varying vec3 viewVector;
#endif

#if defined(TRANSPARENT_REFRACT) || defined(NORMAL_MAP)
uniform mat4 hx_worldMatrix;
#endif

#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

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

#ifdef TRANSPARENT_REFRACT
    viewVector = (hx_worldMatrix * hx_position).xyz - hx_cameraWorldPosition;
#endif

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(TRANSPARENT_REFRACT)
    texCoords = hx_texCoord;
#endif
}