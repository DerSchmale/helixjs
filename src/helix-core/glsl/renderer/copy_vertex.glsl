vertex_attribute vec4 hx_position;
vertex_attribute vec2 hx_texCoord;

varying_out vec2 uv;

void main()
{
    uv = hx_texCoord;
    gl_Position = hx_position;
}