import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Effect} from "./Effect";
import {GL} from "../core/GL";
import {Texture2D} from "../texture/Texture2D";
import {TextureUtils} from "../texture/TextureUtils";
import {FrameBuffer} from "../texture/FrameBuffer";
import {BlitTexture} from "../utils/BlitTexture";
import {META, TextureFilter, TextureWrapMode} from "../Helix";

/**
 * @classdesc
 * TAA is an {@linkcode Effect} added to the Camera that applies Temporal Anti-Aliasing on the render.
 *
 * @constructor
 *
 * @extends Effect
 *
 * @property {Number} alpha The amount the newly rendered frame contributes to the final colour each frame, giving an
 * exponential running average.
 * @property {Number} gamma The amount used to variance clip false samples. Larger values are generally more temporally stable.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TAA()
{
    Effect.call(this);

    if (!META.OPTIONS.renderMotionVectors)
        console.warn("MotionBlur requires renderMotionVectors to be true in InitOptions! Only camera jitter will be applied.");

    this.needsCameraJitter = true;
    this.needsMotionVectors = true;
    this._historyTexture = new Texture2D();
    this._historyFBO = new FrameBuffer(this._historyTexture);
    this._historyTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._historyTexture.wrapMode = TextureWrapMode.CLAMP;
    this._pass = new EffectPass(null, ShaderLibrary.get("taa_fragment.glsl"));
    this._pass.setTexture("historyBuffer", this._historyTexture);
    this.alpha = .1;
    this.gamma = 1.0;
}

TAA.prototype = Object.create(Effect.prototype, {
    alpha: {
        get: function() {
            return this._alpha;
        },

        set: function(value) {
            this._alpha = value;
            this._pass.setUniform("alpha", value);
        }
    },
    gamma: {
        get: function() {
            return this._gamma;
        },

        set: function(value) {
            this._gamma = value;
            this._pass.setUniform("gamma", value);
        }
    }
});

/**
 * @inheritDoc
 */
TAA.prototype.isSupported = function()
{
    return META.OPTIONS.renderMotionVectors;
};

/**
 * @ignore
 */
TAA.prototype.draw = function(renderer, dt)
{
    var target = this.hdrTarget;
    var w = target.width, h = target.height;

    // just copy the data to the history buffer and do nothing else on resize
    if (TextureUtils.assureSize(w, h, this._historyTexture, this._historyFBO)) {
        GL.setRenderTarget(this._historyFBO);
        GL.clear();
        BlitTexture.execute(this.hdrSource);
        // not writing anything to target, so undo upcoming swap
        this._swapHDRFrontAndBack();
        return;
    }

    GL.setRenderTarget(target);
    GL.clear();
    this._pass.draw(renderer);

    // copy latest state to history texture
    GL.setRenderTarget(this._historyFBO);
    GL.clear();
    BlitTexture.execute(this.hdrTargetTexture);
};

export { TAA };