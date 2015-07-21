/**
 *
 * @param numSamples
 * @constructor
 */
HX.HBAO = function(numRays, numSamplesPerRay)
{
    numRays = numRays || 4;
    numSamplesPerRay = numSamplesPerRay || 4;
    if (numRays > 32) numRays = 32;
    if (numSamplesPerRay > 32) numSamplesPerRay = 32;

    this._numRays = numRays;
    this._numSamplesPerRay = numSamplesPerRay;
    this._strength = 1.0;
    this._bias = .01;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this.addPass(this._aoPass = new HX.EffectPass(HX.HBAO.getVertexShader(), HX.HBAO.getFragmentShader(numRays, numSamplesPerRay)));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", 3.1415 * this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);

    this._aoTexture = new HX.Texture2D();
    this._aoTexture.setFilter(HX.TEXTURE_FILTER.BILINEAR_NOMIP);
    this._aoTexture.setWrapMode(HX.TEXTURE_WRAP_MODE.CLAMP);
    this._fbo = new HX.FrameBuffer(this._aoTexture, HX.FrameBuffer.DEPTH_MODE_DISABLED);
};

HX.HBAO.prototype = Object.create(HX.Effect.prototype);

// every AO type should implement this
HX.HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

HX.HBAO.prototype.setSampleRadius = function(value)
{
    this._radius = value;
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
};

HX.HBAO.prototype.setFallOffDistance = function(value)
{
    this._fallOffDistance = value;
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
};

HX.HBAO.prototype.setStrength = function(value)
{
    this._strength = value;
    this._aoPass.setUniform("strengthPerRay", 3.1415 * this._strength / this._numRays);
};

HX.HBAO.prototype.setBias = function(value)
{
    this._bias = value;
    this._aoPass.setUniform("bias", this._bias);
};

HX.HBAO.prototype._initTargetTexture = function(width, height)
{
    this._aoTexture.initEmpty(width, height);
    this._fbo.init();
};

HX.HBAO.prototype.draw = function(dt)
{
    var targetWidth = this._hdrTarget.width();
    var targetHeight = this._hdrTarget.height();

    if (targetWidth != this._aoTexture.width() || targetHeight != this._aoTexture.height())
        this._initTargetTexture(targetWidth, targetHeight);

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._aoPass);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._blurPassX);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._fbo);
    this._drawPass(this._blurPassY);
};

HX.HBAO.prototype._initSampleDirTexture = function()
{
    this._sampleDirTexture = new HX.Texture2D();
    var data = [];
    var j = 0;

    for (var i = 0; i < 256; ++i)
    {
        var angle = i / 256 * 2.0 * Math.PI;
        var r = Math.cos(angle)*.5 + .5;
        var g = Math.sin(angle)*.5 + .5;
        data[j] = Math.round(r * 0xff);
        data[j+1] = Math.round(g * 0xff);
        data[j+2] = 0x00;
        data[j+3] = 0xff;
        j += 4;
    }

    this._sampleDirTexture.uploadData(new Uint8Array(data), 256, 1, false);
    this._sampleDirTexture.setFilter(HX.TEXTURE_FILTER.NEAREST_NOMIP);
    this._sampleDirTexture.setWrapMode(HX.TEXTURE_WRAP_MODE.REPEAT);
};

HX.HBAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new HX.Texture2D();
    var data = [];

    var i;
    var j = 0;
    var offsets1 = [];
    var offsets2 = [];

    for (i = 0; i < 16; ++i) {
        offsets1.push(i / 16.0);
        offsets2.push(i / 15.0);
    }

    HX.shuffle(offsets1);
    HX.shuffle(offsets2);

    i = 0;

    for (var y = 0; y < 4; ++y) {
        for (var x = 0; x < 4; ++x) {
            var r = offsets1[i];
            var g = offsets2[i];

            ++i;

            data[j] = Math.round(r * 0xff);
            data[j + 1] = Math.round(g * 0xff);
            data[j + 2] = 0x00;
            data[j + 3] = 0xff;

            j += 4;
        }
    }

    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.setFilter(HX.TEXTURE_FILTER.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TEXTURE_WRAP_MODE.REPEAT);
};

HX.HBAO.getVertexShader = function()
{
    return "\
        attribute vec4 hx_position;\n\
        attribute vec2 hx_texCoord;\n\
        \n\
        uniform mat4 hx_inverseProjectionMatrix;\n\
        \n\
        varying vec2 uv;\n\
        varying vec3 viewDir;\n\
        varying vec3 frustumCorner;\n\
        \n\
        void main()\
        {\n\
                uv = hx_texCoord;\n\
                viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n\
                frustumCorner = hx_getLinearDepthViewVector(vec2(1.0, 1.0), hx_inverseProjectionMatrix);\n\
                gl_Position = hx_position;\n\
        }";
};

HX.HBAO.getFragmentShader = function(numRays, numSamplesPerRay)
{
    return "#define NUM_RAYS " + numRays + "\n" +
            "#define NUM_SAMPLES_PER_RAY " + numSamplesPerRay + "\n";

        "\n\
        uniform mat4 hx_projectionMatrix;\n\
        uniform mat4 hx_viewMatrix;\n\
        uniform mat4 hx_cameraWorldMatrix;\n\
        uniform vec2 hx_renderTargetResolution;\n\
        uniform vec2 hx_rcpRenderTargetResolution;\n\
        uniform float hx_cameraFrustumRange;\n\
        uniform float hx_cameraNearPlaneDistance;\n\
        \n\
        uniform int numRays;\n\
        uniform int numSamplesPerRay;\n\
        uniform float strengthPerRay;\n\
        uniform float halfSampleRadius;\n\
        uniform float bias;\n\
        uniform float rcpFallOffDistance;\n\
        \n\
        uniform sampler2D hx_gbufferNormals;\n\
        uniform sampler2D hx_gbufferDepth;\n\
        uniform sampler2D sampleDirTexture;\n\
        uniform sampler2D ditherTexture;\n\
        \n\
        varying vec2 uv;\n\
        varying vec3 viewDir;\n\
        varying vec3 frustumCorner;\n\
        \n\
        vec3 getViewPos(vec2 sampleUV)\n\
        {\n\
            float depth = hx_sampleLinearDepth(hx_gbufferDepth, sampleUV);\n\
            float viewZ = depth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n\
            vec3 viewPos = frustumCorner * vec3(sampleUV * 2.0 - 1.0, 1.0);\n\
            return viewPos * viewZ;\n\
        }\n\
        \n\
        // Retrieves the occlusion factor for a particular sample\n\
        float getSampleOcclusion(vec2 sampleUV, vec3 centerViewPos, vec3 centerNormal, vec3 tangent, inout float topOcclusion)\n\
        {\n\
            vec3 sampleViewPos = getViewPos(sampleUV);\n\
            \n\
            // get occlusion factor based on candidate horizon elevation\n\
            vec3 horizonVector = sampleViewPos - centerViewPos;\n\
            float horizonVectorLength = length(horizonVector);\n\
            \n\
            float occlusion;\n\
            \n\
            // If the horizon vector points away from the tangent, make an estimate\n\
            if (dot(tangent, horizonVector) < 0.0)\n\
                occlusion = .5;\n\
            else\n\
                occlusion = dot(centerNormal, horizonVector) / horizonVectorLength;\n\
            \n\
            // this adds occlusion only if angle of the horizon vector is higher than the previous highest one without branching\n\
            float diff = max(occlusion - topOcclusion, 0.0);\n\
            topOcclusion = max(occlusion, topOcclusion);\n\
            \n\
            // attenuate occlusion contribution using distance function 1 - (d/f)^2\n\
            float distanceFactor = clamp(horizonVectorLength * rcpFallOffDistance, 0.0, 1.0);\n\
            distanceFactor = 1.0 - distanceFactor * distanceFactor;\n\
            return diff * distanceFactor;\n\
        }\n\
        \n\
        // Retrieves the occlusion for a given ray\n\
        float getRayOcclusion(vec2 direction, float jitter, vec2 projectedRadii, vec3 centerViewPos, vec3 centerNormal)\n\
        {\n\
            // calculate the nearest neighbour sample along the direction vector\n\
            vec2 texelSizedStep = direction * hx_rcpRenderTargetResolution;\n\
            direction *= projectedRadii;\n\
            \n\
            // gets the tangent for the current ray, this will be used to handle opposing horizon vectors\n\
            // Tangent is corrected with respect to face normal by projecting it onto the tangent plane defined by the normal\n\
            vec3 tangent = getViewPos(uv + texelSizedStep) - centerViewPos;\n\
            tangent -= dot(centerNormal, tangent) * centerNormal;\n\
            \n\
            vec2 stepUV = direction.xy / float(NUM_SAMPLES_PER_RAY - 1);\n\
            \n\
            // jitter the starting position for ray marching between the nearest neighbour and the sample step size\n\
            vec2 jitteredOffset = mix(texelSizedStep, stepUV, jitter);\n\
            //stepUV *= 1.0 + jitter * .1;\n\
            vec2 sampleUV = uv + jitteredOffset;\n\
            \n\
            // top occlusion keeps track of the occlusion contribution of the last found occluder.\n\
            // set to bias value to avoid near-occluders\n\
            float topOcclusion = bias;\n\
            float occlusion = 0.0;\n\
            \n\
            // march!\n\
            for (int step = 0; step < NUM_SAMPLES_PER_RAY; ++step) {\n\
                occlusion += getSampleOcclusion(sampleUV, centerViewPos, centerNormal, tangent, topOcclusion);\n\
                sampleUV += stepUV;\n\
            }\n\
            \n\
            return occlusion;\n\
        }\n\
        \n\
        void main()\n\
        {\n\
            vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
            vec3 worldNormal = normalSample.xyz - .5;\n\
            vec3 centerNormal = mat3(hx_viewMatrix) * worldNormal;\n\
            float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
            float viewZ = centerDepth * hx_cameraFrustumRange + hx_cameraNearPlaneDistance;\n\
            vec3 centerViewPos = viewZ * viewDir;\n\
            \n\
            vec2 projectedRadii = -halfSampleRadius * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]) / centerViewPos.z;\n\
            \n\
            // do not take more steps than there are pixels\n\
            float totalOcclusion = 0.0;\n\
            \n\
            vec2 randomFactors = texture2D(ditherTexture, uv * hx_renderTargetResolution * .25).xy;\n\
            \n\
            vec2 rayUV = vec2(0.0);\n\
            for (int i = 0; i < NUM_RAYS; ++i) {\n\
                rayUV.x = (float(i) + randomFactors.x) / float(NUM_RAYS);\n\
                vec2 sampleDir = texture2D(sampleDirTexture, rayUV).xy * 2.0 - 1.0;\n\
                totalOcclusion += getRayOcclusion(sampleDir, randomFactors.y, projectedRadii, centerViewPos, centerNormal);\n\
            }\n\
            \n\
            totalOcclusion = 1.0 - clamp(strengthPerRay * totalOcclusion, 0.0, 1.0);\n\
            gl_FragColor = vec4(totalOcclusion);\n\
        }";
};