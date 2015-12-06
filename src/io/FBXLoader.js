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
    this._i = 0;
    this._version = null;
    this._rootNode = null;
};

HX.FBXParser.prototype =
{
    parse: function(data, target, onComplete, onFail)
    {
        this._data = new HX.DataStream(data);

        if (!this._verifyHeader()) {
            if (this.onFail) onFail();
            return;
        }

        this._data.offset = 32;
        this._version = this._data.getUint32();
        this._i = 23;

        // TODO: recursively parse nodes
        this._rootNode = this._parseNode();
    },

    _verifyHeader: function()
    {
        return this._data.getString(21) === "Kaydara FBX Binary  ";
    },

    _parseNode: function()
    {
        var data = this._data;
        var endOffset = data.getUint32(this._i += 4);
        var numProperties = data.getUint32(this._i += 4);
        var propertyListLen = data.getUint32(this._i += 4);
        var nameLen = data.getUint8(this._i++);
        var record = new HX.FBXParser.NodeRecord();

        record.name = data.getString(nameLen);

        console.log("Record: " + record.name);

        for (var i = 0; i < numProperties; ++i)
            record.properties.push(this._parseProperty());

        return record;
    },

    _parseProperty: function()
    {
        var prop = new HX.FBXParser.Property();
        prop.typeCode = this._data.getUint8(this._i += 2);

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
                throw "Unsupported INT64 datatype encountered";
                break;
            case HX.FBXParser.Property.FLOAT:
                prop.data = this._data.getFloat32();
                break;
            case HX.FBXParser.Property.DOUBLE:
                prop.data = this._data.getFloat64();
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
                    throw "Unsupported INT64 datatype encountered";
                    break;
                case HX.FBXParser.Property.FLOAT_ARRAY:
                    return this._data.getFloat32Array(len);
                    break;
                case HX.FBXParser.Property.DOUBLE_ARRAY:
                    return this._data.getFloat64Array(len);
                    break;
            }
        }
        else {

        }
    }
};

HX.FBXParser.NodeRecord = function()
{
    this.endOffset = 0;
    this.numProperties = 0;
    this.propertyListLen = 0;
    this.name = "";
    this.properties = [];
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