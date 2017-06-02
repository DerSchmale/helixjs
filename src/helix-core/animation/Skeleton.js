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
    this.rotation = new HX.Quaternion();
    this.position = new HX.Float4();
    this.scale = new HX.Float4(1, 1, 1);
};

HX.SkeletonJointPose.prototype =
{
    copyFrom: function(a)
    {
        this.rotation.copyFrom(a.rotation);
        this.position.copyFrom(a.position);
        this.scale.copyFrom(a.scale);
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
            target[i].rotation.slerp(a[i].rotation, b[i].rotation, factor);
            target[i].position.lerp(a[i].position, b[i].position, factor);
            target[i].scale.lerp(a[i].scale, b[i].scale, factor);
        }
    },

    copyBindPose: function(skeleton)
    {
        var m = new HX.Matrix4x4();
        for (var i = 0; i < skeleton.numJoints; ++i) {
            var j = skeleton.getJoint(i);
            var p = this.jointPoses[i];
            m.inverseAffineOf(j.inverseBindPose);
            m.decompose(p);
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