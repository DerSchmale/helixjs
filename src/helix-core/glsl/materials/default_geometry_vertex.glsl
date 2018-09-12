vertex_attribute vec4 hx_position;

// morph positions are offsets re the base position!
#ifdef HX_USE_MORPHING
vertex_attribute vec3 hx_morphPosition0;
vertex_attribute vec3 hx_morphPosition1;
vertex_attribute vec3 hx_morphPosition2;
vertex_attribute vec3 hx_morphPosition3;

#ifdef HX_USE_NORMAL_MORPHING
    #ifndef HX_SKIP_NORMALS
    vertex_attribute vec3 hx_morphNormal0;
    vertex_attribute vec3 hx_morphNormal1;
    vertex_attribute vec3 hx_morphNormal2;
    vertex_attribute vec3 hx_morphNormal3;
    #endif

uniform float hx_morphWeights[4];
#else
vertex_attribute vec3 hx_morphPosition4;
vertex_attribute vec3 hx_morphPosition5;
vertex_attribute vec3 hx_morphPosition6;
vertex_attribute vec3 hx_morphPosition7;

uniform float hx_morphWeights[8];
#endif

#endif

#ifdef HX_USE_SKINNING
vertex_attribute vec4 hx_jointIndices;
vertex_attribute vec4 hx_jointWeights;

uniform mat4 hx_bindShapeMatrix;
uniform mat4 hx_bindShapeMatrixInverse;

// WebGL doesn't support mat4x3 and I don't want to split the uniform either
#ifdef HX_USE_SKINNING_TEXTURE
uniform sampler2D hx_skinningTexture;
#else
uniform vec4 hx_skinningMatrices[HX_MAX_SKELETON_JOINTS * 3];
#endif
#endif

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)
vertex_attribute vec2 hx_texCoord;
varying_out vec2 texCoords;
#endif

#ifdef VERTEX_COLORS
vertex_attribute vec3 hx_vertexColor;
varying_out vec3 vertexColor;
#endif

#ifndef HX_SKIP_NORMALS
vertex_attribute vec3 hx_normal;
varying_out vec3 normal;

uniform mat3 hx_normalWorldViewMatrix;
#ifdef NORMAL_MAP
vertex_attribute vec4 hx_tangent;

varying_out vec3 tangent;
varying_out vec3 bitangent;
#endif
#endif

void hx_geometry()
{
    vec4 morphedPosition = hx_position;

    #ifndef HX_SKIP_NORMALS
    vec3 morphedNormal = hx_normal;
    #endif

// TODO: Abstract this in functions for easier reuse in other materials
#ifdef HX_USE_MORPHING
    morphedPosition.xyz += hx_morphPosition0 * hx_morphWeights[0];
    morphedPosition.xyz += hx_morphPosition1 * hx_morphWeights[1];
    morphedPosition.xyz += hx_morphPosition2 * hx_morphWeights[2];
    morphedPosition.xyz += hx_morphPosition3 * hx_morphWeights[3];
    #ifdef HX_USE_NORMAL_MORPHING
        #ifndef HX_SKIP_NORMALS
        morphedNormal += hx_morphNormal0 * hx_morphWeights[0];
        morphedNormal += hx_morphNormal1 * hx_morphWeights[1];
        morphedNormal += hx_morphNormal2 * hx_morphWeights[2];
        morphedNormal += hx_morphNormal3 * hx_morphWeights[3];
        #endif
    #else
        morphedPosition.xyz += hx_morphPosition4 * hx_morphWeights[4];
        morphedPosition.xyz += hx_morphPosition5 * hx_morphWeights[5];
        morphedPosition.xyz += hx_morphPosition6 * hx_morphWeights[6];
        morphedPosition.xyz += hx_morphPosition7 * hx_morphWeights[7];
    #endif
#endif

#ifdef HX_USE_SKINNING
    mat4 skinningMatrix = hx_getSkinningMatrix(0);

    // first transform to armature space
    // then apply skinning in skeleton space
    // then transform back to object space
    vec4 animPosition = hx_bindShapeMatrixInverse * ((hx_bindShapeMatrix * morphedPosition) * skinningMatrix);

    #ifndef HX_SKIP_NORMALS
        vec3 animNormal = morphedNormal * mat3(skinningMatrix);

        #ifdef NORMAL_MAP
        vec3 animTangent = hx_tangent.xyz * mat3(skinningMatrix);
        #endif
    #endif
#else
    vec4 animPosition = morphedPosition;

    #ifndef HX_SKIP_NORMALS
        vec3 animNormal = morphedNormal;

        #ifdef NORMAL_MAP
        vec3 animTangent = hx_tangent.xyz;
        #endif
    #endif
#endif

    // TODO: Should gl_position be handled by the shaders if we only return local position?
    gl_Position = hx_wvpMatrix * animPosition;

#ifndef HX_SKIP_NORMALS
    normal = normalize(hx_normalWorldViewMatrix * animNormal);

    #ifdef NORMAL_MAP
        tangent = mat3(hx_worldViewMatrix) * animTangent;
        bitangent = cross(tangent, normal) * hx_tangent.w;
    #endif
#endif

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)
    texCoords = hx_texCoord;
#endif

#ifdef VERTEX_COLORS
    vertexColor = hx_vertexColor;
#endif
}