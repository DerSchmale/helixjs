HX.FbxAnimStack = function()
{
    HX.FbxObject.call(this);

    this.layers = [];
};

HX.FbxAnimStack.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxAnimStack.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxAnimLayer)
        this.layers.push(obj);
    else
        throw new Error("Incompatible child object!");
};