varying_out vec3 hx_viewPosition;

uniform mat4 hx_inverseProjectionMatrix;

void main()
{
    hx_geometry();
    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;

    // this shrinks it down to leave some room for filtering
    gl_Position.xy *= .95;
}