varying vec2 uv;

uniform sampler2D sampler;
uniform float hx_rcpCameraFrustumRange;
uniform mat4 hx_projectionMatrix;

float readDepth(sampler2D sampler, vec2 uv)
{
	#ifdef HX_STORE_EXPLICIT_DEPTH
		vec4 data = texture2D(sampler, uv);
		return hx_RG8ToFloat(data.zw);
    #else
    	return texture2D(sampler, uv).x;
    #endif
}

void main()
{
	float depth = readDepth(sampler, uv);
	float linear = hx_depthToViewZ(depth, hx_projectionMatrix) * hx_rcpCameraFrustumRange;
	gl_FragColor = hx_floatToRGBA8(linear);
}