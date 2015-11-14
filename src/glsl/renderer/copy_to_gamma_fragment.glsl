varying vec2 uv;

uniform sampler2D sampler;

void main()
{
   gl_FragColor = vec4(hx_linearToGamma(texture2D(sampler, uv).xyz), 1.0);
}