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
    this._strength = 1.0;
    this._bias = .01;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    HX.Effect.call(this);
    this.addPass(this._aoPass = new HX.EffectPass(
        HX.ShaderLibrary.get("hbao_vertex.glsl"),
        HX.ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: numRays,
            NUM_SAMPLES_PER_RAY: numSamplesPerRay
        })
    ));
    this.addPass(this._blurPassX = new HX.DirectionalBlurPass(4, 1, 0));
    this.addPass(this._blurPassY = new HX.DirectionalBlurPass(4, 0, 1));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);

    this._aoTexture = new HX.Texture2D();
    this._aoTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._aoTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._fbo = new HX.FrameBuffer(this._aoTexture);
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
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
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
    this._sampleDirTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._sampleDirTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
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
    this._ditherTexture.setFilter(HX.TextureFilter.NEAREST_NOMIP);
    this._ditherTexture.setWrapMode(HX.TextureWrapMode.REPEAT);
};