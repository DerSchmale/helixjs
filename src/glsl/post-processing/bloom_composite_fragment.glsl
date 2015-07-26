varying vec2 uv;

uniform sampler2D hx_source;
uniform sampler2D bloomTexture;

void main()
{
	gl_FragColor = texture2D(hx_source, uv) + texture2D(bloomTexture, uv);
}