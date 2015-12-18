uniform sampler2D depth;
uniform sampler2D source;

varying vec2 uv;

uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform mat4 hx_projectionMatrix;

uniform mat4 reprojectionMatrix;

vec2 reproject(vec2 uv, float z)
{
    // need z in NDC homogeneous coords to be able to unproject
    vec4 ndc;
    ndc.xy = uv.xy * 2.0 - 1.0;
    // Unprojected Z will just end up being Z again, so could put this in the unprojection matrix itself?
    ndc.z = (hx_projectionMatrix[2][2] * z + hx_projectionMatrix[3][2]) / -z;   // ndc = hom.z / hom.w
    ndc.w = 1.0;
    vec4 hom = reprojectionMatrix * ndc;
    return hom.xy / hom.w * .5 + .5;
}

void main()
{
    float depth = hx_sampleLinearDepth(depth, uv);
    float z = -hx_cameraNearPlaneDistance - depth * hx_cameraFrustumRange;
    vec2 reprojectedUV = reproject(uv, z);
    gl_FragColor = texture2D(source, reprojectedUV);
}

