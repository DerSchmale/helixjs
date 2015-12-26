HX.FbxAnimationCurve = function()
{
    HX.FbxObject.call(this);
    this.Default = 0.0;
    this.KeyVer = 0.0;
    this.KeyTime = 0.0;
    this.KeyValueFloat = null;
    this.KeyAttrFlags = 0.0;
    this.KeyAttrDataFloat = null;
    this.KeyAttrRefCount = 0.0;
};

HX.FbxAnimationCurve.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurve.prototype.toString = function() { return "[FbxAnimationCurve(name="+this.name+")]"; };