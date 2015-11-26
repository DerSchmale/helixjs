/**
 * TODO: allow scaling down of textures
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
    this._scale = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    HX.Effect.call(this);
    this._aoPass = new HX.EffectPass(
        HX.ShaderLibrary.get("hbao_vertex.glsl"),
        HX.ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: numRays,
            NUM_SAMPLES_PER_RAY: numSamplesPerRay
        })
    );
    this._blurPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._aoTexture = new HX.Texture2D();
    this._aoTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._aoTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._backTexture = new HX.Texture2D();
    this._backTexture.setFilter(HX.TextureFilter.BILINEAR_NOMIP);
    this._backTexture.setWrapMode(HX.TextureWrapMode.CLAMP);
    this._fbo1 = new HX.FrameBuffer(this._aoTexture);
    this._fbo2 = new HX.FrameBuffer(this._backTexture);
};

HX.HBAO.prototype = Object.create(HX.Effect.prototype);

// every AO type should implement this
HX.HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

Object.defineProperties(HX.HBAO.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },

        set: function (value)
        {
            this._radius = value;
            this._aoPass.setUniform("halfSampleRadius", this._radius * .5);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            this._fallOffDistance = value;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
        }
    },

    bias: {
        get: function()
        {
            return this._bias;
        },
        set: function (value)
        {
            this._bias = value;
            this._aoPass.setUniform("bias", this._bias);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

HX.HBAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (HX.TextureUtils.assureSize(w, h, this._aoTexture, this._fbo1)) {
        HX.TextureUtils.assureSize(w, h, this._backTexture, this._fbo2);
        this._aoPass.setUniform("ditherScale", {x: w * .25, y: h * .25});
    }

    HX.GL.viewport(0, 0, w, h);

    HX.pushRenderTarget(this._fbo1);
    this._drawPass(this._aoPass);

    HX.pushRenderTarget(this._fbo2);
    this._blurPass.setUniform("halfTexelOffset", {x: .5 / w, y: 0.0});
    this._sourceTextureSlot.texture = this._aoTexture;
    this._drawPass(this._blurPass);

    HX.popRenderTarget();
    this._blurPass.setUniform("halfTexelOffset", {x: 0.0, y: .5 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);

    HX.popRenderTarget();

    HX.GL.viewport(0, 0, this._renderer._width, this._renderer._height);
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