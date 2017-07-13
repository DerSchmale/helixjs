export var FileUtils =
{
    extractPathAndFilename: function(filename)
    {
        var index = filename.lastIndexOf("/");
        var obj = {};

        if (index >= 0) {
            obj.path = filename.substr(0, index + 1);
            obj.filename = filename.substr(index + 1);
        }
        else {
            obj.path = "./";
            obj.filename = filename;
        }

        return obj;
    }
};