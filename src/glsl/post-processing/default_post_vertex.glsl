attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;

void main()
{
	uv = hx_texCoord;

	#ifdef USE_SKINNING
        mat4 skinningMatrix = hx_boneWeights.x * hx_skinningMatrices[int(hx_boneIndices.x)];
        skinningMatrix += hx_boneWeights.y * hx_skinningMatrices[int(hx_boneIndices.y)];
        skinningMatrix += hx_boneWeights.z * hx_skinningMatrices[int(hx_boneIndices.z)];
        skinningMatrix += hx_boneWeights.w * hx_skinningMatrices[int(hx_boneIndices.w)];

        vec4 animPosition = skinningMatrix * hx_position;
    #else
        vec4 animPosition = hx_position;
    #endif
	gl_Position = animPosition;
}