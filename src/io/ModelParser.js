HX.ModelParser =
{
    _registeredParsers: []
};

HX.ModelParser.registerParser = function(extension, type)
{
    HX.ModelParser._registeredParsers[extension] = type;
};

HX.ModelParser.getParser = function(filename)
{
    var index = filename.lastIndexOf(".");
    var extension = filename.substr(index + 1).toLowerCase();
    return new HX.ModelParser._registeredParsers[extension]();
};

HX.ModelParser.parse = function(filename, onComplete, onFail)
{
    var parser = HX.ModelParser.getParser(filename);

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