varying_in vec2 uv;

uniform sampler2D sampler;

uniform vec4 blendColor;

void main()
{
    // extractChannel comes from a macro
   hx_FragColor = texture2D(sampler, uv) * blendColor;
}
