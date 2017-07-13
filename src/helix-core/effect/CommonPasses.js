import {EffectPass} from "./EffectPass";
import {ShaderLibrary} from "../shader/ShaderLibrary";

/**
 * @classdesc
 * CopyTexturePass is an {@linkcode EffectPass} that simply copies a texture. Used for downscaling etc.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CopyTexturePass()
{
    EffectPass.call(this, null, ShaderLibrary.get("copy_fragment.glsl"));
}

CopyTexturePass.prototype = Object.create(EffectPass.prototype);

/**
 * Sets the texture to copy from.
 */
CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};

export { CopyTexturePass };