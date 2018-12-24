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
 * @property amount The amount of motion blur to apply. This is basically the ratio of camera exposure time / frame time.
 * @property numSamples The amount of samples used to calculate the blur in each direction.
 * @property maxRadius The maximum distance to blur, in pixels. This is used to limit texture cache issues resulting from large sample radii.
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MotionBlur(numSamples)
{
    Effect.call(this);

    if (META.OPTIONS.renderMotionVectors)
        this.needsMotionVectors = true;
    else
        this.needsNormalDepth = true;

    this.amount = 1;
    this.maxRadius = 40;
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
            this._pass = new EffectPass(null,
                ShaderLibrary.get("snippets_reproject.glsl") +
                ShaderLibrary.get("motion_blur_fragment.glsl", {
                NUM_BLUR_SAMPLES: value,
                STEP_SCALE: 1 / (value - 1)
            }));
            this._pass.setUniform("maxRadius", this._maxRadius);
            this._pass.setUniform("amount", this._amount);
        }
    },
    maxRadius: {
        get: function()
        {
            return this._maxRadius;
        },
        set: function(value)
        {
            this._maxRadius = value;
            if (this._pass)
                this._pass.setUniform("maxRadius", value);
        }
    },
    amount: {
        get: function()
        {
            return this._amount;
        },
        set: function(value)
        {
            this._amount = value;
            if (this._pass)
                this._pass.setUniform("amount", value);
        }
    }
});

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