HX.FbxAnimationCurveNode = function()
{
    HX.FbxObject.call(this);
};

HX.FbxAnimationCurveNode.prototype = Object.create(HX.FbxObject.prototype);
HX.FbxAnimationCurveNode.prototype.toString = function() { return "[FbxAnimationCurveNode(name="+this.name+")]"; };