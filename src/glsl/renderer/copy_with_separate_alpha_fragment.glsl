varying vec2 uv;

uniform sampler2D sampler;
uniform sampler2D alphaSource;

void main()
{
   gl_FragColor = texture2D(sampler, uv);
   gl_FragColor.a = texture2D(alphaSource, uv).a;
}
