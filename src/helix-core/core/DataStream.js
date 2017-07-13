/**
 * @classdesc
 * DataStream is a wrapper for DataView which allows reading the data as a linear stream of data.
 * @param dataView the DataView object to read from.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DataStream(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = DataStream.LITTLE_ENDIAN;
}

/**
 * Little Endian encoding
 */
DataStream.LITTLE_ENDIAN = true;

/**
 * Big Endian encoding
 */
DataStream.BIG_ENDIAN = false;

DataStream.prototype =
{
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

    /**
     * Reads a single 8-bit string character from the stream.
     */
    getChar: function()
    {
        return String.fromCharCode(this.getUint8());
    },

    /**
     * Reads a single unsigned byte integer from the string.
     */
    getUint8: function()
    {
        return this._dataView.getUint8(this._offset++);
    },

    /**
     * Reads a single unsigned short integer from the string.
     */
    getUint16: function()
    {
        var data = this._dataView.getUint16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    /**
     * Reads a single unsigned 32-bit integer from the string.
     */
    getUint32: function()
    {
        var data = this._dataView.getUint32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a single signed byte integer from the string.
     */
    getInt8: function()
    {
        return this._dataView.getInt8(this._offset++);
    },

    /**
     * Reads a single signed short integer from the string.
     */
    getInt16: function()
    {
        var data = this._dataView.getInt16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    /**
     * Reads a single 32 bit integer from the string.
     */
    getInt32: function()
    {
        var data = this._dataView.getInt32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a 64-bit integer and stores it in a Number. The read value is not necessarily the same as what's stored, but
     * may provide an acceptable approximation.
     */
    getInt64AsFloat64: function()
    {
        var L, B;
        if (this._endian === DataStream.LITTLE_ENDIAN) {
            L = this._dataView.getUint32(this._offset, this._endian);
            B = this._dataView.getInt32(this._offset + 4, this._endian);
        }
        else {
            B = this._dataView.getInt32(this._offset, this._endian);
            L = this._dataView.getUint32(this._offset + 4, this._endian);
        }
        this._offset += 8;
        return L + B * 4294967296.0;
    },

    /**
     * Reads a single float.
     */
    getFloat32: function()
    {
        var data = this._dataView.getFloat32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a double float.
     */
    getFloat64: function()
    {
        var data = this._dataView.getFloat64(this._offset, this._endian);
        this._offset += 8;
        return data;
    },

    /**
     * Reads an array of unsigned bytes.
     *
     * @param len The amount of elements to read.
     */
    getUint8Array: function(len)
    {
        return this._readArray(len, Uint8Array, this.getUint8);
    },

    /**
     * Reads an array of unsigned shorts.
     *
     * @param len The amount of elements to read.
     */
    getUint16Array: function(len)
    {
        return this._readArray(len, Uint16Array, this.getUint16);
    },

    /**
     * Reads an array of unsigned 32-bit integers.
     *
     * @param len The amount of elements to read.
     */
    getUint32Array: function(len)
    {
        return this._readArray(len, Uint32Array, this.getUint32);
    },

    /**
     * Reads an array of signed bytes.
     *
     * @param len The amount of elements to read.
     */
    getInt8Array: function(len)
    {
        return this._readArray(len, Int8Array, this.getInt8);
    },

    /**
     * Reads an array of signed shorts.
     *
     * @param len The amount of elements to read.
     */
    getInt16Array: function(len)
    {
        return this._readArray(len, Int16Array, this.getInt16);
    },

    /**
     * Reads an array of signed 32-bit integers.
     *
     * @param len The amount of elements to read.
     */
    getInt32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getInt32);
    },

    /**
     * Reads an array of 64-bit integers into floats.
     *
     * @param len The amount of elements to read.
     */
    getInt64AsFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getInt64AsFloat64);
    },

    /**
     * Reads an array of single floats.
     *
     * @param len The amount of elements to read.
     */
    getFloat32Array: function(len)
    {
        return this._readArray(len, Float32Array, this.getFloat32);
    },

    /**
     * Reads an array of double floats.
     *
     * @param len The amount of elements to read.
     */
    getFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getFloat64);
    },

    /**
     * Reads a string.
     *
     * @param [len] The amount of characters in the string. If omitted, it reads until (and including) it encounters a "\0" character.
     */
    getString: function(len)
    {
        if (!len) return this._get0String();

        var str = "";

        for (var i = 0; i < len; ++i)
            str += this.getChar();

        return str;
    },

    /**
     * @ignore
     */
    _get0String: function()
    {
        var str = "";

        do {
            var ch = this.getUint8();
            if (ch) str += String.fromCharCode(ch);
        } while (ch !== 0);

        return str;
    },

    /**
     * @ignore
     */
    _readArray: function(len, arrayType, func)
    {
        var arr = new arrayType(len);

        for (var i = 0; i < len; ++i)
            arr[i] = func.call(this);

        return arr;
    }
};

export { DataStream };