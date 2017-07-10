import { BlendFactor, BlendOperation } from "../Helix";

function BlendState(srcFactor, dstFactor, operator, color)
{
    this.enabled = true;
    this.srcFactor = srcFactor || BlendFactor.ONE;
    this.dstFactor = dstFactor || BlendFactor.ZERO;
    this.operator = operator || BlendOperation.ADD;
    this.color = color || null;
}

BlendState.prototype = {
    clone: function() {
        return new BlendState(this.srcFactor, this.dstFactor, this.operator, this.color);
    }
};

BlendState._initDefaults = function()
{
    BlendState.ADD = new BlendState(BlendFactor.SOURCE_ALPHA, BlendFactor.ONE);
    BlendState.ADD_NO_ALPHA = new BlendState(BlendFactor.ONE, BlendFactor.ONE);
    BlendState.MULTIPLY = new BlendState(BlendFactor.DESTINATION_COLOR, BlendFactor.ZERO);
    BlendState.ALPHA = new BlendState(BlendFactor.SOURCE_ALPHA, BlendFactor.ONE_MINUS_SOURCE_ALPHA);
    BlendState.INV_ALPHA = new BlendState(BlendFactor.ONE_MINUS_SOURCE_ALPHA, BlendFactor.SOURCE_ALPHA);
};

export { BlendState };