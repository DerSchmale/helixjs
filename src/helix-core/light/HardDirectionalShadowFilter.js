import { CullMode } from '../Helix';
import { ShaderLibrary } from '../shader/ShaderLibrary';
import { ShadowFilter } from './ShadowFilter';

function HardDirectionalShadowFilter()
{
    ShadowFilter.call(this);
}

HardDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype);

HardDirectionalShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("dir_shadow_hard.glsl");
};

HardDirectionalShadowFilter.prototype.getCullMode = function()
{
    return CullMode.FRONT;
};

export { HardDirectionalShadowFilter };