/**
 *
 * @constructor
 */
HX.MultiPassRenderer = function()
{
    HX.ScreenRenderer.call(this);
};

HX.MultiPassRenderer.prototype = Object.create(HX.ScreenRenderer.prototype);

HX.MultiPassRenderer.prototype._updateGBufferFBO = function()
{

};

HX.MultiPassRenderer.prototype._renderToGBuffer = function()
{
    var clearMask = HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT;
    var passIndices = [ HX.MaterialPass.GEOMETRY_COLOR_PASS, HX.MaterialPass.GEOMETRY_NORMAL_PASS, HX.MaterialPass.GEOMETRY_SPECULAR_PASS];

    for (var i = 0; i < 3; ++i) {
        HX.setRenderTarget(this._gbufferSingleFBOs[i]);
        HX.GL.clear(clearMask);
        this._renderPass(passIndices[i]);

        if (i == 0) {
            clearMask = HX.GL.COLOR_BUFFER_BIT;
            // important to use the same clip space calculations for all!
            HX.GL.depthFunc(HX.GL.EQUAL);
        }
    }
};

HX.MultiPassRenderer.prototype._createGBufferFBO = function() {};