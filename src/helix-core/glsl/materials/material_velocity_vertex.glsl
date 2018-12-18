varying_out vec2 hx_velocity;

uniform mat4 hx_inverseWVPMatrix;
uniform mat4 hx_prevViewProjectionMatrix;
uniform mat4 hx_prevWorldMatrix;

void main()
{
    hx_geometry();
    // transform back to old local position
    vec4 pos = hx_inverseWVPMatrix * gl_Position;
    pos = hx_prevWorldMatrix * pos;
    pos = hx_prevViewProjectionMatrix * pos;
    // express in uv coordinates and rescale to 0, 1
    // hence *.25 (twice / 2)
    hx_velocity = (gl_Position.xy / gl_Position.w - pos.xy / pos.w) * .25  + .5;
}