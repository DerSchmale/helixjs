// position to write to
vertex_attribute vec4 hx_position;

// the corner of the cube map
vertex_attribute vec3 corner;

varying_out vec3 direction;

void main()
{
    direction = corner;
    gl_Position = hx_position;
}
