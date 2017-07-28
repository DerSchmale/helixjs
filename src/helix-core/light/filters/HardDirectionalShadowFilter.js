import { CullMode } from '../../Helix';
import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';

/**
 * @classdesc
 * HardDirectionalShadowFilter is a shadow filter for directional lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardDirectionalShadowFilter()
{
    ShadowFilter.call(this);
}

HardDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardDirectionalShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("dir_shadow_hard.glsl");
};

export { HardDirectionalShadowFilter };