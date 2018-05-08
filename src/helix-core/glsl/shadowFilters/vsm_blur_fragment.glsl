varying_in vec2 uv;

uniform sampler2D source;
uniform vec2 direction; // this is 1/pixelSize

vec2 readValues(vec2 coord)
{
    vec4 s = texture2D(source, coord);
    #if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)
    return s.xy;
    #else
    return vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));
    #endif
}

void main()
{
    vec2 total = readValues(uv);

	for (int i = 1; i <= RADIUS; ++i) {
	    vec2 offset = direction * float(i);
		total += readValues(uv + offset) + readValues(uv - offset);
	}

    total *= RCP_NUM_SAMPLES;

#if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)
    hx_FragColor = vec4(total, 0.0, 1.0);
#else
	hx_FragColor.xy = hx_floatToRG8(total.x);
	hx_FragColor.zw = hx_floatToRG8(total.y);
#endif
}