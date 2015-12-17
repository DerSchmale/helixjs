attribute vec4 hx_position;
attribute vec3 hx_normal;

#ifdef USE_SKINNING
attribute vec4 hx_boneIndices;
attribute vec4 hx_boneWeights;

uniform mat4 hx_skinningMatrices[HX_MAX_BONES];
#endif

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldViewMatrix;

varying vec3 normal;

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)
attribute vec2 hx_texCoord;
varying vec2 texCoords;
#endif

#ifdef VERTEX_COLORS
attribute vec3 hx_vertexColor;
varying vec3 vertexColor;
#endif

#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

varying vec3 tangent;
varying vec3 bitangent;

uniform mat4 hx_worldViewMatrix;
#endif


void main()
{
#ifdef USE_SKINNING
    vec4 animPosition = hx_skinningMatrices[int(hx_boneIndices.x)] * hx_position * hx_boneWeights.x;
    animPosition += hx_skinningMatrices[int(hx_boneIndices.y)] * hx_position * hx_boneWeights.y;
    animPosition += hx_skinningMatrices[int(hx_boneIndices.z)] * hx_position * hx_boneWeights.z;
    animPosition += hx_skinningMatrices[int(hx_boneIndices.w)] * hx_position * hx_boneWeights.w;
    vec3 animNormal = hx_normal;

    #ifdef NORMAL_MAP
    vec3 animTangent = hx_tangent.xyz;
    #endif
#else
    vec4 animPosition = hx_position;
    vec3 animNormal = hx_normal;

    #ifdef NORMAL_MAP
    vec3 animTangent = hx_tangent.xyz;
    #endif
#endif

    gl_Position = hx_wvpMatrix * animPosition;
    normal = normalize(hx_normalWorldViewMatrix * animNormal);

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldViewMatrix) * animTangent;
    bitangent = cross(tangent, normal) * hx_tangent.w;
#endif

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)
    texCoords = hx_texCoord;
#endif

#ifdef VERTEX_COLORS
    vertexColor = hx_vertexColor;
#endif
}