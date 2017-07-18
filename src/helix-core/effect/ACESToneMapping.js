import {ToneMapEffect} from "./ToneMapEffect";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";

/**
 * @classdesc
 * ACESToneMapping is an {@linkcode Effect} added to the Camera that applies filmic tone mapping with the ACES parameters.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @extends ToneMapping
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ACESToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

}

ACESToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 */
ACESToneMapping.prototype._createToneMapPass = function()
{
    var defines = {
        HX_ACES: 1
    };
    var extensions = "";

    if (this._adaptive) {
        defines.HX_ADAPTIVE = 1;

        extensions = "#texturelod\n";
    }

    return new EffectPass(
        null,
        extensions + ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" + ShaderLibrary.get("tonemap_filmic_fragment.glsl")
    );
};


export { ACESToneMapping };