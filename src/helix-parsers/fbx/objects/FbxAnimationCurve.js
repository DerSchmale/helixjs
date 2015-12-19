HX.FbxAnimationCurve = function()
{
    HX.FbxObject.call(this);
};

HX.FbxAnimationCurve.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurve.prototype.toString = function() { return "[FbxAnimationCurve(name="+this.name+")]"; };