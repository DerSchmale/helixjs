attribute vec4 hx_position;
attribute float hx_cellSize;

uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform float hx_elevationOffset;
uniform float hx_elevationScale;
uniform float worldSize;

uniform sampler2D heightMap;
//uniform float heightMapSize;

varying vec2 uv;

float getHeight(vec2 worldPos)
{
    vec2 coord = .5 + worldPos / worldSize;
    float offsetY = hx_RGBA8ToFloat(texture2D(heightMap, coord));
    return offsetY * hx_elevationScale + hx_elevationOffset;
}

void hx_geometry()
{
    vec4 worldPos = hx_worldMatrix * hx_position;
    // snap to cell size is required to not get a floating interpolated landscape
    worldPos.xz = floor(worldPos.xz / hx_cellSize) * hx_cellSize;
    uv = .5 + worldPos.xz / worldSize;

    worldPos.y += getHeight(worldPos.xz);
// TODO: We could figure out clip map level based on hx_cellSize and texture size as an improvement if LOD is supported!

    gl_Position = hx_viewProjectionMatrix * worldPos;
}