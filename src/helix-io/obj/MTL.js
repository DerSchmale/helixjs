
/**
 *
 * @constructor
 */
HX.MTL = function()
{
    HX.Importer.call(this, Object, HX.URLLoader.DATA_TEXT);
    this._textures = [];
    this._texturesToLoad = [];
    this._activeMaterial = null;
};

HX.MTL.prototype = Object.create(HX.Importer.prototype);

HX.MTL.prototype.parse = function(data, target)
{
    var lines = data.split("\n");
    var numLines = lines.length;

    for (var i = 0; i < numLines; ++i) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        this._parseLine(line, target);
    }

    this._loadTextures(target);

    return target;
};

HX.MTL.prototype._parseLine = function(line, target)
{
    // skip line
    if (line.length === 0 || line.charAt(0) === "#") return;
    var tokens = line.split(/\s+/);

    switch (tokens[0].toLowerCase()) {
        case "newmtl":
            this._activeMaterial = new HX.BasicMaterial();
            this._activeMaterial.name = tokens[1];
            target[tokens[1]] = this._activeMaterial;
            break;
        case "ns":
            var specularPower = parseFloat(tokens[1]);
            this._activeMaterial.roughness = HX.BasicMaterial.roughnessFromShininess(specularPower);
            break;
        case "kd":
            this._activeMaterial.color = new HX.Color(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
            break;
        case "map_kd":
            this._activeMaterial.colorMap = this._getTexture(tokens[1]);
            break;
        case "map_d":
            this._activeMaterial.maskMap = this._getTexture(tokens[1]);
            this._activeMaterial.alphaThreshold = .5;
            break;
        case "map_ns":
            this._activeMaterial.specularMap = this._getTexture(tokens[1]);
            break;
        case "map_bump":
        case "bump":
            this._activeMaterial.normalMap = this._getTexture(tokens[1]);
            break;
        default:
        //console.log("MTL tag ignored or unsupported: " + tokens[0]);
    }
};

HX.MTL.prototype._getTexture = function(url)
{
    if (!this._textures[url]) {
        this._textures[url] = new HX.Texture2D();

        this._texturesToLoad.push({
            file: this._correctURL(url),
            importer: HX.JPG,
            target: this._textures[url]
        });
    }
    return this._textures[url];
};

HX.MTL.prototype._loadTextures = function(lib)
{
    var files = this._texturesToLoad;
    var len = files.length;
    if (len === 0) {
        this._notifyComplete(lib);
        return;
    }

    var self = this;
    var bulkLoader = new HX.BulkAssetLoader();

    bulkLoader.onComplete = function() {
        self._notifyComplete(lib);
    };

    bulkLoader.onFail = function(message) {
        self._notifyFailure(message);
    };

    bulkLoader.load(files);
};
