varying vec2 uv;

uniform sampler2D sourceTexture;

uniform float gaussianWeights[NUM_SAMPLES];

void main()
{
	vec4 total = vec4(0.0);
	vec2 sampleUV = uv;
	vec2 stepSize = DIRECTION / SOURCE_RES;
	float totalWeight = 0.0;
	for (int i = 0; i < NUM_SAMPLES; ++i) {
		total += texture2D(sourceTexture, sampleUV) * gaussianWeights[i];
		sampleUV += stepSize;
	}
	gl_FragColor = total;
}