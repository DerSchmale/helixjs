import {GL} from "../core/GL";

/**
 * @constructor
 */
function WriteOnlyDepthBuffer()
{
    this._renderBuffer = GL.gl.createRenderbuffer();
    this._format = null;
}

WriteOnlyDepthBuffer.prototype = {
    get width() { return this._width; },
    get height() { return this._height; },
    get format() { return this._format; },

    init: function(width, height, stencil)
    {
        var gl = GL.gl;
        stencil = stencil === undefined? true : stencil;
        this._width = width;
        this._height = height;
        this._format = stencil? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT16;

        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, this._format, width, height);
    },

    dispose: function()
    {
        GL.gl.deleteRenderBuffer(this._renderBuffer);
    }
};

export { WriteOnlyDepthBuffer };