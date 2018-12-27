uniform float hx_rcpCameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform mat4 hx_inverseWVPMatrix;
uniform mat4 hx_prevViewProjectionMatrix;
uniform mat4 hx_prevWorldMatrix;

varying_out float hx_linearDepth;
varying_out vec4 hx_newPos;
varying_out vec4 hx_oldPos;

void main()
{
    hx_geometry();
    hx_linearDepth = (gl_Position.w - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
    hx_newPos = gl_Position;
    hx_oldPos = hx_prevViewProjectionMatrix * hx_prevWorldMatrix * hx_inverseWVPMatrix * gl_Position;
}