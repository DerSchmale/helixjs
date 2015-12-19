HX.FbxObject = function()
{
    this.name = null;
    this.UID = null;
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
        throw new Error("Unhandled object connection " + obj.toString() + " -> " + this.toString());
    },

    connectProperty: function(obj, propertyName)
    {

    },

    copyProperties: function(template)
    {
        for (var key in template) {
            // do not copy anything that's not defined
            if (this.hasOwnProperty(key) && template[key] !== undefined && template[key] !== null) {
                // very dirty, but saves so much space
                // FBX native properties are uppercase, ours aren't. There you have it.
                var char = key.charAt(0);
                if (char.toUpperCase() === char)
                    this[key] = template[key];
            }
        }
    }
};

HX.FbxObject.prototype.toString = function() { return "[FbxObject(name="+this.name+")]"; };