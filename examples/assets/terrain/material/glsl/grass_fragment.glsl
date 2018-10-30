varying_in vec2 uv;
varying_in vec3 normal;
varying_in vec4 worldPosition;
varying_in vec4 viewPosition;

uniform sampler2D colorMap;
uniform vec3 translucency;
uniform float alphaThreshold;
uniform float range;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

HX_GeometryData hx_geometry()
{
    vec4 albedo = texture2D(colorMap, uv);
    if (albedo.w < alphaThreshold) discard;

    albedo.w *= 1.0 - hx_linearStep(range * .8, range, length(viewPosition));

    // dithering is faster than blending
    if (albedo.w <= rand(worldPosition.xy))
        discard;

    HX_GeometryData data;
    // there's no diffuse colour here, or light probes would add in light here
    data.color = hx_gammaToLinear(albedo);
    data.normal = normalize(normal);
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.027;
    data.roughness = 0.5;
    data.occlusion = 1.0;
    data.emission = vec3(0.0);
    data.data = vec4(translucency, 1.0);
    return data;
}