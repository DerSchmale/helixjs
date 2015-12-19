HX.FbxAnimStack = function()
{
    HX.FbxObject.call(this);

    this.layers = null;
};

HX.FbxAnimStack.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxAnimStack.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxAnimLayer) {
        this.layers = this.layers || [];
        this.layers.push(obj);
    }
    else
        throw new Error("Incompatible child object " + obj.toString());
};

HX.FbxAnimStack.prototype.toString = function() { return "[FbxAnimStack(name="+this.name+")]"; };