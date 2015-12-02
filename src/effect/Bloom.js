/**
 * @constructor
 */
HX.BloomBlurPass = function(kernelSizes, weights, directionX, directionY, resolutionX, resolutionY)
{
    this._initWeights(kernelSizes, weights);

    var defines = {
        SOURCE_RES: "vec2(float(" + resolutionX + "), float(" + resolutionY + "))",
        RADIUS: "float(" + Math.ceil(this._kernelSize * .5) + ")",
        DIRECTION: "vec2(" + directionX + ", " + directionY + ")",
        NUM_SAMPLES: this._kernelSize
    };

    var vertex = HX.ShaderLibrary.get("bloom_blur_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("bloom_blur_fragment.glsl", defines);

    HX.EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
};

HX.BloomBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomBlurPass.prototype._initWeights = function(kernelSizes, weights)
{
    this._kernelSize = 0;
    this._weights = [];

    var gaussians = [];

    for (var i = 0; i < kernelSizes.length; ++i) {
        var radius = Math.ceil(kernelSizes[i] * .5);
        var size = Math.ceil(kernelSizes[i]);
        if (size > this._kernelSize)
            this._kernelSize = size;
        gaussians[i] = HX.CenteredGaussianCurve.fromRadius(radius);
    }

    var radius = Math.ceil(this._kernelSize * .5);

    for (var j = 0; j < this._kernelSize; ++j) {
        this._weights[j] = 0;
        for (var i = 0; i < kernelSizes.length; ++i) {
            this._weights[j] += gaussians[i].getValueAt(j - radius) * weights[i];
        }
    }
};


/**
 *
 * @constructor
 */
HX.BloomEffect = function(blurSizes, weights, downScale)
{
    HX.Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._thresholdPass = new HX.EffectPass(null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new HX.EffectPass(HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._compositePass.blendState = HX.BlendState.ADD;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].filter = HX.TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = HX.TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._blurSizes = blurSizes || [ 512, 256 ];

    if (HX.EXT_HALF_FLOAT_TEXTURES_LINEAR && HX.EXT_HALF_FLOAT_TEXTURES) {
        this._weights = weights || [.05, .05];
        this.thresholdLuminance = 1.0;
    }
    else {
        this._weights = weights || [1.5, 5.0 ];
        this.thresholdLuminance = .9;
    }

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);
};

HX.BloomEffect.prototype = Object.create(HX.Effect.prototype);

HX.BloomEffect.prototype._initTextures = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i].initEmpty(Math.ceil(this._targetWidth / this._downScale), Math.ceil(this._targetHeight / this._downScale), HX.GL.RGB, HX.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

HX.BloomEffect.prototype._initBlurPass = function()
{
    var sizesX = [];
    var sizesY = [];
    var len = this._blurSizes.length;
    for (var i = 0; i < len; ++i) {
        sizesX[i] = this._blurSizes[i] / this._downScale;
        sizesY[i] = this._blurSizes[i] / this._downScale;
    }

    var width = this._targetWidth / this._downScale;
    var height = this._targetHeight / this._downScale;
    // direction used to provide step size
    this._blurXPass = new HX.BloomBlurPass(sizesX, this._weights, 1, 0, width, height);
    this._blurYPass = new HX.BloomBlurPass(sizesY, this._weights, 0, 1, width, height);
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