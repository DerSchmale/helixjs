import {GaussianBlurPass} from "./GaussianBlurPass";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 * @classdesc
 * Blur is an {@linkcode Effect} added to the Camera that simply applies a gaussian blur to the screen.
 *
 * @param {number} radius The radius of the blur in pixels.
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Blur(radius)
{
    Effect.call(this);

    this._radius = 0;
	this.radius = radius;
}

Blur.prototype = Object.create(Effect.prototype, {
    radius: {
        get: function() {
            return this._radius;
        },

        set: function(value) {
            if (this._radius === value) return;
            this._radius = value;
            this._blurPass = new GaussianBlurPass(value);
            this._blurSourceSlot = this._blurPass.getTextureIndex("sourceTexture");
        }
    }
});

/**
 * @ignore
 */
Blur.prototype.draw = function(renderer, dt)
{
    // we're manually setting source textures instead of using hx_backBuffer because the GaussianBlurPass needs to
    // handle different textures too (see bloom)
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurPass.setTextureByIndex(this._blurSourceSlot, this.hdrSource);
    this._blurPass.setUniform("stepSize", {x: 1.0 / this.hdrSource.width, y: 0.0});
    this._blurPass.draw(renderer);

    this._swapHDRFrontAndBack();

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
	this._blurPass.setTextureByIndex(this._blurSourceSlot, this.hdrSource);
    this._blurPass.setUniform("stepSize", {x: 0.0, y: 1.0 / this.hdrSource.height});
    this._blurPass.draw(renderer);
};

export { Blur };