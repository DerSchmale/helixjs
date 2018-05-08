varying_in vec2 uv;

uniform sampler2D bloomTexture;
uniform sampler2D hx_backbuffer;
uniform float strength;

void main()
{
	hx_FragColor = texture2D(hx_backbuffer, uv) + texture2D(bloomTexture, uv) * strength;
}