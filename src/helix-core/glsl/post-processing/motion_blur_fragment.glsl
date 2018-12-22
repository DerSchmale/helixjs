varying_in vec2 uv;

uniform sampler2D hx_motionVectorBuffer;
uniform sampler2D hx_backBuffer;
uniform vec2 hx_renderTargetResolution;
uniform float maxRadius;

void main()
{
    vec2 velocity = hx_decodeVelocity(texture2D(hx_motionVectorBuffer, uv));
    float totalWeight = max(dot(velocity, velocity), 0.001);
    vec4 total = texture2D(hx_backBuffer, uv) * totalWeight;

    // possibly rescale velocity to maxRadius (which is in pixels)
    float ssLen = length(hx_renderTargetResolution * velocity);
    velocity *= min(ssLen, maxRadius) / ssLen;

    vec2 step = velocity * STEP_SCALE;
    vec2 texcoord  = uv;

    for (int i = 1; i < NUM_BLUR_SAMPLES; ++i) {
        texcoord += step;
        vec2 vel2 = hx_decodeVelocity(texture2D(hx_motionVectorBuffer, texcoord));
        // all the points in "front" of the velocity vector may have moved through here, if their velocity is similar
        float w = max(dot(velocity, vel2), 0.0);
        totalWeight += w;
        total += texture2D(hx_backBuffer, texcoord) * w;
    }

    gl_FragColor = total / totalWeight;
}