import {ToneMapEffect} from "./ToneMapEffect";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";

/**
 * @classdesc
 * FilmicToneMapping is an {@linkcode Effect} added to the Camera that applies filmic tone mapping.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @extends ToneMapping
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FilmicToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
    this.outputsGamma = true;

}

FilmicToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 */
FilmicToneMapping.prototype._createToneMapPass = function()
{
    var defines = {};
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


export { FilmicToneMapping };