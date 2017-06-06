/**
 *
 * @param skeleton The original skeleton, needed to copy the bind pose.
 * @constructor
 */
HX.SkeletonFreePoseNode = function(skeleton)
{
    HX.SkeletonBlendNode.call(this);
    this._skeleton = skeleton;
    this._poseInvalid = true;
    this._pose.copyBindPose(skeleton);

    this._poseLookUp = {};

    for (var i = 0; i < skeleton.numJoints; ++i) {
        var j = skeleton.getJoint(i);
        this._poseLookUp[j.name] = this._pose.jointPoses[i];
    }
};

HX.SkeletonFreePoseNode.prototype = Object.create(HX.SkeletonBlendNode.prototype, {
    numJoints: {
        get function() { return this._skeleton.numJoints; }
    }
});

HX.SkeletonFreePoseNode.prototype.update = function(dt)
{
    var updated = this._poseInvalid;
    this._poseInvalid = false;
    return updated
};

HX.SkeletonFreePoseNode.prototype.setJointRotation = function(indexOrName, quaternion)
{
    var p = this._getJointPose(indexOrName);
    p.rotation.copyFrom(quaternion);
    this._poseInvalid = true;
};

HX.SkeletonFreePoseNode.prototype.setJointTranslation = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.position.copyFrom(value);
    this._poseInvalid = true;
};

HX.SkeletonFreePoseNode.prototype.setJointScale = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.scale.copyFrom(scale);
    this._poseInvalid = true;
};

HX.SkeletonFreePoseNode.prototype._getJointPose = function(indexOrName)
{
    if (indexOrName instanceof String)
        return this._poseLookUp[indexOrName];
    else
        return this._pose.jointPoses[indexOrName];
};