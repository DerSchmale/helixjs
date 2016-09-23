/**
 * @constructor
 */
HX.BloomBlurPass = function(kernelSize, directionX, directionY, resolutionX, resolutionY)
{
    this._initWeights(kernelSize);

    var defines = {
        SOURCE_RES: "vec2(float(" + resolutionX + "), float(" + resolutionY + "))",
        RADIUS: "float(" + Math.ceil(kernelSize * .5) + ")",
        DIRECTION: "vec2(" + directionX + ", " + directionY + ")",
        NUM_SAMPLES: Math.ceil(kernelSize)
    };

    var vertex = HX.ShaderLibrary.get("bloom_blur_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("bloom_blur_fragment.glsl", defines);

    HX.EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
};

HX.BloomBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomBlurPass.prototype._initWeights = function(kernelSize)
{
    this._weights = [];

    var size = Math.ceil(kernelSize *.5) * 2;
    var radius = size * .5;
    var gaussian = HX.CenteredGaussianCurve.fromRadius(radius,.005);

    var total = 0;
    for (var j = 0; j < kernelSize; ++j) {
        this._weights[j] = gaussian.getValueAt(j - radius);
        total += this._weights[j];
    }

    for (var j = 0; j < kernelSize; ++j) {
        this._weights[j] *= total;
    }
};


/**
 *
 * @constructor
 */
HX.BloomEffect = function(size, strength, downScale, anisotropy)
{
    HX.Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._thresholdPass = new HX.EffectPass(null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new HX.EffectPass(HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._compositePass.blendState = HX.BlendState.ADD_NO_ALPHA;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = HX.TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._size = size || 512;
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
        this._thresholdMaps[i].initEmpty(Math.ceil(this._targetWidth / this._downScale), Math.ceil(this._targetHeight / this._downScale), HX_GL.RGB, HX.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

HX.BloomEffect.prototype._initBlurPass = function()
{
    var size = this._size / this._downScale;

    var width = this._targetWidth / this._downScale;
    var height = this._targetHeight / this._downScale;
    // direction used to provide step size
    this._blurXPass = new HX.BloomBlurPass(size, 1, 0, width, height);
    this._blurYPass = new HX.BloomBlurPass(size * this._anisotropy, 0, 1, width, height);
    this._blurXPass.setTexture("sourceTexture", this._thresholdMaps[0]);
    this._blurYPass.setTexture("sourceTexture", this._thresholdMaps[1]);
};

HX.BloomEffect.prototype.draw = function(dt)
{
    if (this._renderer._width != this._targetWidth || this._renderer._height != this._targetHeight) {
        this._targetWidth = this._renderer._width;
        this._targetHeight = this._renderer._height;
        this._initTextures();
        this._initBlurPass();
    }

    HX.pushRenderTarget(this._smallFBOs[0]);
    {
        this._drawPass(this._thresholdPass);

        HX.pushRenderTarget(this._smallFBOs[1]);
        {
            this._drawPass(this._blurXPass);
        }
        HX.popRenderTarget();

        this._drawPass(this._blurYPass);
    }

    HX.popRenderTarget();

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