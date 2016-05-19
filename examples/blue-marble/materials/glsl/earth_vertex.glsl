attribute vec4 hx_position;
attribute vec3 hx_normal;
attribute vec4 hx_tangent;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying float linearDepth;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;
uniform mat3 hx_normalWorldViewMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;

void main()
{
    uv = hx_texCoord;
    normal = normalize(hx_normalWorldViewMatrix * hx_normal);
    tangent = normalize(hx_normalWorldViewMatrix * hx_tangent.xyz);
    bitangent = cross(tangent, normal) * hx_tangent.w;
    linearDepth = (-(hx_worldViewMatrix * hx_position).z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
    gl_Position = hx_wvpMatrix * hx_position;
}