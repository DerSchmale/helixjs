#ifdef HX_MOTION_VECTORS
uniform sampler2D hx_motionVectorBuffer;
#else
uniform sampler2D hx_normalDepthBuffer;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform mat4 hx_inverseProjectionMatrix;
uniform mat4 hx_cameraWorldMatrix;
uniform mat4 hx_prevViewProjectionMatrix;
uniform vec2 hx_cameraJitter;
#endif


vec2 hx_getMotionVector(vec2 uv)
{
#ifdef HX_MOTION_VECTORS
    return hx_decodeMotionVector(texture2D(hx_motionVectorBuffer, uv));
#else
    vec4 normalDepth = texture2D(hx_normalDepthBuffer, uv);
    float depth = hx_decodeLinearDepth(normalDepth);
    float absViewY = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;

    // unproject any point on the view ray to view space:
    vec2 ndc = uv * 2.0 - 1.0;
    // view projection matrix is jittered, so hx_inverseProjectionMatrix will "unjitter"
    // so we need to reapply the jitter to counter this
    vec3 viewDir = hx_getLinearDepthViewVector(ndc + hx_cameraJitter, hx_inverseProjectionMatrix);

    // reconstruct world position based on linear depth
    vec3 viewPos = viewDir * absViewY;
    vec4 worldPos = hx_cameraWorldMatrix * vec4(viewPos, 1.0);

    // reproject with previous frame matrix
    vec4 oldProj = hx_prevViewProjectionMatrix * worldPos;
    return (ndc - oldProj.xy / oldProj.w) * .5;
#endif
}

vec2 hx_getPreviousFrameUV(vec2 currentUV)
{
    return currentUV - hx_getMotionVector(currentUV);
}