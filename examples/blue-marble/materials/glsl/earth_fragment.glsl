varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying vec2 uv;
varying float linearDepth;

uniform sampler2D colorMap;
uniform sampler2D normalMap;
uniform sampler2D specularMap;
uniform sampler2D cloudMap;
//uniform sampler2D emissionMap;

uniform float hx_transparencyMode;

uniform float specularNormalReflection;
uniform float minRoughness;
uniform float maxRoughness;
uniform float cloudRoughness;
uniform vec3 cloudColor;

void main()
{
    vec4 color = texture2D(colorMap, uv);
    vec3 fragNormal = texture2D(normalMap, uv).xyz - .5;
    mat3 TBN;
    TBN[0] = normalize(tangent);
    TBN[1] = normalize(bitangent);
    TBN[2] = normalize(normal);

    vec4 outputColor = texture2D(colorMap, uv);
//    vec4 emissionSample = texture2D(emissionMap, uv);
    float emission = 0.0;

    // TODO: Should set sun direction so we know where to put the emission?

    vec4 specSample = texture2D(specularMap, uv);
    float roughnessOut = maxRoughness + (minRoughness - maxRoughness) * specSample.x;

    // clouds
    vec4 cloudSample = texture2D(cloudMap, uv);
    vec3 cloudNormal = vec3(cloudSample.xy - .5, .5);
    float cloudAmount = cloudSample.z;

    fragNormal = mix(fragNormal, cloudNormal, cloudAmount);
    outputColor.xyz = mix(outputColor.xyz, cloudColor, cloudAmount);
    roughnessOut = mix(roughnessOut, cloudRoughness, cloudAmount);

    fragNormal = TBN * normalize(fragNormal);

    GeometryData data;
    data.color = hx_gammaToLinear(outputColor);
    data.normal = fragNormal;
    data.metallicness = 0.0;
    data.specularNormalReflection = specularNormalReflection;
    data.roughness = roughnessOut;
    data.emission = emission;
    data.transparencyMode = hx_transparencyMode;
    data.linearDepth = linearDepth;
    hx_processGeometry(data);
}