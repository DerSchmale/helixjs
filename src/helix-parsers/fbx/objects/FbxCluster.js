HX.FbxCluster = function()
{
    HX.FbxObject.call(this);
    this.limbNode = null;
};

HX.FbxCluster.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxCluster.prototype.toString = function() { return "[FbxCluster(name="+this.name+")]"; };

HX.FbxCluster.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxNode) {
        this.limbNode = obj;
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};