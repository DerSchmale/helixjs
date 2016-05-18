/**
 * @constructor
 */
HX.WriteOnlyDepthBuffer = function()
{
    this._renderBuffer = HX_GL.createRenderbuffer();
    this._format = null;
};

HX.WriteOnlyDepthBuffer.prototype = {
    constructor: HX.FrameBuffer,

    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.UNSIGNED_BYTE ]
     */
    init: function(width, height, stencil)
    {
        stencil = stencil === undefined? true : stencil;
        this._width = width;
        this._height = height;
        this._format = stencil? HX_GL.DEPTH_STENCIL : HX_GL.DEPTH_COMPONENT16;

        HX_GL.bindRenderbuffer(HX_GL.RENDERBUFFER, this._renderBuffer);
        HX_GL.renderbufferStorage(HX_GL.RENDERBUFFER, this._format, width, height);
    },

    dispose: function()
    {
        HX_GL.deleteRenderBuffer(this._renderBuffer);
    }
};