varying vec2 uv;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_backbuffer;

void main()
{
// if transparency type is 0, it's opaque and alpha represents unlit/lit ratio
    vec4 colorSample = texture2D(hx_gbufferColor, uv);
    vec4 litSample = texture2D(hx_backbuffer, uv);
    float alpha = colorSample.w;

    gl_FragColor = mix(colorSample, litSample, alpha);
}
