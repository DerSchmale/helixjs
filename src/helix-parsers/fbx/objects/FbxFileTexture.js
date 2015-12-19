HX.FbxFileTexture = function()
{
    HX.FbxObject.call(this);
    this.WrapModeU = 0;
    this.WrapModeV = 0;
    //this.UVSet = null;    // we only support a single uv set

    this.relativeFilename = null;
    this.video = null;
};

HX.FbxFileTexture.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxFileTexture.prototype.connectObject = function(obj)
{
    if (obj instanceof HX.FbxVideo)
        this.video = obj;
    else
        throw new Error("Incompatible child object!");
};

HX.FbxFileTexture.prototype.toString = function() { return "[FbxFileTexture(name="+this.name+")]"; };