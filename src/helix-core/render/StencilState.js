HX.StencilState = function(reference, comparison, onStencilFail, onDepthFail, onPass, readMask, writeMask)
{
    this.enabled = true;
    this.reference = reference || 0;
    this.comparison = comparison || HX.Comparison.ALWAYS;
    this.onStencilFail = onStencilFail || HX.StencilOp.KEEP;
    this.onDepthFail = onDepthFail || HX.StencilOp.KEEP;
    this.onPass = onPass || HX.StencilOp.KEEP;
    this.readMask = readMask === undefined || readMask === null? 0xffffffff : readMask;
    this.writeMask = writeMask === undefined || writeMask === null? 0xffffffff: writeMask;
};