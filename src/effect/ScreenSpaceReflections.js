/**
 *
 * @param numSamples
 * @param range
 * @constructor
 */
HX.ScreenSpaceReflections = function(numSamples, range)
{
    HX.Effect.call(this);
    numSamples = numSamples || 5;
    range = range || 1.0;
    this._numSamples = numSamples;
    var pass = new HX.EffectPass(HX.ScreenSpaceReflections._vertexShader, HX.ScreenSpaceReflections.getFragmentShader(numSamples));
    this.addPass(pass);
    this.setUniform("stepSize", range/numSamples);
    this.setUniform("nearSampleRatio",.1);
};

HX.ScreenSpaceReflections.prototype = Object.create(HX.Effect.prototype);

HX.ScreenSpaceReflections._vertexShader =
    "precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    uniform mat4 hx_inverseProjectionMatrix;\n\
    \n\
    varying vec2 uv;\n\
    varying vec3 viewDir;\n\
    varying vec3 nearViewPos;\n\
    \n\
    void main()\
    {\n\
            uv = hx_texCoord;\n\
            viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n\
            gl_Position = hx_position;\n\
    }";

// TODO: Perform stencil test to rule out based on distance & angle
HX.ScreenSpaceReflections.getFragmentShader = function(numSamples)
{
    return "#define NUM_SAMPLES " + numSamples + "\n\
            \n\
            varying vec2 uv;\n\
            varying vec3 viewDir;\n\
            \n\
            uniform sampler2D hx_source;\n\
            uniform sampler2D hx_gbufferAlbedo;\n\
            uniform sampler2D hx_gbufferNormals;\n\
            uniform sampler2D hx_gbufferDepth;\n\
            uniform sampler2D hx_gbufferSpecular;\n\
            \n\
            uniform mat4 hx_projectionMatrix;\n\
            uniform mat4 hx_viewMatrix;\n\
            uniform float hx_cameraFrustumRange;\n\
            uniform float hx_cameraNearPlaneDistance;\n\
            uniform vec2 hx_renderTargetResolution;\n\
            \n\
            uniform float stepSize;\n\
            uniform float nearSampleRatio;\n\
            \n\
            void main()\n\
            {\n\
                vec4 albedoSample = hx_gammaToLinear(texture2D(hx_gbufferAlbedo, uv));\n\
                vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n\
                float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
                vec3 normalSpecularReflectance;\n\
                float roughness;\n\
                hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);\n\
                vec3 normal = mat3(hx_viewMatrix) * (texture2D(hx_gbufferNormals, uv).xyz * 2.0 - 1.0);\n\
                vec3 reflDir = reflect(normalize(viewDir), normal);\n\
                float fadeFactor = clamp(-reflDir.z * 10000.0, 0.0, 1.0); \n\
                vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflDir, normal);\n\
                // not physically correct, but attenuation is required to look good\n\
                fresnel *= (1.0 - roughness);\n\
                bool hitFound = false;\n\
                // TURNS SAMPLE_POS.z > 0\n\
                vec3 projScale = vec3(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1], -1.0);\n\
                float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n\
                vec3 viewPos = absViewZ * viewDir;\n\
                vec3 samplePos = viewPos * projScale;\n\
                float perspStepSize = stepSize * max(1.0, samplePos.z);\n\
                vec3 sampleStep = reflDir * perspStepSize * projScale / length(reflDir.xy);\n\
                float depthStep = sampleStep.z / hx_cameraFrustumRange;\n\
                \n\
                float originalDepth = depth;\n\
                float prevDepth = depth;\n\
                float finalHitDepth;\n\
                float finalPrevHitDepth;\n\
                float finalMarchDepth;\n\
                vec3 finalSamplePos;\n\
                \n\
                samplePos += sampleStep * nearSampleRatio;\n\
                depth += depthStep * nearSampleRatio;\n\
                \n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    \n\
                    vec2 sampleUV = samplePos.xy / samplePos.z * .5 + .5;\n\
                    float hitDepth = hx_sampleLinearDepth(hx_gbufferDepth, sampleUV);\n\
                    \n\
                    if (depth > hitDepth && !hitFound) {\n\
                        finalMarchDepth = depth;\n\
                        finalSamplePos = samplePos;\n\
                        finalHitDepth = hitDepth;\n\
                        finalPrevHitDepth = prevDepth;\n\
                        hitFound = true;\n\
                    }\n\
                    prevDepth = hitDepth;\n\
                    samplePos += sampleStep;\n\
                    depth += depthStep;\n\
                }\n\
                \n\
                // interpolation for first hit breaks for some reason \n\
                if (finalPrevHitDepth != originalDepth) {\n\
                    float deltaDepth = finalHitDepth - finalPrevHitDepth;\n\
                    float d = depthStep - deltaDepth;\n\
                    float t = (finalMarchDepth - finalHitDepth) / d;\n\
                    finalSamplePos -= sampleStep * t;\n\
                }\n\
                vec2 sampleUV = finalSamplePos.xy / finalSamplePos.z;\n\
                vec2 borderFactors = abs(sampleUV);\n\
                borderFactors = (1.0 - borderFactors) * 10.0;\n\
                sampleUV = sampleUV * .5 + .5;\n\
                fadeFactor *= clamp((finalHitDepth - originalDepth)/.0001, 0.1, 1.1) - .1;\n\
                fadeFactor *= clamp(borderFactors.x, 0.0, 1.0) * clamp(borderFactors.y, 0.0, 1.0);\n\
                vec4 reflColor = texture2D(hx_source, sampleUV);\n\
                vec4 srcColor = texture2D(hx_source, uv);\n\
                float amountUsed = hitFound? fadeFactor : 0.0;\n\
                gl_FragColor = vec4(srcColor.xyz + fresnel * reflColor.xyz * amountUsed, 1.0 - amountUsed);\n\
            }";
};