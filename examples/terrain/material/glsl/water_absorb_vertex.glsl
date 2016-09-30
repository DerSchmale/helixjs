attribute vec4 hx_position;

uniform mat4 hx_worldViewMatrix;
uniform mat4 hx_wvpMatrix;

varying vec4 proj;
varying vec3 viewPos;

void hx_geometry()
{
    viewPos = (hx_worldViewMatrix * hx_position).xyz;
    gl_Position = proj = hx_wvpMatrix * hx_position;
}