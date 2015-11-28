varying vec2 uv;

uniform sampler2D sampler;
#if defined(HX_NO_DEPTH_TEXTURES) && defined(HX_MAX_DEPTH_PRECISION)
uniform sampler2D sampler2; // contains the final precision in the w channel
#endif
uniform mat4 hx_projectionMatrix;
uniform float hx_rcpCameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

float readDepth()
{
#ifdef HX_NO_DEPTH_TEXTURES
    vec4 data;
    data.xy = texture2D(sampler, uv).zw;
    #ifdef HX_MAX_DEPTH_PRECISION
        data.z = texture2D(sampler2, uv).w;
        data.w = 0.0;
        return hx_RGBA8ToFloat(data);
    #else
        return hx_RG8ToFloat(data.xy);
    #endif
#else
    return texture2D(sampler, uv).x;
#endif
}

void main()
{
	float depth = readDepth();
	float linear = (hx_depthToViewZ(depth, hx_projectionMatrix) - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
	gl_FragColor = hx_floatToRGBA8(linear);
}