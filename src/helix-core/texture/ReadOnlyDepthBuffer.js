/**
 * @constructor
 */
HX.ReadOnlyDepthBuffer = function()
{
    this._renderBuffer = HX_GL.createRenderbuffer();
};

HX.ReadOnlyDepthBuffer.prototype = {
    constructor: HX.FrameBuffer,

    width: function() { return this._width; },
    height: function() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.UNSIGNED_BYTE ]
     */
    init: function(width, height)
    {
        this._width = width;
        this._height = height;

        HX_GL.bindRenderbuffer(HX_GL.RENDERBUFFER, this._renderBuffer);
        HX_GL.renderbufferStorage(HX_GL.RENDERBUFFER, HX_GL.DEPTH_STENCIL, width, height);
    },

    dispose: function()
    {
        HX_GL.deleteRenderBuffer(this._renderBuffer);
    }
};