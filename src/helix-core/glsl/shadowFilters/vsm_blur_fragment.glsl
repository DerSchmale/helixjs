varying vec2 uv;

uniform sampler2D source;
uniform vec2 direction; // this is 1/pixelSize

vec2 readValues(vec2 coord)
{
    vec4 s = texture2D(source, coord);
    return vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));
}

void main()
{
    vec2 total = readValues(uv);

	for (int i = 1; i <= RADIUS; ++i) {
	    vec2 offset = direction * float(i);
		total += readValues(uv + offset) + readValues(uv - offset);
	}

    total *= RCP_NUM_SAMPLES;

	gl_FragColor.xy = hx_floatToRG8(total.x);
	gl_FragColor.zw = hx_floatToRG8(total.y);
}