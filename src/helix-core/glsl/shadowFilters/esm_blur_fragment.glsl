varying_in vec2 uv;

uniform sampler2D source;
uniform vec2 direction; // this is 1/pixelSize

float readValue(vec2 coord)
{
    float v = texture2D(source, coord).x;
    return v;
//    return exp(HX_ESM_CONSTANT * v);
}

void main()
{
    float total = readValue(uv);

	for (int i = 1; i <= RADIUS; ++i) {
	    vec2 offset = direction * float(i);
		total += readValue(uv + offset) + readValue(uv - offset);
	}

//	hx_FragColor = vec4(log(total * RCP_NUM_SAMPLES) / HX_ESM_CONSTANT);
	hx_FragColor = vec4(total * RCP_NUM_SAMPLES);
}