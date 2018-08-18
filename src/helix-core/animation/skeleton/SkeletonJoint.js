import {Matrix4x4} from "../../math/Matrix4x4";

var nameCounter = 0;

/**
 * @classdesc
 * SkeletonJoint describes a single joint in a {@linkcode Skeleton}.
 * (Pedantic note: some packages call these "bones", which is technically a slight misnomer.)
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonJoint()
{
    /**
     * The name of the joint.
     */
    this.name = "hx_joint_" + (nameCounter++);

    /**
     * The index in the Skeleton of the parent joint.
     */
    this.parentIndex = -1;

    /**
     * The inverse bind pose of the joint. This was how the joint was positioned with the mesh in the default skinned state (usually the T-pose).
     * @type {Matrix4x4}
     */
    this.inverseBindPose = new Matrix4x4();
}

SkeletonJoint.prototype =
{
    toString: function()
    {
        return "[SkeletonJoint]";
    }
};

export { SkeletonJoint };