// completely lifted from http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html

#define NUM_SAMPLES 2

attribute vec4 hx_position;

uniform vec3 hx_cameraWorldPosition;
uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldMatrix;

varying vec3 viewDir;
varying vec3 color0;
varying vec3 color1;

uniform vec3 lightDir;
uniform float atmosphereRadius;
uniform float earthRadius;
uniform float rayleighFactor;
uniform float mieFactor;
uniform vec3 waveLenFactors;
uniform vec3 waveLenFactorsKr4PiKm4Pi;
uniform float rcpAtmosThickness;
uniform float rcpThicknessOverScaleDepth;

// earth origin is at 0, so ignore that
float getRayIntersectionDistance(vec3 origin, vec3 dir, float radius)
{
    // a = 1, since dir is unit
    float b = 2.0 * dot(dir, origin);
    // TODO: (origin . origin) is the camera height squared, could optimize
    float c = dot(origin, origin) - radius*radius;
    float det = max(b*b - 4.0 * c, 0.0);

    // quadratic root
    return (-b - sqrt(det)) / 2.0;
}

float scale(float cosAngle)
{
	float x = 1.0 - cosAngle;
	return exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

void hx_geometry()
{
    vec3 farPos = (hx_worldMatrix * hx_position).xyz;
    // points towards camera
    viewDir = farPos.xyz - hx_cameraWorldPosition;
    float far = length(viewDir);
    viewDir /= far;

    float near = getRayIntersectionDistance(hx_cameraWorldPosition, viewDir, atmosphereRadius);
    vec3 nearPos = hx_cameraWorldPosition + near * viewDir;
    float atmosDist = far - near;

    float scaleDepth = .35;

// TODO: calculate start offset correctly. Nearest point density is not really 0!
    float fStartAngle = dot(viewDir, nearPos) / atmosphereRadius;
    float fStartDepth = saturate(exp(-1.0 / scaleDepth));
    float fStartOffset = fStartDepth * scaleDepth * scale(fStartAngle);

    float thicknessOverScaleDepth = rcpAtmosThickness / scaleDepth;
    float sampleLength = atmosDist / float(NUM_SAMPLES);
    float fScaledLength = sampleLength * rcpAtmosThickness;

    vec3 v3SampleRay = viewDir * sampleLength;
    vec3 v3SamplePoint = nearPos + v3SampleRay * 0.5;

    vec3 color = vec3(0.0, 0.0, 0.0);

    vec3 v3Attenuate;

    for(int i = 0; i < NUM_SAMPLES; ++i) {
        float fHeight = length(v3SamplePoint);
        float expThicknessOverScaleDepth = exp(thicknessOverScaleDepth * (earthRadius - fHeight));
        float rcpHeight = 1.0 / fHeight;
        float lightAngle = dot(lightDir, v3SamplePoint) * rcpHeight;
        float cameraAngle = dot(viewDir, v3SamplePoint) * rcpHeight;
        float scatter = fStartOffset + expThicknessOverScaleDepth * scaleDepth * (scale(lightAngle) - scale(cameraAngle));
        v3Attenuate = saturate(exp(-scatter * waveLenFactorsKr4PiKm4Pi));
        v3Attenuate = clamp(v3Attenuate, 0.0, 1.0);
        color += v3Attenuate * expThicknessOverScaleDepth * fScaledLength;
        v3SamplePoint += v3SampleRay;
    }

    color0 = color * rayleighFactor * waveLenFactors;
    color1 = color * mieFactor;

    gl_Position = hx_wvpMatrix * hx_position;
}