/**
 * @constructor
 */
HX.ReadOnlyDepthBuffer = function()
{
    this._renderBuffer = HX.GL.createRenderbuffer();
};

HX.ReadOnlyDepthBuffer.prototype = {
    constructor: HX.FrameBuffer,

    width: function() { return this._width; },
    height: function() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX.GL.UNSIGNED_BYTE ]
     */
    init: function(width, height)
    {
        this._width = width;
        this._height = height;

        HX.GL.bindRenderbuffer(HX.GL.RENDERBUFFER, this._renderBuffer);
        HX.GL.renderbufferStorage(HX.GL.RENDERBUFFER, HX.GL.DEPTH_STENCIL, width, height);
    },

    dispose: function()
    {
        HX.GL.deleteRenderBuffer(this._fbo);
    }
};