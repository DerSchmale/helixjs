attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;

uniform vec2 direction; // this is 1/pixelSize

void main()
{
	uv = hx_texCoord - float(NUM_SAMPLES) * .5 * direction;
	gl_Position = hx_position;
}