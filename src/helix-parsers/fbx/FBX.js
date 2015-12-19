/**
 *
 * @constructor
 */
HX.FBX = function()
{
    HX.AssetParser.call(this, HX.GroupNode, HX.URLLoader.DATA_BINARY);
    this._rootNode = null;
};

HX.FBX.prototype = Object.create(HX.AssetParser.prototype);

HX.FBX.prototype.parse = function(data, target)
{
    var stream = new HX.DataStream(data);

    try {
        var deserializer = new HX.FBXBinaryDeserializer();
        var fbxGraphBuilder = new HX.FBXGraphBuilder();
        var fbxConverter = new HX.FBXConverter();

        var newTime, time = Date.now();

        var record = deserializer.deserialize(stream);

        newTime = Date.now();
        console.log("Serialization: " + (newTime - time));
        time = newTime;

        var fbxRoot = fbxGraphBuilder.build(record);
        newTime = Date.now();
        console.log("Graph building: " + (newTime - time));

        fbxConverter.convert(fbxRoot, target);
        newTime = Date.now();
        console.log("Conversion: " + (newTime - time));
    }
    catch(err) {
        console.log(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    //this._notifyComplete(target);
};

HX.FBX._STRING_DEMARCATION = String.fromCharCode(0, 1);

HX.FBX.LayerMapping =
{
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};