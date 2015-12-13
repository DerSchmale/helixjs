HX.AssetLoader = function(ParserType)
{
    // this can either be listened to, or overwritten by a function
    this.onComplete = new HX.Signal();
    this.onFail = new HX.Signal();
    this.fileMap = {};
    this.options = {};
    this._parserType = ParserType;
};

HX.AssetLoader.prototype =
{
    // if we need to remap filenames, filemapping might be useful
    // just contains an object table:
    // { "filename.tga": "filename.jpg", ... }
    // target: optional, (and usually only used by parsers)
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

        var parser = new this._parserType();
        target = target || parser.createContainer();
        parser.onComplete = this.onComplete;
        parser.onFail = this.onFail;
        parser.fileMap = this.fileMap;
        parser.options = this.options;
        parser.path = HX.FileUtils.extractPath(filename);

        if (parser.dataType === HX.AssetParser.IMAGE) {
            var image = new Image();
            image.onload = function() {
                parser.parse(image, target);
            };

            image.onError = function() {
                console.warn("Failed loading texture '" + url + "'");
                if (onError) onError();
            };
            image.src = filename;
        }
        else {
            var urlLoader = new HX.URLLoader();
            urlLoader.type = parser.dataType;

            urlLoader.onComplete = function (data)
            {
                parser.parse(data, target);
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

HX.AssetParser = function(containerType, dataType)
{
    this._dataType = dataType === undefined? HX.URLLoader.DATA_TEXT : dataType;
    this._containerType = containerType;
    this.onComplete = null;
    this.onFail = null;
    this.fileMap = null;
    // be able to pass parser specific objects
    this.options = {};
    this.path = "";
};

HX.AssetParser.prototype =
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
        if (!this.onFail) {
            console.warn("Parser error: " + message);
            return;
        }

        if (this.onFail instanceof HX.Signal)
            this.onFail.dispatch(message);
        else
            this.onFail(message);
    },

    _correctURL: function(url)
    {
        return this.path + (this.fileMap.hasOwnProperty(url)? this.fileMap[url] : url);
    }
};

HX.AssetParser.DATA_TEXT = HX.URLLoader.DATA_TEXT;
HX.AssetParser.DATA_BINARY = HX.URLLoader.DATA_BINARY;
HX.AssetParser.IMAGE = 2;