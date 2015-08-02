attribute vec4 hx_position;
attribute vec2 hx_texCoord;

uniform mat4 hx_inverseProjectionMatrix;

varying vec2 uv;
varying vec3 viewDir;
varying vec3 frustumCorner;

void main()
{
    uv = hx_texCoord;
    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);
    frustumCorner = hx_getLinearDepthViewVector(vec2(1.0, 1.0), hx_inverseProjectionMatrix);
    gl_Position = hx_position;
}