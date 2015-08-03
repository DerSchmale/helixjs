/**
 * @constructor
 */
HX.FrameBuffer = function(colorTextures, depthBuffer)
{
    if (colorTextures && colorTextures[0] === undefined) colorTextures = [ colorTextures ];

    this._colorTextures = colorTextures;
    this._numColorTextures = this._colorTextures? this._colorTextures.length : 0;
    this._depthBuffer = depthBuffer;

    if (this._colorTextures && this._numColorTextures > 1) {

        this._drawBuffers = new Array(this._numColorTextures);
        for (var i = 0; i < this._numColorTextures; ++i) {
            this._drawBuffers[i] = HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i;
        }
    }
    else {
        this._drawBuffers = null;
    }

    this._fbo = HX.GL.createFramebuffer();
};

HX.FrameBuffer.prototype = {
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
    init: function()
    {
        HX.setRenderTarget(this);

        if (this._colorTextures) {
            this._width = this._colorTextures[0]._width;
            this._height = this._colorTextures[0]._height;
        }
        else  {
            this._width = this._depthBuffer._width;
            this._height = this._depthBuffer._height;
        }

        for (var i = 0; i < this._numColorTextures; ++i) {
            var texture = this._colorTextures[i];

            if (HX.EXT_DRAW_BUFFERS)
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, HX.GL.TEXTURE_2D, texture._texture, 0);
            else
            // try using default (will only work for 1 color texture tho)
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.GL.COLOR_ATTACHMENT0 + i, HX.GL.TEXTURE_2D, texture._texture, 0);
        }


        if (this._depthBuffer) {
            if (this._depthBuffer instanceof HX.Texture2D) {
                HX.GL.framebufferTexture2D(HX.GL.FRAMEBUFFER, HX.GL.DEPTH_STENCIL_ATTACHMENT, HX.GL.TEXTURE_2D, this._depthBuffer._texture, 0);
            }
            else {
                HX.GL.bindRenderbuffer(HX.GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
                HX.GL.framebufferRenderbuffer(HX.GL.FRAMEBUFFER, HX.GL.DEPTH_STENCIL_ATTACHMENT, HX.GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
            }
        }

        var status = HX.GL.checkFramebufferStatus(HX.GL.FRAMEBUFFER);

        switch (status) {
            case HX.GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case HX.GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case HX.GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case HX.GL.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
        }

        HX.setRenderTarget(null);
    },

    dispose: function()
    {
        HX.GL.deleteFramebuffer(this._fbo);
    }
};