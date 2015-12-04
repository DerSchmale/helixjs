attribute vec4 hx_position;
attribute vec3 hx_normal;

#if defined(COLOR_MAP) || defined(NORMAL_MAP) || defined(MASK_MAP)
attribute vec2 hx_texCoord;
varying vec2 texCoords;
#endif

varying vec3 normal;
varying vec3 viewVector;
varying vec2 screenUV;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;
uniform mat3 hx_normalWorldViewMatrix;

#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

varying vec3 tangent;
varying vec3 bitangent;
#endif


void main()
{
    vec4 viewSpace = hx_worldViewMatrix * hx_position;
    vec4 proj = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldViewMatrix * hx_normal;

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldViewMatrix) * hx_tangent.xyz;
    bitangent = cross(tangent, normal) * hx_tangent.w;
#endif

    viewVector = viewSpace.xyz;

#if defined(COLOR_MAP) || defined(NORMAL_MAP) || defined(MASK_MAP)
    texCoords = hx_texCoord;
#endif
    screenUV = proj.xy / proj.w * .5 + .5;
    gl_Position = proj;
}