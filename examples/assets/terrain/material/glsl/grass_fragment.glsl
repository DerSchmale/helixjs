varying_in vec2 uv;
varying_in vec3 normal;
varying_in vec4 worldPosition;
varying_in vec4 viewPosition;

uniform sampler2D colorMap;
uniform vec3 translucency;
uniform float alphaThreshold;
uniform float range;

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(vec2 n) {
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

HX_GeometryData hx_geometry()
{
    vec4 albedo = texture2D(colorMap, uv);
    float tr = 1.0 - hx_linearStep(range * .8, range, length(viewPosition));
    float dither = rand(worldPosition.xy);

    if (albedo.w < alphaThreshold || tr <= dither)
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