/**
 *
 * @param numSamples
 */
HX.SSAO = function(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._ditherTexture = null;

    HX.Effect.call(this);

    this._ssaoPass = new HX.EffectPass(null,
        HX.ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: numSamples
            }
        ));
    this._blurPass = new HX.EffectPass(null, HX.ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    // TODO: We could reproject
    this._ssaoTexture = new HX.Texture2D();
    this._ssaoTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._ssaoTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._backTexture = new HX.Texture2D();
    this._backTexture.filter = HX.TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = HX.TextureWrapMode.CLAMP;
    this._fbo1 = new HX.FrameBuffer(this._ssaoTexture);
    this._fbo2 = new HX.FrameBuffer(this._backTexture);
};

HX.SSAO.prototype = Object.create(HX.Effect.prototype);

// every SSAO type should implement this
HX.SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

Object.defineProperties(HX.SSAO.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },
        set: function (value)
        {
            this._radius = value;
            this._ssaoPass.setUniform("sampleRadius", this._radius);
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
            this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
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
            this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});


HX.SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poissonPoints = HX.PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < this._numSamples; ++i) {
        var point = poissonPoints[i];

        // power of two, to create a bit more for closer occlusion
        samples[j++] = Math.pow(point.x, 2);
        samples[j++] = Math.pow(point.y, 2);
        samples[j++] = Math.pow(point.z, 2);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

HX.SSAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (HX.TextureUtils.assureSize(w, h, this._ssaoTexture, this._fbo1)) {
        HX.TextureUtils.assureSize(w, h, this._backTexture, this._fbo2);
        this._ssaoPass.setUniform("ditherScale", {x: w *.25, y: h *.25});
    }

    HX.pushRenderTarget(this._fbo1);
    this._drawPass(this._ssaoPass);

    HX.pushRenderTarget(this._fbo2);
    this._blurPass.setUniform("halfTexelOffset", {x: .5 / w, y: 0.0});
    this._sourceTextureSlot.texture = this._ssaoTexture;
    this._drawPass(this._blurPass);
    HX.popRenderTarget();

    this._blurPass.setUniform("halfTexelOffset", {x: 0.0, y: .5 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);
    HX.popRenderTarget();
};

HX.SSAO.prototype._initDitherTexture = function()
{
    var data = [ 126, 255, 126, 255, 135, 253, 105, 255, 116, 51, 26, 255, 137, 57, 233, 255, 139, 254, 121, 255, 56, 61, 210, 255, 227, 185, 73, 255, 191, 179, 30, 255, 107, 245, 173, 255, 205, 89, 34, 255, 191, 238, 138, 255, 56, 233, 125, 255, 198, 228, 161, 255, 85, 13, 164, 255, 140, 248, 168, 255, 147, 237, 65, 255 ];

    // in case you're wondering, this is how the list above is generated, until approved
    /*var n = new HX.Float4();
    for (var i = 0; i < 16; ++i) {
        var azimuthal = Math.random() * Math.PI * 2.0;
        var polar = Math.random() * Math.PI;
        n.fromSphericalCoordinates(1.0, azimuthal, polar);
        data[i * 4] = Math.round((n.x * .5 + .5) * 0xff);
        data[i * 4 + 1] = Math.round((n.y * .5 + .5) * 0xff);
        data[i * 4 + 2] = Math.round((n.z * .5 + .5) * 0xff);
        data[i * 4 + 3] = 0xff;
    }
    console.log(data.join(", "));*/

    this._ditherTexture = new HX.Texture2D();
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = HX.TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = HX.TextureWrapMode.REPEAT;
};