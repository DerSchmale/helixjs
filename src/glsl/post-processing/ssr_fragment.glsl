#extension GL_OES_standard_derivatives : enable

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_gbufferDepth;
uniform sampler2D hx_dither2D;
uniform vec2 hx_renderTargetResolution;

uniform sampler2D source;

varying vec2 uv;
varying vec3 viewDir;

uniform vec2 ditherTextureScale;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform float hx_rcpCameraFrustumRange;
uniform mat4 hx_projectionMatrix;

uniform float maxDistance;
uniform float stepSize;
uniform float maxRoughness;

// all in viewspace
// 0 is start, 1 is end
float raytrace(in vec3 ray0, in vec3 rayDir, out float hitZ, out vec2 hitUV)
{
    vec4 dither = texture2D(hx_dither2D, uv * ditherTextureScale);
    // Clip to the near plane
	float rayLength = ((ray0.z + rayDir.z * maxDistance) > -hx_cameraNearPlaneDistance) ?
						(-hx_cameraNearPlaneDistance - ray0.z) / rayDir.z : maxDistance;

    vec3 ray1 = ray0 + rayDir * rayLength;

    // only need the w component for perspective correct interpolation
    // need to get adjusted ray end's uv value
    vec4 hom0 = hx_projectionMatrix * vec4(ray0, 1.0);
    vec4 hom1 = hx_projectionMatrix * vec4(ray1, 1.0);
    float rcpW0 = 1.0 / hom0.w;
    float rcpW1 = 1.0 / hom1.w;

    hom0 *= rcpW0;
    hom1 *= rcpW1;

    // expressed in pixels, so we can snap to 1
    // need to figure out the ratio between 1 pixel and the entire line "width" (if primarily vertical, it's actually height)

    // line dimensions in pixels:

    vec2 pixelSize = (hom1.xy - hom0.xy) * hx_renderTargetResolution * .5;

    // line-"width" = max(abs(pixelSize.x), abs(pixelSize.y))
    // ratio pixel/width = 1 / max(abs(pixelSize.x), abs(pixelSize.y))

    float stepRatio = 1.0 / max(abs(pixelSize.x), abs(pixelSize.y)) * stepSize;

    vec2 uvEnd = hom1.xy * .5 + .5;

    vec2 dUV = (uvEnd - uv) * stepRatio;
    hitUV = uv;

    // linear depth
    float rayDepth = (-ray0.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
    float rayPerspDepth0 = rayDepth * rcpW0;
    float rayPerspDepth1 = (-ray1.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange * rcpW1;
    float rayPerspDepth = rayPerspDepth0;
    // could probably optimize this:
    float dRayD = (rayPerspDepth1 - rayPerspDepth0) * stepRatio;

    float rcpW = rcpW0;
    float dRcpW = (rcpW1 - rcpW0) * stepRatio;
    float sceneDepth = rayDepth;
    float prevRayDepth, prevSceneDepth;

    float amount = 0.0;

    hitUV += dUV * dither.z;
    rayPerspDepth += dRayD * dither.z;
    rcpW += dRcpW * dither.z;

    float sampleCount;
    for (int i = 0; i < NUM_SAMPLES; ++i) {
        rayDepth = rayPerspDepth / rcpW;

        sceneDepth = hx_sampleLinearDepth(hx_gbufferDepth, hitUV);

        if (rayDepth > sceneDepth + .001) {
            amount = float(sceneDepth < 1.0);
            sampleCount = float(i);
            break;
        }

        hitUV += dUV;
        rayPerspDepth += dRayD;
        rcpW += dRcpW;
    }

    hitZ = -hx_cameraNearPlaneDistance - sceneDepth * hx_cameraFrustumRange;

    // TODO: fade out last samples
    amount *= clamp((1.0 - (sampleCount - float(NUM_SAMPLES)) / float(NUM_SAMPLES)) * 5.0, 0.0, 1.0);
    return amount;
}

void main()
{
    vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));
    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
    float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
    vec3 normalSpecularReflectance;
    float roughness;
    float metallicness;
    hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);
    vec4 normalSample = texture2D(hx_gbufferNormals, uv);
    vec3 normal = hx_decodeNormal(normalSample);
    vec3 reflDir = reflect(normalize(viewDir), normal);

    vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflDir, normal);
    // not physically correct, but attenuation is required to look good

    // step for every pixel

    float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
    vec3 viewSpacePos = absViewZ * viewDir;

    float hitZ = 0.0;
    vec2 hitUV;
    float amount = raytrace(viewSpacePos, reflDir, hitZ, hitUV);
    float fadeFactor = 1.0; //clamp(-reflDir.z * 100.0, 0.0, 1.0);

    vec2 borderFactors = abs(hitUV * 2.0 - 1.0);
    borderFactors = (1.0 - borderFactors) * 10.0;
    fadeFactor *= clamp(borderFactors.x, 0.0, 1.0) * clamp(borderFactors.y, 0.0, 1.0);

    float diff = viewSpacePos.z - hitZ;
    fadeFactor *= smoothstep(-1.0, 0.0, diff);
    fadeFactor *= smoothstep(maxRoughness, 0.0, roughness);

    vec4 reflColor = texture2D(source, hitUV);

    float amountUsed = amount * fadeFactor;
    gl_FragColor = vec4(fresnel * reflColor.xyz, amountUsed);
}

