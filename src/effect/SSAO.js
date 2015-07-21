/**
 *
 * @param numSamples
 * @constructor
 */
HX.SSAO = function(numSamples)
{
    numSamples = numSamples || 32;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this.addPass(this._ssaoPass = new HX.EffectPass(null, HX.SSAO.getFragmentShader(numSamples)));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * 3.1415 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);

    this._ssaoTexture = new HX.Texture2D();
    this._ssaoTexture.setFilter(HX.TEXTURE_FILTER.BILINEAR_NOMIP);
    this._ssaoTexture.setWrapMode(HX.TEXTURE_WRAP_MODE.CLAMP);
    this._fbo = new HX.FrameBuffer(this._ssaoTexture, HX.FrameBuffer.DEPTH_MODE_DISABLED);
};

HX.SSAO.prototype = Object.create(HX.Effect.prototype);

// every SSAO type should implement this
HX.SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

HX.SSAO.prototype.setSampleRadius = function(value)
{
    this._radius = value;
    this._ssaoPass.setUniform("sampleRadius", this._radius);
};

HX.SSAO.prototype.setFallOffDistance = function(value)
{
    this._fallOffDistance = value;
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
};

HX.SSAO.prototype.setStrength = function(value)
{
    this._strength = value;
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * 3.1415 * this._strength / this._numSamples);
};

HX.SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poisson = HX.DEFAULT_POISSON_SPHERE;

    for (var i = 0; i < this._numSamples; ++i) {
        var x = poisson[i * 3];
        var y = poisson[i * 3 + 1];
        var z = poisson[i * 3 + 2];

        samples[j++] = Math.pow(x, 6);
        samples[j++] = Math.pow(y, 6);
        samples[j++] = Math.pow(z, 6);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

HX.SSAO.prototype._initTargetTexture = function(width, height)
{
    this._ssaoTexture.initEmpty(width, height);
    this._fbo.init();
};

HX.SSAO.prototype.draw = function(dt)
{
    var targetWidth = this._hdrTarget.width();
    var targetHeight = this._hdrTarget.height();

    if (targetWidth != this._ssaoTexture.width() || targetHeight != this._ssaoTexture.height())
        this._initTargetTexture(targetWidth, targetHeight);

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._ssaoPass);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._hdrTarget);
    this._drawPass(this._blurPassX);
    this._swapHDRBuffers();

    HX.setRenderTarget(this._fbo);
    this._drawPass(this._blurPassY);
};

HX.SSAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new HX.Texture2D();
    var data = [
        0x40, 0x1d, 0x4b, 0xff,
        0xca, 0x44, 0x2b, 0xff,
        0x17, 0xaa, 0x44, 0xff,
        0xa1, 0xd1, 0x24, 0xff,
        0x5d, 0x2d, 0xda, 0xff,
        0xe7, 0x54, 0xba, 0xff,
        0x34, 0xba, 0xd3, 0xff,
        0xbe, 0xe1, 0xb3, 0xff,
        0x52, 0x6c, 0x09, 0xff,
        0xc3, 0x23, 0x46, 0xff,
        0x88, 0xeb, 0x3c, 0xff,
        0xf9, 0xa2, 0x78, 0xff,
        0x05, 0x5c, 0x86, 0xff,
        0x76, 0x13, 0xc2, 0xff,
        0x3b, 0xdb, 0xb8, 0xff,
        0xac, 0x92, 0xf5, 0xff
    ];
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.setFilter(HX.TEXTURE_FILTER.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TEXTURE_WRAP_MODE.REPEAT);
};

HX.SSAO.getFragmentShader = function(numSamples)
{
    return "#define NUM_SAMPLES " + numSamples + "\n\
        uniform mat4 hx_projectionMatrix;\n\
        uniform mat4 hx_viewMatrix;\n\
        uniform mat4 hx_cameraWorldMatrix;\n\
        uniform vec2 hx_renderTargetResolution;\n\
        uniform float hx_cameraFrustumRange;\n\
        \n\
        uniform float strengthPerSample;\n\
        uniform float rcpFallOffDistance;\n\
        uniform float sampleRadius;\n\
        uniform vec3 samples[NUM_SAMPLES]; // w contains bias\n\
        \n\
        uniform sampler2D hx_gbufferNormals;\n\
        uniform sampler2D hx_gbufferDepth;\n\
        uniform sampler2D ditherTexture;\n\
        \n\
        varying vec2 uv;\n\
        \n\
        void main()\n\
        {\n\
            vec4 normalSample = texture2D(hx_gbufferNormals, uv);\n\
            vec3 worldNormal = normalSample.xyz - .5;\n\
            vec3 centerNormal = mat3(hx_viewMatrix) * worldNormal;\n\
            float centerDepth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n\
            float totalOcclusion = 0.0;\n\
            vec3 dither = texture2D(ditherTexture, uv * hx_renderTargetResolution * .25).xyz;\n\
            vec3 randomPlaneNormal = normalize(dither - .5);\n\
            float w = -centerDepth * hx_cameraFrustumRange * hx_projectionMatrix[2][3] + hx_projectionMatrix[3][3];\n\
            vec3 sampleRadii;\n\
            sampleRadii.x = sampleRadius * .5 * hx_projectionMatrix[0][0] / w;\n\
            sampleRadii.y = sampleRadius * .5 * hx_projectionMatrix[1][1] / w;\n\
            sampleRadii.z = sampleRadius;\n\
            \n\
            for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);\n\
                vec3 normOffset = normalize(sampleOffset);\n\
                float cosFactor = dot(normOffset, centerNormal);\n\
                float sign = sign(cosFactor);\n\
                sampleOffset *= sign;\n\
                cosFactor *= sign;\n\
                \n\
                vec3 scaledOffset = sampleOffset * sampleRadii;\n\
                \n\
                vec2 samplePos = uv + scaledOffset.xy;\n\
                float occluderDepth = hx_sampleLinearDepth(hx_gbufferDepth, samplePos);\n\
                float diffZ = (centerDepth - occluderDepth) * hx_cameraFrustumRange;\n\
                \n\
                // distanceFactor: from 1 to 0, near to far\n\
                float distanceFactor = clamp(diffZ * rcpFallOffDistance, 0.0, 1.0);\n\
                distanceFactor = 1.0 - distanceFactor;\n\
                \n\
                // sampleOcclusion: 1 if occluding, 0 otherwise\n\
                float sampleOcclusion = float(diffZ > scaledOffset.z);\n\
                totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;\n\
                \n\
            }\n\
            gl_FragColor = vec4(1.0 - totalOcclusion * strengthPerSample);\n\
        }"
};