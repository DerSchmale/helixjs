/**
 *
 * @constructor
 */
HX.Blur = function(numSamples, radius)
{
    if (!radius) radius = numSamples;
    HX.Effect.call(this);

    this._blurPass = new HX.GaussianBlurPass(radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._radius = radius;
    this._numSamples = numSamples;
};

HX.Blur.prototype = Object.create(HX.Effect.prototype,
    {
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
            }
        }
    });

HX.Blur.prototype.draw = function(dt)
{
    var ratio = this._radius / this._numSamples;
    // we're manually setting source textures instead of using hx_backbuffer because the GaussianBlurPass needs to
    // handle different textures too (see bloom)
    HX.setRenderTarget(this.hdrTarget);
    HX.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: ratio / this.hdrSource.width, y: 0.0});
    this._drawPass(this._blurPass);

    this._swapHDRFrontAndBack();

    HX.setRenderTarget(this.hdrTarget);
    HX.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: 0.0, y: ratio / this.hdrSource.height});
    this._drawPass(this._blurPass);
};

HX.Blur.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._smallFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._smallFBOs = null;
    this._thresholdMaps = null;
};