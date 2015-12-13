HX.SkeletonJoint = function()
{
    this.parentIndex = 0;
    this.inverseBindPose = new HX.Matrix4x4();
};

HX.SkeletonJointPose = function()
{
    this.orientation = new HX.Quaternion();
    this.translation = new HX.Float4();
    // scale not supported at this point
};

HX.Skeleton = function()
{
    this._joints = null;
};

HX.Skeleton.prototype =
{
    get numJoints()
    {
        return this._joints.length;
    },

    getJoint: function(index)
    {
        return this._joints[index];
    }
};