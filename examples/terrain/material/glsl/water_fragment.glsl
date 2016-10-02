uniform sampler2D waveMap;

uniform sampler2D hx_normalDepth;
uniform sampler2D hx_backbuffer;

uniform mat4 hx_viewMatrix;
uniform float roughness;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform float indexOfRefraction;
uniform vec3 absorptionDensity;
uniform vec3 inScatterDensity;

varying vec2 uv1;
varying vec2 uv2;
varying vec4 proj;
varying vec3 viewPos;

HX_GeometryData hx_geometry()
{
    vec2 screenCoord = proj.xy / proj.w * .5 + .5;
    vec4 normalDepth = texture2D(hx_normalDepth, screenCoord);
    vec3 normal1 = texture2D(waveMap, uv1).xzy - .5;
    vec3 normal2 = texture2D(waveMap, uv2).xzy - .5;
    vec3 normal = normal1 + normal2 * .25;
    normal = mat3(hx_viewMatrix) * normalize(normal);

    float depth = hx_decodeLinearDepth(normalDepth);
    float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
    vec3 backPos = -viewPos / viewPos.z * absViewZ;
    float dist = distance(viewPos, backPos);

    vec3 viewDir = normalize(viewPos);

    vec3 refractDir = refract(viewDir, normal, 1.0 / indexOfRefraction);
// cannot clamp, as this would make any deep region have the same offset, which looks weird
    vec2 offset = refractDir.xy / proj.w * dist;
    screenCoord += offset;

    // mirror wrapping looks best
    if (screenCoord.x > 1.0) screenCoord.x -= (screenCoord.x - 1.0) * 2.0;
    else if (screenCoord.x < 0.0) screenCoord.x -= screenCoord.x * 2.0;

    if (screenCoord.y > 1.0) screenCoord.y -= (screenCoord.y - 1.0) * 2.0;
    else if (screenCoord.y < 0.0) screenCoord.y -= screenCoord.y * 2.0;

    vec4 backColor = texture2D(hx_backbuffer, screenCoord);

    vec3 absorb = -absorptionDensity * dist;
    absorb.x = exp(absorb.x);
    absorb.y = exp(absorb.y);
    absorb.z = exp(absorb.z);

    float alpha = hx_linearStep(0.0, 0.5, dist);

    HX_GeometryData data;
    // there's no diffuse colour here, or light probes would add in light here
    data.color = vec4(0.0, 0.0, 0.0, alpha);
    data.normal = normal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = roughness; // todo: add z falloff?
    data.emission = backColor.xyz * absorb;
    // in this case, the lighting model expects the data object to contain the water's absorption properties and the distance of the ray between surface and bottom
    data.data = vec4(inScatterDensity, min(dist, 20.0));
    return data;
}