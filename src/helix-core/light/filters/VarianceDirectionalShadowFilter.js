import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import { VSMBlurShader } from '../shaders/VSMBlurShader';


/**
 * @classdesc
 * VarianceDirectionalShadowFilter is a shadow filter for directional lights that provides variance soft shadow mapping.
 * The implementation is highly experimental at this point.
 *
 * @property {number} blurRadius The blur radius for the soft shadows.
 * @property {number} lightBleedReduction A value to counter light bleeding, an artifact of the technique.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VarianceDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._blurRadius = 2;
    this._lightBleedReduction = .35;
}

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

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
};

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new VSMBlurShader(this._blurRadius);
};

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this._lightBleedReduction;
    return {
        HX_DIR_VSM_MIN_VARIANCE: -0.0001,
        HX_DIR_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_DIR_VSM_LIGHT_BLEED_REDUCTION_RANGE: "float(" + range + ")"
    };
};


export { VarianceDirectionalShadowFilter };