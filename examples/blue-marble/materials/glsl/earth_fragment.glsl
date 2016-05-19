varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying vec2 uv;
varying float linearDepth;
varying vec3 scatterColor0;
varying vec3 scatterColor1;

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
uniform vec3 cloudColorDay;
uniform vec3 cloudColorNight;
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
    vec4 emissionColor = hx_gammaToLinear(texture2D(emissionMap, uv));
    float emission = dot(sunViewDirection, TBN[2]);
    // anything above .1 should be mapped to 1.0
    emission = hx_linearStep(-.2, .1, emission);

    vec4 specSample = texture2D(specularMap, uv);
    float roughnessOut = maxRoughness + (minRoughness - maxRoughness) * specSample.x;

    // clouds
    // TODO: We should perform parallax correction
    vec4 cloudSample = texture2D(cloudMap, uv);
    vec3 cloudNormal = vec3(cloudSample.xy - .5, .5);
    float cloudAmount = cloudSample.z;

    outputColor.xyz = mix(outputColor.xyz, cloudColorDay, cloudAmount);
    emissionColor.xyz = mix(emissionColor.xyz, cloudColorNight, cloudAmount);

    outputColor.xyz = scatterColor1 * .25 * outputColor.xyz;
    outputColor.xyz = mix(outputColor.xyz, emissionColor.xyz, emission);
    outputColor.xyz += scatterColor0;

    fragNormal = mix(fragNormal, cloudNormal, cloudAmount);
    roughnessOut = mix(roughnessOut, cloudRoughness, cloudAmount);
//    emission *= hx_linearStep(.5, 0.0, cloudAmount);

    fragNormal = TBN * normalize(fragNormal);

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