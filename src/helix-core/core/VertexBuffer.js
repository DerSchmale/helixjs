import { GL } from './GL.js';

/**
 *
 * @constructor
 */
function VertexBuffer()
{
    this._buffer = GL.gl.createBuffer();
}

VertexBuffer.prototype = {

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Float32Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = GL.gl.STATIC_DRAW;

        this.bind();
        GL.gl.bufferData(GL.gl.ARRAY_BUFFER, data, usageHint);
    },

    dispose: function()
    {
        if (this._buffer) {
            GL.gl.deleteBuffer(this._buffer);
            this._buffer = 0;
        }
    },

    /**
     * @private
     */
    bind: function()
    {
        GL.gl.bindBuffer(GL.gl.ARRAY_BUFFER, this._buffer);
    }
};

export { VertexBuffer };