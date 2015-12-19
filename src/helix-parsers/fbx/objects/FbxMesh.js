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