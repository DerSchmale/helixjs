/**
 *
 * @constructor
 */
HX.CopyTexturePass = function()
{
    HX.EffectPass.call(this, null, HX.ShaderLibrary.get("copy_fragment.glsl"));
};

HX.CopyTexturePass.prototype = Object.create(HX.EffectPass.prototype);

HX.CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};