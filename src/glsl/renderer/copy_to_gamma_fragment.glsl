varying vec2 uv;

uniform sampler2D sampler;

void main()
{
   gl_FragColor = hx_linearToGamma(texture2D(sampler, uv));
}