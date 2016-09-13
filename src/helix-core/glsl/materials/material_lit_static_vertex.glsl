attribute vec4 hx_position;

uniform mat4 hx_worldViewMatrix;

varying vec3 hx_viewPosition;

void main()
{
    hx_geometry();
    hx_viewPosition = (hx_worldViewMatrix * hx_position).xyz;
}