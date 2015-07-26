varying vec2 uv;
varying vec3 viewWorldDir;

uniform vec3 tint;
uniform float density;
uniform float startDistance;
uniform float height;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform vec3 hx_cameraWorldPosition;

uniform sampler2D hx_source;
uniform sampler2D hx_gbufferDepth;

void main()
{
	vec4 color = texture2D(hx_source, uv);
	float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
	// do not fog up skybox
	if (depth == 1.0) depth = -1.0;
	float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
	vec3 viewDir = viewWorldDir * viewZ;
	float worldY = viewDir.y + hx_cameraWorldPosition.y;
	float s = sign(hx_cameraWorldPosition.y - height);

	float ratioUnder = clamp(s * (height - worldY) / abs(viewDir.y), 0.0, 1.0);

	if (hx_cameraWorldPosition.y < height)
		ratioUnder = 1.0 - ratioUnder;

	float distance = length(viewDir) * ratioUnder;

	distance -= startDistance;

	float fog = clamp(exp2(-distance * density), 0.0, 1.0);
	color.xyz = mix(tint, color.xyz, fog);
	gl_FragColor = color;
}