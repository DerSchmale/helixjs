HX.FbxMesh = function()
{
    HX.FbxObject.call(this);
    this.Color = null;
    //this.BBoxMin = null;
    //this.BBoxMax = null;
    this["Casts Shadows"] = true;

    this.vertices = null;
    this.layerElements = null;
};

HX.FbxMesh.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxMesh.prototype.toString = function() { return "[FbxMesh(name="+this.name+")]"; };

HX.FbxMesh.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxSkin) {
        if (this.skin) throw "Skin already set!";
        this.skin = obj;
    }
    else {
        throw new Error("Unhandled object connection " + obj.toString());
    }
};