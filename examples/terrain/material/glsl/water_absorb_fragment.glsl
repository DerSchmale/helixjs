uniform sampler2D waveMap;

uniform sampler2D hx_normalDepth;

uniform mat4 hx_viewMatrix;
uniform float roughness;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;
uniform vec3 absorptionDensity;

varying vec3 viewPos;
varying vec4 proj;

HX_GeometryData hx_geometry()
{
    vec2 screenCoord = proj.xy / proj.w * .5 + .5;
    vec4 normalDepth = texture2D(hx_normalDepth, screenCoord);
    float depth = hx_decodeLinearDepth(normalDepth);
    float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
    vec3 backPos = -viewPos / viewPos.z * absViewZ;
    float dist = distance(viewPos, backPos);
    vec3 absorb = -absorptionDensity * dist;
    vec3 color;


    // TODO: Do not output depth for water
    HX_GeometryData data;

    data.color.x = exp(absorb.x);
    data.color.y = exp(absorb.y);
    data.color.z = exp(absorb.z);
    data.color.w = 1.0;


    data.normal = vec3(0.0);
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = 0.0;
    data.emission = vec3(0.0);
    return data;
}