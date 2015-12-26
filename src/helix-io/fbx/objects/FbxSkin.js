HX.FbxSkin = function()
{
    HX.FbxObject.call(this);
    this.clusters = null;

    // data will contain the converter
};

HX.FbxSkin.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxSkin.prototype.toString = function() { return "[FbxSkin(name="+this.name+")]"; };

HX.FbxSkin.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxCluster) {
        this.clusters = this.clusters || [];
        this.clusters.push(obj);
    }
    else
        throw new Error("Unhandled object connection " + obj.toString());
};