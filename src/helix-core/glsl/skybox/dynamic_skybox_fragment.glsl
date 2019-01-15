#define NUM_SAMPLES 16

uniform vec3 sunDir;
uniform float earthRadius;
uniform float atmosphereRadius;
uniform vec3 rayleighScattering;
uniform vec3 rayleighExtinction;
uniform float rayleighHeightFalloff;
uniform float mieScattering;
uniform float mieExtinction;
uniform float mieHeightFalloff;
uniform float mieCoefficient;
uniform float intensity;
uniform vec3 groundColor;

varying_in vec3 viewDir;

// sign is 1 for the furthest hit (or inside), - for the closest
float getDistanceToSphere(vec3 origin, vec3 dir, float r, float sign)
{
    // a = 1, since dir is unit
    float b = dot(dir, origin);
    float c = dot(origin, origin) - r * r;
    float det = max(b*b - c, 0.0);
    return max(-b + sign * sqrt(det), 0.0);
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

float getDistanceToGround(vec3 p, vec3 dir, float z)
{
    return (z - p.z) / dir.z;
}

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
    vec3 t1 = expOpticalThickness(p1, p2, rayleighExtinction, rayleighHeightFalloff);
    vec3 t2 = expOpticalThickness(p1, p2, vec3(mieExtinction), mieHeightFalloff);
    return  exp(-(t1 + t2));
}

vec3 inscatterFactor(float height, float falloff, vec3 scatterFactor)
{
    return exp(-height * falloff) * scatterFactor;
}

vec3 inscatter(vec3 p, vec3 lightDir, vec3 scattering, float falloff)
{
    vec3 l = p - 2.0 * atmosphereRadius * lightDir;
    float h = max(length(p) - earthRadius, 0.0);
    return transmittance(p, l) * inscatterFactor(h, falloff, scattering);
}


void main()
{
    vec3 view = normalize(viewDir);

    vec3 x0 = vec3(0.0, 0.0, earthRadius + 1.8);

    float t0 = 0.0; // marching segment starts at origin
    float t1 = getDistanceToSphere(x0, view, atmosphereRadius, 1.0); // marching segment ends at atmosphere

    bool ground = false;
    // this is the correct form, but it's indistuingishable from assuming a flat plane
    /*float tp = getDistanceToSphere(x0, view, earthRadius, -1.0); // need closest hit
    if (tp > 0.0) {
        t1 = tp;
        ground = true;
    }*/
    if (viewDir.z < 0.0) {
        float tp = getDistanceToGround(x0, view, earthRadius);
        t1 = min(t1, tp);
        ground = true;
    }

    // normally, this should be a test whether the light ray arriving at x0 intersects the earth sphere, but it's
    // *practically* the same as just checking whether it points up
    if (sunDir.z > 0.0) {
        // light intersects earth to get to us, so we're in shadow. We only need to start marching where the sun is visible.
        // This is done by sweeping out a cylindrical shadow volume and finding the intersection.
        t0 = getDistanceToCylinder(-sunDir, earthRadius, x0, view);
        t0 = min(t0, t1);
    }

	float vDotL = dot(sunDir, view);
	float dist = t1 - t0;
    float dx = dist / float(NUM_SAMPLES);
    vec3 rayleigh = vec3(0.0);
    vec3 mie = vec3(0.0);

    // start at t0
    vec3 x1 = x0 + t0 * view;
    vec3 tr;

	for (int i = 0; i < NUM_SAMPLES; ++i) {
        x1 += dx * view;
        tr = transmittance(x0, x1);

        // in-scattered amount also extinguished through the atmosphere
        rayleigh += tr * inscatter(x1, sunDir, rayleighScattering, rayleighHeightFalloff);
        mie += tr * inscatter(x1, sunDir, vec3(mieScattering), mieHeightFalloff);
	}

    vec3 col = rayleigh * hx_phaseRayleigh(vDotL) + mie * hx_phaseHG(vDotL, mieCoefficient);
    col *= dx * intensity;

    if (ground)
        col += tr * groundColor * max(-sunDir.z, 0.0);

	hx_FragColor = vec4(hx_linearToGamma(col), 1.0);
}