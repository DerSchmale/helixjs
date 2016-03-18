attribute vec4 hx_position;
attribute float hx_instanceID;

uniform mat4 hx_viewMatrix;
uniform mat4 hx_cameraWorldMatrix;
uniform mat4 hx_projectionMatrix;

uniform vec3 lightViewPosition[LIGHTS_PER_BATCH];
uniform vec3 lightColor[LIGHTS_PER_BATCH];
uniform float lightRadius[LIGHTS_PER_BATCH];

varying vec2 uv;
varying vec3 viewDir;
varying vec3 lightColorVar;
varying vec3 lightPositionVar;
varying float lightRadiusVar;

void main()
{
	int instance = int(hx_instanceID);
	lightPositionVar = lightViewPosition[instance];
	lightColorVar = lightColor[instance];
	lightRadiusVar = lightRadius[instance];
	vec3 viewPos = mat3(hx_viewMatrix) * (hx_position.xyz * lightRadius[instance]) + lightPositionVar;
	vec4 proj = hx_projectionMatrix * vec4(viewPos, 1.0);

	viewDir = -viewPos / viewPos.z;

	gl_Position = proj;
}