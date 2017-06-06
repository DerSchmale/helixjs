#ifdef USE_MORPHING
attribute vec2 hx_morphIndex;

uniform sampler2D hx_morphPositions;

// TODO:
// uniform sampler2D hx_morphNormals;

// TODO: Remove normal:
attribute vec3 hx_normal;
#else
attribute vec4 hx_position;
attribute vec3 hx_normal;
#endif

#ifdef USE_SKINNING
attribute vec4 hx_boneIndices;
attribute vec4 hx_boneWeights;

// WebGL doesn't support mat4x3 and I don't want to split the uniform either
uniform mat4 hx_skinningMatrices[HX_MAX_BONES];
#endif

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldViewMatrix;
uniform mat4 hx_worldViewMatrix;

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
#endif

void hx_geometry()
{
#ifdef USE_MORPHING
// TODO: Also apply to normals
    vec4 morphedPosition = vec4(texture2D(hx_morphPositions, hx_morphIndex).xyz, 1.0);
    vec3 morphedNormal = hx_normal;
#else
    vec4 morphedPosition = hx_position;
    vec3 morphedNormal = hx_normal;
#endif

#ifdef USE_SKINNING
    mat4 skinningMatrix = hx_getSkinningMatrix(0);

    vec4 animPosition = skinningMatrix * morphedPosition;
    vec3 animNormal = mat3(skinningMatrix) * morphedNormal;

    #ifdef NORMAL_MAP
    vec3 animTangent = mat3(skinningMatrix) * hx_tangent.xyz;
    #endif
#else
    vec4 animPosition = morphedPosition;
    vec3 animNormal = morphedNormal;

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