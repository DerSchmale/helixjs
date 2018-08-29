import {Signal} from "../core/Signal";
import {AssetLoader} from "./AssetLoader";
import {URLLoader} from "./URLLoader";
import {ArrayUtils} from "../utils/ArrayUtils";

/**
 * @constructor
 * @param {string} basePath The base path or url to load the assets from. All filenames will have this value prepended.
 * @param {string} [crossOrigin] An optional cross origin string. This is used when loading images from a different domain.
 *
 * @classdesc
 * AssetLibrary provides a way to load a collection of assets. These can be textures, models, plain text, json, ...
 * Assets need to be queued with a given ID and loading starts when requested. When loading completes, the ID can be used
 * to retrieve the loaded asset.
 *
 * @property {Signal} onComplete The {@linkcode Signal} dispatched when all assets have completed loading. Its payload
 * object is a reference to the assetLibrary itself.
 * @property {Signal} onProgress The {@linkcode Signal} dispatched when all assets have completed loading. Its payload
 * is the ratio of loaded objects for 0 to 1.
 * @property {string} basePath The base path relative to which all the filenames are defined. This value is set in the
 * constructor.
 * @property {string} crossOrigin A cross origin string. This is used when loading images from a different domain.
 *
 * @example
 * var assetLibrary = new HX.AssetLibrary("assets/");
 * assetLibrary.queueAsset("some-model", "models/some-model.obj", HX.AssetLibrary.Type.ASSET, HX_IO.OBJ);
 * assetLibrary.queueAsset("some-texture", "textures/some_texture.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
 * assetLibrary.onComplete.bind(onAssetsLoaded);
 * assetLibrary.onProgress.bind(onAssetsProgress);
 * assetLibrary.load();
 *
 * function onAssetsLoaded()
 * {
 * // do something
 * }
 *
 * function onAssetsProgress(ratio)
 * {
 *      var percent = ratio * 100
 * }
 *
 * @author derschmale <http://www.derschmale.com>
 */

function AssetLibrary(basePath, crossOrigin)
{
	this.onComplete = new Signal(/* void */);
	this.onProgress = new Signal(/* number */);
	this.fileMap = {};
	this._numLoaded = 0;
	this._queue = [];
	this._assets = {};
	if (basePath && basePath.charAt(basePath.length - 1) !== "/") basePath += "/";
	this.basePath = basePath || "";
    this.crossOrigin = crossOrigin;
}

/**
 * The type of asset to load. For example: <code>AssetLibrary.Type.JSON</code> for a JSON object.
 * @enum
 */
AssetLibrary.Type = {
    /**
     * A JSON data object.
     */
    JSON: 0,

    /**
     * A Helix-based asset.
     */
    ASSET: 1,

    /**
     * A plain text file.
     */
    PLAIN_TEXT: 2,

    /**
     * Raw binary data
     */
    RAW_BINARY: 3
};

AssetLibrary.prototype =
{
    /**
     * Adds an asset to the loading queue.
     * @param {string} id The ID that will be used to retrieve the asset when loaded.
     * @param {string} file Either a File object or a filename relative to the base path provided in the constructor.
     * @param {AssetLibrary.Type} type The type of asset to be loaded.
     * @param parser The parser used to parse the loaded data.
     * @param [options] An optional options object (importer-dependent)
     * @param [target] An optional empty target to contain the parsed asset. This allows lazy loading.
     * @see {@linkcode AssetLibrary#Type}
     */
    queueAsset: function(id, file, type, parser, options, target)
    {
        this._queue.push({
            id: id,
            file: (file instanceof Blob)? file : this.basePath + file,
            type: type,
            parser: parser,
            options: options,
            target: target
        });
    },

    /**
     * Start loading all the assets. Every time a single asset finished loading, <code>onProgress</code> is dispatched.
     * When all assets have finished loading, <code>onComplete</code> is dispatched.
     */
    load: function()
    {
        if (this._queue.length === 0) {
            this.onComplete.dispatch(this);
            return;
        }

        var asset = this._queue[this._numLoaded];

        switch (asset.type) {
            case AssetLibrary.Type.JSON:
                this._json(asset.file, asset.id);
                break;
            case AssetLibrary.Type.PLAIN_TEXT:
                this._plainText(asset.file, asset.id);
                break;
            case AssetLibrary.Type.RAW_BINARY:
                this._rawBinary(asset.file, asset.id);
                break;
            case AssetLibrary.Type.ASSET:
                this._asset(asset.file, asset.id, asset.parser, asset.options, asset.target);
                break;
            default:
                throw new Error("Unknown asset type " + asset.type + "!");
        }
    },

    /**
     * Retrieves a loaded asset from the asset library. This method should only be called once <code>onComplete</code>
     * has been dispatched.
     * @param {string} id The ID assigned to the loaded asset when calling <code>queueAsset</code>
     * @returns {*} The loaded asset.
     */
    get: function(id) { return this._assets[id]; },

    /**
     * Adds an asset explicitly.
     * @param {string} id The ID assigned to the asset when calling <code>get</code>
     * @param asset The asset to add to the library
     */
    addAsset: function(id, asset)
    {
        this._assets[id] = asset;
    },

    /**
     * Merges the contents of another library into the current.
     * @param {AssetLibrary} library The library to add.
     */
    mergeLibrary: function(library)
    {
        ArrayUtils.forEach(library._assets, (function (obj, key)
        {
            this.addAsset(key, obj);
        }).bind(this));
    },

    _json: function(file, id)
    {
        var self = this;

        this._loadText(file, function(result) {
			self._assets[id] = JSON.parse(result);
			self._onAssetLoaded();
        });

    },

    _plainText: function(file, id)
    {
        var self = this;

        this._loadText(file, function(result) {
			self._assets[id] = result;
			self._onAssetLoaded();
        });
    },

	_loadText: function(file, callback)
	{
		if (file instanceof Blob) {
			var reader = new FileReader();
			reader.onload = function() {
				callback(reader.result);
			};
			reader.readAsText(file);
		}
		else {
			var loader = new XMLHttpRequest();
			loader.overrideMimeType("application/json");
			loader.open('GET', file, true);
			loader.onreadystatechange = function()
			{
				if (loader.readyState === 4 && loader.status === 200) {
					callback(loader.responseText);
				}
			};
			loader.send(null);
		}
	},

    _rawBinary: function(file, id)
    {
        var self = this;
        if (file instanceof Blob) {
			var reader = new FileReader();
			reader.onload = function() {
				self._assets[id] = data;
				self._onAssetLoaded();
			};
			reader.readAsArrayBuffer(file);
        }
        else {
			var loader = new URLLoader();
			loader.type = URLLoader.DATA_BINARY;
			loader.onComplete = function (data)
			{
				self._assets[id] = data;
				self._onAssetLoaded();
			};

			loader.load(file);
		}
    },

    _asset: function(file, id, parser, options, target)
    {
        var loader = new AssetLoader(parser);
        loader.fileMap = this.fileMap;
        loader.options = options || {};
        loader.options.crossOrigin = this.crossOrigin;
        loader.onComplete.bind(function()
        {
            this._onAssetLoaded();
        }, this);

        loader.onProgress.bind(function(ratio)
        {
            this.onProgress.dispatch((this._numLoaded + ratio) / this._queue.length);
        }, this);

        this._assets[id] = loader.load(file, target);
		this._assets[id].name = id;
    },

    _onAssetLoaded: function()
    {
        ++this._numLoaded;

        this.onProgress.dispatch(this._numLoaded / this._queue.length);

        if (this._numLoaded === this._queue.length)
            this.onComplete.dispatch(this);
        else
            this.load();
    }
};

export { AssetLibrary };