varying_in vec2 uv;

uniform sampler2D sampler;

void main()
{
    // extractChannel comes from a macro
    vec2 velocity = hx_decodeMotionVector(texture2D(sampler, uv));
    // swizzle so that it looks more naturally like tangent space normal maps
    hx_FragColor = vec4(velocity.xy * .5 + .5, 0.0, 1.0);
}