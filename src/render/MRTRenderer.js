/**
 *
 * @constructor
 */
HX.MRTRenderer = function()
{
    HX.ScreenRenderer.call(this);
};

HX.MRTRenderer.prototype = Object.create(HX.ScreenRenderer.prototype);

HX.MRTRenderer.prototype._renderToGBuffer = function()
{
    HX.setRenderTarget(this._gbufferFBO);
    HX.clear();
    this._renderPass(HX.MaterialPass.GEOMETRY_PASS);
};

HX.MRTRenderer.prototype._createGBufferFBO = function()
{
    var targets = [ this._gbuffer[0], this._gbuffer[1], this._gbuffer[2] ];
    this._gbufferFBO = new HX.FrameBuffer(targets, HX.FrameBuffer.DEPTH_MODE_READ_WRITE, this._depthBuffer);
};

HX.MRTRenderer.prototype._updateGBufferFBO = function ()
{
    this._gbufferFBO.init();
};

HX.MRTRenderer.prototype.dispose = function()
{
    this._gbufferFBO.dispose();

    HX.ScreenRenderer.prototype.dispose.call(this);
};