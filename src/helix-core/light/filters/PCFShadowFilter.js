import {ShaderLibrary} from '../../shader/ShaderLibrary';
import {ShadowFilter} from './ShadowFilter';

/**
 * @classdesc
 * PCFShadowFilter is a shadow filter that provides percentage closer soft shadow mapping. However, WebGL does not
 * support shadow test interpolations, so the results aren't as great as its GL/DX counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#shadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFShadowFilter()
{
    ShadowFilter.call(this);
    this.softness = .001;
    this.numShadowSamples = 6;
    this.dither = false;
}

PCFShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
PCFShadowFilter.prototype.getGLSL = function ()
{
    var defines = {
        HX_PCF_NUM_SHADOW_SAMPLES: this.numShadowSamples,
        HX_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + (1.0 / this.numShadowSamples) + ")",
        HX_PCF_SOFTNESS: this.softness
    };

    if (this.dither)
        defines.HX_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("shadow_pcf.glsl", defines);
};

export {PCFShadowFilter};