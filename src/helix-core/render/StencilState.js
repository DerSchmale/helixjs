import { Comparison, StencilOp } from "../Helix";

/**
 * @classdesc
 * StencilState defines the stencil mode the renderer should use.
 * @param reference The stencil reference value.
 * @param comparison The stencil comparison.
 * @param onStencilFail The operation to use when the stencil test fails.
 * @param onDepthFail The operation to use when the depth test fails.
 * @param onPass The operation to use when both tests succeed.
 * @param readMask The stencil read mask.
 * @param writeMask The stencil write mask.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
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