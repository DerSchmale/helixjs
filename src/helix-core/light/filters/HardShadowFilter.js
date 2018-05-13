import { ShaderLibrary } from '../../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';

/**
 * @classdesc
 * HardShadowFilter is a shadow filter that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#shadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardShadowFilter()
{
    ShadowFilter.call(this);
}

HardShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("shadow_hard.glsl");
};

export { HardShadowFilter };