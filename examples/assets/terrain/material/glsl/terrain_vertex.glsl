vertex_attribute vec4 hx_position;
vertex_attribute float hx_cellSize;
vertex_attribute float hx_cellMipLevel;

uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewMatrix;
uniform mat4 hx_viewProjectionMatrix;

// these are passed in by Terrain
uniform float hx_elevationOffset;
uniform float hx_elevationScale;
uniform float hx_heightMapSize;
uniform float hx_worldSize;
uniform sampler2D hx_heightMap;

varying_out vec3 viewPosition;
varying_out vec2 uv;

void hx_geometry()
{
    // there should be an interpolation between two adjacent detail levels

    vec4 worldPos = hx_worldMatrix * hx_position;

// snap to cell size is required to not get a floating interpolated landscape
    worldPos.xy = floor(worldPos.xy / hx_cellSize) * hx_cellSize;
    uv = worldPos.xy / hx_worldSize + .5;

#ifdef HX_GLSL_300_ES
    // the shader LOD extension doesn't work in the vertex shader, so only WebGL 2 can support this
    float offsetZ = textureLod(hx_heightMap, uv, hx_cellMipLevel).x;
#else
    float offsetZ = texture2D(hx_heightMap, uv).x;
#endif

    worldPos.z += offsetZ * hx_elevationScale + hx_elevationOffset;

    viewPosition = (hx_viewMatrix * worldPos).xyz;
    gl_Position = hx_viewProjectionMatrix * worldPos;
}