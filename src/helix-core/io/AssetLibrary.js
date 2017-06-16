/**
 * Creates a new AssetLibrary object.
 * @param {string} basePath The base path or url to load the assets from. All filenames will have this value prepended.
 * @constructor
 *
 * @classdesc
 * AssetLibrary provides a way to load a collection of assets. These can be textures, models, plain text, json, ...
 * Assets need to be queued with a given ID and loading starts when requested. When loading completes, the ID can be used
 * to retrieve the loaded asset.
 *
 * @example
 * var assetLibrary = new AssetLibrary("assets/");
 * assetLibrary.queueAsset("some-model", "models/some-model.obj", HX.AssetLibrary.Type.ASSET, HX.OBJ);
 * assetLibrary.queueAsset("some-texture", "textures/some_texture.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
 * assetLibrary.onComplete.bind(onAssetsLoaded);
 * assetLibrary.onProgress.bind(onAssetsProgress);
 * assetLibrary.load();
 */
HX.AssetLibrary = function(basePath)
{
    this._numLoaded = 0;
    this._queue = [];
    this._assets = {};
    if (basePath && basePath.charAt(basePath.length - 1) != "/") basePath = basePath + "/";
    this._basePath = basePath || "";
    this._onComplete = new HX.Signal(/* void */);
    this._onProgress = new HX.Signal(/* number */)
};

/**
 * The type of asset to load. For example: <code>AssetLibrary.Type.JSON</code> for a JSON object.
 * @enum
 */
HX.AssetLibrary.Type = {
    /**
     * A JSON data object.
     */
    JSON: 0,

    /**
     * An asset.
     */
    ASSET: 1,

    /**
     * A plain text file.
     */
    PLAIN_TEXT: 2
};

HX.AssetLibrary.prototype =
{
    /**
     * The {@linkcode Signal} dispatched when all assets have completed loading. Its payload object is a reference to
     * the assetLibrary itself.
     * @see {@linkcode Signal}.
     */
    get onComplete()
    {
        return this._onComplete;
    },

    /**
     * The {@linkcode Signal} dispatched when all assets have completed loading. Its payload is the ratio of loaded
     * objects for 0 to 1.
     * @see {@linkcode Signal}
     */
    get onProgress()
    {
        return this._onProgress;
    },

    /**
     * The base path relative to which all the filenames are defined. This value is set in the constructor.
     */
    get basePath()
    {
        return this._basePath;
    },

    /**
     * Adds an asset to the loading queue.
     * @param {string} id The ID that will be used to retrieve the asset when loaded.
     * @param {string} filename The filename relative to the base path provided in the constructor.
     * @param {AssetLibrary.Type} type The type of asset to be loaded.
     * @param [parser] The parser used to parse the loaded data.
     * @see {@linkcode AssetLibrary.Type}
     */
    queueAsset: function(id, filename, type, parser)
    {
        this._queue.push({
            id: id,
            filename: this._basePath + filename,
            type: type,
            parser: parser
        });
    },

    /**
     * Start loading all the assets. Every time a single asset finished loading, <code>onProgress</code> is dispatched.
     * When all assets have finished loading, <code>onComplete</code> is dispatched.
     */
    load: function()
    {
        if (this._queue.length === 0) {
            this.onComplete.dispatch();
            return;
        }

        var asset = this._queue[this._numLoaded];
        switch (asset.type) {
            case HX.AssetLibrary.Type.JSON:
                this._json(asset.filename, asset.id);
                break;
            case HX.AssetLibrary.Type.PLAIN_TEXT:
                this._plainText(asset.filename, asset.id);
                break;
            case HX.AssetLibrary.Type.ASSET:
                this._model(asset.filename, asset.id, asset.parser);
                break;
        }
    },

    /**
     * Retrieves a loaded asset from the asset library. This method should only be called once <code>onComplete</code>
     * has been dispatched.
     * @param {string} id The ID assigned to the loaded asset when calling <code>queueAsset</code>
     * @returns {*} The loaded asset.
     */
    get: function(id) { return this._assets[id]; },

    _json: function(file, id)
    {
        var self = this;
        var loader = new XMLHttpRequest();
        loader.overrideMimeType("application/json");
        loader.open('GET', file, true);
        loader.onreadystatechange = function()
        {
            if (loader.readyState === 4 && loader.status === "200") {
                self._assets[id] = JSON.parse(loader.responseText);
                self._onAssetLoaded();
            }
        };
        loader.send(null);
    },

    _plainText: function(file, id)
    {
        var self = this;
        var loader = new XMLHttpRequest();
        loader.overrideMimeType("application/json");
        loader.open('GET', file, true);
        loader.onreadystatechange = function()
        {
            if (loader.readyState === 4 && loader.status === "200") {
                self._assets[id] = loader.responseText;
                self._onAssetLoaded();
            }
        };
        loader.send(null);
    },

    _textureCube: function(file, id)
    {
        var self = this;
        var loader = new HX.AssetLoader(HX.HCM);
        loader.bind(function() {
            self._onAssetLoaded();
        });
        this._assets[id] = loader.load(file);
    },

    _texture2D: function(file, id)
    {
        var self = this;
        var loader = new HX.AssetLoader(HX.JPG);

        loader.onComplete.bind(function() {
            self._onAssetLoaded();
        });

        this._assets[id] = loader.load(file);
    },

    _model: function(file, id, parser)
    {
        var self = this;
        var loader = new HX.AssetLoader(parser);
        // loader.options = loader.options || {};
        // loader.options.convertUpAxis = true;
        loader.onComplete.bind(function()
        {
            self._onAssetLoaded();
        });

        this._assets[id] = loader.load(file);
    },

    _onAssetLoaded: function()
    {
        this._onProgress.dispatch(this._numLoaded / this._queue.length);

        if (++this._numLoaded === this._queue.length)
            this._onComplete.dispatch(this);
        else
            this.load();
    }
};