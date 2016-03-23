attribute vec4 hx_position;

attribute vec2 hx_texCoord;

varying vec2 texCoords;

uniform mat4 hx_wvpMatrix;

void main()
{
#ifdef USE_SKINNING
    mat4 skinningMatrix = hx_boneWeights.x * hx_skinningMatrices[int(hx_boneIndices.x)];
    skinningMatrix += hx_boneWeights.y * hx_skinningMatrices[int(hx_boneIndices.y)];
    skinningMatrix += hx_boneWeights.z * hx_skinningMatrices[int(hx_boneIndices.z)];
    skinningMatrix += hx_boneWeights.w * hx_skinningMatrices[int(hx_boneIndices.w)];

    vec4 animPosition = skinningMatrix * hx_position;
#else
    vec4 animPosition = hx_position;
#endif

    texCoords = hx_texCoord;
    gl_Position = hx_wvpMatrix * hx_position;
}