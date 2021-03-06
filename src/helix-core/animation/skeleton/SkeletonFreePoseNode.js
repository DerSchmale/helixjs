import {SkeletonBlendNode} from "./SkeletonBlendNode";

/**
 * @param skeleton The original skeleton, needed to copy the bind pose.
 *
 * @classdesc
 * <p>SkeletonFreePoseNode is a SkeletonBlendNode that allows freely setting any Skeleton joint's pose directly.</p>
 *
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonFreePoseNode(skeleton)
{
    SkeletonBlendNode.call(this);

    this.skeleton = skeleton;
    this._poseInvalid = true;
    this.pose.copyBindPose(skeleton);

    this._poseLookUp = {};

    var joints = skeleton.joints;
    for (var i = 0, len = joints.length; i < len; ++i) {
        var j = joints[i];
        this._poseLookUp[j.name] = this.pose._jointPoses[i];
    }

	this.numJoints = joints.length;
}

SkeletonFreePoseNode.prototype = Object.create(SkeletonBlendNode.prototype);

/**
 * @ignore
 */
SkeletonFreePoseNode.prototype.update = function(dt)
{
    var updated = this._poseInvalid;
    this._poseInvalid = false;
    return updated
};

/**
 * Sets a joint's rotation.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Quaternion} quaternion The new rotation.
 */
SkeletonFreePoseNode.prototype.setJointRotation = function(indexOrName, quaternion)
{
    var p = this._getJointPose(indexOrName);
    p.rotation.copyFrom(quaternion);
    this._poseInvalid = true;
};

/**
 * Sets a joint's translation.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Float4} value The new translation.
 */
SkeletonFreePoseNode.prototype.setJointTranslation = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.position.copyFrom(value);
    this._poseInvalid = true;
};

/**
 * Sets a joint's scale.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Float4} value The new scale.
 */
SkeletonFreePoseNode.prototype.setJointScale = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.scale.copyFrom(value);
    this._poseInvalid = true;
};

/**
 * @ignore
 */
SkeletonFreePoseNode.prototype._getJointPose = function(indexOrName)
{
    if (indexOrName instanceof String)
        return this._poseLookUp[indexOrName];
    else
        return this.pose._jointPoses[indexOrName];
};

SkeletonFreePoseNode.prototype._queryChildren = function(name)
{
    // this is a leaf node
    return null;
};

export { SkeletonFreePoseNode};