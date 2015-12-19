// probably needs to be subclasses for Light, Camera, etc
HX.FbxNodeAttribute = function()
{
    HX.FbxObject.call(this);
    // actual video not supported
    this.type = null;
};

HX.FbxNodeAttribute.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxNodeAttribute.prototype.toString = function() { return "[FbxNodeAttribute(name="+this.name+")]"; };