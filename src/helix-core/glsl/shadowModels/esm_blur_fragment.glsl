varying vec2 uv;

uniform sampler2D source;
uniform vec2 direction; // this is 1/pixelSize

float readExp(vec2 coord)
{
    float v = hx_RGBA8ToFloat(texture2D(source, coord));
    return exp(HX_ESM_CONSTANT * v);
}

void main()
{
    float total = 0.0;
	vec2 sampleUV = uv;
	float totalWeight = 0.0;

	for (int i = 0; i < NUM_SAMPLES; ++i) {
		total += readExp(sampleUV);
		sampleUV += direction;
	}

	gl_FragColor = hx_floatToRGBA8(log(total / float(NUM_SAMPLES)) / HX_ESM_CONSTANT);
}