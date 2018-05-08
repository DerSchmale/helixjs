vertex_attribute vec4 hx_position;

uniform mat4 hx_wvpMatrix;

void hx_geometry()
{
    gl_Position = hx_wvpMatrix * hx_position;
}