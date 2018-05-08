varying_in vec2 uv;

uniform sampler2D source;

void main()
{
    hx_FragColor = hx_floatToRGBA8(texture2D(source, uv).x);
}
