import * as HX from 'helix';
import {FBXBinaryDeserializer} from "./FBXBinaryDeserializer";
import {FBXGraphBuilder} from "./FBXGraphBuilder";
import {FBXConverter} from "./FBXConverter";
import {FBXSettings} from "./FBXSettings";

/**
 *
 * @constructor
 */
function FBX()
{
    HX.Importer.call(this, HX.SceneNode, HX.Importer.TYPE_BINARY);
    this._rootNode = null;
}

FBX.prototype = Object.create(HX.Importer.prototype);

FBX.prototype.parse = function(data, target)
{
    var stream = new HX.DataStream(data);

    var deserializer = new FBXBinaryDeserializer();
    var fbxGraphBuilder = new FBXGraphBuilder();
    var fbxSceneConverter = new FBXConverter();
    var settings = new FBXSettings();

    try {
        var newTime, time = Date.now();

        var record = deserializer.deserialize(stream);

        newTime = Date.now();
        console.log("Serialization: " + (newTime - time));
        time = newTime;

        settings.init(record);

        if (deserializer.version < 7000) throw new Error("Unsupported FBX version!");
        fbxGraphBuilder.build(record, settings);

        newTime = Date.now();
        console.log("Graph building: " + (newTime - time));
        time = newTime;

        fbxSceneConverter.convert(fbxGraphBuilder.sceneRoot, fbxGraphBuilder.animationStack, target, settings);

        newTime = Date.now();
        console.log("Conversion: " + (newTime - time));
    }
    catch(err) {
        console.log(err.stack);
        this._notifyFailure(err.message);
        return;
    }

    if (fbxSceneConverter.textureTokens.length > 0) {
        this._loadTextures(fbxSceneConverter.textureTokens, fbxSceneConverter.textureMaterialMap, target);
    }
    else
        this._notifyComplete(target);
};

FBX.prototype._loadTextures = function(tokens, map, target)
{
    var numTextures = tokens.length;

    this._textureLibrary = new HX.AssetLibrary();

    for (var i = 0; i < numTextures; ++i) {
        var token = tokens[i];
        token.filename = this._correctURL(token.filename);
        this._textureLibrary.queueAsset(token.filename, token.filename, HX.AssetLibrary.Type.ASSET, HX.JPG)
    }

    // bulkLoader.onFail = function(message)
    // {
    //     self._notifyFailure(message);
    // };

    this._textureLibrary.onComplete.bind(function()
    {
        var numMappings = map.length;
        for (var i = 0; i < numMappings; ++i) {
            var mapping = map[i];
            var token = mapping.token;
            var texture = this._textureLibrary.get(token.filename);
            texture.name = token.name;

            switch (mapping.mapType) {
                case FBXConverter._TextureToken.NORMAL_MAP:
                    mapping.material.normalMap = texture;
                    break;
                case FBXConverter._TextureToken.SPECULAR_MAP:
                    mapping.material.specularMap = texture;
                    break;
                case FBXConverter._TextureToken.DIFFUSE_MAP:
                    mapping.material.colorMap = texture;
                    break;
            }
        }
        this._notifyComplete(target);
    }, this);

    this._textureLibrary.load();
};

export { FBX };