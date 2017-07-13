import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 *
 * @constructor
 */
function FXAA()
{
    Effect.call(this);

    this._pass = new EffectPass(null, ShaderLibrary.get("fxaa_fragment.glsl"));
    this._pass.setUniform("edgeThreshold", 1/4);
    this._pass.setUniform("edgeThresholdMin", 1/16);
    this._pass.setUniform("edgeSharpness", 100.0);
};

FXAA.prototype = Object.create(Effect.prototype);

FXAA.prototype.draw = function(dt)
{
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._pass);
};

export { FXAA };