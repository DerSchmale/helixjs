import { GL } from './GL.js';
import { BufferUsage } from '../Helix.js';

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function IndexBuffer()
{
    this._buffer = GL.gl.createBuffer();
}

IndexBuffer.prototype = {
    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Int16Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = BufferUsage.STATIC_DRAW;

        this.bind();
        GL.gl.bufferData(GL.gl.ELEMENT_ARRAY_BUFFER, data, usageHint);
    },

    /**
     * @private
     */
    bind: function()
    {
        GL.gl.bindBuffer(GL.gl.ELEMENT_ARRAY_BUFFER, this._buffer);
    }
};

export { IndexBuffer };