varying vec2 uv;

uniform sampler2D sampler;
uniform vec4 color;

void main()
{
    // extractChannel comes from a macro
   gl_FragColor = texture2D(sampler, uv) * color;
}
