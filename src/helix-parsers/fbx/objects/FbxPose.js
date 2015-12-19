HX.FbxPose = function()
{
    HX.FbxObject.call(this);
};

HX.FbxPose.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxPose.prototype.toString = function() { return "[FbxPose(name="+this.name+")]"; };