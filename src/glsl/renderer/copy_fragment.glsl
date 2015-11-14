varying vec2 uv;

uniform sampler2D sampler;

void main()
{
    // extractChannel comes from a macro
   gl_FragColor = vec4(extractChannels(texture2D(sampler, uv)));
   gl_FragColor.a = 1.0;
}
