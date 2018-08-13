import { GL } from './GL.js';

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function UniformBuffer(size)
{
    this._buffer = GL.gl.createBuffer();
    // contains { offset, type, size }
    this._uniforms = [];
    this._size = size;
}

UniformBuffer.prototype = {
    /**
     * The size of the uniform buffer in bytes
     */
    get size() { return this._size; },

    /**
     * Uploads raw data for the buffer.
     * @param data The data to upload, must be a Float32Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        var gl = GL.gl;

        if (usageHint === undefined)
            usageHint = gl.DYNAMIC_DRAW;

        this.bind();
        gl.bufferData(gl.UNIFORM_BUFFER, data, usageHint);
    },

    registerUniform: function(name, offset, size, type)
    {
        this._uniforms[name] = {offset: offset, size: size, type: type};
    },

    getUniformOffset: function(name)
    {
        var uniform = this._uniforms[name];
        return uniform? uniform.offset : -1;
    },
    
    setUniform: function(name, data)
    {
        var gl = GL.gl;
        var uniform = this._uniforms[name];
        this.bind();

        switch(uniform.type) {
            case gl.FLOAT:
                var arr = new Float32Array(1);
                arr[0] = data;
                data = arr;
                break;
            case gl.FLOAT_VEC2:
                arr = new Float32Array(2);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                data = arr;
                break;
            case gl.FLOAT_VEC3:
                arr = new Float32Array(3);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                arr[2] = value.z || value[2] || 0;
                data = arr;
                break;
            case gl.FLOAT_VEC4:
                arr = new Float32Array(4);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                arr[2] = value.z || value[2] || 0;
                arr[3] = value.w || value[3] || 0;
                data = arr;
                break;
            case gl.INT:
            case gl.BOOL:
                arr = new Int32Array(1);
                arr[0] = value;
                data = arr;
                break;
            case gl.INT_VEC2:
            case gl.BOOL_VEC2:
                arr = new Int32Array(2);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                data = arr;
                break;
            case gl.INT_VEC3:
            case gl.BOOL_VEC3:
                arr = new Int32Array(3);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                arr[2] = value.z || value[2] || 0;
                data = arr;
                break;
            case gl.INT_VEC4:
            case gl.BOOL_VEC4:
                arr = new Int32Array(4);
                arr[0] = value.x || value[0] || 0;
                arr[1] = value.y || value[1] || 0;
                arr[2] = value.z || value[2] || 0;
                arr[3] = value.w || value[3] || 0;
                data = arr;
                break;
            case gl.FLOAT_MAT4:
                data = value;
                break;
            default:
                // expect data to be correct
        }

        // TODO: Allow setting different types
        gl.bufferSubData(gl.UNIFORM_BUFFER, uniform.offset, uniform.size, data);
    },

    // TODO: Allow setting member uniforms by name. However, getting this requires a shader to get the definition from
    // Could we create a dummy material and then just grab it from there?
    // We would need to provide a sort of MaterialPass.createUniformBuffer

    /**
     * @private
     */
    bind: function(bindingPoint)
    {
        var gl = GL.gl;

        if (bindingPoint === undefined) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, this._buffer);
        }
        else {
            gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, this._buffer);
        }
    }
};

export { UniformBuffer };