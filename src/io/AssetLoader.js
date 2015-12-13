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
    load: function (filename)
    {
        var urlLoader = new HX.URLLoader();
        var parser = new this._parserType();
        var target = parser.createContainer();
        parser.onComplete = this.onComplete;
        parser.onFail = this.onFail;
        parser.fileMap = this.fileMap;
        parser.options = this.options;
        parser.path = HX.FileUtils.extractPath(filename);

        urlLoader.type = parser.dataType;

        urlLoader.onComplete = function (data)
        {
            parser.parse(data, target);
        };

        urlLoader.onError = function (code)
        {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (onFail) {
                if (onFail instanceof HX.Signal)
                    onFail.dispatch(code);
                else
                    onFail(code);
            }
        };

        urlLoader.load(filename);

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
            console.warn("Parser error: " + message);
            return;
        }

        if (this.onFail instanceof HX.Signal)
            this.onFail.dispatch(message);
        else
            this.onFail(message);
    }
};