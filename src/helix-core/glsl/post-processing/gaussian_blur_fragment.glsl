varying_in vec2 uv;

uniform sampler2D sourceTexture;

uniform vec2 stepSize;

uniform float gaussianWeights[NUM_WEIGHTS];

void main()
{
	vec4 total = texture2D(sourceTexture, uv) * gaussianWeights[0];
    vec2 offset = vec2(0.0);

	for (int i = 1; i <= RADIUS; ++i) {
		offset += stepSize;
	    vec4 s = texture2D(sourceTexture, uv + offset) + texture2D(sourceTexture, uv - offset);
		total += s * gaussianWeights[i];
	}

	hx_FragColor = total;
}