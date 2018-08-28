import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import { VSMBlurShader } from '../shaders/VSMBlurShader';
import {capabilities, CullMode, DataType, TextureFilter, TextureFormat} from "../../Helix";


/**
 * @classdesc
 * VarianceShadowFilter is a shadow filter that provides variance soft shadow mapping. The implementation is highly
 * experimental at this point.
 *
 * @property {Number} blurRadius The blur radius for the soft shadows.
 * @property {Number} lightBleedReduction A value to counter light bleeding, an artifact of the technique.
 * @property {Number} minVariance The minimum amount of variance.
 * @property {Boolean} useHalfFloat Uses half float textures for the shadow map, if available. This may result in
 * performance improvements, but also precision artifacts. Defaults to true.
 *
 * @see {@linkcode InitOptions#shadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VarianceShadowFilter()
{
    ShadowFilter.call(this);
	this.lightBleedReduction = .5;
	this.minVariance = .001;
	this.useHalfFloat = true;
	this._blurRadius = 2;
}

VarianceShadowFilter.prototype = Object.create(ShadowFilter.prototype,
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
        }
    });

/**
 * @ignore
 */
VarianceShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("shadow_vsm.glsl", defines);
};

VarianceShadowFilter.prototype.getCullMode = function()
{
	return CullMode.BACK;
};

VarianceShadowFilter.prototype.getShadowMapFilter = function()
{
	return TextureFilter.BILINEAR_NOMIP;
};

VarianceShadowFilter.prototype.getShadowMapFormat = function()
{
    return capabilities.EXT_COLOR_BUFFER_HALF_FLOAT || capabilities.EXT_COLOR_BUFFER_FLOAT? TextureFormat.RG || TextureFormat.RGB : TextureFormat.RGBA;
};

VarianceShadowFilter.prototype.getShadowMapDataType = function()
{
    return capabilities.EXT_COLOR_BUFFER_HALF_FLOAT && this.useHalfFloat? DataType.HALF_FLOAT :
            capabilities.EXT_COLOR_BUFFER_FLOAT? DataType.FLOAT : DataType.UNSIGNED_BYTE;
};

/**
 * @ignore
 */
VarianceShadowFilter.prototype._createBlurShader = function()
{
    return new VSMBlurShader(this._blurRadius);
};

/**
 * @ignore
 */
VarianceShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this.lightBleedReduction;
    return {
        HX_VSM_MIN_VARIANCE: "float(" + this.minVariance + ")",
        HX_VSM_LIGHT_BLEED_REDUCTION: "float(" + this.lightBleedReduction + ")",
        HX_VSM_RCP_LIGHT_BLEED_REDUCTION_RANGE: "float(" + (1.0 / range) + ")"
    };
};


export { VarianceShadowFilter };