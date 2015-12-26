/**
 *
 * @constructor
 */
HX.SkeletonJoint = function()
{
    this.name = null;
    this.parentIndex = -1;
    this.inverseBindPose = new HX.Matrix4x4();
};

HX.SkeletonJoint.prototype =
{
    toString: function()
    {
        return "[SkeletonJoint]";
    }
};

/**
 *
 * @constructor
 */
HX.SkeletonJointPose = function()
{
    this.orientation = new HX.Quaternion();
    this.translation = new HX.Float4();
    this.scale = 1.0;
};

HX.SkeletonJointPose.prototype =
{
    copyFrom: function(a)
    {
        this.orientation.copyFrom(a.orientation);
        this.translation.copyFrom(a.translation);
        this.scale = a.scale;
    },

    toString: function()
    {
        return "[SkeletonJointPose]";
    }
};

/**
 *
 * @constructor
 */
HX.SkeletonPose = function()
{
    this.jointPoses = [];
};

HX.SkeletonPose.prototype =
{
    interpolate: function(a, b, factor)
    {
        a = a.jointPoses;
        b = b.jointPoses;
        var len = a.length;

        if (this.jointPoses.length !== len) {
            this._numJoints = len;
            this.jointPoses = [];
            for (var i = 0; i < len; ++i) {
                this.jointPoses[i] = new HX.SkeletonJointPose();
            }
        }

        var target = this.jointPoses;
        for (var i = 0; i < len; ++i) {
            target[i].orientation.slerp(a[i].orientation, b[i].orientation, factor);
            target[i].translation.lerp(a[i].translation, b[i].translation, factor);
            target[i].scale = HX.lerp(a[i].scale, b[i].scale, factor);
        }
    },

    copyFrom: function(a)
    {
        a = a.jointPoses;
        var target = this.jointPoses;
        var len = target.length;
        for (var i = 0; i < len; ++i) {
            target[i].copyFrom(a[i]);
        }

    }
};

/**
 *
 * @constructor
 */
HX.Skeleton = function()
{
    this._joints = [];
    this._name = "";
};

HX.Skeleton.prototype =
{
    get numJoints()
    {
        return this._joints.length;
    },

    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    getJoint: function(index)
    {
        return this._joints[index];
    },

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};