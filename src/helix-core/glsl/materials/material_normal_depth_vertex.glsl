attribute vec4 hx_position;

varying float hx_linearDepth;

uniform mat4 hx_worldViewMatrix;
uniform float hx_rcpCameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

void main()
{
    hx_geometry();

    hx_linearDepth = (gl_Position.w - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
}