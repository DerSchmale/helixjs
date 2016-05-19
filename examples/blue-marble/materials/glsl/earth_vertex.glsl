#define NUM_SAMPLES 2

attribute vec4 hx_position;
attribute vec3 hx_normal;
attribute vec4 hx_tangent;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying float linearDepth;
varying vec3 scatterColor0;
varying vec3 scatterColor1;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;
uniform mat4 hx_worldMatrix;
uniform mat3 hx_normalWorldViewMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;
uniform vec3 hx_cameraWorldPosition;

// earth origin is at 0, so ignore that
float getRayIntersectionDistance(vec3 origin, vec3 dir, float radius)
{
    // a = 1, since dir is unit
    float b = 2.0 * dot(dir, origin);
    // TODO: (origin . origin) is the camera height squared, could optimize
    float c = dot(origin, origin) - radius*radius;
    float det = max(b*b - 4.0 * c, 0.0);

    // quadratic root
    return (-b - sqrt(det)) / 2.0;
}

float scale(float cosAngle)
{
	float x = 1.0 - cosAngle;
	return exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

void main()
{
    uv = hx_texCoord;
    normal = normalize(hx_normalWorldViewMatrix * hx_normal);
    tangent = normalize(hx_normalWorldViewMatrix * hx_tangent.xyz);
    bitangent = cross(tangent, normal) * hx_tangent.w;

    vec3 farPos = (hx_worldViewMatrix * hx_position).xyz;
    linearDepth = (-farPos.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
    gl_Position = hx_wvpMatrix * hx_position;
}