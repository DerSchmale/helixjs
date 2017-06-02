/**
 *
 * @param skeleton The original skeleton, needed to copy the bind pose.
 * @constructor
 */
HX.SkeletonFreePoseNode = function(skeleton)
{
    HX.SkeletonBlendNode.call(this);
    this._poseInvalid = true;
    this._pose = new HX.SkeletonPose();
    this._pose.copyBindPose(skeleton);
};

HX.SkeletonFreePoseNode.prototype = Object.create(HX.SkeletonBlendNode.prototype,
    {
    });

HX.SkeletonFreePoseNode.prototype.update = function(dt)
{
    var updated = this._poseInvalid;
    this._poseInvalid = false;
    return updated
};