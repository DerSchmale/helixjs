vertex_attribute vec4 hx_position;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldMatrix;
uniform vec3 hx_cameraWorldPosition;

varying_out vec3 viewVecWorld;

void hx_geometry()
{
    gl_Position = hx_wvpMatrix * hx_position;
    vec4 worldPos = hx_worldMatrix * hx_position;
    viewVecWorld = worldPos.xyz - hx_cameraWorldPosition;
}