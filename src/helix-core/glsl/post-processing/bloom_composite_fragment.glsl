varying vec2 uv;

uniform sampler2D bloomTexture;
uniform float strength;

void main()
{
	gl_FragColor = texture2D(bloomTexture, uv) * strength;
}