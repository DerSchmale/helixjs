HX.FBXLoader =
{
    load: function (filename, onComplete, onFail)
    {
        var fbxParser = new HX.FBXParser();
        var groupNode = new HX.GroupNode();

        var urlLoader = new HX.URLLoader();
        urlLoader.type = HX.URLLoader.DATA_BINARY;

        urlLoader.onComplete = function (data)
        {
            fbxParser.parse(data, groupNode, onComplete, onFail);
        };

        urlLoader.onError = function (code)
        {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (onFail) onFail(code);
        };

        urlLoader.load(filename);

        return groupNode;
    }
};

/**
 *
 * @constructor
 */
HX.FBXParser = function()
{
    this._version = null;
    this._nodes = [];
};

HX.FBXParser.prototype =
{
    parse: function(data, target, onComplete, onFail)
    {
        var time = Date.now();
        this._data = new HX.DataStream(data);

        if (!this._verifyHeader()) {
            console.log("Incorrect FBX header");
            if (onFail) onFail();
            return;
        }

        if (this._data.getUint16() !== 0x001a)
            console.log("Suspected oddity with FBX file");

        this._version = this._data.getUint32();
        console.log("FBX version " + this._version);

        var node;
        do {
            node = this._parseNode();
            this._nodes.push(node);
        } while (node);

        console.log("Parsing complete in " + (Date.now() - time) + "ms");
    },

    _verifyHeader: function()
    {
        return this._data.getString(21) === "Kaydara FBX Binary  \0";
    },

    _parseNode: function()
    {
        var data = this._data;
        var endOffset = data.getUint32();
        var numProperties = data.getUint32();
        var propertyListLen = data.getUint32();
        var nameLen = data.getUint8();

        if (endOffset === 0) {
            if (numProperties !== 0 || propertyListLen !== 0 || nameLen !== 0) throw "Invalid null node!";
            return null;
        }

        var record = new HX.FBXParser.NodeRecord();
        record.name = data.getString(nameLen);

        for (var i = 0; i < numProperties; ++i) {
            var prop = this._parseProperty();
            record.properties.push(prop);
        }

        // there's more data, must contain child nodes (terminated by null node)
        if (data.offset != endOffset) {
            var node;
            do {
                node = this._parseNode();
                if (node) record.children.push(node);
            }
            while (node);
        }

        return record;
    },

    _parseProperty: function()
    {
        var prop = new HX.FBXParser.Property();
        prop.typeCode = this._data.getChar();

        switch (prop.typeCode) {
            case HX.FBXParser.Property.BOOLEAN:
                prop.data = this._data.getUint8();
                break;
            case HX.FBXParser.Property.INT16:
                prop.data = this._data.getInt16();
                break;
            case HX.FBXParser.Property.INT32:
                prop.data = this._data.getInt32();
                break;
            case HX.FBXParser.Property.INT64:
                // not sure what to do with this eventually
                //throw "Unsupported INT64 datatype encountered";
                prop.data = {
                    L: this._data.getInt32(),
                    U: this._data.getInt32()
                };
                break;
            case HX.FBXParser.Property.FLOAT:
                prop.data = this._data.getFloat32();
                break;
            case HX.FBXParser.Property.DOUBLE:
                prop.data = this._data.getFloat64();
                break;
            case HX.FBXParser.Property.STRING:
                var len = this._data.getUint32();
                prop.data = this._data.getString(len);
                break;
            case HX.FBXParser.Property.RAW:
                var len = this._data.getUint32();
                prop.data = this._data.getUint8Array(len);
                break;
            default:
                prop.data = this._parseArray(prop.typeCode);
        }
        return prop;
    },

    _parseArray: function(type)
    {
        var len = this._data.getUint32();
        var encoding = this._data.getUint32();
        var compressedLength = this._data.getUint32();

        if (encoding === 0) {
            switch (type) {
                case HX.FBXParser.Property.BOOLEAN_ARRAY:
                    return this._data.getUint8Array(len);
                case HX.FBXParser.Property.INT32_ARRAY:
                    return this._data.getInt32Array(len);
                case HX.FBXParser.Property.INT64_ARRAY:
                    // not sure what to do with this eventually
                    return this._data.getInt32Array(len * 2);
                    break;
                case HX.FBXParser.Property.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case HX.FBXParser.Property.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
                default:
                    throw "Unknown data type code " + type;
            }
        }
        else {
            var data = this._data.getUint8Array(compressedLength);
            data = new ArrayBuffer(RawDeflate.inflate(data));

            switch (type) {
                case HX.FBXParser.Property.BOOLEAN_ARRAY:
                    return new Uint8Array(data);
                case HX.FBXParser.Property.INT32_ARRAY:
                    return new Int32Array(data);
                case HX.FBXParser.Property.INT64_ARRAY:
                    // INCORRECT
                    return new Int32Array(data);
                    break;
                case HX.FBXParser.Property.FLOAT_ARRAY:
                    return new Float32Array(data);
                    break;
                case HX.FBXParser.Property.DOUBLE_ARRAY:
                    return new Float64Array(len);
                    break;
                default:
                    throw "Unknown data type code " + type;
            }
        }
    }
};

HX.FBXParser.NodeRecord = function()
{
    this.name = "";
    this.properties = [];
    this.children = [];
};

HX.FBXParser.Property = function()
{
    this.typeCode = null;
    this.data = null;
};


HX.FBXParser.Property.INT16 = "Y";
HX.FBXParser.Property.BOOLEAN = "C";
HX.FBXParser.Property.INT32 = "I";
HX.FBXParser.Property.FLOAT = "F";
HX.FBXParser.Property.DOUBLE = "D";
HX.FBXParser.Property.INT64 = "L";

HX.FBXParser.Property.BOOLEAN_ARRAY = "b";
HX.FBXParser.Property.INT32_ARRAY = "i";
HX.FBXParser.Property.FLOAT_ARRAY = "f";
HX.FBXParser.Property.DOUBLE_ARRAY = "d";
HX.FBXParser.Property.INT64_ARRAY = "l";

HX.FBXParser.Property.STRING = "S";
HX.FBXParser.Property.RAW = "R";