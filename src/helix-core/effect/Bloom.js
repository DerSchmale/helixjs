/**
 *
 * @constructor
 */
HX.BloomEffect = function(radius, strength, downScale, anisotropy)
{
    HX.Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._radius = radius || 512;
    this._radius /= this._downScale;
    this._thresholdPass = new HX.EffectPass(null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new HX.EffectPass(HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._blurPass = new HX.GaussianBlurPass(this._radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._thresholdWidth = -1;
    this._thresholdHeight = -1;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = HX.TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._anisotropy = anisotropy || 1;

    this._strength = strength === undefined? 1.0 : strength;

    if (HX.EXT_HALF_FLOAT_TEXTURES_LINEAR && HX.EXT_HALF_FLOAT_TEXTURES)
        this.thresholdLuminance = 1.0;
    else
        this.thresholdLuminance = .9;

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);

    this.strength = this._strength;
};

HX.BloomEffect.prototype = Object.create(HX.Effect.prototype,
    {
        strength: {
            get: function() {
                return this._strength;
            },

            set: function(value) {
                this._strength = value;
                this._compositePass.setUniform("strength", this._strength);
            }
        }
    });

HX.BloomEffect.prototype._initTextures = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdWidth = Math.ceil(this._targetWidth / this._downScale);
        this._thresholdHeight = Math.ceil(this._targetHeight / this._downScale);
        this._thresholdMaps[i].initEmpty(this._thresholdWidth, this._thresholdHeight, HX_GL.RGB, HX.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

HX.BloomEffect.prototype.draw = function(dt)
{
    if (this._renderer._width != this._targetWidth || this._renderer._height != this._targetHeight) {
        this._targetWidth = this._renderer._width;
        this._targetHeight = this._renderer._height;
        this._initTextures();
    }

    HX.setRenderTarget(this._smallFBOs[0]);
    HX.clear();
    this._drawPass(this._thresholdPass);

    HX.setRenderTarget(this._smallFBOs[1]);
    HX.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[0];
    this._blurPass.setUniform("stepSize", {x: 1.0 / this._thresholdWidth, y: 0.0});
    this._drawPass(this._blurPass);

    HX.setRenderTarget(this._smallFBOs[0]);
    HX.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[1];
    this._blurPass.setUniform("stepSize", {x: 0.0, y: 1.0 / this._thresholdHeight});
    this._drawPass(this._blurPass);

    HX.setRenderTarget(this.hdrTarget);
    HX.clear();
    this._drawPass(this._compositePass);
};

HX.BloomEffect.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._smallFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._smallFBOs = null;
    this._thresholdMaps = null;
};

Object.defineProperty(HX.BloomEffect.prototype, "thresholdLuminance", {
    get: function() {
        return this._thresholdLuminance;
    },

    set: function(value) {
        this._thresholdLuminance = value;
        this._thresholdPass.setUniform("threshold", value)
    }
});