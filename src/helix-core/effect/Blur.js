import {GaussianBlurPass} from "./GaussianBlurPass";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 *
 * @constructor
 */
function Blur(numSamples, radius)
{
    if (!radius) radius = numSamples;
    Effect.call(this);

    this._blurPass = new GaussianBlurPass(radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._radius = radius;
    this._numSamples = numSamples;
}

Blur.prototype = Object.create(Effect.prototype,
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

Blur.prototype.draw = function(dt)
{
    var ratio = this._radius / this._numSamples;
    // we're manually setting source textures instead of using hx_backbuffer because the GaussianBlurPass needs to
    // handle different textures too (see bloom)
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: ratio / this.hdrSource.width, y: 0.0});
    this._drawPass(this._blurPass);

    this._swapHDRFrontAndBack();

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: 0.0, y: ratio / this.hdrSource.height});
    this._drawPass(this._blurPass);
};

Blur.prototype.dispose = function()
{
    for (var i = 0; i < 2; ++i) {
        this._smallFBOs[i].dispose();
        this._thresholdMaps[i].dispose();
    }

    this._smallFBOs = null;
    this._thresholdMaps = null;
};

export { Blur };