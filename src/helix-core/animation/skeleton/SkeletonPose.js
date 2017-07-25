import {SkeletonJointPose} from "./SkeletonJointPose";
import {Matrix4x4} from "../../math/Matrix4x4";


/**
 * @classdesc
 * SkeletonPose represents an entire pose a {@linkcode Skeleton} can have. Usually, several poses are interpolated to create animations.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonPose()
{
    this.jointPoses = [];
}

SkeletonPose.prototype =
    {
        /**
         * Interpolates between two poses and stores it in the current
         * @param a
         * @param b
         * @param factor
         */
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
                t.rotation.slerp(a[i].rotation, b[i].rotation, factor);
                t.position.lerp(a[i].position, b[i].position, factor);
                t.scale.lerp(a[i].scale, b[i].scale, factor);
            }
        },

        /**
         * Grabs the inverse bind pose data from a skeleton and generates a local pose from it
         * @param skeleton
         */
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

        /**
         * Copies another pose.
         */
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

        /**
         * @ignore
         */
        _initJointPoses: function(numJointPoses)
        {
            this._numJoints = numJointPoses;
            this.jointPoses.length = numJointPoses;
            for (var i = 0; i < numJointPoses; ++i)
                this.jointPoses[i] = new SkeletonJointPose();
        },

        /**
         * @ignore
         */
        globalFromLocal: function(local, skeleton)
        {
            var numJoints = skeleton.numJoints;
            var rootPose = local.jointPoses;
            var globalPose = this.jointPoses;

            for (var i = 0; i < numJoints; ++i) {
                var localJointPose = rootPose[i];
                var globalJointPose = globalPose[i];
                var joint = skeleton.getJoint(i);

                if (joint.parentIndex < 0)
                    globalJointPose.copyFrom(localJointPose);
                else {
                    var parentPose = globalPose[joint.parentIndex];
                    var gTr = globalJointPose.position;
                    var ptr = parentPose.position;
                    var pQuad = parentPose.rotation;
                    pQuad.rotate(localJointPose.position, gTr);
                    gTr.x += ptr.x;
                    gTr.y += ptr.y;
                    gTr.z += ptr.z;
                    globalJointPose.rotation.multiply(pQuad, localJointPose.rotation);
                    globalJointPose.scale.x = parentPose.scale.x * localJointPose.scale.x;
                    globalJointPose.scale.y = parentPose.scale.y * localJointPose.scale.y;
                    globalJointPose.scale.z = parentPose.scale.z * localJointPose.scale.z;
                }
            }
        },
    };

export { SkeletonPose };