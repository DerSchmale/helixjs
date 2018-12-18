varying_in vec2 uv;

uniform sampler2D bloomTexture;
uniform sampler2D hx_backBuffer;
uniform float strength;

void main()
{
	hx_FragColor = texture2D(hx_backBuffer, uv) + texture2D(bloomTexture, uv) * strength;
}