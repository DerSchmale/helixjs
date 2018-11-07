varying_in vec2 uv;

uniform sampler2D sampler;

void main()
{
    // extractChannel comes from a macro
    vec3 normal = hx_decodeNormal(texture2D(sampler, uv));
    // swizzle so that it looks more naturally like tangent space normal maps
    hx_FragColor = vec4(normal.xzy * vec3(.5, .5, -.5) + .5, 1.0);
}