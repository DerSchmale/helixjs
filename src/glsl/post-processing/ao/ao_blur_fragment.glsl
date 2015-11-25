varying vec2 uv;

uniform sampler2D source;
uniform vec2 halfTexelOffset;

void main()
{
    vec4 total = texture2D(source, uv - halfTexelOffset * 3.0);
    total += texture2D(source, uv + halfTexelOffset);
	gl_FragColor = total * .5;
}