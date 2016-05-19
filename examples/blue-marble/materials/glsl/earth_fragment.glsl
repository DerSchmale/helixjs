varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying vec2 uv;
varying float linearDepth;

uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D specularMap;
uniform sampler2D cloudMap;
uniform sampler2D emissionMap;

uniform float hx_transparencyMode;
uniform vec2 hx_rcpRenderTargetResolution;

uniform float specularNormalReflection;
uniform float minRoughness;
uniform float maxRoughness;
uniform float cloudRoughness;
uniform vec3 cloudColor;
uniform vec3 sunViewDirection;  // sun direction in camera space!

void main()
{
    vec4 color = texture2D(colorMap, uv);
    vec3 fragNormal = texture2D(normalMap, uv).xyz - .5;
    mat3 TBN;
    TBN[0] = normalize(tangent);
    TBN[1] = normalize(bitangent);
    TBN[2] = normalize(normal);

    vec4 outputColor = hx_gammaToLinear(texture2D(colorMap, uv));
    vec4 emissionSample = hx_gammaToLinear(texture2D(emissionMap, uv));
    float emission = max(dot(sunViewDirection, TBN[2]), 0.0);

    vec4 specSample = texture2D(specularMap, uv);
    float roughnessOut = maxRoughness + (minRoughness - maxRoughness) * specSample.x;

    // clouds
    // TODO: We should perform parallax correction
    vec4 cloudSample = texture2D(cloudMap, uv);
    vec3 cloudNormal = vec3(cloudSample.xy - .5, .5);
    float cloudAmount = cloudSample.z;

    fragNormal = mix(fragNormal, cloudNormal, cloudAmount);
    outputColor.xyz = mix(outputColor.xyz, cloudColor, cloudAmount);
    roughnessOut = mix(roughnessOut, cloudRoughness, cloudAmount);
    emission = emission * (1.0 - cloudAmount);

    fragNormal = TBN * normalize(fragNormal);

    outputColor.xyz = mix(outputColor.xyz, emissionSample.xyz, emission);

    // TODO: apply atmospheric scattering
    // need to figure out the scatter distance from surface to atmosphere
    // from there, we need to figure out how much is "fogged" and how much incoming light is scattered out
    // it doesn't make sense to do this in the geometry stage, should somehow be a post-process thing
    // but perhaps it can be close enough?

    GeometryData data;
    data.color = outputColor;
    data.normal = fragNormal;
    data.metallicness = 0.0;
    data.specularNormalReflection = specularNormalReflection;
    data.roughness = roughnessOut;
    data.emission = emission;
    data.transparencyMode = hx_transparencyMode;
    data.linearDepth = linearDepth;
    hx_processGeometry(data);
}