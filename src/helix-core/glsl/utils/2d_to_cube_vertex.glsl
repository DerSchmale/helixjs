// position to write to
attribute vec4 hx_position;

// the corner of the cube map
attribute vec3 corner;

varying vec3 direction;

void main()
{
    direction = corner;
    gl_Position = hx_position;
}
