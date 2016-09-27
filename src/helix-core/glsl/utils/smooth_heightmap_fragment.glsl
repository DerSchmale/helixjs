varying vec2 uv;

uniform sampler2D reference;    // the source (8 bit) texture
uniform sampler2D source;

uniform vec2 stepSize;

void main()
{
    float gauss[4];
    gauss[0] = 0.201788613113303;
    gauss[1] = 0.17755834971394;
    gauss[2] = 0.120969095455128;
    gauss[3] = 0.063811162332456;
    float refHeight = texture2D(reference, uv).x;
    float total = hx_RGBA8ToFloat(texture2D(source, uv)) * gauss[0];
    float totalWeight = gauss[0];
    float currentWeightL = 1.0;
    float currentWeightR = 1.0;
    vec2 offset = vec2(0.0);


    for (int i = 0; i < 3; ++i) {
        offset += stepSize;
        float refLeft = texture2D(reference, uv - offset).x;
        float refRight = texture2D(reference, uv + offset).x;
        float heightLeft = hx_RGBA8ToFloat(texture2D(source, uv - offset));
        float heightRight = hx_RGBA8ToFloat(texture2D(source, uv + offset));
        // smooth out over N pixels that have the same reference height in the source image
        currentWeightL = max(currentWeightL - abs(refLeft - refHeight) * 5.0, 0.0);
        currentWeightR = max(currentWeightR - abs(refRight - refHeight) * 5.0, 0.0);
        totalWeight += (currentWeightL + currentWeightR) * gauss[i + 1];
        total += (heightLeft * currentWeightL + heightRight * currentWeightR) *  gauss[i + 1];
    }

    gl_FragColor = hx_floatToRGBA8(total / totalWeight);
//    gl_FragColor = hx_floatToRGBA8(refHeight);
}
