varying vec2 uv;

uniform sampler2D sampler;

void main()
{
   gl_FragColor = vec4(1.0 - hx_sampleLinearDepth(sampler, uv));
}