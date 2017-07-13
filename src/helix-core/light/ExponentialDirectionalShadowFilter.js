// highly experimental
import {ShadowFilter} from "./ShadowFilter";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {DataType, TextureFormat} from "../Helix";
import {ESMBlurShader} from "./shaders/ESMBlurShader";

function ExponentialDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
};


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

        // not recommended to change
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

ExponentialDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return TextureFormat.RGB;
};

ExponentialDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return DataType.FLOAT;
};

ExponentialDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_esm.glsl", defines);
};

ExponentialDirectionalShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

ExponentialDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new ESMBlurShader(this._blurRadius);
};

export { ExponentialDirectionalShadowFilter };