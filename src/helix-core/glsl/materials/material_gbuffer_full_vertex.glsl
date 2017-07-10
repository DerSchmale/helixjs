varying float hx_linearDepth;

uniform float hx_rcpCameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

void main()
{
    hx_geometry();

    hx_linearDepth = (gl_Position.w - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
}