import {GL} from "../core/GL";

/**
 * @classdesc
 * WriteOnlyDepthBuffer is a depth buffer that can be used with {@linkcode FrameBuffer} as a depth buffer if read-backs
 * are not required.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function WriteOnlyDepthBuffer()
{
    this._renderBuffer = GL.gl.createRenderbuffer();
    this._format = null;
}

WriteOnlyDepthBuffer.prototype = {
    /**
     * The width of the depth buffer.
     */
    get width() { return this._width; },

    /**
     * The height of the depth buffer.
     */
    get height() { return this._height; },

    /**
     * The format of the depth buffer.
     */
    get format() { return this._format; },

    /**
     * Initializes the depth buffer.
     * @param width The width of the depth buffer.
     * @param height The height of the depth buffer.
     * @param stencil Whether or not a stencil buffer is required.
     */
    init: function(width, height, stencil)
    {
        var gl = GL.gl;
        stencil = stencil === undefined? true : stencil;
        this._width = width;
        this._height = height;
        this._format = stencil? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT16;

        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, this._format, width, height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
};

export { WriteOnlyDepthBuffer };