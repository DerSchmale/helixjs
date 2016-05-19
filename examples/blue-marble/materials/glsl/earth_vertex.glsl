#define NUM_SAMPLES 2

attribute vec4 hx_position;
attribute vec3 hx_normal;
attribute vec4 hx_tangent;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 normal;
varying vec3 tangent;
varying vec3 bitangent;
varying float linearDepth;
varying vec3 scatterColor0;
varying vec3 scatterColor1;

uniform mat4 hx_wvpMatrix;
uniform mat4 hx_worldViewMatrix;
uniform mat4 hx_worldMatrix;
uniform mat3 hx_normalWorldViewMatrix;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_rcpCameraFrustumRange;
uniform vec3 hx_cameraWorldPosition;
uniform vec3 lightDir;

uniform float atmosphereRadius;
uniform float earthRadius;
uniform float rayleighFactor;
uniform float mieFactor;
uniform vec3 waveLenFactors;
uniform vec3 waveLenFactorsKr4PiKm4Pi;
uniform float rcpThicknessOverScaleDepth;
uniform float expThicknessOverScaleDepth;
uniform float rcpAtmosThickness;

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
    uv = hx_texCoord;
    normal = normalize(hx_normalWorldViewMatrix * hx_normal);
    tangent = normalize(hx_normalWorldViewMatrix * hx_tangent.xyz);
    bitangent = cross(tangent, normal) * hx_tangent.w;

    vec3 pos = (hx_worldViewMatrix * hx_position).xyz;
    linearDepth = (-pos.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;
    gl_Position = hx_wvpMatrix * hx_position;

    // scattering
    vec3 farPos = (hx_worldMatrix * hx_position).xyz;
    vec3 v3Pos = farPos;
    vec3 v3Ray = v3Pos - hx_cameraWorldPosition;
    float farDist = length(v3Ray);
    v3Ray = v3Ray / farDist;
    v3Pos = normalize(v3Pos);

    float nearDist = getRayIntersectionDistance(hx_cameraWorldPosition, v3Ray, atmosphereRadius);

    float scaleDepth = .35;

// completely lifted from http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html

// this doesn't really make sense in the geometry pass, since it will have lighting applied
// we could do this in a post-process step, if we use specular.w for this purpose, but it's honestly not that bad...

    vec3 nearPoint = hx_cameraWorldPosition + v3Ray * nearDist;
    float atmosDist = farDist - nearDist;
    float cameraAngle = dot(-v3Ray, v3Pos);
    float lightAngle = dot(lightDir, v3Pos);
    float cameraScale = scale(cameraAngle);
    float lightScale = scale(lightAngle);
    float cameraOffset = expThicknessOverScaleDepth*cameraScale;
    float scaleSum = lightScale + cameraScale;


    // Initialize the scattering loop variables
    float sampleLength = atmosDist / float(NUM_SAMPLES);
    float scaledLength = sampleLength * rcpAtmosThickness;
    vec3 sampleRayStep = v3Ray * sampleLength;
    vec3 samplePoint = nearPoint + sampleRayStep * 0.5;

    // Now loop through the sample rays
    vec3 inScattering = vec3(0.0, 0.0, 0.0);
    vec3 attenuation;

    for(int i=0; i < NUM_SAMPLES; i++)
    {
        float height = length(samplePoint);
        float depth = exp(rcpThicknessOverScaleDepth * (earthRadius - height));
        float fScatter = depth*scaleSum - cameraOffset;
        attenuation = exp(-fScatter * (waveLenFactorsKr4PiKm4Pi));
        inScattering += attenuation * (depth * scaledLength);
        samplePoint += sampleRayStep;
    }

    scatterColor0.rgb = inScattering * (waveLenFactors * rayleighFactor + mieFactor);
    // Calculate the attenuation factor for the ground
    scatterColor1.rgb = attenuation;
}