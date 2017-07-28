import { CullMode } from '../../Helix';
import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';
import {MathX} from "../../math/MathX";

/**
 * @classdesc
 * PCFPointShadowFilter is a shadow filter for point lights that provides percentage closer soft shadow mapping.
 * However, WebGL does not support shadow test interpolations, so the results aren't as great as its GL/DX counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#pointShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFPointShadowFilter()
{
    ShadowFilter.call(this);
    this._softness = .005;
    this._numShadowSamples = 6;
    this._dither = false;
}

PCFPointShadowFilter.prototype = Object.create(ShadowFilter.prototype,
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
                }
            }
        }
    }
);

/**
 * @ignore
 */
PCFPointShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        HX_POINT_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_POINT_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_POINT_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_POINT_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("point_shadow_pcf.glsl", defines);
};

export { PCFPointShadowFilter };