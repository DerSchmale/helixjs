attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 viewWorldDir;

uniform mat4 hx_inverseProjectionMatrix;
uniform mat4 hx_cameraWorldMatrix;

void main()
{
		uv = hx_texCoord;
		vec3 frustumVector = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);
		viewWorldDir = mat3(hx_cameraWorldMatrix) * frustumVector;
		gl_Position = hx_position;
}