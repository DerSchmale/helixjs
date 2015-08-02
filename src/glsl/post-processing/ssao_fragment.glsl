uniform mat4 hx_projectionMatrix;
uniform mat4 hx_viewMatrix;
uniform mat4 hx_cameraWorldMatrix;
uniform vec2 hx_renderTargetResolution;
uniform float hx_cameraFrustumRange;

uniform float strengthPerSample;
uniform float rcpFallOffDistance;
uniform float sampleRadius;
uniform vec3 samples[NUM_SAMPLES]; // w contains bias

uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferDepth;
uniform sampler2D ditherTexture;

varying vec2 uv;

void main()
{
    vec4 normalSample = texture2D(hx_gbufferNormals, uv);
    vec3 worldNormal = normalSample.xyz - .5;
    vec3 centerNormal = mat3(hx_viewMatrix) * worldNormal;
    float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
    float totalOcclusion = 0.0;
    vec3 dither = texture2D(ditherTexture, uv * hx_renderTargetResolution * .25).xyz;
    vec3 randomPlaneNormal = normalize(dither - .5);
    float w = -centerDepth * hx_cameraFrustumRange * hx_projectionMatrix[2][3] + hx_projectionMatrix[3][3];
    vec3 sampleRadii;
    sampleRadii.x = sampleRadius * .5 * hx_projectionMatrix[0][0] / w;
    sampleRadii.y = sampleRadius * .5 * hx_projectionMatrix[1][1] / w;
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
        float occluderDepth = hx_sampleLinearDepth(hx_gbufferDepth, samplePos);
        float diffZ = (centerDepth - occluderDepth) * hx_cameraFrustumRange;

        // distanceFactor: from 1 to 0, near to far
        float distanceFactor = clamp(diffZ * rcpFallOffDistance, 0.0, 1.0);
        distanceFactor = 1.0 - distanceFactor;

        // sampleOcclusion: 1 if occluding, 0 otherwise
        float sampleOcclusion = float(diffZ > scaledOffset.z);
        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;

    }
    gl_FragColor = vec4(1.0 - totalOcclusion * strengthPerSample);
}