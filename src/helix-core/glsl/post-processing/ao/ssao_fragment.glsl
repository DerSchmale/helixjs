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
uniform sampler2D hx_gbufferNormalDepth;

varying vec2 uv;

void main()
{
    vec4 normalDepth = texture2D(hx_gbufferNormalDepth, uv);
    vec3 centerNormal = hx_decodeNormal(normalDepth);
    float centerDepth = hx_decodeLinearDepth(normalDepth);
    float totalOcclusion = 0.0;
    vec3 dither = texture2D(ditherTexture, uv * ditherScale).xyz;
    vec3 randomPlaneNormal = normalize(dither - .5);
    float w = hx_cameraNearPlaneDistance + centerDepth * hx_cameraFrustumRange;
    float centerY = centerDepth * hx_cameraFrustumRange;    // can ignore nearDist
    vec3 sampleRadii;
    sampleRadii.xy = sampleRadius * .5 / w * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][2]);
    sampleRadii.z = sampleRadius;

    for (int i = 0; i < NUM_SAMPLES; ++i) {
        vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);
        vec3 normOffset = normalize(sampleOffset);

        // mirror sample position to the positive side of the plane
        float cosFactor = dot(normOffset, centerNormal);
        float sign = sign(cosFactor);
        sampleOffset *= sign;
        cosFactor *= sign;

        vec3 scaledOffset = sampleOffset * sampleRadii;

        vec2 samplePos = uv + scaledOffset.xy;
        normalDepth = texture2D(hx_gbufferNormalDepth, samplePos);
        float occluderDepth = hx_decodeLinearDepth(normalDepth);

        // can ignore nearDist
        float occluderY = hx_cameraFrustumRange * occluderDepth;
        float sampleY = centerY + scaledOffset.z;

        float distanceFactor = max(1.0 - (sampleY - occluderY) * rcpFallOffDistance, 0.0);

        // at this point, occlusion really means occlusion, and not the output "colour" (ie 1 = completely occluded)
        float sampleOcclusion = float(occluderY < sampleY);

        // if cosFactor = 0, the sample is coplanar, and occludes less
        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;
    }
    gl_FragColor = vec4(vec3(1.0 - totalOcclusion * strengthPerSample), 1.0);
}