import {ShadowFilter} from "./ShadowFilter";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {DataType, TextureFormat} from "../../Helix";
import {ESMBlurShader} from "../shaders/ESMBlurShader";

/**
 * @classdesc
 * ExponentialDirectionalShadowFilter is a shadow filter for directional lights that provides exponential soft shadow
 * mapping. The implementation is highly experimental at this point.
 *
 * @property {number} blurRadius The blur radius for the soft shadows.
 * @property {number} darkeningFactor A darkening factor of the shadows. Counters some artifacts of the technique.
 * @property {number} expScaleFactor The exponential scale factor. Probably you shouldn't touch this.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ExponentialDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
}


ExponentialDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
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
                this.onShaderInvalid.dispatch();
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
                this.onShaderInvalid.dispatch();
            }
        }
    });

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return TextureFormat.RGB;
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return DataType.FLOAT;
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_esm.glsl", defines);
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new ESMBlurShader(this._blurRadius);
};

export { ExponentialDirectionalShadowFilter };