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

    var deserializer = new HX.FBXBinaryDeserializer();
    var fbxGraphBuilder = new HX.FBXGraphBuilder();
    var fbxConverter = new HX.FBXConverter();

    try {
        var newTime, time = Date.now();

        var record = deserializer.deserialize(stream);

        newTime = Date.now();
        console.log("Serialization: " + (newTime - time));
        time = newTime;

        var fbxRoot = fbxGraphBuilder.build(record);
        newTime = Date.now();
        console.log("Graph building: " + (newTime - time));
        time = newTime;

        fbxConverter.convert(fbxRoot, target);
        newTime = Date.now();
        console.log("Conversion: " + (newTime - time));
    }
    catch(err) {
        console.log(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    if (fbxConverter.textureTokens.length > 0) {
        this._loadTextures(fbxConverter.textureTokens, fbxConverter.textureMaterialMap, target);
    }
    else
        this._notifyComplete(target);
};

HX.FBX.prototype._loadTextures = function(tokens, map, target)
{
    var files = [];
    var numTextures = tokens.length;

    for (var i = 0; i < numTextures; ++i) {
        var token = tokens[i];
        token.filename = files[i] = this._correctURL(token.filename);
    }

    var self = this;
    var bulkLoader = new HX.BulkAssetLoader();
    bulkLoader.onFail = function(message)
    {
        self._notifyFailure(message);
    };

    bulkLoader.onComplete = function()
    {
        var numMappings = map.length;
        for (var i = 0; i < numMappings; ++i) {
            var mapping = map[i];
            var token = mapping.token;
            var texture = bulkLoader.getAsset(token.filename);
            texture.name = token.name;

            switch (mapping.mapType) {
                case HX.FBXConverter._TextureToken.NORMAL_MAP:
                    mapping.material.normalMap = texture;
                    break;
                case HX.FBXConverter._TextureToken.SPECULAR_MAP:
                    mapping.material.specularMap = texture;
                    break;
                case HX.FBXConverter._TextureToken.DIFFUSE_MAP:
                    mapping.material.colorMap = texture;
                    break;
            }
        }
        self._notifyComplete(target);
    };

    bulkLoader.load(files, HX.JPG);
};