attribute vec4 hx_position;
attribute vec3 hx_normal;
attribute vec2 hx_texCoord;

varying vec3 normal;
varying vec2 texCoords;
varying vec3 viewVector;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldMatrix;
uniform mat3 hx_normalWorldMatrix;
uniform vec3 hx_cameraWorldPosition;

#ifdef NORMAL_MAP
attribute vec4 hx_tangent;

varying vec3 tangent;
varying vec3 bitangent;
#endif


void main()
{
    gl_Position = hx_wvpMatrix * hx_position;
    normal = hx_normalWorldMatrix * hx_normal;

#ifdef NORMAL_MAP
    tangent = mat3(hx_worldMatrix) * hx_tangent.xyz;
    bitangent = cross(tangent, normal) * hx_tangent.w;
#endif

    viewVector = hx_cameraWorldPosition - (hx_worldMatrix * hx_position).xyz;
    texCoords = hx_texCoord;
}