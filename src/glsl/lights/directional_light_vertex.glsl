attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 viewDir;

uniform mat4 hx_inverseProjectionMatrix;

void main()
{
	uv = hx_texCoord;
	viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);
	gl_Position = hx_position;
}