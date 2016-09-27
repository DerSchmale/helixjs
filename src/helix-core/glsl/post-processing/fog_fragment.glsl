varying vec2 uv;
varying vec3 viewDir;

uniform vec3 tint;
uniform float density;
uniform float startDistance;
uniform float heightFallOff;

uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;
uniform vec3 hx_cameraWorldPosition;

uniform sampler2D hx_normalDepth;
uniform sampler2D hx_backbuffer;

void main()
{
    vec4 normalDepth = texture2D(hx_normalDepth, uv);
	vec4 color = texture2D(hx_backbuffer, uv);
	float depth = hx_decodeLinearDepth(normalDepth);
	// do not fog up skybox
	if (normalDepth.z == 1.0 && normalDepth.w == 1.0) depth = 0.0;
	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
	vec3 viewVec = viewDir * absViewZ;
	float fogFactor = length(viewVec);// * exp(-heightFallOff * hx_cameraWorldPosition.y);
//    if( abs( viewVec.y ) > 0.1 )
//	{
		float t = heightFallOff * (viewVec.y + hx_cameraWorldPosition.y);
		fogFactor *= saturate(( 1.0 - exp( -t ) ) / t);
//	}

	float fog = clamp(exp(-fogFactor * density), 0.0, 1.0);
	color.xyz = mix(tint, color.xyz, fog);
	gl_FragColor = color;
}