// Note: this is not in core because no exporter or stream output functionality is not essential to rendering

/**
 * @classdesc
 * DataOutputStream is a wrapper for DataView which allows writing the data as a linear stream of data.
 * @param dataView the DataView object to write to.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DataOutputStream(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = DataOutputStream.LITTLE_ENDIAN;
}

/**
 * Little Endian encoding
 */
DataOutputStream.LITTLE_ENDIAN = true;

/**
 * Big Endian encoding
 */
DataOutputStream.BIG_ENDIAN = false;

DataOutputStream.prototype = {
    /**
     * The current byte offset into the file.
     */
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    /**
     * The endianness used by the data.
     */
    get endian() { return this._endian; },
    set endian(value) { this._endian = value; },

    /**
     * The size of the data view in bytes.
     */
    get byteLength () { return this._dataView.byteLength; },

    /**
     * The amount of bytes still left in the file until EOF.
     */
    get bytesAvailable() { return this._dataView.byteLength - this._offset; },

    writeChar: function(v)
    {
        return this.writeUint8(v.charCodeAt(0));
    },

    writeUint8: function(v)
    {
        return this._dataView.setUint8(this._offset++, v);
    },

    writeUint16: function(v)
    {
        var data = this._dataView.setUint16(this._offset, v, this._endian);
        this._offset += 2;
        return data;
    },

    writeUint32: function(v)
    {
        var data = this._dataView.setUint32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeInt8: function(v)
    {
        return this._dataView.setInt8(this._offset++, v);
    },

    writeInt16: function(v)
    {
        var data = this._dataView.setInt16(this._offset, v, this._endian);
        this._offset += 2;
        return data;
    },

    writeInt32: function(v)
    {
        var data = this._dataView.setInt32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeFloat32: function(v)
    {
        var data = this._dataView.setFloat32(this._offset, v, this._endian);
        this._offset += 4;
        return data;
    },

    writeFloat64: function(v)
    {
        var data = this._dataView.setFloat64(this._offset, v, this._endian);
        this._offset += 8;
        return data;
    },

    writeString: function(v)
    {
        var len = v.length;
        for (var i = 0; i < len; ++i)
            this.writeUint8(v.charCodeAt(i));
    },

    writeUint8Array: function(v)
    {
        this._writeArray(v, this.writeUint8);
    },

    writeUint16Array: function(v)
    {
        this._writeArray(v, this.writeUint16);
    },

    writeUint32Array: function(v)
    {
        this._writeArray(v, this.writeUint32);
    },

    // I'm actually not sure why JS cares about whether or not the value is signed when writing...

    writeInt8Array: function(v)
    {
        this._writeArray(v, this.writeInt8);
    },

    writeInt16Array: function(v)
    {
        this._writeArray(v, this.writeInt16);
    },

    writeInt32Array: function(v)
    {
        this._writeArray(v, this.writeInt32);
    },

    writeFloat32Array: function(v)
    {
        this._writeArray(v, this.writeFloat32);
    },

    writeFloat64Array: function(v)
    {
        this._writeArray(v, this.writeFloat64);
    },

    /**
     * @ignore
     */
    _writeArray: function(val, func)
    {
        var len = val.length;
        for (var i = 0; i < len; ++i)
            func.call(this, val[i]);
    }
};

export { DataOutputStream };