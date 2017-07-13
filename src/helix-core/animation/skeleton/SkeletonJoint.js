import {Matrix4x4} from "../../math/Matrix4x4";

/**
 *
 * @constructor
 */
function SkeletonJoint()
{
    this.name = null;
    this.parentIndex = -1;
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