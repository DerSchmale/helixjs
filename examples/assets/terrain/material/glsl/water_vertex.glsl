attribute vec4 hx_position;

uniform mat4 hx_worldMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform mat4 hx_viewMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;

varying vec2 uv1;
varying vec2 uv2;
varying vec4 proj;
varying vec3 viewPos;


uniform float normalScale1;
uniform float normalScale2;
uniform vec2 normalOffset1;
uniform vec2 normalOffset2;

void hx_geometry()
{
    vec4 worldPos = hx_worldMatrix * hx_position;
    viewPos = (hx_viewMatrix * worldPos).xyz;
    // snap to cell size is required to not get a floating interpolated landscape
    uv1 = (worldPos.xz + normalOffset1) * normalScale1;
    uv2 = (worldPos.xz + normalOffset2) * normalScale2;
    gl_Position = proj = hx_viewProjectionMatrix * worldPos;
}