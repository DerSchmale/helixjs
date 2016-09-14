attribute vec4 hx_position;

varying float hx_linearDepth;

uniform mat4 hx_worldViewMatrix;
uniform float hx_rcpCameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

void main()
{
    hx_geometry();

    vec4 hx_viewPos = hx_worldViewMatrix * hx_position;
    hx_linearDepth = (-hx_viewPos.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
}