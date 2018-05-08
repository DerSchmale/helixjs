varying_in vec2 uv;

uniform sampler2D sampler;

void main()
{
   hx_FragColor = hx_linearToGamma(texture2D(sampler, uv));
}