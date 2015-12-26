HX.FbxPose = function()
{
    HX.FbxObject.call(this);
    this.type = null;
    this.poseNodes = [];
};

HX.FbxPose.prototype = Object.create(HX.FbxObject.prototype);

HX.FbxPose.prototype.toString = function() { return "[FbxPose(name="+this.name+")]"; };

HX.FbxPoseNode = function()
{
    this.targetUID = null;
    this.matrix = null;
}