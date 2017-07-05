import {FBXRecord} from "./FBXRecord";

import * as pako from "pako";

// Could also create an ASCII deserializer
function FBXBinaryDeserializer()
{
    this._version = 0;
}

FBXBinaryDeserializer.prototype =
{
    get version() { return this._version },

    deserialize: function(dataStream)
    {
        this._data = dataStream;
        this._verifyHeader();

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();

        var root = new FBXRecord();
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

        var record = new FBXRecord();
        record.name = data.getString(nameLen);

        console.log(record.name);

        for (var i = 0; i < numProperties; ++i) {
            var dataElm = this._parseDataElement();
            record.data.push(dataElm);
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset !== endOffset) {
            this._deserializeNode(record);
        }

        return record;
    },

    _parseDataElement: function()
    {
        var typeCode = this._data.getChar();

        switch (typeCode) {
            case FBXBinaryDeserializer.BOOLEAN:
                return this._data.getUint8();
                break;
            case FBXBinaryDeserializer.INT16:
                return this._data.getInt16();
                break;
            case FBXBinaryDeserializer.INT32:
                return this._data.getInt32();
                break;
            case FBXBinaryDeserializer.INT64:
                // just concatenating strings, since they're only used for ids
                return this._data.getInt64AsFloat64();
                break;
            case FBXBinaryDeserializer.FLOAT:
                return this._data.getFloat32();
                break;
            case FBXBinaryDeserializer.DOUBLE:
                return this._data.getFloat64();
                break;
            case FBXBinaryDeserializer.STRING:
                var len = this._data.getUint32();
                if (len === 0) return "";
                return this._data.getString(len);
                break;
            case FBXBinaryDeserializer.RAW:
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
                case FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case FBXBinaryDeserializer.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case FBXBinaryDeserializer.INT64_ARRAY:
                    return this._data.getInt64AsFloat64Array(len);
                    break;
                case FBXBinaryDeserializer.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else if (encoding === 1) {
            var data = this._data.getUint8Array(compressedLength);

            data = pako.inflate(data).buffer;

            switch (type) {
                case FBXBinaryDeserializer.BOOLEAN_ARRAY:
                    return new Uint8Array(data);
                case FBXBinaryDeserializer.INT32_ARRAY:
                    return new Int32Array(data);
                case FBXBinaryDeserializer.INT64_ARRAY:
                    data = new HX.DataStream(new DataView(data));
                    return data.getInt64AsFloat64Array(data.byteLength / 8);
                case FBXBinaryDeserializer.FLOAT_ARRAY:
                    return new Float32Array(data);
                case FBXBinaryDeserializer.DOUBLE_ARRAY:
                    return new Float64Array(data);
                default:
                    throw new Error("Unknown data type code " + type);
            }
        }
        else
            throw new Error("Invalid encoding value " + encoding);
    }
};

FBXBinaryDeserializer.INT16 = "Y";
FBXBinaryDeserializer.BOOLEAN = "C";
FBXBinaryDeserializer.INT32 = "I";
FBXBinaryDeserializer.FLOAT = "F";
FBXBinaryDeserializer.DOUBLE = "D";
FBXBinaryDeserializer.INT64 = "L";

FBXBinaryDeserializer.BOOLEAN_ARRAY = "b";
FBXBinaryDeserializer.INT32_ARRAY = "i";
FBXBinaryDeserializer.FLOAT_ARRAY = "f";
FBXBinaryDeserializer.DOUBLE_ARRAY = "d";
FBXBinaryDeserializer.INT64_ARRAY = "l";

FBXBinaryDeserializer.STRING = "S";
FBXBinaryDeserializer.RAW = "R";

export { FBXBinaryDeserializer };