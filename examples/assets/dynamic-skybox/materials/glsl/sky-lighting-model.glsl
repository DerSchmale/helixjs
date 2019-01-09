#define NUM_SAMPLES 8

uniform mat4 hx_cameraWorldMatrix;

uniform float sunAngleSize;
uniform float sunSoftness;
uniform float earthRadius;
uniform float atmosphereRadius;
uniform vec3 rayleighScattering;
uniform float rayleighExtinctionFactor;
uniform float rayleighHeightFalloff;
uniform float mieScattering;
uniform float mieExtinctionFactor;
uniform float mieHeightFalloff;
uniform float mieCoefficient;
uniform float intensity;


varying_in vec3 viewVecWorld;

float rayleigh(float vDotL)
{
    return 3.0 / (16.0 * HX_PI) * (1.0 + vDotL * vDotL);
}

float hg(float vDotL, float k)
{
    float d = 1.0 + k * vDotL;
    return (1.0 - k * k) / (4.0 * HX_PI * d * d);
}

// between two points
vec3 expOpticalThickness(vec3 p1, vec3 p2, vec3 baseDensity, float falloff)
{
    float h0 = max(length(p1) - earthRadius, 0.0);
    float h1 = max(length(p2) - earthRadius, 0.0);
    float dist = distance(p1, p2);
    float dz = (h1 - h0) / dist;

    if (abs(dz) < .0001)
        return baseDensity * exp(-falloff * h0) * dist;

    float e0 = exp(-falloff * h0);
	float em = exp(-falloff * h1);
	// this is actually incorrect, because the height function is not linear from p1 to p2, but is in function of length
	// but perhaps it's close enough
	return baseDensity * (e0 - em) / (falloff * dz);
}

vec3 transmittance(vec3 p1, vec3 p2)
{
    return  exp(-expOpticalThickness(p1, p2, rayleighExtinctionFactor * rayleighScattering, rayleighHeightFalloff)) *
            exp(-expOpticalThickness(p1, p2, vec3(mieExtinctionFactor * mieScattering), mieHeightFalloff));
}

vec3 inscatterFactor(float height, float falloff, vec3 scatterFactor)
{
    return exp(-height * rayleighHeightFalloff) * scatterFactor;
}

vec3 inscatter(vec3 p, vec3 lightDir, float rayleigh, float mie)
{
    vec3 l = p + 2.0 * atmosphereRadius * lightDir;
    float h = max(length(p) - earthRadius, 0.0);
    // todo: add mie and ozon
    return transmittance(p, l) *
            (inscatterFactor(h, rayleighHeightFalloff, rayleighScattering) * rayleigh +
            inscatterFactor(h, mieHeightFalloff, vec3(mieScattering)) * mie);
}

// if <= 0.0, consider no intersection found
float getDistanceToSphere(vec3 origin, vec3 dir, float r)
{
    // a = 1, since dir is unit
    float b = dot(dir, origin);
    float c = dot(origin, origin) - r * r;
    float det = max(b*b - c, 0.0);
    return max(-b + sqrt(det), 0.0);
}

// cylinder axis goes through origin!
// if <= 0.0, consider no intersection found
float getDistanceToCylinder(vec3 axis, float r, vec3 orig, vec3 dir)
{
    vec3 A = dir - dot(dir, axis) * axis;
    vec3 C = orig - dot(orig, axis) * axis;
    float a = dot(A, A);
    float b = 2.0 * dot(A, C);
    float c = dot(C, C) - r * r;
    float det = max(b * b - 4.0 * a * c, 0.0);
    float t = (-b + sqrt(det)) / (2.0 * a);
    t = max(t, 0.0);
    return t;
}

// light dir is to the lit surface
// view dir is to the lit surface
void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)
{
	float vDotL = -dot(lightDir, viewDir);
	float sunAngle = acos(vDotL);
    float sunMask = 1.0 - smoothstep(sunAngleSize - sunSoftness, sunAngleSize, sunAngle);

    // will apply transmittance to sun disk
	vec3 col = vec3(0.0);
	// to the light
	vec3 lightWorldDir = -mat3(hx_cameraWorldMatrix) * lightDir;

    vec3 marchDir = normalize(viewVecWorld);
    vec3 x0 = vec3(0.0, 0.0, earthRadius);

    // in case we're on the shadow side, so only a portion of the ray is illuminated, so only start sampling from the start
    // Create a shadow volume by sweeping out an infinite cylinder through the origin (= earth center) with earth radius.
    // The intersection of the ray with this shadow volume (t > 0) is where we should start sampling

    // ray ends at atmosphere or if earth is in between
    float tatmos = getDistanceToSphere(x0, marchDir, atmosphereRadius);
//    float tearth = getDistanceToSphere(x0, marchDir, earthRadius);
    float t1 = tatmos; // tearth > 0.001? tearth : tatmos;

    // ray starts at origin
    float t0 = 0.0;

    // light intersects earth to get to us, so we're in shadow. Figure out where shadow ends
    // instead of doing an actual sphere intersection test, it's good enough like this
    if (lightWorldDir.z < 0.0) {
        t0 = getDistanceToCylinder(lightWorldDir, earthRadius, x0, marchDir);
        // if to < t1, the atmopsphere is wholly in shadow along the ray
        t0 = min(t0, t1);
//        t1 = tatmos;
    }

    float dist = t1 - t0;

    float dx = dist / float(NUM_SAMPLES - 1);
    float rayleighF = rayleigh(vDotL);
    float mieF = hg(vDotL, mieCoefficient);

    // start at t0
    vec3 x1 = x0 + t0 * marchDir;
    // march from back to front, so we can keep multiplying the constant transmittance
	for (int i = 0; i < NUM_SAMPLES; ++i) {
        x1 += dx * marchDir;
        // in-scattered amount also extinguished through the atmosphere
        col += transmittance(x0, x1) * inscatter(x1, lightWorldDir, rayleighF, mieF);
	}

    col *= dx;
	col += vec3(sunMask) * transmittance(x0, x1 + dx * marchDir);

    diffuseColor = col * intensity;
    specularColor = vec3(0.0);
}