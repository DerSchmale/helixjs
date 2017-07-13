import {ToneMapEffect} from "./ToneMapEffect";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";


/**
 * @classdesc
 * ReinhardToneMapping is an {@linkcode Effect} added to the Camera that applies Reinhard tone mapping.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ReinhardToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
}

ReinhardToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 * @private
 */
ReinhardToneMapping.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions = "";

    if (this._adaptive) {
        defines.HX_ADAPTIVE = 1;
        extensions += "#texturelod\n";
    }

    return new EffectPass(
        null,
        extensions + ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" + ShaderLibrary.get("tonemap_reinhard_fragment.glsl")
    );
};


export { ReinhardToneMapping };