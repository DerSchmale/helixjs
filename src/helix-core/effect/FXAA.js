HX.FXAA = function()
{
    HX.Effect.call(this);

    this._pass = new HX.EffectPass(null, HX.ShaderLibrary.get("fxaa_fragment.glsl"));
    this._pass.setUniform("edgeThreshold", 1/8);
    this._pass.setUniform("edgeThresholdMin", 1/16);
    this._pass.setUniform("edgeSharpness", 4.0);
};

HX.FXAA.prototype = Object.create(HX.Effect.prototype);

HX.FXAA.prototype.draw = function(dt)
{
    this._swapHDRBuffers();
    this._drawPass(this._pass);
};