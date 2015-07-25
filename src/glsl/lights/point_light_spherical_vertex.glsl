uniform float lightRadius[LIGHTS_PER_BATCH];
uniform vec3 lightWorldPosition[LIGHTS_PER_BATCH];
uniform vec3 lightColor[LIGHTS_PER_BATCH];
uniform vec2 attenuationFixFactors[LIGHTS_PER_BATCH];

varying vec2 uv;
varying vec3 viewWorldDir;
varying vec3 lightColorVar;
varying vec3 lightPositionVar;
varying vec2 attenuationFixVar;

void main()
{
	int instance = int(hx_instanceID);
	vec4 worldPos = hx_position;
	lightPositionVar = lightWorldPosition[instance];
	lightColorVar = lightColor[instance];
	attenuationFixVar = attenuationFixFactors[instance];
	worldPos.xyz *= lightRadius[instance];
	worldPos.xyz += lightPositionVar;

	vec4 viewPos = hx_viewMatrix * worldPos;
	vec4 proj = hx_projectionMatrix * viewPos;

	viewWorldDir = mat3(hx_cameraWorldMatrix) * (viewPos.xyz / viewPos.z);

	/* render as flat disk, prevent clipping */
	proj /= proj.w;
	proj.z = 0.0;
	uv = proj.xy/proj.w * .5 + .5;
	gl_Position = proj;
}