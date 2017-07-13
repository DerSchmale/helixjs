import { GL } from './GL.js';

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
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

    /**
     * @private
     */
    bind: function()
    {
        GL.gl.bindBuffer(GL.gl.ARRAY_BUFFER, this._buffer);
    }
};

export { VertexBuffer };