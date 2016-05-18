varying vec2 uv;

uniform sampler2D sampler;

void main()
{
// GREY = OPAQUE
// RED = ALPHA
// BLUE = ADDITIVE

    float mode = texture2D(sampler, uv).w;
    if (mode == HX_TRANSPARENCY_ALPHA)
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    else if (mode == HX_TRANSPARENCY_ADDITIVE)
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
    else
        gl_FragColor = vec4(.25, .25, .25, 1.0);
}