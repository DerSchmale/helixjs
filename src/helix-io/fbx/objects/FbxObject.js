HX.FbxObject = function()
{
    this.name = null;
    this.UID = null;
    this.parent = null; // only used if parent is FbxNode

    // can be use for marking during parsing
    this.data = null;
};

HX.FbxObject.prototype =
{
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