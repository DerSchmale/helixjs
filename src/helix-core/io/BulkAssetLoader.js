/**
 * TODO: Remove in favour of AssetLibrary
 * @constructor
 */
HX.BulkAssetLoader = function ()
{
    this._assets = null;
    this._files = null;
    this._abortOnFail = false;
    this.onComplete = new HX.Signal();
    this.onFail = new HX.Signal();
};

HX.BulkAssetLoader.prototype =
{
    get abortOnFail()
    {
        return this._abortOnFail;
    },

    set abortOnFail(value)
    {
        this._abortOnFail = value;
    },

    getAsset: function(filename)
    {
        return this._assets[filename];
    },

    /**
     *
     * @param files An array of files or { file: "", importer: Importer } objects
     * @param importer If files is an array of filenames, the importer to use for all
     */
    load: function(files, importer)
    {
        this._files = files;
        this._assets = {};
        this._index = 0;

        if (importer) {
            for (var i = 0; i < this._files.length; ++i) {
                this._files[i] = {
                    file: this._files[i],
                    importer: importer,
                    target: null
                };
            }
        }

        this._loadQueued();
    },

    _loadQueued: function()
    {
        if (this._index === this._files.length) {
            this._notifyComplete();
            return;
        }

        var file = this._files[this._index];
        var loader = new HX.AssetLoader(file.importer);

        var self = this;
        loader.onComplete = function(asset)
        {
            var filename = file.file;
            self._assets[filename] = asset;
            ++self._index;
            self._loadQueued();
        };

        loader.onFail = function(error) {
            self._notifyFailure(error);

            if (self._abortOnFail)
                return;
            else
                // continue loading
                loader.onComplete();
        };

        loader.load(file.file, file.target);
    },

    _notifyComplete: function()
    {
        if (!this.onComplete) return;

        if (this.onComplete instanceof HX.Signal)
            this.onComplete.dispatch();
        else
            this.onComplete();
    },

    _notifyFailure: function(message)
    {
        if (!this.onFail) {
            console.warn("Importer error: " + message);
            return;
        }

        if (this.onFail instanceof HX.Signal)
            this.onFail.dispatch(message);
        else
            this.onFail(message);
    }
};