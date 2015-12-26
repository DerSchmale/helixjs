HX.FBXElement = function()
{
    this._children = [];
};

HX.FBXElement.prototype =
{
    get numChildren()
    {
        return this._children.length;
    },

    getChild: function(i)
    {
        return this._children[i];
    }
};