HX.DataStream = function(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
};

HX.DataStream.prototype =
{
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    getChar: function()
    {
        return String.fromCharCode(this.getUint8());
    },

    getUint8: function()
    {
        this._dataView.getUint8(this._offset++);
    },

    getUint16: function()
    {
        this._dataView.getUint16(this._offset);
        this._offset += 2;
    },

    getUint32: function()
    {
        this._dataView.getUint32(this._offset);
        this._offset += 4;
    },

    getInt8: function()
    {
        this._dataView.getInt8(this._offset++);
    },

    getInt16: function()
    {
        this._dataView.getInt16(this._offset);
        this._offset += 2;
    },

    getInt32: function()
    {
        this._dataView.getInt32(this._offset);
        this._offset += 4;
    },

    getFloat32: function()
    {
        this._dataView.getFloat32(this._offset);
        this._offset += 4;
    },

    getFloat64: function()
    {
        this._dataView.getFloat64(this._offset);
        this._offset += 8;
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

    getFloat32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getFloat32);
    },

    getFloat64Array: function(len)
    {
        return this._readArray(len, Int64Array, this.getFloat64);
    },

    getString: function(len)
    {
        var str = "";

        for (var i = 0; i < len; ++i)
            str = str + this.getChar(this._offset);

        return str;
    },

    _readArray: function(len, arrayType, func)
    {
        var arr = new arrayType();

        for (var i = 0; i < len; ++i)
            arr[i] = func(this._offset);

        return arr;
    }
};