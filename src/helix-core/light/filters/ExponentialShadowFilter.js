import {ShadowFilter} from "./ShadowFilter";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {CullMode, DataType, TextureFilter, TextureFormat} from "../../Helix";
import {ESMBlurShader} from "../shaders/ESMBlurShader";
import {VarianceShadowFilter} from "./VarianceShadowFilter";

/**
 * @classdesc
 * ExponentialShadowFilter is a shadow filter for directional lights that provides exponential soft shadow
 * mapping. The implementation is highly experimental at this point.
 *
 * @property {number} blurRadius The blur radius for the soft shadows.
 * @property {number} darkeningFactor A darkening factor of the shadows. Counters some artifacts of the technique.
 * @property {number} expScaleFactor The exponential scale factor. Probably you shouldn't touch this.
 *
 * @see {@linkcode InitOptions#shadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ExponentialShadowFilter()
{
    ShadowFilter.call(this);
    this.shadowMapFilter = TextureFilter.BILINEAR_NOMIP;
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
}


ExponentialShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        darkeningFactor: {
            get: function()
            {
                return this._darkeningFactor;
            },

            set: function(value)
            {
                this._darkeningFactor = value;
            }
        },

        expScaleFactor: {
            get: function()
            {
                return this._expScaleFactor;
            },

            set: function(value)
            {
                this._expScaleFactor = value;
            }
        }
    });

ExponentialShadowFilter.prototype.getCullMode = function()
{
	return CullMode.BACK;
};

ExponentialShadowFilter.prototype.getShadowMapFilter = function()
{
	return TextureFilter.BILINEAR_NOMIP;
};


/**
 * @ignore
 */
ExponentialShadowFilter.prototype.getShadowMapFormat = function()
{
    return TextureFormat.RG || TextureFormat.RGB;
};

/**
 * @ignore
 */
ExponentialShadowFilter.prototype.getShadowMapDataType = function()
{
    return DataType.FLOAT;
};

/**
 * @ignore
 */
ExponentialShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("shadow_esm.glsl", defines);
};

/**
 * @ignore
 */
ExponentialShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

/**
 * @ignore
 */
ExponentialShadowFilter.prototype._createBlurShader = function()
{
    return new ESMBlurShader(this._blurRadius);
};

export { ExponentialShadowFilter };