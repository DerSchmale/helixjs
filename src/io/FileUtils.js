HX.FileUtils =
{
    extractPath: function(filename)
    {
        var index = filename.lastIndexOf("/");
        return index >= 0? filename.substr(0, index + 1) : "";
    }
};