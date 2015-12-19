HX.FbxObject = function()
{
    this.name = null;
};

HX.FbxObject.prototype =
{
    get numChildren()
    {
        return this._children.length;
    },

    getChild: function(i)
    {
        return this._children[i];
    },

    connectObject: function(obj)
    {
        throw new Error("Unhandled object connection!");
    },

    connectProperty: function(obj, propertyName)
    {

    },

    copyProperties: function(template)
    {
        for (var key in template) {
            // do not copy anything that's not defined
            if (this.hasOwnProperty(key) && template[key] !== undefined && template[key] !== null) {
                this[key] = template[key];
            }
        }
    }
};