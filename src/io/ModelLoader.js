HX.ModelLoader =
{
    _registeredParsers: []
};

HX.ModelLoader.registerParser = function(extension, type)
{
    HX.ModelLoader._registeredParsers[extension] = type;
};

HX.ModelLoader.getParser = function(filename)
{
    var index = filename.lastIndexOf(".");
    var extension = filename.substr(index + 1).toLowerCase();
    return new HX.ModelLoader._registeredParsers[extension]();
};

HX.ModelLoader.load = function(filename, onComplete, onFail)
{
    var model = new HX.Model();

    var onParseComplete = function(modelData)
    {
        model._setModelData(modelData);
        if (onComplete) onComplete();
    };

    HX.ModelLoader._parse(filename, onParseComplete, onFail);

    return model;
};

HX.ModelLoader._parse = function(filename, onComplete, onFail)
{
    var parser = HX.ModelLoader.getParser(filename);

    var urlLoader = new HX.URLLoader();
    urlLoader.setType(parser.dataType());

    urlLoader.onComplete = function(data)
    {
        parser.parse(data, onComplete, onFail);
    };

    urlLoader.onError = function(code)
    {
        console.warn("Failed loading " + filename + ". Error code: " + code);
        if (onFail) onFail(code);
    };

    urlLoader.load(filename);
};