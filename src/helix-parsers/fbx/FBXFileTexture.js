HX.FBXMesh = function()
{
    HX.FBXElement.call(this);
    this.Color = null;
    //this.BBoxMin = null;
    //this.BBoxMax = null;
    this["Casts Shadows"] = true;
};

HX.FBXMesh.prototype = Object.create(HX.FBXElement.prototype);