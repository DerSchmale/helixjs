vertex_attribute vec4 hx_position;
vertex_attribute vec2 hx_texCoord;

varying_out vec2 uv1;
varying_out vec2 uv2;
varying_out vec2 uv3;
varying_out vec2 uv4;

uniform vec2 pixelSize;

void main()
{
	uv1 = hx_texCoord + vec2(-1.5, .5) * pixelSize;
	uv2 = hx_texCoord + vec2(.5, .5) * pixelSize;
	uv3 = hx_texCoord + vec2(.5, -1.5) * pixelSize;
	uv4 = hx_texCoord + vec2(-1.5, -1.5) * pixelSize;
	gl_Position = hx_position;
}