varying_in vec3 normal;
varying_in vec3 tangent;
varying_in vec3 bitangent;
varying_in vec2 uv;
varying_in float linearDepth;
varying_in vec3 scatterColor0;
varying_in vec3 scatterColor1;

uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D specularMap;
uniform sampler2D cloudMap;
uniform sampler2D emissionMap;

uniform float normalSpecularReflectance;
uniform float minRoughness;
uniform float maxRoughness;
uniform float cloudRoughness;
uniform vec3 cloudColorDay;
uniform vec3 cloudColorNight;
uniform vec3 sunViewDirection;  // sun direction in camera space!

HX_GeometryData hx_geometry()
{
    vec4 color = texture2D(colorMap, uv);
    vec3 fragNormal = texture2D(normalMap, uv).xyz - .5;
    mat3 TBN;
    TBN[0] = normalize(tangent);
    TBN[1] = normalize(bitangent);
    TBN[2] = normalize(normal);

    vec4 outputColor = hx_gammaToLinear(texture2D(colorMap, uv));
    vec3 emissionColor = hx_gammaToLinear(texture2D(emissionMap, uv)).xyz;
    float emission = dot(sunViewDirection, TBN[2]);
    emission = hx_linearStep(-.2, .1, emission);

    vec4 specSample = texture2D(specularMap, uv);
    float roughnessOut = maxRoughness + (minRoughness - maxRoughness) * specSample.x;

    // clouds
    // TODO: We should perform parallax correction
    vec4 cloudSample = texture2D(cloudMap, uv);
    vec3 cloudNormal = vec3(cloudSample.xy - .5, .5);
    float cloudAmount = cloudSample.z;

    outputColor.xyz = mix(outputColor.xyz, cloudColorDay, cloudAmount);
    emissionColor = mix(emissionColor, cloudColorNight, cloudAmount) * .5;

    outputColor.xyz = scatterColor1 * .25 * outputColor.xyz;
//    outputColor.xyz += scatterColor0;

    fragNormal = mix(fragNormal, cloudNormal, cloudAmount);
    roughnessOut = mix(roughnessOut, cloudRoughness, cloudAmount);

    fragNormal = TBN * normalize(fragNormal);

    HX_GeometryData data;
    data.color = outputColor;
    data.normal = fragNormal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = normalSpecularReflectance;
    data.roughness = roughnessOut;
    data.occlusion = 1.0;
    data.emission = scatterColor0 + emission * emissionColor;
    return data;
}