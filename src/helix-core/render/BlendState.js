import { BlendFactor, BlendOperation } from "../Helix";

/**
 * @classdesc
 * BlendState defines the blend mode the renderer should use. Default presets include BlendState.ALPHA, BlendState.ADD
 * and BlendState.MULTIPLY.
 *
 * @param srcFactor The source blend factor.
 * @param dstFactor The destination blend factor.
 * @param operator The blend operator.
 * @param color The blend color.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BlendState(srcFactor, dstFactor, operator, color)
{
    /**
     * Defines whether blending is enabled.
     */
    this.enabled = true;

    /**
     * The source blend factor.
     * @see {@linkcode BlendFactor}
     */
    this.srcFactor = srcFactor || BlendFactor.ONE;

    /**
     * The destination blend factor.
     * @see {@linkcode BlendFactor}
     */
    this.dstFactor = dstFactor || BlendFactor.ZERO;

    /**
     * The blend operator.
     * @see {@linkcode BlendOperation}
     */
    this.operator = operator || BlendOperation.ADD;

    /**
     * The source blend factor for the alpha.
     * @see {@linkcode BlendFactor}
     */
    this.alphaSrcFactor = null;

    /**
     * The source blend factor for the alpha.
     * @see {@linkcode BlendFactor}
     */
    this.alphaDstFactor = null;

    /**
     * The blend operator for the alpha.
     * @see {@linkcode BlendOperation}
     */
    this.alphaOperator = null;

    /**
     * The blend color.
     * @see {@linkcode Color}
     */
    this.color = color || null;
}

BlendState.prototype = {
    /**
     * Creates a copy of this BlendState.
     */
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
    BlendState.ALPHA.alphaSrcFactor = BlendFactor.ONE;
    BlendState.ALPHA.alphaDstFactor = BlendFactor.ONE_MINUS_SOURCE_ALPHA;
    BlendState.INV_ALPHA = new BlendState(BlendFactor.ONE_MINUS_SOURCE_ALPHA, BlendFactor.SOURCE_ALPHA);
};

export { BlendState };