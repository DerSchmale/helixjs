varying vec2 uv;

uniform sampler2D bloomTexture;
uniform sampler2D hx_backbuffer;
uniform float strength;

void main()
{
	gl_FragColor = texture2D(hx_backbuffer, uv) + texture2D(bloomTexture, uv) * strength;
}