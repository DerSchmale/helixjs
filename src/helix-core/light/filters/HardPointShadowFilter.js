import { CullMode } from '../../Helix';
import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';

/**
 * @classdesc
 * HardPointShadowFilter is a shadow filter for point lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#pointShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardPointShadowFilter()
{
    ShadowFilter.call(this);
}

HardPointShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardPointShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("point_shadow_hard.glsl");
};

/**
 * @ignore
 */
HardPointShadowFilter.prototype.getCullMode = function()
{
    return CullMode.FRONT;
};

export { HardPointShadowFilter };