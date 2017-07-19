attribute vec4 hx_position;

// morph positions are offsets re the base position!
#ifdef HX_USE_MORPHING
attribute vec3 hx_morphPosition0;
attribute vec3 hx_morphPosition1;
attribute vec3 hx_morphPosition2;
attribute vec3 hx_morphPosition3;
#if HX_NUM_MORPH_TARGETS > 4
attribute vec3 hx_morphPosition4;
attribute vec3 hx_morphPosition5;
attribute vec3 hx_morphPosition6;
attribute vec3 hx_morphPosition7;
#endif

uniform float hx_morphWeights[HX_NUM_MORPH_TARGETS];
#endif

#ifdef HX_USE_SKINNING
attribute vec4 hx_jointIndices;
attribute vec4 hx_jointWeights;

// WebGL doesn't support mat4x3 and I don't want to split the uniform either
#ifdef HX_USE_SKINNING_TEXTURE
uniform sampler2D hx_skinningTexture;
#else
uniform vec4 hx_skinningMatrices[HX_MAX_SKELETON_JOINTS * 3];
#endif
#endif

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;

#ifndef HX_SKIP_NORMALS
attribute vec3 hx_normal;
uniform mat3 hx_normalWorldViewMatrix;
varying vec3 normal;
#endif

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)
attribute vec2 hx_texCoord;
varying vec2 texCoords;
#endif

#ifdef VERTEX_COLORS
attribute vec3 hx_vertexColor;
varying vec3 vertexColor;
#endif

#ifndef HX_SKIP_NORMALS
#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

varying vec3 tangent;
varying vec3 bitangent;
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
    #if HX_NUM_MORPH_TARGETS > 4
        morphedPosition.xyz += hx_morphPosition4 * hx_morphWeights[4];
        morphedPosition.xyz += hx_morphPosition5 * hx_morphWeights[5];
        morphedPosition.xyz += hx_morphPosition6 * hx_morphWeights[6];
        morphedPosition.xyz += hx_morphPosition7 * hx_morphWeights[7];
    #endif
#endif

#ifdef HX_USE_SKINNING
    mat4 skinningMatrix = hx_getSkinningMatrix(0);

    vec4 animPosition = morphedPosition * skinningMatrix;

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

    gl_Position = hx_wvpMatrix * animPosition;

#ifndef HX_SKIP_NORMALS
        normal = normalize(hx_normalWorldViewMatrix * animNormal);

    #ifdef NORMAL_MAP
        tangent = mat3(hx_worldViewMatrix) * animTangent;
        bitangent = cross(tangent, normal) * hx_tangent.w;
    #endif

#endif

#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP)
    texCoords = hx_texCoord;
#endif

#ifdef VERTEX_COLORS
    vertexColor = hx_vertexColor;
#endif
}