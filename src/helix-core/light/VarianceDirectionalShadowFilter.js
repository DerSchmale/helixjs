import { ShaderLibrary } from '../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import { VSMBlurShader } from './shaders/VSMBlurShader';


function VarianceDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._blurRadius = 2;
    this._lightBleedReduction = .35;
};

VarianceDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
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

        lightBleedReduction: {
            get: function()
            {
                return this._lightBleedReduction;
            },

            set: function(value)
            {
                this._lightBleedReduction = value;
                this.onShaderInvalid.dispatch();
            }
        }
    });

VarianceDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
};

VarianceDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new VSMBlurShader(this._blurRadius);
};

VarianceDirectionalShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this._lightBleedReduction;
    return {
        HX_VSM_MIN_VARIANCE: -0.0001,
        HX_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_VSM_LIGHT_BLEED_REDUCTION_RANGE: "float(" + range + ")"
    };
};


export { VarianceDirectionalShadowFilter };