/**
 *
 * @constructor
 */
import {ToneMapEffect} from "./ToneMapEffect";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "./EffectPass";


function ReinhardToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
};

ReinhardToneMapping.prototype = Object.create(ToneMapEffect.prototype);

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