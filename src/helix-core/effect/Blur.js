import {GaussianBlurPass} from "./GaussianBlurPass";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 * @classdesc
 * Blur is an {@linkcode Effect} added to the Camera that simply applies a gaussian blur to the screen.
 *
 * @param {number} radius The radius of the blur.
 *
 * @param numSamples The amount of samples used to calculate the blur in each direction. Cannot be changed after creation.
 * @param radius The radius of the blur.
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Blur(numSamples, radius)
{
    if (!radius) radius = numSamples;
    Effect.call(this);

	this.radius = radius;

	this._blurPass = new GaussianBlurPass(radius);
	this._blurSourceSlot = this._blurPass.getTextureIndex("sourceTexture");
    this._numSamples = numSamples;
}

Blur.prototype = Object.create(Effect.prototype);

/**
 * @ignore
 */
Blur.prototype.draw = function(renderer, dt)
{
    var ratio = this.radius / this._numSamples;
    // we're manually setting source textures instead of using hx_backBuffer because the GaussianBlurPass needs to
    // handle different textures too (see bloom)
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurPass.setTextureByIndex(this._blurSourceSlot, this.hdrSource);
    this._blurPass.setUniform("stepSize", {x: ratio / this.hdrSource.width, y: 0.0});
    this._blurPass.draw(renderer);

    this._swapHDRFrontAndBack();

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
	this._blurPass.setTextureByIndex(this._blurSourceSlot, this.hdrSource);
    this._blurPass.setUniform("stepSize", {x: 0.0, y: ratio / this.hdrSource.height});
    this._blurPass.draw(renderer);
};

export { Blur };