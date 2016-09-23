uniform mat4 hx_projectionMatrix;
uniform mat4 hx_cameraWorldMatrix;
uniform float hx_cameraFrustumRange;
uniform float hx_cameraNearPlaneDistance;

uniform vec2 ditherScale;
uniform float strengthPerSample;
uniform float rcpFallOffDistance;
uniform float sampleRadius;
uniform vec3 samples[NUM_SAMPLES]; // w contains bias

uniform sampler2D ditherTexture;
uniform sampler2D hx_normalDepth;

varying vec2 uv;

void main()
{
    vec4 normalDepth = texture2D(hx_normalDepth, uv);
    vec3 centerNormal = hx_decodeNormal(normalDepth);
    float centerDepth = hx_decodeLinearDepth(normalDepth);
    float totalOcclusion = 0.0;
    vec3 dither = texture2D(ditherTexture, uv * ditherScale).xyz;
    vec3 randomPlaneNormal = normalize(dither - .5);
    float w = centerDepth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;
    vec3 sampleRadii;
    sampleRadii.xy = sampleRadius * .5 / w * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]);
    sampleRadii.z = sampleRadius;

    for (int i = 0; i < NUM_SAMPLES; ++i) {
        vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);
        vec3 normOffset = normalize(sampleOffset);
        float cosFactor = dot(normOffset, centerNormal);
        float sign = sign(cosFactor);
        sampleOffset *= sign;
        cosFactor *= sign;

        vec3 scaledOffset = sampleOffset * sampleRadii;

        vec2 samplePos = uv + scaledOffset.xy;
        normalDepth = texture2D(hx_normalDepth, samplePos);
        float occluderDepth = hx_decodeLinearDepth(normalDepth);
        float diffZ = (centerDepth - occluderDepth) * hx_cameraFrustumRange;

        // distanceFactor: from 1 to 0, near to far
        float distanceFactor = clamp(diffZ * rcpFallOffDistance, 0.0, 1.0);
        distanceFactor = 1.0 - distanceFactor;

        // sampleOcclusion: 1 if occluding, 0 otherwise
        float sampleOcclusion = float(diffZ > scaledOffset.z);
        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;
    }
    gl_FragColor = vec4(vec3(1.0 - totalOcclusion * strengthPerSample), 1.0);
}