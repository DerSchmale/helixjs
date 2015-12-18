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

    vec4 viewSpace = hx_worldViewMatrix * animPosition;
    vec4 proj = hx_wvpMatrix * hx_position;
    normal = normalize(hx_normalWorldViewMatrix * animNormal);

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldViewMatrix) * animTangent.xyz;
    bitangent = cross(tangent, normal) * hx_tangent.w;
#endif

    viewVector = viewSpace.xyz;

#if defined(COLOR_MAP) || defined(NORMAL_MAP) || defined(MASK_MAP)
    texCoords = hx_texCoord;
#endif
    screenUV = proj.xy / proj.w * .5 + .5;
    gl_Position = proj;
}