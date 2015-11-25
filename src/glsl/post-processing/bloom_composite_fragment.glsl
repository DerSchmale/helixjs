varying vec2 uv;

uniform sampler2D bloomTexture;

void main()
{
	gl_FragColor = texture2D(bloomTexture, uv);
}