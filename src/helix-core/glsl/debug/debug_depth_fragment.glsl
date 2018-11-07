varying_in vec2 uv;

uniform sampler2D sampler;

void main()
{
    // extractChannel comes from a macro
    float depth = hx_decodeLinearDepth(texture2D(sampler, uv));
    // swizzle so that it looks more naturally like tangent space normal maps
    hx_FragColor = vec4(depth, depth, depth, 1.0);
}
