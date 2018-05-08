varying_in vec2 uv1;
varying_in vec2 uv2;
varying_in vec2 uv3;
varying_in vec2 uv4;

uniform sampler2D source;

void main()
{
    vec4 total = texture2D(source, uv1) + texture2D(source, uv2) + texture2D(source, uv3) + texture2D(source, uv4);
	hx_FragColor = total * .25;
}