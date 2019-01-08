varying_in vec2 uv;
varying_in vec3 viewDir;

uniform vec3 tint;
uniform float density;
uniform float startDistance;
uniform float heightFallOff;
uniform bool applyToSkybox;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform vec3 hx_cameraWorldPosition;

uniform sampler2D hx_normalDepthBuffer;
uniform sampler2D hx_backBuffer;

void main()
{
    vec4 normalDepth = texture2D(hx_normalDepthBuffer, uv);
	vec4 color = texture2D(hx_backBuffer, uv);
	float depth = hx_decodeLinearDepth(normalDepth);
	// do not fog up skybox, or should we allow this optionally
	if (normalDepth.z == 1.0 && normalDepth.w == 1.0)
	    depth = 0.0;
	float absViewY = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
	vec3 viewVec = viewDir * absViewY;
    float viewLen = length(viewVec);
    float dist = max(viewLen - startDistance, 0.0);
    float h = hx_cameraWorldPosition.z, z = viewVec.z / viewLen; // z-slope of normalized direction
	// a = density, b = falloff, h = o.z (origin height), z = d.z (dir height slope), m = distance to point
	// the density function is: f(p) = a * exp(-b * p.z) or:
    // f(t) = ae ^ (-b(zt + h))
	// anti-derivative:
	// F(t) = -ae ^ (-b(zt + h)) / bz + C

	float e0 = exp(-heightFallOff * h);
	float em = exp(-heightFallOff * (z * dist + h));
	float optThickness = density * (e0 - em) / (heightFallOff * z);
 	float fog = clamp(exp(-optThickness), 0.0, 1.0);

    // "fog" is actually an extinction parameter, so the lower the value, the less original colour
	color.xyz = mix(tint, color.xyz, fog);
	hx_FragColor = color;
}