varying_out vec4 hx_newPos;
varying_out vec4 hx_oldPos;

uniform mat4 hx_inverseWVPMatrix;
uniform mat4 hx_prevViewProjectionMatrix;
uniform mat4 hx_prevWorldMatrix;

void main()
{
    hx_geometry();
    hx_newPos = gl_Position;
    hx_oldPos = hx_prevViewProjectionMatrix * hx_prevWorldMatrix * hx_inverseWVPMatrix * gl_Position;
}