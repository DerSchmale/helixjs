varying_in vec2 uv;

uniform sampler2D sampler;

void main()
{
    // extractChannel comes from a macro
   hx_FragColor = vec4(extractChannels(texture2D(sampler, uv)));

#ifndef COPY_ALPHA
   hx_FragColor.a = 1.0;
#endif
}
