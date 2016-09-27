varying vec2 uv;

uniform sampler2D source;

void main()
{
    gl_FragColor = hx_floatToRGBA8(texture2D(source, uv).x);
}
