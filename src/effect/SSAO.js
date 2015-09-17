/**
 *
 * @param numSamples
 * @constructor
 */
HX.SSAO = function(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this.addPass(this._ssaoPass = new HX.EffectPass(null,
        HX.ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: numSamples
            }
        )));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);

    this._ssaoTexture = new HX.Texture2D();
    this._ssaoTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._ssaoTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._fbo = new HX.FrameBuffer(this._ssaoTexture);
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
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
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
    this._ditherTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
};