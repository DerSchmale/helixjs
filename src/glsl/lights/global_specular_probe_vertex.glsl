attribute vec2 hx_texCoord;

varying vec3 viewWorldDir;
varying vec2 uv;

void main()
{
	vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;
	viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;
	viewWorldDir.y = viewWorldDir.y;
	vec4 pos = hx_position;
	pos.z = 1.0;
	gl_Position = pos;
	uv = hx_texCoord;
}