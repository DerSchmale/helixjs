HX.HardDirectionalShadowFilter = function()
{
    HX.ShadowFilter.call(this);
};

HX.HardDirectionalShadowFilter.prototype = Object.create(HX.ShadowFilter.prototype);

HX.HardDirectionalShadowFilter.prototype.getGLSL = function()
{
    return HX.ShaderLibrary.get("dir_shadow_hard.glsl");
};

HX.HardDirectionalShadowFilter.prototype.getCullMode = function()
{
    return HX.CullMode.FRONT;
};