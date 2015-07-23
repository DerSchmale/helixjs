varying vec2 uv;

uniform sampler2D sampler;

void main()
{
   gl_FragColor = vec4(hx_RGBA8ToFloat(texture2D(sampler, uv)));
}