varying vec2 uv;

uniform sampler2D source;
uniform vec2 pixelSize;

void main()
{
    gl_FragColor.x = texture2D(source, uv).x;
    gl_FragColor.y = texture2D(source, uv + vec2(pixelSize.x, 0.0)).x;
    gl_FragColor.z = texture2D(source, uv + vec2(0.0, pixelSize.y)).x;
    gl_FragColor.w = texture2D(source, uv + pixelSize).x;
}
