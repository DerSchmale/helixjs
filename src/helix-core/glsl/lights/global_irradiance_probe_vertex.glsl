attribute vec4 hx_position;
attribute vec2 hx_texCoord;

uniform mat4 hx_inverseViewProjectionMatrix;
uniform vec3 hx_cameraWorldPosition;

varying vec3 viewWorldDir;
varying vec2 uv;

// using rect mesh for rendering skyboxes!
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