/**
 *
 * @constructor
 */
import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";

function CopyTexturePass()
{
    EffectPass.call(this, null, ShaderLibrary.get("copy_fragment.glsl"));
}

CopyTexturePass.prototype = Object.create(EffectPass.prototype);

CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};

export { CopyTexturePass };