import {capabilities} from "../Helix";
import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {BlendState} from "../render/BlendState";
import {TextureFormat, BlendFactor, BlendOperation} from "../Helix";
import {Color} from "../core/Color";
import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {MathX} from "../math/MathX";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 * @classdesc
 * A base class for tone mapping effects.
 *
 * @property {number} exposure The exposure value (in "stops"). Higher values will result in brighter results.
 * @property {number} key The intended average luminosity in the scene. Gives a hint whether the scene should be dark (low-key) or bright (high-key).
 * @property {number} adaptionRate The amount of time in milliseconds for the "lens" to adapt to the scene's brightness.
 *
 * @constructor
 * @param adaptive Defines whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @ignore
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ToneMapEffect(adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!capabilities.EXT_SHADER_TEXTURE_LOD || !capabilities.EXT_COLOR_BUFFER_HALF_FLOAT)) {
        console.log("Warning: adaptive tone mapping not supported, using non-adaptive");
        this._adaptive = false;
        return;
    }

    Effect.call(this);

    this._toneMapPass = this._createToneMapPass();

    if (this._adaptive) {
        this._extractLuminancePass = new EffectPass(null, ShaderLibrary.get("tonemap_reference_fragment.glsl"));
        this._extractLuminancePass.blendState = new BlendState(BlendFactor.CONSTANT_ALPHA, BlendFactor.ONE_MINUS_CONSTANT_ALPHA, BlendOperation.ADD, new Color(1.0, 1.0, 1.0, 1.0));

        this._luminanceMap = new Texture2D();
        this._luminanceMap.initEmpty(256, 256, TextureFormat.RGBA, capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new FrameBuffer(this._luminanceMap);
        this._luminanceFBO.init();

        this.adaptationRate = 500.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", MathX.log2(this._luminanceMap._width));
    }

    this.key = .25;
    this.exposure = 0.0;
}

ToneMapEffect.prototype = Object.create(Effect.prototype, {
    exposure: {
        get: function()
        {
            return this._exposure;
        },
        set: function(value)
        {
            this._exposure = value;
            this._toneMapPass.setUniform("hx_exposure", Math.pow(2.0, value));
        }
    },

    key: {
        get: function()
        {
            return this._key;
        },
        set: function(value)
        {
            this._key = value;
            this._toneMapPass.setUniform("hx_key", value);
        }
    }
});

ToneMapEffect.prototype._createToneMapPass = function()
{
    throw new Error("Abstract method called!");
};


ToneMapEffect.prototype.draw = function(dt)
{
    if (this._adaptive) {
        var amount = this.adaptationRate > 0 ? dt / this.adaptationRate : 1.0;
        if (amount > 1) amount = 1;

        this._extractLuminancePass.blendState.color.a = amount;

        GL.setRenderTarget(this._luminanceFBO);
        // can't clear at this point
        this._drawPass(this._extractLuminancePass);
        this._luminanceMap.generateMipmap();
    }

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._toneMapPass);
};

export { ToneMapEffect };