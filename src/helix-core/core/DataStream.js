HX.DataStream = function(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = HX.DataStream.LITTLE_ENDIAN;
};

HX.DataStream.LITTLE_ENDIAN = true;
HX.DataStream.BIG_ENDIAN = false;

HX.DataStream.prototype =
{
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    get endian() { return this._endian; },
    set endian(value) { this._endian = value; },

    get byteLength () { return this._dataView.byteLength; },

    getChar: function()
    {
        return String.fromCharCode(this.getUint8());
    },

    getUint8: function()
    {
        return this._dataView.getUint8(this._offset++);
    },

    getUint16: function()
    {
        var data = this._dataView.getUint16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    getUint32: function()
    {
        var data = this._dataView.getUint32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    getInt8: function()
    {
        return this._dataView.getInt8(this._offset++);
    },

    getInt16: function()
    {
        var data = this._dataView.getInt16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    getInt32: function()
    {
        var data = this._dataView.getInt32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    // dangerous, but might be an okay approximation
    getInt64AsFloat64: function()
    {
        var L, B;
        if (this._endian === HX.DataStream.LITTLE_ENDIAN) {
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

    getFloat32: function()
    {
        var data = this._dataView.getFloat32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    getFloat64: function()
    {
        var data = this._dataView.getFloat64(this._offset, this._endian);
        this._offset += 8;
        return data;
    },

    getArray: function(len)
    {
        return this._readArray(len, Array, this.getUint8);
    },

    getUint8Array: function(len)
    {
        return this._readArray(len, Uint8Array, this.getUint8);
    },

    getUint16Array: function(len)
    {
        return this._readArray(len, Uint16Array, this.getUint16);
    },

    getUint32Array: function(len)
    {
        return this._readArray(len, Uint32Array, this.getUint32);
    },

    getInt8Array: function(len)
    {
        return this._readArray(len, Int8Array, this.getInt8);
    },

    getInt16Array: function(len)
    {
        return this._readArray(len, Int16Array, this.getInt16);
    },

    getInt32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getInt32);
    },

    getInt64AsFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getInt64AsFloat64);
    },

    getFloat32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getFloat32);
    },

    getFloat64Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getFloat64);
    },

    getString: function(len)
    {
        var str = "";

        for (var i = 0; i < len; ++i)
            str = str + this.getChar();

        return str;
    },

    _readArray: function(len, arrayType, func)
    {
        var arr = new arrayType(len);

        for (var i = 0; i < len; ++i)
            arr[i] = func.call(this);

        return arr;
    }
};