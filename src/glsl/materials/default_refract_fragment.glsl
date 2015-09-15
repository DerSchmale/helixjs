varying vec2 texCoords;
varying vec3 normal;
varying vec3 viewVector;

#ifdef COLOR_MAP
uniform sampler2D colorMap;
#else
uniform vec3 color;
#endif

#ifdef NORMAL_MAP
varying vec3 tangent;
varying vec3 bitangent;

uniform sampler2D normalMap;
#endif

// when used as TRANSPARENT_DIFFUSE, hx_source is a copy of the render target:
uniform sampler2D hx_source;
uniform sampler2D hx_gbufferDepth;

uniform mat4 hx_projectionMatrix;
uniform mat4 hx_viewProjectionMatrix;
uniform vec3 hx_cameraWorldPosition;
uniform float hx_cameraNearPlaneDistance;
uniform float hx_cameraFrustumRange;

uniform float refractiveRatio;   // the ratio of refractive indices

void main()
{
    vec4 outputColor;
    #ifdef COLOR_MAP
        outputColor = texture2D(colorMap, texCoords);
    #else
        outputColor = vec4(color, 1.0);
    #endif

    vec3 fragNormal = normal;
    #ifdef NORMAL_MAP
        vec4 normalSample = texture2D(normalMap, texCoords);
        mat3 TBN;
        TBN[2] = normalize(normal);
        TBN[0] = normalize(tangent);
        TBN[1] = normalize(bitangent);

        fragNormal = TBN * (normalSample.xyz * 2.0 - 1.0);
    #endif

    // use the immediate background depth value for a distance estimate
    float depth = hx_sampleLinearDepth(hx_gbufferDepth, texCoords);

    // this can be done in vertex shader
    float viewZ = hx_depthToViewZ(gl_FragCoord.z, hx_projectionMatrix);

    vec3 viewDir = normalize(-viewVector);
    vec3 refractionVector = refract(viewDir, fragNormal, refractiveRatio);
    float distance = depth * hx_cameraFrustumRange - viewZ - hx_cameraNearPlaneDistance;
    vec3 refractedPoint = hx_cameraWorldPosition - viewVector + refractionVector * distance;
    vec4 samplePos = hx_viewProjectionMatrix * vec4(refractedPoint, 1.0);
    samplePos.xy = samplePos.xy / samplePos.w * .5 + .5;

    vec4 background = texture2D(hx_source, samplePos.xy);
    gl_FragColor = outputColor * background;
}