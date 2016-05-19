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
uniform vec3 lightColor;

#ifdef GROUND_MODE
attribute vec2 hx_texCoord;
attribute vec3 hx_normal;

varying vec2 uv;
varying vec3 normal;
#endif

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

void main()
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

    #ifdef GROUND_MODE
    // Calculate the ray's starting position, then calculate its scattering offset
    	float fDepth = exp((earthRadius - atmosphereRadius) / scaleDepth);
    	float rcpFarLen = 1.0 / length(farPos);
    	float cameraAngle = dot(-viewDir, farPos) * rcpFarLen;
    	float lightAngle = dot(lightDir, farPos) * rcpFarLen;
    	float fCameraScale = scale(cameraAngle);
    	float fLightScale = scale(lightAngle);
    	float fCameraOffset = fDepth*fCameraScale;
    	float fTemp = fLightScale + fCameraScale;
    #endif

// TODO: calculate start offset correctly. Nearest point density is not really 0!
    float fStartAngle = dot(viewDir, nearPos) / atmosphereRadius;
    float fStartDepth = exp(-1.0 / scaleDepth);
    float fStartOffset = fStartDepth * scaleDepth * scale(fStartAngle);

    float fScale = 1.0 / (atmosphereRadius - earthRadius);
    float scaleOverScaleDepth = fScale / scaleDepth;
    float fSampleLength = atmosDist / float(NUM_SAMPLES);
    float fScaledLength = fSampleLength * fScale;

    vec3 v3SampleRay = viewDir * fSampleLength;
    vec3 v3SamplePoint = nearPos + v3SampleRay * 0.5;

    vec3 color = vec3(0.0, 0.0, 0.0);

    float Kr4Pi = rayleighFactor * 4.0 * 3.1415926;
    float Km4Pi = mieFactor * 4.0 * 3.1415926;

    vec3 v3Attenuate;

    for(int i = 0; i < NUM_SAMPLES; ++i) {
        float fHeight = length(v3SamplePoint);
        float fDepth = exp(scaleOverScaleDepth * (earthRadius - fHeight));
        #ifdef GROUND_MODE
            float scatter = fDepth*fTemp - fCameraOffset;
        #else
            float rcpHeight = 1.0 / fHeight;
            float lightAngle = dot(lightDir, v3SamplePoint) * rcpHeight;
            float cameraAngle = dot(viewDir, v3SamplePoint) * rcpHeight;
            float scatter = fStartOffset + fDepth * scaleDepth * (scale(lightAngle) - scale(cameraAngle));
        #endif
        v3Attenuate = exp(-scatter * (waveLenFactors * Kr4Pi + Km4Pi));
        v3Attenuate = clamp(v3Attenuate, 0.0, 1.0);
        color += v3Attenuate * fDepth * fScaledLength;
        v3SamplePoint += v3SampleRay;
    }

    #ifdef GROUND_MODE
        color0 = color * lightColor * (rayleighFactor * waveLenFactors + mieFactor);
        color1 = v3Attenuate;
    #else
        color0 = color * lightColor * rayleighFactor * waveLenFactors;
        color1 = color * lightColor * mieFactor;
    #endif

    gl_Position = hx_wvpMatrix * hx_position;

    #ifdef GROUND_MODE
    uv = hx_texCoord;
    normal = hx_normal;
    #endif
}