attribute vec4 hx_position;
attribute vec3 hx_normal;

uniform mat4 hx_wvpMatrix;
uniform mat3 hx_normalWorldMatrix;

varying vec3 normal;

void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;
}