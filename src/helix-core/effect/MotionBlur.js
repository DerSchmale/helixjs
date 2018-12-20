import {Effect} from "./Effect";
import {GL} from "../core/GL";
import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {META} from "../Helix";

/**
 * @classdesc
 * MotionBlur is an {@linkcode Effect} added to the Camera that applies a motion blur effect between frames.
 *
 * @param numSamples The amount of samples used to calculate the blur in each direction.
 * @param radius The radius of the blur.
 * @constructor
 *
 * @property numSamples The amount of samples used to calculate the blur in each direction.
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MotionBlur(numSamples)
{
    if (!META.OPTIONS.renderMotionVectors)
        console.warn("MotionBlur requires renderMotionVectors to be true in InitOptions");

    Effect.call(this);

    this.needsVelocity = true;

    this._numSamples = -1;
    this.numSamples = numSamples || 8;
}

MotionBlur.prototype = Object.create(Effect.prototype, {
    numSamples: {
        get: function()
        {
            return this._numSamples;
        },
        set: function(value)
        {
            if (value === this._numSamples) return;

            this._numSamples = value;
            this._pass = new EffectPass(null, ShaderLibrary.get("motion_blur_fragment.glsl", {
                NUM_BLUR_SAMPLES: value,
                STEP_SCALE: 1 / (value - 1)
            }));
        }
    }

});

/**
 * @inheritDoc
 */
MotionBlur.prototype.isSupported = function()
{
    return META.OPTIONS.renderMotionVectors;
};

/**
 * @ignore
 */
MotionBlur.prototype.draw = function(renderer, dt)
{
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._pass.draw(renderer);
};

export {MotionBlur};