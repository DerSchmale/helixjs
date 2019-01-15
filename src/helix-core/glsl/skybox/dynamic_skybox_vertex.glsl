vertex_attribute vec4 hx_position;

varying_out vec3 viewDir;

uniform mat4 inverseViewProjectionMatrix;

void main()
{
    vec4 unproj = inverseViewProjectionMatrix * hx_position;
    viewDir = normalize(unproj.xyz / unproj.w);
    gl_Position = hx_position;
}