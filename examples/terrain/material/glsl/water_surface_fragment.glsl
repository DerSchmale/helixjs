uniform sampler2D waveMap;

uniform sampler2D hx_normalDepth;

uniform mat4 hx_viewMatrix;
uniform float roughness;

varying vec2 uv1;
varying vec2 uv2;
varying vec4 proj;
varying float linearDepth;

HX_GeometryData hx_geometry()
{
    vec2 screenCoord = proj.xy / proj.w * .5 + .5;
    vec4 normalDepth = texture2D(hx_normalDepth, screenCoord);
    float depth = hx_decodeLinearDepth(normalDepth);
    float alpha = hx_linearStep(0.0, 0.001, depth - linearDepth);

    vec3 normal1 = texture2D(waveMap, uv1).xzy - .5;
    vec3 normal2 = texture2D(waveMap, uv2).xzy - .5;
    vec3 normal = normal1 + normal2 * .25;
    normal = mat3(hx_viewMatrix) * normalize(normal);

    HX_GeometryData data;
    data.color = vec4(0.0, 0.0, 0.0, alpha);
    data.normal = normal;
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = roughness; // todo: add z falloff
    data.emission = vec3(0.0);
    return data;
}