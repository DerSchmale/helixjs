vertex_attribute vec4 hx_position;

uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform mat4 hx_viewMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;

varying_out vec2 uv1;
varying_out vec2 uv2;
varying_out vec4 proj;
varying_out vec3 viewPos;

uniform float normalScale1;
uniform float normalScale2;
uniform vec2 normalOffset1;
uniform vec2 normalOffset2;

void hx_geometry()
{
    vec4 worldPos = hx_worldMatrix * hx_position;
    viewPos = (hx_viewMatrix * worldPos).xyz;
    // snap to cell size is required to not get a floating interpolated landscape
    uv1 = (worldPos.xy + normalOffset1) * normalScale1;
    uv2 = (worldPos.xy + normalOffset2) * normalScale2;
    gl_Position = proj = hx_viewProjectionMatrix * worldPos;
}