import { CullMode } from '../../Helix';
import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';

/**
 * @classdesc
 * HardSpotShadowFilter is a shadow filter for spot lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#spotShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardSpotShadowFilter()
{
    ShadowFilter.call(this);
}

HardSpotShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardSpotShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("spot_shadow_hard.glsl");
};

export { HardSpotShadowFilter };