attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 viewPosition;
varying vec4 projPosition;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;

void main()
{
    vec4 viewSpace = hx_worldViewMatrix * hx_position;

    uv = hx_texCoord;
    gl_Position = projPosition = hx_wvpMatrix * hx_position;
    viewPosition = viewSpace.xyz;
}