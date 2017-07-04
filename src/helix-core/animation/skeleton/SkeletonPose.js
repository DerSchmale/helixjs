import {Float4} from "../../math/Float4";
import {Quaternion} from "../../math/Quaternion";
import {SkeletonJointPose} from "./SkeletonJointPose";
import {Matrix4x4} from "../../math/Matrix4x4";


/**
 *
 * @constructor
 */
function SkeletonPose()
{
    this.jointPoses = [];
};

SkeletonPose.prototype =
    {
        interpolate: function(a, b, factor)
        {
            a = a.jointPoses;
            b = b.jointPoses;
            var len = a.length;

            if (this.jointPoses.length !== len)
                this._initJointPoses(len);

            var target = this.jointPoses;
            for (var i = 0; i < len; ++i) {
                var t = target[i];
                Quaternion.slerp(a[i].rotation, b[i].rotation, factor, t.rotation);
                Float4.lerp(a[i].position, b[i].position, factor, t.position);
                Float4.lerp(a[i].scale, b[i].scale, factor, t.scale);
            }
        },

        copyBindPose: function(skeleton)
        {
            var m = new Matrix4x4();
            for (var i = 0; i < skeleton.numJoints; ++i) {
                var j = skeleton.getJoint(i);
                var p = this.jointPoses[i] = new SkeletonJointPose();
                // global bind pose matrix
                m.inverseAffineOf(j.inverseBindPose);

                // local bind pose matrix
                if (j.parentIndex >= 0)
                    m.append(skeleton.getJoint(j.parentIndex).inverseBindPose);

                m.decompose(p);
            }
        },

        copyFrom: function(a)
        {
            a = a.jointPoses;
            var target = this.jointPoses;
            var len = a.length;

            if (this.jointPoses.length !== len)
                this._initJointPoses(len);

            for (var i = 0; i < len; ++i)
                target[i].copyFrom(a[i]);
        },

        _initJointPoses: function(numJointPoses)
        {
            this._numJoints = numJointPoses;
            this.jointPoses.length = numJointPoses;
            for (var i = 0; i < numJointPoses; ++i)
                this.jointPoses[i] = new SkeletonJointPose();
        }
    };

export { SkeletonPose };