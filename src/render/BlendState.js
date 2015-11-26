HX.BlendState = function(srcFactor, dstFactor, operator, color)
{
    this.enabled = true;
    this.srcFactor = srcFactor || HX.BlendFactor.ONE;
    this.dstFactor = dstFactor || HX.BlendFactor.ZERO;
    this.operator = operator || HX.BlendOperation.ADD;
    this.color = color || null;
};

HX.BlendState._initDefaults = function()
{
    HX.BlendState.ADD = new HX.BlendState(HX.BlendFactor.ONE, HX.BlendFactor.ONE);
    HX.BlendState.ADD_WITH_ALPHA = new HX.BlendState(HX.BlendFactor.SOURCE_ALPHA, HX.BlendFactor.ONE);
    HX.BlendState.MULTIPLY = new HX.BlendState(HX.BlendFactor.ZERO, HX.BlendFactor.SOURCE_COLOR);
    HX.BlendState.ALPHA = new HX.BlendState(HX.BlendFactor.SOURCE_ALPHA, HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA);
    HX.BlendState.INV_ALPHA = new HX.BlendState(HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA, HX.BlendFactor.SOURCE_ALPHA);
}