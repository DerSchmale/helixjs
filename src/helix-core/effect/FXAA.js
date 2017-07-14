import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {Effect} from "./Effect";
import {GL} from "../core/GL";

/**
 * @classdesc
 * FXAA is an {@linkcode Effect} added to the Camera that applies "Fast approXimate Anti-Aliasing" on the render.
 *
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FXAA()
{
    Effect.call(this);

    this._pass = new EffectPass(null, ShaderLibrary.get("fxaa_fragment.glsl"));
    this._pass.setUniform("edgeThreshold", 1/4);
    this._pass.setUniform("edgeThresholdMin", 1/16);
    this._pass.setUniform("edgeSharpness", 100.0);
}

FXAA.prototype = Object.create(Effect.prototype);

/**
 * @ignore
 */
FXAA.prototype.draw = function(dt)
{
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._pass);
};

export { FXAA };