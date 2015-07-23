varying vec2 uv;

uniform sampler2D sampler;
uniform float hx_rcpCameraFrustumRange;
uniform mat4 hx_projectionMatrix;

void main()
{
	float depth = hx_readDepth(sampler, uv);
	float linear = hx_depthToViewZ(depth, hx_projectionMatrix) * hx_rcpCameraFrustumRange;
	gl_FragColor = hx_floatToRGBA8(linear);
}