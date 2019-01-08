#define NUM_SAMPLES 8

uniform mat4 hx_cameraWorldMatrix;

uniform float sunAngleSize;
uniform float sunSoftness;
uniform float earthRadius;
uniform float atmosphereRadius;
uniform vec3 rayleighExtinction;
uniform vec3 rayleighFactors;
uniform float intensity;


varying_in vec3 viewVecWorld;

vec3 rayleigh(float vDotL)
{
    return 3.0 / (16.0 * HX_PI) * (1.0 + vDotL * vDotL) * rayleighFactors;
}

vec3 transmittance(float dx)
{
    // TODO: density is not constant, but has an exponential distribution based on height
    return exp(-dx * rayleighExtinction);
}

float getAtmosThickness(vec3 origin, vec3 dir)
{
    // a = 1, since dir is unit
    float b = dot(dir, origin);
    float c = dot(origin, origin) - atmosphereRadius*atmosphereRadius;
    float det = max(b*b - c, 0.0);
    return (-b + sqrt(det));
}

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float vDotL = -dot(lightDir, viewDir);
	float sunAngle = acos(vDotL);
    float sunMask = 1.0 - smoothstep(sunAngleSize - sunSoftness, sunAngleSize, sunAngle);

	vDotL = max(vDotL, 0.0);

    // will apply transmittance to sun disk
	vec3 col = vec3(sunMask);
	vec3 lightWorldDir = mat3(hx_cameraWorldMatrix) * lightDir;

	// TODO: Calculate distance based on atmosphere and earth size
	// we're on a point at (0, 0, earthRadius), need to get intersection from there with atmosphere and dir t * worldDir

    vec3 x = vec3(0.0, 0.0, earthRadius);
    vec3 marchDir = normalize(viewVecWorld);
    float dist = getAtmosThickness(x, marchDir);
    float dx = dist / float(NUM_SAMPLES - 1);
    vec3 tr = transmittance(dx);
    vec3 scatter = rayleigh(vDotL);

    x += marchDir * dist;
    // march from back to front, so we can keep multiplying the constant transmittance
	for (int i = NUM_SAMPLES; i > 0; --i) {
        x -= dx * marchDir;
        col *= tr;
        // in-scattered amount also extinguished through the atmosphere
        col += scatter * dx * transmittance(getAtmosThickness(x, -lightWorldDir));
	}

    diffuseColor = col * intensity;
    specularColor = vec3(0.0);
}