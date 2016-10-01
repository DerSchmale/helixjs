uniform mat4 hx_worldViewMatrix;

varying vec3 hx_viewPosition;
uniform mat4 hx_inverseProjectionMatrix;

void main()
{
    hx_geometry();
    // we need to do an unprojection here to be sure to have skinning - or anything like that - support
    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;
}