varying vec2 uv;

uniform sampler2D sampler;
uniform mat4 hx_projectionMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;

float readDepth()
{
#ifdef HX_NO_DEPTH_TEXTURES
    vec4 data;
    data.xy = texture2D(sampler, uv).zw;
    return hx_RG8ToFloat(data.xy);
#else
    return texture2D(sampler, uv).x;
#endif
}

void main()
{
	float depth = readDepth();
	float linear = (-hx_depthToViewZ(depth, hx_projectionMatrix) - hx_cameraNearPlaneDistance) / hx_cameraFrustumRange;
	gl_FragColor = hx_floatToRGBA8(linear);
}