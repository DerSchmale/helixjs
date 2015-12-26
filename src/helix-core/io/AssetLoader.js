HX.AssetLoader = function(ImporterType)
{
    // this can either be listened to, or overwritten by a function
    this.onComplete = new HX.Signal();
    this.onFail = new HX.Signal();
    this.fileMap = {};
    this.options = {};
    this._importerType = ImporterType;
};

HX.AssetLoader.prototype =
{
    // if we need to remap filenames, filemapping might be useful
    // just contains an object table:
    // { "filename.tga": "filename.jpg", ... }
    // target: optional, (and usually only used by importers)
    load: function (filename, target)
    {
        function fail(code) {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (this.onFail) {
                if (this.onFail instanceof HX.Signal)
                    this.onFail.dispatch(code);
                else
                    this.onFail(code);
            }
        }

        var importer = new this._importerType();
        target = target || importer.createContainer();
        importer.onComplete = this.onComplete;
        importer.onFail = this.onFail;
        importer.fileMap = this.fileMap;
        importer.options = this.options;
        var file = HX.FileUtils.extractPathAndFilename(filename);
        importer.path = file.path;
        importer.filename = file.filename;

        if (importer.dataType === HX.Importer.TYPE_IMAGE) {
            var image = new Image();
            image.onload = function() {
                importer.parse(image, target);
            };

            image.onError = function() {
                console.warn("Failed loading texture '" + url + "'");
                if (onError) onError();
            };
            image.src = filename;
        }
        else {
            var urlLoader = new HX.URLLoader();
            urlLoader.type = importer.dataType;

            urlLoader.onComplete = function (data)
            {
                importer.parse(data, target);
            };

            urlLoader.onError = function (code)
            {
                fail(code);
            };

            urlLoader.load(filename);
        }

        return target;
    }
};

HX.Importer = function(containerType, dataType)
{
    this._dataType = dataType === undefined? HX.URLLoader.DATA_TEXT : dataType;
    this._containerType = containerType;
    this.onComplete = null;
    this.onFail = null;
    this.fileMap = null;
    // be able to pass importer specific settings
    this.options = {};
    this.path = "";
    this.filename = "";
};

HX.Importer.prototype =
{
    get dataType() { return this._dataType; },
    createContainer: function() { return new this._containerType(); },

    parse: function(data, target) {},

    _notifyComplete: function(asset)
    {
        if (!this.onComplete) return;

        if (this.onComplete instanceof HX.Signal)
            this.onComplete.dispatch(asset);
        else
            this.onComplete(asset);
    },

    _notifyFailure: function(message)
    {
        if (this.onFail instanceof HX.Signal) {
            if (!this.onFail.hasListeners) {
                console.error(message);
            }
            this.onFail.dispatch(message);
        }
        else
            this.onFail(message);
    },

    _correctURL: function(url)
    {
        return this.path + (this.fileMap.hasOwnProperty(url)? this.fileMap[url] : url).replace("\\", "/");
    }
};

HX.Importer.TYPE_TEXT = HX.URLLoader.DATA_TEXT;
HX.Importer.TYPE_BINARY = HX.URLLoader.DATA_BINARY;
HX.Importer.TYPE_IMAGE = 2;