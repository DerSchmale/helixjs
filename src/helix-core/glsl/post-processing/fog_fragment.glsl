varying vec2 uv;

uniform vec3 tint;
uniform float density;
uniform float startDistance;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

uniform sampler2D hx_normalDepth;
uniform sampler2D hx_backbuffer;

void main()
{
    vec4 normalDepth = texture2D(hx_normalDepth, uv);
	vec4 color = texture2D(hx_backbuffer, uv);
	float depth = hx_decodeLinearDepth(normalDepth);
	// do not fog up skybox
	if (depth > .999) depth = 0.0;
	float distance = max(depth * hx_cameraFrustumRange - startDistance, 0.0);
	float fog = clamp(exp2(-distance * density), 0.0, 1.0);
	color.xyz = mix(tint, color.xyz, fog);
	gl_FragColor = color;
}