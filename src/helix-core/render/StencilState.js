import { Comparison, StencilOp } from "../Helix";

export function StencilState(reference, comparison, onStencilFail, onDepthFail, onPass, readMask, writeMask)
{
    this.enabled = true;
    this.reference = reference || 0;
    this.comparison = comparison || Comparison.ALWAYS;
    this.onStencilFail = onStencilFail || StencilOp.KEEP;
    this.onDepthFail = onDepthFail || StencilOp.KEEP;
    this.onPass = onPass || StencilOp.KEEP;
    this.readMask = readMask === undefined || readMask === null? 0xffffffff : readMask;
    this.writeMask = writeMask === undefined || writeMask === null? 0xffffffff: writeMask;
}