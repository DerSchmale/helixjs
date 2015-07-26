HX.FXAA = function()
{
    HX.Effect.call(this);

    this.addPass(new HX.EffectPass(null, HX.ShaderLibrary.get("fxaa_fragment.glsl")));
    this.setUniform("edgeThreshold", 1/8);
    this.setUniform("edgeThresholdMin", 1/16);
    this.setUniform("edgeSharpness", 4.0);
};

HX.FXAA.prototype = Object.create(HX.Effect.prototype);