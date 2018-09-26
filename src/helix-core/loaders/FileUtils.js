/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var FileUtils =
{
	extractExtension: function(filename)
    {
        return filename.toLowerCase().substr(filename.lastIndexOf(".") + 1);
    },

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