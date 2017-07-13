/**
 *
 * @constructor
 */
import {ToneMapEffect} from "./ToneMapEffect";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";

function FilmicToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

};

FilmicToneMapping.prototype = Object.create(ToneMapEffect.prototype);

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