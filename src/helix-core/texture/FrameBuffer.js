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

    this._fbo = HX_GL.createFramebuffer();
};

HX.FrameBuffer.prototype = {
    constructor: HX.FrameBuffer,

    get width() { return this._width; },
    get height() { return this._height; },

    /**
     *
     * @param width
     * @param height
     * @param formats An Array of formats for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.RGBA ]
     * @param dataTypes An Array of data types for each color buffer. If only one provided, it will be used for all. Defaults to [ HX_GL.UNSIGNED_BYTE ]
     */
    init: function()
    {
        HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, this._fbo);

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
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, HX.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, HX_GL.TEXTURE_2D, texture._texture, 0);
            else
            // try using default (will only work for 1 color texture tho)
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, HX_GL.COLOR_ATTACHMENT0 + i, HX_GL.TEXTURE_2D, texture._texture, 0);
        }


        if (this._depthBuffer) {
            if (this._depthBuffer instanceof HX.Texture2D) {
                HX_GL.framebufferTexture2D(HX_GL.FRAMEBUFFER, HX_GL.DEPTH_STENCIL_ATTACHMENT, HX_GL.TEXTURE_2D, this._depthBuffer._texture, 0);
            }
            else {
                HX_GL.bindRenderbuffer(HX_GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
                HX_GL.framebufferRenderbuffer(HX_GL.FRAMEBUFFER, HX_GL.DEPTH_STENCIL_ATTACHMENT, HX_GL.RENDERBUFFER, this._depthBuffer._renderBuffer);
            }
        }

        var status = HX_GL.checkFramebufferStatus(HX_GL.FRAMEBUFFER);

        switch (status) {
            case HX_GL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case HX_GL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case HX_GL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case HX_GL.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
        }
    },

    dispose: function()
    {
        HX_GL.deleteFramebuffer(this._fbo);
    }
};