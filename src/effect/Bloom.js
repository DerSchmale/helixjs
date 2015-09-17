/**
 *
 * @constructor
 */
HX.BloomThresholdPass = function()
{
    HX.EffectPass.call(this, null, HX.ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this.setThresholdLuminance(1.0);
};

HX.BloomThresholdPass.prototype = Object.create(HX.EffectPass.prototype);

HX.BloomThresholdPass.prototype.setThresholdLuminance = function(value)
{
    this._thresholdLuminance = value;
    this.setUniform("threshold", value);
};

HX.BloomThresholdPass.prototype.getThresholdLuminance = function()
{
    return this._thresholdLuminance;
};

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
HX.BloomCompositePass = function()
{
    HX.EffectPass.call(this, HX.ShaderLibrary.get("bloom_composite_vertex.glsl"), HX.ShaderLibrary.get("bloom_composite_fragment.glsl"));
};

HX.BloomCompositePass.prototype = Object.create(HX.EffectPass.prototype);


/**
 *
 * @constructor
 */
HX.BloomEffect = function(blurSizes, weights)
{
    HX.Effect.call(this);

    this._downScale = 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    this._thresholdPass = new HX.BloomThresholdPass();
    this._compositePass = new HX.BloomCompositePass();

    this.addPass(this._thresholdPass);
    this.addPass(null);
    this.addPass(null);
    this.addPass(this._compositePass);

    this._thresholdMaps = [];
    this._thresholdFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new HX.Texture2D();
        this._thresholdMaps[i].setFilter(HX.TextureFilter.BILINEAR_NOMIP);
        this._thresholdMaps[i].setWrapMode(HX.TextureWrapMode.CLAMP);
        this._thresholdFBOs[i] = new HX.FrameBuffer([this._thresholdMaps[i]]);
    }

    this._blurSizes = blurSizes || [ 512, 256 ];

    if (HX.EXT_HALF_FLOAT_TEXTURES_LINEAR && HX.EXT_HALF_FLOAT_TEXTURES)
        this._weights = weights || [.05,.05 ];
    else {
        this._weights = weights || [1.5, 5.0 ];
        this.setThresholdLuminance(.9);
    }

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);
};

HX.BloomEffect.prototype = Object.create(HX.Effect.prototype);

HX.BloomEffect.prototype.setThresholdLuminance = function(value)
{
    this._thresholdLuminance = value;
    this.setUniform("threshold", value);
};

HX.BloomEffect.prototype._initTextures = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i].initEmpty(Math.ceil(this._targetWidth / this._downScale), Math.ceil(this._targetHeight / this._downScale), HX.GL.RGB, HX.HDR_FORMAT);
        this._thresholdFBOs[i].init();
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
    this._opaquePasses[1] = new HX.BloomBlurPass(sizesX, this._weights, 1, 0, width, height);
    this._opaquePasses[2] = new HX.BloomBlurPass(sizesY, this._weights, 0, 1, width, height);
    this._opaquePasses[1].setTexture("sourceTexture", this._thresholdMaps[0]);
    this._opaquePasses[2].setTexture("sourceTexture", this._thresholdMaps[1]);

    var mesh = this._mesh;
    if (mesh) {
        this._mesh = null;
        this.setMesh(mesh);
    }
};

HX.BloomEffect.prototype.draw = function(dt)
{
    if (this._hdrTarget._width != this._targetWidth || this._hdrTarget._height != this._targetHeight) {
        this._targetWidth = this._hdrTarget._width;
        this._targetHeight = this._hdrTarget._height;
        this._initTextures();
        this._initBlurPass();
    }

    var targetIndex = 0;
    HX.GL.viewport(0, 0, this._thresholdMaps[0]._width, this._thresholdMaps[0]._height);

    for (var i = 0; i < 3; ++i) {
        HX.setRenderTarget(this._thresholdFBOs[targetIndex]);
        this._drawPass(this._opaquePasses[i]);
        targetIndex = 1 - targetIndex;
    }

    HX.setRenderTarget(this._hdrTarget);
    HX.GL.viewport(0, 0, this._targetWidth, this._targetHeight);
    this._drawPass(this._compositePass);
    this._swapHDRBuffers();
};

HX.BloomEffect.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._thresholdFBOs = null;
    this._thresholdMaps = null;
};

HX.BloomEffect.prototype.getThresholdLuminance = function()
{
    return this.getPass(0).getThresholdLuminance();
};

HX.BloomEffect.prototype.setThresholdLuminance = function(value)
{
    return this.getPass(0).setThresholdLuminance(value);
};