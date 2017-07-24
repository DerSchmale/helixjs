import {CullMode, META} from '../../Helix';
import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import {MathX} from "../../math/MathX";

/**
 * @classdesc
 * PCFDirectionalShadowFilter is a shadow filter for directional lights that provides percentage closer soft shadow
 * mapping. However, WebGL does not support shadow test interpolations, so the results aren't as great as its GL/DX
 * counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._softness = .001;
    this._numShadowSamples = 6;
    this._dither = false;
}

PCFDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                value = MathX.clamp(value, 1, 32);
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                    this.onShaderInvalid.dispatch();
                }
            }
        }
    }
);

/**
 * @ignore
 */
PCFDirectionalShadowFilter.prototype.getCullMode = function()
{
    return CullMode.FRONT;
};

/**
 * @ignore
 */
PCFDirectionalShadowFilter.prototype.getGLSL = function()
{
    if (META.OPTIONS.pointShadowFilter._numShadowSamples)

    var defines = {
        HX_DIR_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_DIR_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_DIR_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_DIR_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("dir_shadow_pcf.glsl", defines);
};

export { PCFDirectionalShadowFilter };