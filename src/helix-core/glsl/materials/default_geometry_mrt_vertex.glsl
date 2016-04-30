attribute vec4 hx_position;
attribute vec3 hx_normal;

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

varying float linearDepth;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;

void main()
{
#ifdef USE_SKINNING
    mat4 skinningMatrix = hx_boneWeights.x * hx_skinningMatrices[int(hx_boneIndices.x)];
    skinningMatrix += hx_boneWeights.y * hx_skinningMatrices[int(hx_boneIndices.y)];
    skinningMatrix += hx_boneWeights.z * hx_skinningMatrices[int(hx_boneIndices.z)];
    skinningMatrix += hx_boneWeights.w * hx_skinningMatrices[int(hx_boneIndices.w)];

    vec4 animPosition = skinningMatrix * hx_position;
    vec3 animNormal = mat3(skinningMatrix) * hx_normal;

    #ifdef NORMAL_MAP
    vec3 animTangent = mat3(skinningMatrix) * hx_tangent.xyz;
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

    linearDepth = (-(hx_worldViewMatrix * animPosition).z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;

#ifdef VERTEX_COLORS
    vertexColor = hx_vertexColor;
#endif
}