varying vec2 uv;
varying vec3 viewDir;

uniform vec3 tint;
uniform float density;
uniform float startDistance;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

uniform sampler2D hx_source;
uniform sampler2D hx_gbufferDepth;

void main()
{
	vec4 color = texture2D(hx_source, uv);
	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
	// do not fog up skybox
	// this might actually solve itself due to depth map encoding
	if (depth == 1.0) depth = -1.0;
	float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;

	float distance = length(viewDir * viewZ);

	distance -= startDistance;

	float fog = clamp(exp2(-distance * density), 0.0, 1.0);
	color.xyz = mix(tint, color.xyz, fog);
	gl_FragColor = color;
}