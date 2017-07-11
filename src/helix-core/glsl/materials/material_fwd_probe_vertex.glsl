varying vec3 hx_viewPosition;
varying vec3 hx_worldPosition;
uniform mat4 hx_inverseProjectionMatrix;
uniform mat4 hx_worldMatrix;

void main()
{
    hx_geometry();
    hx_worldPosition = (hx_worldMatrix * gl_Position).xyz;
    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;
}