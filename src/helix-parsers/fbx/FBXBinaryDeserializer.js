// Could also create an ASCII deserializer
HX.FBXBinaryDeserializer = function()
{
    this._version = 0;
};

HX.FBXBinaryDeserializer.prototype =
{
    get version() { return this._version },

    deserialize: function(dataStream)
    {
        this._data = dataStream;

        this._verifyHeader();

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();

        var root = new HX.FBXRecord();
        root.name = "[root]";
        this._deserializeNode(root);
        return root;
    },

    _verifyHeader: function()
    {
        if (this._data.getString(21) !== "Kaydara FBX Binary  \0")
            throw new Error("Incorrect FBX file header!");
    },

    _deserializeNode: function(parent)
    {
        var node;
        do {
            node = this._importNode();
            if (node) parent.children.push(node);
        } while (node);
    },

    _importNode: function()
    {
        var data = this._data;
        var endOffset = data.getUint32();
        var numProperties = data.getUint32();
        var propertyListLen = data.getUint32();
        var nameLen = data.getUint8();

        if (endOffset === 0) {
            if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0)
                throw new Error("Invalid null node!");
            return null;
        }

        var record = new HX.FBXRecord();
        record.name = data.getString(nameLen);

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset !== endOffset)
            this._deserializeNode(record);

        return record;
    },

    _parseDataElement: function()
    {
        var typeCode = this._data.getChar();

        switch (typeCode) {
            case HX.FBXBinaryDeserializer.BOOLEAN:
                return this._data.getUint8();
                break;
            case HX.FBXBinaryDeserializer.INT16:
                return this._data.getInt16();
                break;
            case HX.FBXBinaryDeserializer.INT32:
                return this._data.getInt32();
                break;
            case HX.FBXBinaryDeserializer.INT64:
                // just concatenating strings, since they're only used for ids
                return this._data.getInt32() + "" + this._data.getInt32();
                break;
            case HX.FBXBinaryDeserializer.FLOAT:
                return this._data.getFloat32();
                break;
            case HX.FBXBinaryDeserializer.DOUBLE:
                return this._data.getFloat64();
                break;
            case HX.FBXBinaryDeserializer.STRING:
                var len = this._data.getUint32();
                return this._data.getString(len);
                break;
            case HX.FBXBinaryDeserializer.RAW:
                var len = this._data.getUint32();
                return this._data.getUint8Array(len);
                break;
            default:
                return this._parseArray(typeCode);
        }
    },

    _parseArray: function(type)
    {
        var len = this._data.getUint32();
        var encoding = this._data.getUint32();
        var compressedLength = this._data.getUint32();

        if (encoding === 0) {
            switch (type) {
                case HX.FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case HX.FBXBinaryDeserializer.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case HX.FBXBinaryDeserializer.INT64_ARRAY:
                    // not sure what to do with this eventually
                    return this._data.getInt32Array(len * 2);
                    break;
                case HX.FBXBinaryDeserializer.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case HX.FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else {
            var data = this._data.getUint8Array(compressedLength);
            data = pako.inflate(data).buffer;

            switch (type) {
                case HX.FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return new Uint8Array(data.buffer);
                case HX.FBXBinaryDeserializer.INT32_ARRAY:
                    return new Int32Array(data);
                case HX.FBXBinaryDeserializer.INT64_ARRAY:
                    // INCORRECT
                    return new Int32Array(data);
                case HX.FBXBinaryDeserializer.FLOAT_ARRAY:
                    return new Float32Array(data);
                case HX.FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return new Float64Array(data);
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
    }
};

HX.FBXBinaryDeserializer.INT16 = "Y";
HX.FBXBinaryDeserializer.BOOLEAN = "C";
HX.FBXBinaryDeserializer.INT32 = "I";
HX.FBXBinaryDeserializer.FLOAT = "F";
HX.FBXBinaryDeserializer.DOUBLE = "D";
HX.FBXBinaryDeserializer.INT64 = "L";

HX.FBXBinaryDeserializer.BOOLEAN_ARRAY = "b";
HX.FBXBinaryDeserializer.INT32_ARRAY = "i";
HX.FBXBinaryDeserializer.FLOAT_ARRAY = "f";
HX.FBXBinaryDeserializer.DOUBLE_ARRAY = "d";
HX.FBXBinaryDeserializer.INT64_ARRAY = "l";

HX.FBXBinaryDeserializer.STRING = "S";
HX.FBXBinaryDeserializer.RAW = "R";