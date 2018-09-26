vertex_attribute vec4 hx_position;
vertex_attribute float hx_cellSize;

uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform float hx_elevationOffset;
uniform float hx_elevationScale;
uniform float worldSize;
uniform float heightMapSize;

uniform sampler2D heightMap;

varying_out vec3 viewPosition;
varying_out vec2 uv;

void hx_geometry()
{
    // there should be an interpolation between two adjacent detail levels

    vec4 worldPos = hx_worldMatrix * hx_position;
    // snap to cell size is required to not get a floating interpolated landscape
    worldPos.xy = floor(worldPos.xy / hx_cellSize) * hx_cellSize;
    uv = worldPos.xy / worldSize + .5;

    float offsetZ = texture2D(heightMap, uv).x;
    worldPos.z += offsetZ * hx_elevationScale + hx_elevationOffset;
// TODO: We could figure out clip map level based on hx_cellSize and texture size as an improvement if LOD is supported!

    viewPosition = (hx_viewMatrix * worldPos).xyz;
    gl_Position = hx_viewProjectionMatrix * worldPos;
}