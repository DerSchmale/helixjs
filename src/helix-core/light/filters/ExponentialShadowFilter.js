import {ShadowFilter} from "./ShadowFilter";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {DataType, TextureFilter, TextureFormat} from "../../Helix";
import {ESMBlurShader} from "../shaders/ESMBlurShader";

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
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
}


ExponentialShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        shadowMapFilter: {
            get: function() {
                return TextureFilter.BILINEAR_NOMIP;
            }
        },

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

/**
 * @ignore
 */
ExponentialShadowFilter.prototype.getShadowMapFormat = function()
{
    return TextureFormat.RGB;
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