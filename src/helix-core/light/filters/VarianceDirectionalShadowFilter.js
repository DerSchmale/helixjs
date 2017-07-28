import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import { VSMBlurShader } from '../shaders/VSMBlurShader';
import {capabilities, DataType, TextureFormat} from "../../Helix";


/**
 * @classdesc
 * VarianceDirectionalShadowFilter is a shadow filter for directional lights that provides variance soft shadow mapping.
 * The implementation is highly experimental at this point.
 *
 * @property {Number} blurRadius The blur radius for the soft shadows.
 * @property {Number} lightBleedReduction A value to counter light bleeding, an artifact of the technique.
 * @property {Boolean} useHalfFloat Uses half float textures for the shadow map, if available. This may result in
 * performance improvements, but also precision artifacts. Defaults to true.
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
    this._minVariance = .001;
    this._useHalfFloat = true;
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
            }
        },

        useHalfFloat: {
            get: function()
            {
                return this._useHalfFloat;
            },

            set: function(value)
            {
                this._useHalfFloat = value;
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

VarianceDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR || capabilities.EXT_FLOAT_TEXTURES_LINEAR? TextureFormat.RGB : TextureFormat.RGBA;
};

VarianceDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR && this._useHalfFloat? DataType.HALF_FLOAT :
            capabilities.EXT_FLOAT_TEXTURES_LINEAR? DataType.FLOAT : DataType.UNSIGNED_BYTE;
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
        HX_DIR_VSM_MIN_VARIANCE: this._minVariance,
        HX_DIR_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_DIR_VSM_LIGHT_BLEED_REDUCTION_RANGE: "float(" + range + ")"
    };
};


export { VarianceDirectionalShadowFilter };