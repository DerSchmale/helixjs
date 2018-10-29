varying_in vec2 uv;
varying_in vec3 normal;
varying_in vec4 viewPosition;

uniform sampler2D colorMap;
uniform vec3 translucency;
uniform float alphaThreshold;
uniform float range;

// Noise functions:
//	<https://www.shadertoy.com/view/4dS3Wd>
//	By Morgan McGuire @morgan3d, http://graphicscodex.com
//
float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(float x) {
	float i = floor(x);
	float f = fract(x);
	float u = f * f * (3.0 - 2.0 * f);
	return mix(hash(i), hash(i + 1.0), u);
}

HX_GeometryData hx_geometry()
{
    vec4 albedo = texture2D(colorMap, uv);
    if (albedo.w < alphaThreshold) discard;

    albedo.w *= 1.0 - hx_linearStep(range * .5, range, length(viewPosition));

    // dithering is faster than blending
    if (albedo.w < noise((viewPosition.x + viewPosition.y) * 100000.0))
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