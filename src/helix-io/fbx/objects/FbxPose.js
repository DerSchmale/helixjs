import {FbxObject} from "./FbxObject";
function FbxPose()
{
    FbxObject.call(this);
    this.type = null;
    this.poseNodes = [];
}

FbxPose.prototype = Object.create(FbxObject.prototype);

FbxPose.prototype.toString = function() { return "[FbxPose(name="+this.name+")]"; };

function FbxPoseNode()
{
    this.targetUID = null;
    this.matrix = null;
}

export {FbxPose, FbxPoseNode};